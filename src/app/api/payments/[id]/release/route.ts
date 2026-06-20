import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: NextRequest,
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
    return NextResponse.json({ error: "El pago no está retenido" }, { status: 400 });
  }

  const [updatedPayment] = await prisma.$transaction([
    prisma.payment.update({
      where: { id },
      data: { status: "RELEASED", releasedAt: new Date() },
    }),
    prisma.serviceRequest.update({
      where: { id: payment.serviceRequestId },
      data: { status: "COMPLETED", completedAt: new Date() },
    }),
  ]);

  if (payment.serviceRequest.technicianId) {
    await prisma.notification.create({
      data: {
        userId: payment.serviceRequest.technicianId,
        type: "SERVICE_COMPLETED",
        title: "Pago liberado",
        body: `El cliente confirmó la recepción del servicio "${payment.serviceRequest.title}". El pago ha sido liberado.`,
        link: `/dashboard/tecnico/solicitudes`,
      },
    });
  }

  return NextResponse.json({ payment: updatedPayment });
}
