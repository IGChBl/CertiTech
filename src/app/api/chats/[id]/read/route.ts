import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionPayload } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { markChatAsRead } from "@/lib/chat/read";
import { getPrismaFriendlyErrorMessage, isPrismaConnectionTimeoutError } from "@/lib/prisma-errors";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getCurrentSessionPayload();
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await context.params;

  const participant = await prisma.chatParticipant.findUnique({
    where: {
      chatId_userId: {
        chatId: id,
        userId: session.userId,
      },
    },
  });

  if (!participant) {
    return NextResponse.json({ error: "No autorizado para este chat" }, { status: 403 });
  }

  try {
    const readAt = await markChatAsRead(id, session.userId);
    return NextResponse.json({ ok: true, lastReadAt: readAt.toISOString() });
  } catch (error) {
    console.error("[chats][read] Error marcando chat como leído", error);
    const status = isPrismaConnectionTimeoutError(error) ? 503 : 500;
    return NextResponse.json(
      {
        error: getPrismaFriendlyErrorMessage(error, "No se pudo marcar el chat como leído."),
      },
      { status },
    );
  }
}
