import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { emitToChat } from "@/lib/realtime/socket";
import { z } from "zod";

// Demo simulation: the backend only ever receives sanitized, non-sensitive data.
// Raw PAN / CVV / expiry are validated client-side and never sent, stored, or logged.
const simulatePaymentSchema = z.object({
  serviceRequestId: z.string().min(1),
  cardHolder: z.string().min(3).max(100),
  cardLastFour: z.string().regex(/^\d{4}$/, "Últimos 4 dígitos inválidos"),
  simulatedReference: z.string().min(1).max(64).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireRole("CLIENT");
  if (auth.error || !auth.user) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = simulatePaymentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de pago inválidos", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { serviceRequestId, cardHolder, cardLastFour } = parsed.data;

  const serviceRequest = await prisma.serviceRequest.findUnique({
    where: { id: serviceRequestId },
    include: { payment: true },
  });

  if (!serviceRequest) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  if (serviceRequest.clientId !== auth.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (serviceRequest.status !== "AWAITING_PAYMENT") {
    return NextResponse.json({ error: "Esta solicitud no está pendiente de pago" }, { status: 400 });
  }

  if (serviceRequest.payment) {
    return NextResponse.json({ error: "Esta solicitud ya tiene un pago registrado" }, { status: 400 });
  }

  const amount = serviceRequest.agreedPrice;
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Monto de pago inválido" }, { status: 400 });
  }

  const [payment] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        serviceRequestId,
        clientId: auth.user.id,
        amount,
        status: "HELD",
        cardLastFour,
        cardHolder,
        paidAt: new Date(),
      },
    }),
    prisma.serviceRequest.update({
      where: { id: serviceRequestId },
      data: { status: "PENDING" },
    }),
  ]);

  if (serviceRequest.technicianId) {
    await prisma.notification.create({
      data: {
        userId: serviceRequest.technicianId,
        type: "NEW_REQUEST",
        title: "Pago recibido — solicitud confirmada",
        body: `El cliente pagó por "${serviceRequest.title}". Revisa la solicitud.`,
        link: `/dashboard/tecnico/solicitudes`,
      },
    });
  }

  // Resolve the chat from the offer that bridged into this request (offers may be
  // many-per-chat, so we never rely on the one-to-one chat.serviceRequestId link).
  const linkedOffer = await prisma.offer.findFirst({
    where: { serviceRequestId },
    select: { chatId: true },
    orderBy: { createdAt: "desc" },
  });

  if (linkedOffer) {
    // Persist a system message both participants see in the timeline (and on
    // reload). Rendered centered/grey by the client; sender is only an anchor.
    const systemMessage = await prisma.message.create({
      data: {
        chatId: linkedOffer.chatId,
        senderId: auth.user.id,
        content: JSON.stringify({
          type: "system",
          text: "La oferta ha sido aceptada y el pago se ha realizado correctamente.",
        }),
      },
      select: { id: true, chatId: true, content: true, createdAt: true },
    });

    // DB-first realtime: update both participants' offer cards immediately and
    // drop the system message into the open conversation. No-op outside chat;
    // reload/API remains the source of truth.
    emitToChat(linkedOffer.chatId, "payment:confirmed", {
      serviceRequestId,
      paymentStatus: payment.status,
      requestStatus: "PENDING",
    });
    emitToChat(linkedOffer.chatId, "message:new", {
      id: systemMessage.id,
      chatId: systemMessage.chatId,
      content: systemMessage.content,
      createdAt: systemMessage.createdAt,
      sender: { id: "system", name: "Sistema", avatarUrl: null },
    });
  }

  return NextResponse.json({ payment }, { status: 201 });
}
