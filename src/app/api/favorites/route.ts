import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireRole("CLIENT");
  if (auth.error || !auth.user) return auth.error;

  const favorites = await prisma.favorite.findMany({
    where: { clientId: auth.user.id },
    include: {
      technicianProfile: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
            },
          },
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

  const body = await request.json().catch(() => null);
  const technicianProfileId = body?.technicianProfileId as string | undefined;

  if (!technicianProfileId) {
    return NextResponse.json({ error: "tecnicianProfileId es requerido" }, { status: 400 });
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

  const body = await request.json().catch(() => null);
  const technicianProfileId = body?.technicianProfileId as string | undefined;

  if (!technicianProfileId) {
    return NextResponse.json({ error: "tecnicianProfileId es requerido" }, { status: 400 });
  }

  await prisma.favorite.deleteMany({
    where: {
      clientId: auth.user.id,
      technicianProfileId,
    },
  });

  return NextResponse.json({ message: "Eliminado de favoritos" });
}
