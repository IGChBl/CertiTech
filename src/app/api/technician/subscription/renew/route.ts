import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { calculateSubscriptionEndDate } from "@/lib/subscriptions/billing";
import { hasTechnicianPoliceRecord, POLICE_RECORD_REQUIRED_MESSAGE } from "@/lib/subscriptions/service";

const renewSchema = z.object({
  plan: z.enum(["MONTHLY", "YEARLY"]),
  autoRenew: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireRole("TECHNICIAN");
  if (auth.error || !auth.user) return auth.error;

  if (!auth.user.isEmailVerified) {
    return NextResponse.json(
      {
        error: "Debes verificar tu correo antes de gestionar una suscripción.",
      },
      { status: 403 },
    );
  }

  if (!auth.user.technicianProfile) {
    return NextResponse.json(
      {
        error: "No se encontró un perfil técnico asociado a tu cuenta.",
      },
      { status: 400 },
    );
  }

  if (!hasTechnicianPoliceRecord(auth.user.technicianProfile.policeRecordUrl)) {
    return NextResponse.json(
      {
        error: POLICE_RECORD_REQUIRED_MESSAGE,
      },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = renewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date();
  const requestedPlan = parsed.data.plan;
  const autoRenew = parsed.data.autoRenew ?? false;
  const provisionalEndDate = calculateSubscriptionEndDate(requestedPlan, now);

  const updated = await prisma.technicianProfile.update({
    where: { userId: auth.user.id },
    data: {
      subscriptionPlan: requestedPlan,
      subscriptionStatus: "PENDING_PAYMENT",
      subscriptionStartDate: now,
      subscriptionEndDate: provisionalEndDate,
      autoRenew,
    },
    select: {
      id: true,
      subscriptionPlan: true,
      subscriptionStatus: true,
      subscriptionStartDate: true,
      subscriptionEndDate: true,
      autoRenew: true,
    },
  });

  await prisma.notification.create({
    data: {
      userId: auth.user.id,
      type: "SYSTEM",
      title: "Solicitud de renovación registrada",
      body: "Tu solicitud fue registrada. Completa el pago para activar la suscripción.",
      link: "/dashboard/tecnico/suscripcion",
      metadata: {
        plan: requestedPlan,
      },
    },
  });

  return NextResponse.json({
    message: "Solicitud enviada. Tu plan queda pendiente de pago hasta confirmar transacción.",
    subscription: updated,
  });
}
