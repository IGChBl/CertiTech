import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { calculateSubscriptionEndDate } from "@/lib/subscriptions/billing";
import { hasTechnicianPoliceRecord, POLICE_RECORD_REQUIRED_MESSAGE } from "@/lib/subscriptions/service";

const updateSchema = z
  .object({
    profileId: z.string().min(1),
    plan: z.enum(["FREE", "MONTHLY", "YEARLY"]).optional(),
    status: z.enum(["ACTIVE", "EXPIRED", "CANCELLED", "PENDING_PAYMENT"]).optional(),
    endDate: z.string().optional().nullable(),
    extendDays: z.number().int().min(1).max(3650).optional(),
    autoRenew: z.boolean().optional(),
    featuredUntil: z.string().optional().nullable(),
    featuredDays: z.number().int().min(1).max(365).optional(),
    registerPaymentNow: z.boolean().optional(),
    note: z.string().max(500).optional(),
  })
  .refine(
    (value) =>
      value.plan !== undefined ||
      value.status !== undefined ||
      value.endDate !== undefined ||
      value.extendDays !== undefined ||
      value.autoRenew !== undefined ||
      value.featuredUntil !== undefined ||
      value.featuredDays !== undefined ||
      value.registerPaymentNow !== undefined,
    {
      message: "Debes enviar al menos un cambio de suscripción.",
      path: ["profileId"],
    },
  );

function parseDateInput(value: string | null | undefined) {
  if (value === null) return { value: null as Date | null | undefined, invalid: false };
  if (value === undefined || value.trim() === "") return { value: undefined as Date | null | undefined, invalid: false };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { value: undefined as Date | null | undefined, invalid: true };
  }
  return { value: parsed as Date, invalid: false };
}

export async function GET() {
  const auth = await requireRole("ADMIN");
  if (auth.error || !auth.user) return auth.error;

  const subscriptions = await prisma.technicianProfile.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
          isEmailVerified: true,
          status: true,
        },
      },
    },
    orderBy: [{ featuredUntil: "desc" }, { subscriptionPlan: "desc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json({ subscriptions });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireRole("ADMIN");
  if (auth.error || !auth.user) return auth.error;

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const current = await prisma.technicianProfile.findUnique({
    where: { id: data.profileId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  if (!current) {
    return NextResponse.json({ error: "Perfil técnico no encontrado." }, { status: 404 });
  }

  const now = new Date();
  const plan = data.plan ?? current.subscriptionPlan;
  const status = data.status ?? current.subscriptionStatus;

  if (status === "ACTIVE" && plan !== "FREE" && !hasTechnicianPoliceRecord(current.policeRecordUrl)) {
    return NextResponse.json({ error: POLICE_RECORD_REQUIRED_MESSAGE }, { status: 400 });
  }

  const subscriptionStartDate =
    status === "ACTIVE" && plan !== "FREE"
      ? current.subscriptionStartDate ?? now
      : current.subscriptionStartDate;

  const parsedEndDate = data.endDate !== undefined ? parseDateInput(data.endDate) : { value: current.subscriptionEndDate, invalid: false };
  if (parsedEndDate.invalid) {
    return NextResponse.json({ error: "Fecha de vencimiento inválida." }, { status: 400 });
  }
  let subscriptionEndDate = parsedEndDate.value;

  if (data.extendDays) {
    const base = subscriptionEndDate && subscriptionEndDate.getTime() > now.getTime() ? subscriptionEndDate : now;
    const extended = new Date(base);
    extended.setDate(extended.getDate() + data.extendDays);
    subscriptionEndDate = extended;
  }

  if (status === "ACTIVE" && plan !== "FREE" && !subscriptionEndDate) {
    subscriptionEndDate = calculateSubscriptionEndDate(plan, now);
  }

  const parsedFeaturedUntil =
    data.featuredUntil !== undefined ? parseDateInput(data.featuredUntil) : { value: current.featuredUntil, invalid: false };
  if (parsedFeaturedUntil.invalid) {
    return NextResponse.json({ error: "Fecha de destacado inválida." }, { status: 400 });
  }
  let featuredUntil = parsedFeaturedUntil.value;
  if (data.featuredDays) {
    const baseFeatured = featuredUntil && featuredUntil.getTime() > now.getTime() ? featuredUntil : now;
    const extendedFeatured = new Date(baseFeatured);
    extendedFeatured.setDate(extendedFeatured.getDate() + data.featuredDays);
    featuredUntil = extendedFeatured;
  }

  const updated = await prisma.technicianProfile.update({
    where: { id: current.id },
    data: {
      subscriptionPlan: plan,
      subscriptionStatus: status,
      subscriptionStartDate,
      subscriptionEndDate,
      autoRenew: data.autoRenew ?? current.autoRenew,
      featuredUntil,
      lastPaymentDate: data.registerPaymentNow ? now : current.lastPaymentDate,
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
      targetType: "TECHNICIAN",
      targetId: updated.id,
      details: {
        type: "subscription_update",
        plan,
        status,
        subscriptionEndDate: subscriptionEndDate?.toISOString() ?? null,
        featuredUntil: featuredUntil?.toISOString() ?? null,
        note: data.note ?? null,
      },
    },
  });

  await prisma.notification.create({
    data: {
      userId: updated.user.id,
      type: "SYSTEM",
      title: "Actualización de suscripción",
      body: `Tu plan técnico fue actualizado a ${plan} (${status}).`,
      link: "/dashboard/tecnico/suscripcion",
    },
  });

  return NextResponse.json({
    message: "Suscripción actualizada correctamente.",
    subscription: updated,
  });
}
