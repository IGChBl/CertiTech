import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { upsertCategorySchema } from "@/lib/validations/category";
import { slugify } from "@/lib/utils";

export async function GET() {
  const categories = await prisma.serviceCategory.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ categories });
}

export async function POST(request: NextRequest) {
  const auth = await requireRole("ADMIN");
  if (auth.error) return auth.error;

  const body = await request.json().catch(() => null);

  if (body?.slug) {
    body.slug = slugify(body.slug);
  } else if (body?.name) {
    body.slug = slugify(body.name);
  }

  const parsed = upsertCategorySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.flatten() }, { status: 400 });
  }

  const category = await prisma.serviceCategory.upsert({
    where: { slug: parsed.data.slug },
    update: {
      name: parsed.data.name,
      icon: parsed.data.icon,
      description: parsed.data.description,
      isActive: parsed.data.isActive ?? true,
    },
    create: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      icon: parsed.data.icon,
      description: parsed.data.description,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return NextResponse.json({ category });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireRole("ADMIN");
  if (auth.error) return auth.error;

  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Id requerido" }, { status: 400 });
  }

  await prisma.serviceCategory.delete({ where: { id } });

  return NextResponse.json({ message: "Categoría eliminada" });
}
