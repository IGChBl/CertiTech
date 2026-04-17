import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { createReviewSchema } from "@/lib/validations/review";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const technicianProfileId = request.nextUrl.searchParams.get("technicianProfileId");

  const reviews = await prisma.review.findMany({
    where: technicianProfileId
      ? {
          technicianProfileId,
          isHidden: false,
        }
      : { isHidden: false },
    include: {
      client: {
        include: {
          clientProfile: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ reviews });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole("CLIENT");
  if (auth.error || !auth.user) return auth.error;

  const body = await request.json().catch(() => null);

  if (body?.rating !== undefined) {
    body.rating = Number(body.rating);
  }

  const parsed = createReviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos invalidos", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { serviceRequestId, technicianProfileId, rating, comment } = parsed.data;

  const serviceRequest = await prisma.serviceRequest.findUnique({
    where: { id: serviceRequestId },
    include: {
      technician: {
        include: {
          technicianProfile: true,
        },
      },
    },
  });

  if (!serviceRequest) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  if (serviceRequest.clientId !== auth.user.id) {
    return NextResponse.json({ error: "No puedes valorar este servicio" }, { status: 403 });
  }

  if (serviceRequest.status !== "COMPLETED") {
    return NextResponse.json({ error: "Solo puedes valorar servicios completados" }, { status: 400 });
  }

  const existingReview = await prisma.review.findUnique({
    where: { serviceRequestId },
  });

  if (existingReview) {
    return NextResponse.json({ error: "Ya existe una valoracion para este servicio" }, { status: 409 });
  }

  const profile = await prisma.technicianProfile.findUnique({
    where: { id: technicianProfileId },
  });

  if (!profile) {
    return NextResponse.json({ error: "Tecnico no encontrado" }, { status: 404 });
  }

  const created = await prisma.review.create({
    data: {
      serviceRequestId,
      clientId: auth.user.id,
      technicianProfileId,
      rating,
      comment,
    },
  });

  const agg = await prisma.review.aggregate({
    where: {
      technicianProfileId,
      isHidden: false,
    },
    _avg: { rating: true },
    _count: { rating: true },
  });

  await prisma.technicianProfile.update({
    where: { id: technicianProfileId },
    data: {
      averageRating: agg._avg.rating ?? 0,
      totalReviews: agg._count.rating,
    },
  });

  if (serviceRequest.technicianId) {
    await prisma.notification.create({
      data: {
        userId: serviceRequest.technicianId,
        type: "NEW_REVIEW",
        title: "Recibiste una nueva valoracion",
        body: `Calificacion recibida: ${rating} estrellas`,
        link: "/dashboard/tecnico/valoraciones",
      },
    });
  }

  return NextResponse.json({ review: created }, { status: 201 });
}
