import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const clientVerificationStates = ["PENDING", "BASIC_VERIFIED", "VERIFIED", "REJECTED"] as const;
const technicianVerificationStates = ["PENDING", "IN_REVIEW", "VERIFIED", "REJECTED"] as const;

type ClientVerificationState = (typeof clientVerificationStates)[number];
type TechnicianVerificationState = (typeof technicianVerificationStates)[number];

export async function GET(request: NextRequest) {
  const auth = await requireRole("ADMIN");
  if (auth.error || !auth.user) return auth.error;

  const type = request.nextUrl.searchParams.get("type")?.toUpperCase() ?? "ALL";

  const [clients, technicians] = await Promise.all([
    type === "TECHNICIAN"
      ? Promise.resolve([])
      : prisma.clientProfile.findMany({
          where: {
            verificationStatus: {
              in: ["PENDING", "BASIC_VERIFIED", "REJECTED"],
            },
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                phone: true,
                birthDate: true,
                isEmailVerified: true,
                createdAt: true,
              },
            },
            verifiedBy: {
              select: {
                id: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
    type === "CLIENT"
      ? Promise.resolve([])
      : prisma.technicianProfile.findMany({
          where: {
            verification: {
              in: ["PENDING", "IN_REVIEW", "REJECTED"],
            },
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                phone: true,
                birthDate: true,
                isEmailVerified: true,
                createdAt: true,
              },
            },
            services: {
              include: {
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
            verificationRequests: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
            verifiedBy: {
              select: {
                id: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
  ]);

  return NextResponse.json({ clients, technicians });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireRole("ADMIN");
  if (auth.error || !auth.user) return auth.error;

  const body = await request.json().catch(() => null);
  const targetType = String(body?.targetType ?? "").toUpperCase();
  const profileId = String(body?.profileId ?? "");
  const status = String(body?.status ?? "").toUpperCase();
  const reason = body?.reason ? String(body.reason).trim() : null;
  const note = body?.note ? String(body.note).trim() : null;

  if (!profileId || !status || !["CLIENT", "TECHNICIAN"].includes(targetType)) {
    return NextResponse.json({ error: "targetType, profileId y status son requeridos" }, { status: 400 });
  }

  if (targetType === "CLIENT") {
    if (!clientVerificationStates.includes(status as ClientVerificationState)) {
      return NextResponse.json({ error: "Estado de verificacion de cliente invalido" }, { status: 400 });
    }

    if (status === "REJECTED" && !reason) {
      return NextResponse.json({ error: "Debes indicar el motivo del rechazo." }, { status: 400 });
    }

    const updated = await prisma.clientProfile.update({
      where: { id: profileId },
      data: {
        verificationStatus: status as ClientVerificationState,
        rejectionReason: status === "REJECTED" ? reason : null,
        verificationNote: note || null,
        verifiedAt: status === "BASIC_VERIFIED" || status === "VERIFIED" ? new Date() : null,
        verifiedById: status === "PENDING" ? null : auth.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    await prisma.adminAction.create({
      data: {
        adminId: auth.user.id,
        actionType: "OTHER",
        targetType: "USER",
        targetId: updated.userId,
        details: {
          verificationTarget: "CLIENT",
          verificationStatus: status,
          reason,
          note,
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId: updated.user.id,
        type: "SYSTEM",
        title: "Actualizacion de verificacion",
        body:
          status === "REJECTED"
            ? "Tu verificacion fue rechazada. Revisa el motivo y actualiza tu informacion para solicitar una nueva revision."
            : status === "PENDING"
              ? "Tu cuenta esta pendiente de verificacion. Algunas funciones estaran limitadas hasta completar el proceso."
              : "Tu verificacion de cliente fue actualizada exitosamente.",
        link: "/dashboard/cliente/configuracion",
      },
    });

    return NextResponse.json({ profile: updated });
  }

  if (!technicianVerificationStates.includes(status as TechnicianVerificationState)) {
    return NextResponse.json({ error: "Estado de verificacion de tecnico invalido" }, { status: 400 });
  }

  if (status === "REJECTED" && !reason) {
    return NextResponse.json({ error: "Debes indicar el motivo del rechazo." }, { status: 400 });
  }

  const updated = await prisma.technicianProfile.update({
    where: { id: profileId },
    data: {
      verification: status as TechnicianVerificationState,
      rejectionReason: status === "REJECTED" ? reason : null,
      verificationNote: note || null,
      verifiedAt: status === "VERIFIED" ? new Date() : null,
      verifiedById: status === "PENDING" || status === "IN_REVIEW" ? null : auth.user.id,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  const latestVerificationRequest = await prisma.verificationRequest.findFirst({
    where: { technicianProfileId: updated.id },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (latestVerificationRequest) {
    await prisma.verificationRequest.update({
      where: { id: latestVerificationRequest.id },
      data: {
        status: status === "VERIFIED" ? "APPROVED" : status === "REJECTED" ? "REJECTED" : "PENDING",
        reviewedById: status === "VERIFIED" || status === "REJECTED" ? auth.user.id : null,
        reviewNote: status === "VERIFIED" || status === "REJECTED" ? note || reason || null : null,
        reviewedAt: status === "VERIFIED" || status === "REJECTED" ? new Date() : null,
      },
    });
  } else {
    await prisma.verificationRequest.create({
      data: {
        technicianProfileId: updated.id,
        requestedById: updated.user.id,
        status: status === "VERIFIED" ? "APPROVED" : status === "REJECTED" ? "REJECTED" : "PENDING",
        reviewedById: status === "VERIFIED" || status === "REJECTED" ? auth.user.id : null,
        reviewNote: status === "VERIFIED" || status === "REJECTED" ? note || reason || null : null,
        reviewedAt: status === "VERIFIED" || status === "REJECTED" ? new Date() : null,
      },
    });
  }

  await prisma.adminAction.create({
    data: {
      adminId: auth.user.id,
      actionType: status === "VERIFIED" ? "VERIFY_TECHNICIAN" : status === "REJECTED" ? "REJECT_VERIFICATION" : "OTHER",
      targetType: "TECHNICIAN",
      targetId: updated.id,
      details: {
        verificationStatus: status,
        reason,
        note,
      },
    },
  });

  await prisma.notification.create({
    data: {
      userId: updated.user.id,
      type: status === "VERIFIED" ? "TECHNICIAN_VERIFIED" : "SYSTEM",
      title: "Actualizacion de verificacion tecnica",
      body:
        status === "VERIFIED"
          ? "Tu perfil tecnico fue verificado. Ya puedes aparecer en busquedas y recibir solicitudes."
          : status === "REJECTED"
            ? "Tu verificacion fue rechazada. Revisa el motivo y actualiza tu informacion para solicitar una nueva revision."
            : "Tu perfil esta en revision. Podras aparecer en busquedas y recibir solicitudes cuando sea aprobado por CertiTech.",
      link: "/dashboard/tecnico/configuracion",
    },
  });

  return NextResponse.json({ profile: updated });
}
