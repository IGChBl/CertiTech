import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guards";
import { updateServiceStatusSchema } from "@/lib/validations/service-request";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const auth = await requireAuth();
  if (auth.error || !auth.user) return auth.error;

  const { id } = await context.params;

  const serviceRequest = await prisma.serviceRequest.findUnique({
    where: { id },
  });

  if (!serviceRequest) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  const role = auth.user.role.code;
  const isOwner = serviceRequest.clientId === auth.user.id;
  const isAssignedTechnician = serviceRequest.technicianId === auth.user.id;

  if (role === "CLIENT" && !auth.user.isEmailVerified) {
    return NextResponse.json(
      {
        error: "Debes verificar tu correo para gestionar solicitudes.",
      },
      { status: 403 },
    );
  }

  if (role === "TECHNICIAN" && !auth.user.isEmailVerified) {
    return NextResponse.json(
      {
        error: "Debes verificar tu correo para gestionar solicitudes.",
      },
      { status: 403 },
    );
  }

  if (role === "TECHNICIAN" && auth.user.technicianProfile?.verification !== "VERIFIED") {
    return NextResponse.json(
      {
        error:
          "Tu perfil esta en revision. Podras aparecer en busquedas y recibir solicitudes cuando sea aprobado por CertiTech.",
      },
      { status: 403 },
    );
  }

  if (role !== "ADMIN" && !isOwner && !isAssignedTechnician) {
    if (!(role === "TECHNICIAN" && !serviceRequest.technicianId)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
  }

  const body = await request.json().catch(() => null);
  const parsed = updateServiceStatusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Estado invalido" }, { status: 400 });
  }

  const status = parsed.data.status;

  const updated = await prisma.serviceRequest.update({
    where: { id },
    data: {
      status,
      technicianId:
        role === "TECHNICIAN" && !serviceRequest.technicianId && status === "ACCEPTED"
          ? auth.user.id
          : serviceRequest.technicianId,
      completedAt: status === "COMPLETED" ? new Date() : null,
      canceledAt: status === "CANCELED" ? new Date() : null,
    },
  });

  const notifyTargets = [updated.clientId, updated.technicianId].filter(Boolean) as string[];

  for (const userId of notifyTargets) {
    if (userId === auth.user.id) continue;

    await prisma.notification.create({
      data: {
        userId,
        type:
          status === "ACCEPTED"
            ? "REQUEST_ACCEPTED"
            : status === "CANCELED"
              ? "REQUEST_REJECTED"
              : status === "COMPLETED"
                ? "SERVICE_COMPLETED"
                : "SYSTEM",
        title: "Actualizacion de solicitud",
        body: `La solicitud ${updated.title} ahora esta en estado ${status}.`,
        link: "/dashboard",
      },
    });
  }

  return NextResponse.json({ request: updated });
}
