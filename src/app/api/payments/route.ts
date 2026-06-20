import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const simulatePaymentSchema = z.object({
  serviceRequestId: z.string().min(1),
  cardHolder: z.string().min(3).max(100),
  cardNumber: z.string().length(16, "Número de tarjeta inválido"),
  expiry: z.string().regex(/^\d{2}\/\d{2}$/, "Formato MM/AA"),
  cvv: z.string().length(3, "CVV inválido"),
});

export async function POST(request: NextRequest) {
  const auth = await requireRole("CLIENT");
  if (auth.error || !auth.user) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = simulatePaymentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de pago inválidos", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { serviceRequestId, cardHolder, cardNumber } = parsed.data;

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
        cardLastFour: cardNumber.slice(-4),
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

  return NextResponse.json({ payment }, { status: 201 });
}
