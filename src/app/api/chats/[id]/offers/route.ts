import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { createOfferSchema } from "@/lib/validations/offer";
import { messageWithOfferSelect, serializeMessageWithOffer } from "@/lib/offers/service";
import { emitToChat } from "@/lib/realtime/socket";
import { getPrismaFriendlyErrorMessage, isPrismaConnectionTimeoutError } from "@/lib/prisma-errors";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth();
    if (auth.error || !auth.user) return auth.error;

    if (!auth.user.isEmailVerified) {
      return NextResponse.json(
        { error: "Debes verificar tu correo para enviar propuestas." },
        { status: 403 },
      );
    }

    const { id: chatId } = await context.params;

    // Only a technician participant may create an offer.
    const technicianProfileId = auth.user.technicianProfile?.id;
    if (!technicianProfileId) {
      return NextResponse.json(
        { error: "Solo los técnicos pueden enviar propuestas de precio." },
        { status: 403 },
      );
    }

    // Validate chat participation (technician side) and resolve the client side
    // from the database — never from client-supplied identity values.
    const participants = await prisma.chatParticipant.findMany({
      where: { chatId },
      select: { userId: true },
    });

    const isTechnicianParticipant = participants.some((p) => p.userId === auth.user!.id);
    if (!isTechnicianParticipant) {
      return NextResponse.json({ error: "No autorizado para este chat" }, { status: 403 });
    }

    const clientParticipant = participants.find((p) => p.userId !== auth.user!.id);
    if (!clientParticipant) {
      return NextResponse.json(
        { error: "La conversación no tiene un cliente destinatario." },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = createOfferSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Propuesta inválida", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // The chat already links a validated service request (if any); use it as the
    // offer's linked request so we never trust a client-provided id.
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { serviceRequestId: true },
    });

    const amount = Math.round(parsed.data.amount * 100) / 100;

    // Offer + anchor Message created atomically. The Message is only a visual
    // anchor in the timeline; the Offer row is the source of truth.
    const created = await prisma.$transaction(async (tx) => {
      const message = await tx.message.create({
        data: {
          chatId,
          senderId: auth.user!.id,
          content: JSON.stringify({ type: "offer", price: amount, status: "pending" }),
        },
        select: { id: true },
      });

      await tx.offer.create({
        data: {
          chatId,
          serviceRequestId: chat?.serviceRequestId ?? null,
          messageId: message.id,
          clientId: clientParticipant.userId,
          technicianProfileId,
          amount,
          description: parsed.data.description,
        },
      });

      await tx.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      });

      return tx.message.findUniqueOrThrow({
        where: { id: message.id },
        select: messageWithOfferSelect,
      });
    });

    await prisma.notification.create({
      data: {
        userId: clientParticipant.userId,
        type: "NEW_MESSAGE",
        title: "Nueva propuesta de precio",
        body: `Recibiste una propuesta por C$ ${amount.toLocaleString()}`,
        link: "/dashboard/cliente/chats",
      },
    });

    const dto = serializeMessageWithOffer(created);

    // DB-first realtime: broadcast only after the transaction commits, to the
    // authorized chat room (clients can only join rooms they participate in).
    emitToChat(chatId, "offer:new", dto);

    return NextResponse.json({ message: dto }, { status: 201 });
  } catch (error) {
    console.error("[chats][offers][POST] Error creando propuesta", error);
    const status = isPrismaConnectionTimeoutError(error) ? 503 : 500;
    return NextResponse.json(
      {
        error: getPrismaFriendlyErrorMessage(error, "No se pudo enviar la propuesta en este momento."),
      },
      { status },
    );
  }
}
