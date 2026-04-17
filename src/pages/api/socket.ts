import type { NextApiRequest, NextApiResponse } from "next";
import type { Server as NetServer } from "http";
import { Server as SocketServer } from "socket.io";
import type { Socket as NetSocket } from "net";
import { prisma } from "@/lib/prisma";

type NextApiResponseServerIO = NextApiResponse & {
  socket: NetSocket & {
    server: NetServer & {
      io?: SocketServer;
    };
  };
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(_req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    const io = new SocketServer(res.socket.server, {
      path: "/api/socket_io",
      addTrailingSlash: false,
      cors: {
        origin: "*",
      },
    });

    io.on("connection", (socket) => {
      socket.on("join-chat", (chatId: string) => {
        if (chatId) {
          socket.join(chatId);
        }
      });

      socket.on(
        "send-message",
        async (payload: { chatId: string; senderId: string; content: string; imageUrl?: string }) => {
          const { chatId, senderId, content, imageUrl } = payload;

          if (!chatId || !senderId || !content?.trim()) {
            return;
          }

          const participant = await prisma.chatParticipant.findUnique({
            where: {
              chatId_userId: {
                chatId,
                userId: senderId,
              },
            },
          });

          if (!participant) {
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
            },
          });
        },
      );

      socket.on("message-read", async (payload: { chatId: string; userId: string }) => {
        if (!payload?.chatId || !payload?.userId) {
          return;
        }

        await prisma.chatParticipant.updateMany({
          where: {
            chatId: payload.chatId,
            userId: payload.userId,
          },
          data: {
            lastReadAt: new Date(),
          },
        });
      });
    });

    res.socket.server.io = io;
  }

  res.end();
}
