import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { buildPublicTechnicianWhere } from "@/lib/subscriptions/service";

export async function GET() {
  const auth = await requireRole("CLIENT");
  if (auth.error || !auth.user) return auth.error;

  const favorites = await prisma.favorite.findMany({
    where: {
      clientId: auth.user.id,
      technicianProfile: buildPublicTechnicianWhere(),
    },
    include: {
      technicianProfile: {
        select: {
          id: true,
          userId: true,
          displayName: true,
          businessName: true,
          city: true,
          workZone: true,
          description: true,
          yearsExperience: true,
          availabilityText: true,
          avatarUrl: true,
          averageRating: true,
          totalReviews: true,
          completedJobs: true,
          verification: true,
          referencePriceMin: true,
          referencePriceMax: true,
          isHomeService: true,
          services: {
            include: {
              category: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ favorites });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole("CLIENT");
  if (auth.error || !auth.user) return auth.error;

  if (!auth.user.isEmailVerified) {
    return NextResponse.json(
      { error: "Debes verificar tu correo para gestionar favoritos." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const technicianProfileId = body?.technicianProfileId as string | undefined;

  if (!technicianProfileId) {
    return NextResponse.json({ error: "technicianProfileId es requerido" }, { status: 400 });
  }

  const existing = await prisma.favorite.findUnique({
    where: {
      clientId_technicianProfileId: {
        clientId: auth.user.id,
        technicianProfileId,
      },
    },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ isFavorite: false, message: "Eliminado de favoritos" });
  }

  const technician = await prisma.technicianProfile.findFirst({
    where: {
      id: technicianProfileId,
      ...buildPublicTechnicianWhere(),
    },
    select: { id: true },
  });

  if (!technician) {
    return NextResponse.json({ error: "Solo puedes guardar técnicos verificados y activos." }, { status: 400 });
  }

  await prisma.favorite.create({
    data: {
      clientId: auth.user.id,
      technicianProfileId,
    },
  });

  return NextResponse.json({ isFavorite: true, message: "Guardado en favoritos" });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireRole("CLIENT");
  if (auth.error || !auth.user) return auth.error;

  if (!auth.user.isEmailVerified) {
    return NextResponse.json(
      { error: "Debes verificar tu correo para gestionar favoritos." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const technicianProfileId = body?.technicianProfileId as string | undefined;

  if (!technicianProfileId) {
    return NextResponse.json({ error: "technicianProfileId es requerido" }, { status: 400 });
  }

  await prisma.favorite.deleteMany({
    where: {
      clientId: auth.user.id,
      technicianProfileId,
    },
  });

  return NextResponse.json({ message: "Eliminado de favoritos" });
}
