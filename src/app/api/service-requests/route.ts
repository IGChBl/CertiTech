import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/auth/guards";
import { createServiceRequestSchema } from "@/lib/validations/service-request";
import { prisma } from "@/lib/prisma";
import { requireTechnicianSubscriptionAccess } from "@/lib/subscriptions/guards";
import { hasActivePaidSubscription, hasTechnicianPoliceRecord, POLICE_RECORD_REQUIRED_MESSAGE } from "@/lib/subscriptions/service";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error || !auth.user) return auth.error;

  const role = auth.user.role.code;

  if (role === "CLIENT") {
    const requests = await prisma.serviceRequest.findMany({
      where: { clientId: auth.user.id },
      include: {
        category: true,
        technician: {
          include: {
            technicianProfile: {
              select: {
                id: true,
                displayName: true,
                businessName: true,
                city: true,
                workZone: true,
                avatarUrl: true,
                verification: true,
                averageRating: true,
                totalReviews: true,
              },
            },
          },
        },
        images: true,
        review: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ requests });
  }

  if (role === "TECHNICIAN") {
    if (!auth.user.isEmailVerified) {
      return NextResponse.json({
        requests: [],
        message: "Debes verificar tu correo para gestionar solicitudes y contrataciones.",
      });
    }

    const profile = auth.user.technicianProfile;
    if (!profile) {
      return NextResponse.json({
        requests: [],
        message: "No se encontró tu perfil técnico. Completa tu configuración para continuar.",
      });
    }

    const isVerifiedTechnician = profile.verification === "VERIFIED";

    if (!isVerifiedTechnician) {
      return NextResponse.json({
        requests: [],
        message:
          "Tu perfil está en revisión. Podrás aparecer en búsquedas y recibir solicitudes cuando sea aprobado por CertiTech.",
      });
    }

    const subscriptionGate = requireTechnicianSubscriptionAccess({
      subscriptionPlan: profile.subscriptionPlan,
      subscriptionStatus: profile.subscriptionStatus,
      subscriptionEndDate: profile.subscriptionEndDate,
      policeRecordUrl: profile.policeRecordUrl,
    });
    const canReceiveNewRequests = !subscriptionGate.error;
    const availableLeadFilters = canReceiveNewRequests
      ? [
          {
            technicianId: null,
            status: "PENDING" as const,
            categoryId: {
              in: (
                await prisma.technicianService.findMany({
                  where: { technicianId: profile.id },
                  select: { categoryId: true },
                })
              ).map((service) => service.categoryId),
            },
          },
        ]
      : [];

    const requests = await prisma.serviceRequest.findMany({
      where: {
        OR: [
          { technicianId: auth.user.id },
          ...availableLeadFilters,
        ],
      },
      include: {
        category: true,
        client: {
          include: {
            clientProfile: {
              select: {
                id: true,
                fullName: true,
                city: true,
                zone: true,
                avatarUrl: true,
                verificationStatus: true,
              },
            },
          },
        },
        images: true,
        review: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      requests,
      message: canReceiveNewRequests
        ? undefined
        : !hasTechnicianPoliceRecord(profile.policeRecordUrl)
          ? POLICE_RECORD_REQUIRED_MESSAGE
          : "Tu suscripción actual no permite recibir nuevas solicitudes. Puedes gestionar trabajos ya asignados.",
    });
  }

  const requests = await prisma.serviceRequest.findMany({
    include: {
      category: true,
      client: { include: { clientProfile: true } },
      technician: { include: { technicianProfile: true } },
      images: true,
      review: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({ requests });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole("CLIENT");
  if (auth.error || !auth.user) return auth.error;

  const clientProfile = auth.user.clientProfile;
  const canRequestService =
    auth.user.isEmailVerified &&
    !!clientProfile &&
    (clientProfile.verificationStatus === "BASIC_VERIFIED" || clientProfile.verificationStatus === "VERIFIED");

  if (!canRequestService) {
    const errorMessage =
      clientProfile?.verificationStatus === "REJECTED"
        ? "Tu verificación fue rechazada. Revisa el motivo y actualiza tu información para solicitar una nueva revisión."
        : "Tu cuenta está pendiente de verificación. Algunas funciones estarán limitadas hasta completar el proceso.";

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);

  if (body?.budgetMin !== undefined && body.budgetMin !== "") {
    body.budgetMin = Number(body.budgetMin);
  }

  if (body?.budgetMax !== undefined && body.budgetMax !== "") {
    body.budgetMax = Number(body.budgetMax);
  }

  const parsed = createServiceRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  if (data.technicianId) {
    const technician = await prisma.user.findUnique({
      where: { id: data.technicianId },
      include: {
        technicianProfile: {
          select: {
            verification: true,
            subscriptionPlan: true,
            subscriptionStatus: true,
            subscriptionEndDate: true,
            policeRecordUrl: true,
          },
        },
      },
    });

    const isAvailableTechnician =
      technician &&
      technician.status === "ACTIVE" &&
      technician.isEmailVerified &&
      technician.technicianProfile?.verification === "VERIFIED" &&
      !!technician.technicianProfile &&
      hasTechnicianPoliceRecord(technician.technicianProfile.policeRecordUrl) &&
      hasActivePaidSubscription({
        subscriptionPlan: technician.technicianProfile.subscriptionPlan,
        subscriptionStatus: technician.technicianProfile.subscriptionStatus,
        subscriptionEndDate: technician.technicianProfile.subscriptionEndDate,
        policeRecordUrl: technician.technicianProfile.policeRecordUrl,
      });

    if (!isAvailableTechnician) {
      return NextResponse.json(
        {
          error: "Solo puedes contratar técnicos verificados con suscripción activa y correo confirmado.",
        },
        { status: 400 },
      );
    }
  }

  // The negotiated price is never client-supplied here. A request is created
  // PENDING; agreedPrice + AWAITING_PAYMENT are set server-side only when the
  // client accepts a technician's persistent Offer (see lib/offers/service.ts).
  const created = await prisma.serviceRequest.create({
    data: {
      clientId: auth.user.id,
      technicianId: data.technicianId,
      categoryId: data.categoryId,
      title: data.title,
      description: data.description,
      city: data.city,
      zone: data.zone,
      locationReference: data.locationReference,
      desiredDate: data.desiredDate ? new Date(data.desiredDate) : null,
      urgency: data.urgency,
      budgetMin: data.budgetMin,
      budgetMax: data.budgetMax,
      status: "PENDING",
      isDirectRequest: !!data.technicianId,
      images: data.imageUrls?.length
        ? {
            createMany: {
              data: data.imageUrls.map((url) => ({ url })),
            },
          }
        : undefined,
    },
    include: {
      category: true,
      images: true,
    },
  });

  if (created.technicianId) {
    await prisma.notification.create({
      data: {
        userId: created.technicianId,
        type: "NEW_REQUEST",
        title: "Nueva solicitud directa",
        body: `${created.title}`,
        link: `/dashboard/tecnico/solicitudes`,
      },
    });
  }

  return NextResponse.json({ request: created, requiresPayment: false }, { status: 201 });
}
