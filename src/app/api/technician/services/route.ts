import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { upsertTechnicianServiceSchema } from "@/lib/validations/technician-service";
import { getPrismaFriendlyErrorMessage, isPrismaConnectionTimeoutError } from "@/lib/prisma-errors";

export async function GET() {
  const auth = await requireRole("TECHNICIAN");
  if (auth.error || !auth.user || !auth.user.technicianProfile) {
    return auth.error || NextResponse.json({ error: "Perfil de técnico no encontrado" }, { status: 404 });
  }

  try {
    const services = await prisma.technicianService.findMany({
      where: { technicianId: auth.user.technicianProfile.id },
      include: {
        category: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ services });
  } catch (error) {
    const status = isPrismaConnectionTimeoutError(error) ? 503 : 500;
    return NextResponse.json(
      {
        services: [],
        error: getPrismaFriendlyErrorMessage(error, "No se pudieron cargar los servicios en este momento."),
      },
      { status },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRole("TECHNICIAN");
  if (auth.error || !auth.user || !auth.user.technicianProfile) {
    return auth.error || NextResponse.json({ error: "Perfil de técnico no encontrado" }, { status: 404 });
  }

  const profileId = auth.user.technicianProfile.id;

  try {
    const body = await request.json().catch(() => null);
    const parsed = upsertTechnicianServiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.flatten() }, { status: 400 });
    }

    const { categoryId, title, description, basePrice, isActive } = parsed.data;

    // Check if category exists
    const category = await prisma.serviceCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }

    // Check if service with same category and title already exists for this technician
    const existing = await prisma.technicianService.findFirst({
      where: {
        technicianId: profileId,
        categoryId,
        title: {
          equals: title,
          mode: "insensitive",
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ya tienes un servicio con el mismo título en esta categoría" },
        { status: 400 },
      );
    }

    const service = await prisma.technicianService.create({
      data: {
        technicianId: profileId,
        categoryId,
        title,
        description,
        basePrice,
        isActive,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({ service });
  } catch (error) {
    const status = isPrismaConnectionTimeoutError(error) ? 503 : 500;
    return NextResponse.json(
      {
        error: getPrismaFriendlyErrorMessage(error, "No se pudo guardar el servicio en este momento."),
      },
      { status },
    );
  }
}
