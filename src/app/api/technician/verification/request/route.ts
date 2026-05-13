import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { hasTechnicianPoliceRecord, POLICE_RECORD_REQUIRED_MESSAGE } from "@/lib/subscriptions/service";

export async function POST() {
  const auth = await requireRole("TECHNICIAN");
  if (auth.error || !auth.user) return auth.error;

  if (!auth.user.isEmailVerified) {
    return NextResponse.json(
      {
        error: "Debes verificar tu correo antes de solicitar la revisión de tu perfil.",
      },
      { status: 403 },
    );
  }

  const profile = auth.user.technicianProfile;
  if (!profile) {
    return NextResponse.json(
      {
        error: "No encontramos tu perfil técnico. Completa tu registro para continuar.",
      },
      { status: 400 },
    );
  }

  if (!hasTechnicianPoliceRecord(profile.policeRecordUrl)) {
    return NextResponse.json({ error: POLICE_RECORD_REQUIRED_MESSAGE }, { status: 400 });
  }

  if (profile.verification === "VERIFIED") {
    return NextResponse.json(
      {
        message: "Tu perfil ya está verificado.",
      },
      { status: 200 },
    );
  }

  const latestRequest = await prisma.verificationRequest.findFirst({
    where: {
      technicianProfileId: profile.id,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.technicianProfile.update({
      where: { id: profile.id },
      data: {
        verification: "IN_REVIEW",
        rejectionReason: null,
        verificationNote: "Solicitud de verificación enviada por el técnico.",
      },
    });

    if (latestRequest) {
      await tx.verificationRequest.update({
        where: { id: latestRequest.id },
        data: {
          status: "PENDING",
          notes: "Solicitud reenviada por el técnico desde configuración.",
          reviewNote: null,
          reviewedById: null,
          reviewedAt: null,
        },
      });
    } else {
      await tx.verificationRequest.create({
        data: {
          technicianProfileId: profile.id,
          requestedById: auth.user.id,
          status: "PENDING",
          notes: "Solicitud de verificación enviada por el técnico desde configuración.",
        },
      });
    }
  });

  return NextResponse.json({
    message: "Solicitud de verificación enviada. Nuestro equipo revisará tu perfil.",
  });
}

