import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const refundSchema = z.object({
  reason: z.string().min(5).max(500),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("CLIENT");
  if (auth.error || !auth.user) return auth.error;

  const { id } = await context.params;

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { serviceRequest: true },
  });

  if (!payment) {
    return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  }

  if (payment.clientId !== auth.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (payment.status !== "HELD") {
    return NextResponse.json({ error: "Solo se puede reembolsar un pago retenido" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = refundSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Motivo de reembolso requerido" }, { status: 400 });
  }

  const [updatedPayment] = await prisma.$transaction([
    prisma.payment.update({
      where: { id },
      data: { status: "REFUNDED", refundedAt: new Date(), refundReason: parsed.data.reason },
    }),
    prisma.serviceRequest.update({
      where: { id: payment.serviceRequestId },
      data: { status: "CANCELED", canceledAt: new Date() },
    }),
  ]);

  if (payment.serviceRequest.technicianId) {
    await prisma.notification.create({
      data: {
        userId: payment.serviceRequest.technicianId,
        type: "REQUEST_REJECTED",
        title: "Reembolso solicitado",
        body: `El cliente solicitó reembolso para "${payment.serviceRequest.title}": ${parsed.data.reason}`,
        link: `/dashboard/tecnico/solicitudes`,
      },
    });
  }

  return NextResponse.json({ payment: updatedPayment });
}
