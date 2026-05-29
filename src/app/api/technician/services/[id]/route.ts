import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { upsertTechnicianServiceSchema } from "@/lib/validations/technician-service";
import { getPrismaFriendlyErrorMessage, isPrismaConnectionTimeoutError } from "@/lib/prisma-errors";

type Context = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: Context) {
  const auth = await requireRole("TECHNICIAN");
  if (auth.error || !auth.user || !auth.user.technicianProfile) {
    return auth.error || NextResponse.json({ error: "Perfil de técnico no encontrado" }, { status: 404 });
  }

  const { id } = await context.params;
  const profileId = auth.user.technicianProfile.id;

  try {
    const service = await prisma.technicianService.findUnique({
      where: { id },
    });

    if (!service) {
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
    }

    if (service.technicianId !== profileId) {
      return NextResponse.json({ error: "No autorizado para editar este servicio" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parsed = upsertTechnicianServiceSchema.partial().safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.flatten() }, { status: 400 });
    }

    const { categoryId, title, description, basePrice, isActive } = parsed.data;

    // Check unique constraint if title or category is updated
    if (title || categoryId) {
      const nextTitle = title ?? service.title;
      const nextCategoryId = categoryId ?? service.categoryId;

      const duplicate = await prisma.technicianService.findFirst({
        where: {
          id: { not: id },
          technicianId: profileId,
          categoryId: nextCategoryId,
          title: {
            equals: nextTitle,
            mode: "insensitive",
          },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "Ya tienes otro servicio con el mismo título en esta categoría" },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.technicianService.update({
      where: { id },
      data: {
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

    return NextResponse.json({ service: updated });
  } catch (error) {
    const status = isPrismaConnectionTimeoutError(error) ? 503 : 500;
    return NextResponse.json(
      {
        error: getPrismaFriendlyErrorMessage(error, "No se pudo actualizar el servicio en este momento."),
      },
      { status },
    );
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  const auth = await requireRole("TECHNICIAN");
  if (auth.error || !auth.user || !auth.user.technicianProfile) {
    return auth.error || NextResponse.json({ error: "Perfil de técnico no encontrado" }, { status: 404 });
  }

  const { id } = await context.params;
  const profileId = auth.user.technicianProfile.id;

  try {
    const service = await prisma.technicianService.findUnique({
      where: { id },
    });

    if (!service) {
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
    }

    if (service.technicianId !== profileId) {
      return NextResponse.json({ error: "No autorizado para eliminar este servicio" }, { status: 403 });
    }

    await prisma.technicianService.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Servicio eliminado correctamente" });
  } catch (error) {
    const status = isPrismaConnectionTimeoutError(error) ? 503 : 500;
    return NextResponse.json(
      {
        error: getPrismaFriendlyErrorMessage(error, "No se pudo eliminar el servicio en este momento."),
      },
      { status },
    );
  }
}
