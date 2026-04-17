import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { startChatSchema } from "@/lib/validations/chat";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error || !auth.user) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = startChatSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos invalidos", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { recipientUserId, serviceRequestId } = parsed.data;

  if (recipientUserId === auth.user.id) {
    return NextResponse.json({ error: "No puedes iniciar chat contigo mismo" }, { status: 400 });
  }

  const recipient = await prisma.user.findUnique({ where: { id: recipientUserId } });
  if (!recipient || recipient.status !== "ACTIVE") {
    return NextResponse.json({ error: "Destinatario no disponible" }, { status: 404 });
  }

  let chat = null;

  if (serviceRequestId) {
    chat = await prisma.chat.findUnique({ where: { serviceRequestId } });
  }

  if (!chat) {
    chat = await prisma.chat.findFirst({
      where: {
        serviceRequestId: null,
        participants: {
          some: { userId: auth.user.id },
        },
        AND: {
          participants: {
            some: { userId: recipientUserId },
          },
        },
      },
    });
  }

  if (!chat) {
    chat = await prisma.chat.create({
      data: {
        serviceRequestId,
        createdById: auth.user.id,
      },
    });
  }

  await prisma.chatParticipant.createMany({
    data: [
      { chatId: chat.id, userId: auth.user.id },
      { chatId: chat.id, userId: recipientUserId },
    ],
    skipDuplicates: true,
  });

  return NextResponse.json({ chatId: chat.id });
}
