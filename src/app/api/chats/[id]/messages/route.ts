import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { getCurrentSessionPayload } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { sendMessageSchema } from "@/lib/validations/chat";
import { markChatAsRead } from "@/lib/chat/read";
import { getPrismaFriendlyErrorMessage, isPrismaConnectionTimeoutError } from "@/lib/prisma-errors";

type UpdateMessageBody = {
  messageId?: string;
  content?: string;
};

function isUpdateMessageBody(value: unknown): value is UpdateMessageBody {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const body = value as Record<string, unknown>;

  return (
    (typeof body.messageId === "string" || body.messageId === undefined) &&
    (typeof body.content === "string" || body.content === undefined)
  );
}

async function assertParticipant(chatId: string, userId: string) {
  return prisma.chatParticipant.findUnique({
    where: {
      chatId_userId: {
        chatId,
        userId,
      },
    },
    select: {
      chatId: true,
      userId: true,
    },
  });
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getCurrentSessionPayload();
    if (!session) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await context.params;

    const participant = await assertParticipant(id, session.userId);
    if (!participant) {
      return NextResponse.json({ error: "No autorizado para este chat" }, { status: 403 });
    }

    const messages = await prisma.message.findMany({
      where: { chatId: id },
      select: {
        id: true,
        content: true,
        imageUrl: true,
        createdAt: true,
        isRead: true,
        sender: {
          select: {
            id: true,
            email: true,
            clientProfile: {
              select: {
                fullName: true,
                avatarUrl: true,
              },
            },
            technicianProfile: {
              select: {
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    await markChatAsRead(id, session.userId);

    return NextResponse.json({
      messages: messages.map((message) => ({
        id: message.id,
        content: message.content,
        imageUrl: message.imageUrl,
        createdAt: message.createdAt,
        isRead: message.isRead,
        sender: {
          id: message.sender.id,
          name:
            message.sender.clientProfile?.fullName ??
            message.sender.technicianProfile?.displayName ??
            message.sender.email,
          avatarUrl: message.sender.clientProfile?.avatarUrl ?? message.sender.technicianProfile?.avatarUrl ?? null,
        },
      })),
    });
  } catch (error) {
    console.error("[chats][messages][GET] Error consultando mensajes", error);
    const status = isPrismaConnectionTimeoutError(error) ? 503 : 500;
    return NextResponse.json(
      {
        error: getPrismaFriendlyErrorMessage(error, "No se pudieron cargar los mensajes en este momento."),
      },
      { status },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth();
    if (auth.error || !auth.user) return auth.error;

    if (!auth.user.isEmailVerified) {
      return NextResponse.json(
        { error: "Debes verificar tu correo para enviar mensajes." },
        { status: 403 },
      );
    }

    const { id } = await context.params;

    const participant = await assertParticipant(id, auth.user.id);
    if (!participant) {
      return NextResponse.json({ error: "No autorizado para este chat" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = sendMessageSchema.safeParse({ ...body, chatId: id });

    if (!parsed.success) {
      return NextResponse.json({ error: "Mensaje invalido", issues: parsed.error.flatten() }, { status: 400 });
    }

    const created = await prisma.message.create({
      data: {
        chatId: id,
        senderId: auth.user.id,
        content: parsed.data.content,
        imageUrl: parsed.data.imageUrl,
      },
    });

    const recipients = await prisma.chatParticipant.findMany({
      where: {
        chatId: id,
        userId: { not: auth.user.id },
      },
    });

    if (recipients.length > 0) {
      await prisma.notification.createMany({
        data: recipients.map((recipient) => ({
          userId: recipient.userId,
          type: "NEW_MESSAGE",
          title: "Tienes un nuevo mensaje",
          body: parsed.data.content.slice(0, 100),
          link: "/dashboard/cliente/chats",
        })),
      });
    }

    return NextResponse.json({ message: created }, { status: 201 });
  } catch (error) {
    console.error("[chats][messages][POST] Error enviando mensaje", error);
    const status = isPrismaConnectionTimeoutError(error) ? 503 : 500;
    return NextResponse.json(
      {
        error: getPrismaFriendlyErrorMessage(error, "No se pudo enviar el mensaje en este momento."),
      },
      { status },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth();
    if (auth.error || !auth.user) return auth.error;

    const { id } = await context.params;

    const participant = await assertParticipant(id, auth.user.id);
    if (!participant) {
      return NextResponse.json({ error: "No autorizado para este chat" }, { status: 403 });
    }

    const body: unknown = await request.json().catch(() => null);

    if (!isUpdateMessageBody(body)) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const messageId = body.messageId;
    const newContent = body.content?.trim();

    if (!messageId || !newContent) {
      return NextResponse.json({ error: "messageId y content son requeridos" }, { status: 400 });
    }

    const existing = await prisma.message.findFirst({
      where: {
        id: messageId,
        chatId: id,
        senderId: auth.user.id,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Mensaje no encontrado en este chat" }, { status: 404 });
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { content: newContent },
    });

    return NextResponse.json({ message: updated });
  } catch (error) {
    console.error("[chats][messages][PATCH] Error actualizando mensaje", error);
    const status = isPrismaConnectionTimeoutError(error) ? 503 : 500;
    return NextResponse.json(
      {
        error: getPrismaFriendlyErrorMessage(error, "No se pudo actualizar el mensaje en este momento."),
      },
      { status },
    );
  }
}
