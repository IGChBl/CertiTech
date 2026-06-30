import type { NextApiRequest, NextApiResponse } from "next";
import type { Server as NetServer } from "http";
import { Server as SocketServer } from "socket.io";
import type { Socket as NetSocket } from "net";
import { AUTH_COOKIE, AUTH_REFRESH_COOKIE } from "@/lib/constants";
import { verifyAccessToken, verifyRefreshToken } from "@/lib/auth/jwt";
import { prisma } from "@/lib/prisma";
import { setSocketServer } from "@/lib/realtime/socket";

type NextApiResponseServerIO = NextApiResponse & {
  socket: NetSocket & {
    server: NetServer & {
      io?: SocketServer;
    };
  };
};

type AuthenticatedSocketData = {
  userId: string;
};

type SocketCorsOrigin = Array<string | RegExp> | false;

function getSocketCorsOrigin(): SocketCorsOrigin {
  const configuredOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.SOCKET_ALLOWED_ORIGINS,
  ]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV !== "production") {
    // Dev/demo: además de localhost, permite cualquier IP de red privada
    // (192.168.x.x, 10.x.x.x, 172.16-31.x.x) para usar la app desde otros
    // dispositivos del mismo Wi-Fi sin fijar la IP (que cambia por DHCP).
    return [
      ...configuredOrigins,
      /^http:\/\/localhost(?::\d+)?$/,
      /^http:\/\/127\.0\.0\.1(?::\d+)?$/,
      /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(?::\d+)?$/,
      /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(?::\d+)?$/,
      /^http:\/\/172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}(?::\d+)?$/,
      // Túneles públicos para demo desde otra red (Cloudflare, ngrok, localtunnel).
      /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/,
      /^https:\/\/[a-z0-9-]+\.ngrok-free\.app$/,
      /^https:\/\/[a-z0-9.-]+\.ngrok\.io$/,
      /^https:\/\/[a-z0-9-]+\.loca\.lt$/,
    ];
  }

  return configuredOrigins.length > 0 ? configuredOrigins : false;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseCookies(cookieHeader: string | undefined) {
  const cookies = new Map<string, string>();

  for (const item of cookieHeader?.split(";") ?? []) {
    const separatorIndex = item.indexOf("=");
    if (separatorIndex === -1) continue;

    const name = item.slice(0, separatorIndex).trim();
    const value = item.slice(separatorIndex + 1).trim();
    if (name) cookies.set(name, decodeURIComponent(value));
  }

  return cookies;
}

async function resolveSocketUserId(cookieHeader: string | undefined) {
  const cookies = parseCookies(cookieHeader);
  const accessToken = cookies.get(AUTH_COOKIE);
  const refreshToken = cookies.get(AUTH_REFRESH_COOKIE);

  try {
    if (accessToken) {
      const payload = await verifyAccessToken(accessToken);
      return payload.userId;
    }
  } catch {
    // Fall back to refresh token below.
  }

  try {
    if (refreshToken) {
      const payload = await verifyRefreshToken(refreshToken);
      return payload.userId;
    }
  } catch {
    return null;
  }

  return null;
}

async function isChatParticipant(chatId: string, userId: string) {
  const participant = await prisma.chatParticipant.findUnique({
    where: {
      chatId_userId: {
        chatId,
        userId,
      },
    },
    select: { chatId: true },
  });

  return Boolean(participant);
}

export default function handler(_req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    const io = new SocketServer(res.socket.server, {
      path: "/api/socket_io",
      addTrailingSlash: false,
      cors: {
        origin: getSocketCorsOrigin(),
        credentials: true,
      },
    });

    io.use(async (socket, next) => {
      try {
        const userId = await resolveSocketUserId(socket.handshake.headers.cookie);
        if (!userId) {
          return next(new Error("No autenticado"));
        }

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, status: true },
        });

        if (!user || user.status !== "ACTIVE") {
          return next(new Error("No autenticado"));
        }

        (socket.data as AuthenticatedSocketData).userId = user.id;
        return next();
      } catch {
        return next(new Error("No autenticado"));
      }
    });

    io.on("connection", (socket) => {
      socket.on("join-chat", async (chatId: string) => {
        const userId = (socket.data as AuthenticatedSocketData).userId;

        if (!chatId || !(await isChatParticipant(chatId, userId))) {
          return;
        }

        socket.join(chatId);
      });

      socket.on(
        "send-message",
        async (payload: { chatId: string; content: string; imageUrl?: string }) => {
          const { chatId, content, imageUrl } = payload;
          const senderId = (socket.data as AuthenticatedSocketData).userId;

          if (!chatId || !content?.trim()) {
            return;
          }

          if (!(await isChatParticipant(chatId, senderId))) {
            return;
          }

          const message = await prisma.message.create({
            data: {
              chatId,
              senderId,
              content: content.trim(),
              imageUrl,
            },
            include: {
              sender: {
                include: {
                  clientProfile: true,
                  technicianProfile: true,
                },
              },
            },
          });

          await prisma.chat.update({
            where: { id: chatId },
            data: { updatedAt: new Date() },
          });

          const recipients = await prisma.chatParticipant.findMany({
            where: {
              chatId,
              userId: { not: senderId },
            },
          });

          for (const recipient of recipients) {
            await prisma.notification.create({
              data: {
                userId: recipient.userId,
                type: "NEW_MESSAGE",
                title: "Nuevo mensaje recibido",
                body: content.slice(0, 100),
                link: "/dashboard/cliente/chats",
              },
            });
          }

          io.to(chatId).emit("message:new", {
            id: message.id,
            chatId: message.chatId,
            content: message.content,
            imageUrl: message.imageUrl,
            createdAt: message.createdAt,
            sender: {
              id: message.sender.id,
              name:
                message.sender.clientProfile?.fullName ??
                message.sender.technicianProfile?.displayName ??
                message.sender.email,
              avatarUrl:
                message.sender.clientProfile?.avatarUrl ?? message.sender.technicianProfile?.avatarUrl ?? null,
            },
          });
        },
      );

      socket.on("message-read", async (payload: { chatId: string }) => {
        const userId = (socket.data as AuthenticatedSocketData).userId;

        if (!payload?.chatId || !(await isChatParticipant(payload.chatId, userId))) {
          return;
        }

        await prisma.chatParticipant.update({
          where: {
            chatId_userId: {
              chatId: payload.chatId,
              userId,
            },
          },
          data: {
            lastReadAt: new Date(),
          },
        });
      });

      socket.on(
        "update-message",
        async (payload: { chatId?: string; messageId?: string; newContent?: string }) => {
          const userId = (socket.data as AuthenticatedSocketData).userId;
          const chatId = typeof payload?.chatId === "string" ? payload.chatId : "";
          const messageId = typeof payload?.messageId === "string" ? payload.messageId : "";
          const newContent = typeof payload?.newContent === "string" ? payload.newContent.trim() : "";

          if (!chatId || !messageId || !newContent) {
            return;
          }

          if (!(await isChatParticipant(chatId, userId))) {
            return;
          }

          const existing = await prisma.message.findFirst({
            where: {
              id: messageId,
              chatId,
              senderId: userId,
            },
            select: { id: true },
          });

          if (!existing) {
            return;
          }

          const updated = await prisma.message.update({
            where: { id: messageId },
            data: { content: newContent },
          });

          io.to(chatId).emit("message:update", {
            id: updated.id,
            chatId,
            content: updated.content,
          });
        },
      );
    });

    res.socket.server.io = io;
    setSocketServer(io);
  }

  res.end();
}
