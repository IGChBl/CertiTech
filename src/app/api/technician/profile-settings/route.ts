import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const updatePricesSchema = z
  .object({
    referencePriceMin: z.number().int().positive("El precio mínimo debe ser mayor a 0.").optional().nullable(),
    referencePriceMax: z.number().int().positive("El precio máximo debe ser mayor a 0.").optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (
      value.referencePriceMin !== undefined &&
      value.referencePriceMin !== null &&
      value.referencePriceMax !== undefined &&
      value.referencePriceMax !== null &&
      value.referencePriceMax < value.referencePriceMin
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["referencePriceMax"],
        message: "El precio máximo no puede ser menor que el precio mínimo.",
      });
    }
  });

export async function PATCH(request: NextRequest) {
  const auth = await requireRole("TECHNICIAN");
  if (auth.error || !auth.user) return auth.error;

  const body = await request.json().catch(() => null);
  const normalized = {
    referencePriceMin:
      body?.referencePriceMin === "" || body?.referencePriceMin === null || body?.referencePriceMin === undefined
        ? null
        : Number(body.referencePriceMin),
    referencePriceMax:
      body?.referencePriceMax === "" || body?.referencePriceMax === null || body?.referencePriceMax === undefined
        ? null
        : Number(body.referencePriceMax),
  };

  const parsed = updatePricesSchema.safeParse(normalized);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const updated = await prisma.technicianProfile.update({
    where: { userId: auth.user.id },
    data: {
      referencePriceMin: parsed.data.referencePriceMin ?? null,
      referencePriceMax: parsed.data.referencePriceMax ?? null,
    },
    select: {
      referencePriceMin: true,
      referencePriceMax: true,
    },
  });

  return NextResponse.json({
    message: "Precios referenciales actualizados.",
    profile: updated,
  });
}

