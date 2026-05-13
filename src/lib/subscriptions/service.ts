import type { Prisma, SubscriptionPlan, SubscriptionStatus, TechnicianVerificationStatus, UserStatus } from "@prisma/client";

const PAID_PLANS = new Set<SubscriptionPlan>(["MONTHLY", "YEARLY"]);

type SubscriptionSnapshot = {
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  subscriptionEndDate: Date | null;
  policeRecordUrl?: string | null;
};

type VisibilitySnapshot = SubscriptionSnapshot & {
  verification: TechnicianVerificationStatus;
  userStatus: UserStatus;
  isEmailVerified: boolean;
};

export const POLICE_RECORD_REQUIRED_MESSAGE =
  "Debes subir tu récord policial para continuar con el proceso de verificación.";

export function isPaidPlan(plan: SubscriptionPlan) {
  return PAID_PLANS.has(plan);
}

export function isSubscriptionDateExpired(endDate: Date | null | undefined, now = new Date()) {
  if (!endDate) return false;
  return endDate.getTime() < now.getTime();
}

export function getSubscriptionDaysRemaining(endDate: Date | null | undefined, now = new Date()) {
  if (!endDate) return null;
  const diffMs = endDate.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function hasActivePaidSubscription(snapshot: SubscriptionSnapshot, now = new Date()) {
  if (!isPaidPlan(snapshot.subscriptionPlan)) return false;
  if (snapshot.subscriptionStatus !== "ACTIVE") return false;
  if (isSubscriptionDateExpired(snapshot.subscriptionEndDate, now)) return false;
  return true;
}

export function hasTechnicianPoliceRecord(policeRecordUrl: string | null | undefined) {
  return typeof policeRecordUrl === "string" && policeRecordUrl.trim().length > 0;
}

export function canTechnicianReceiveNewLeads(snapshot: SubscriptionSnapshot, now = new Date()) {
  if (!hasTechnicianPoliceRecord(snapshot.policeRecordUrl)) return false;
  return hasActivePaidSubscription(snapshot, now);
}

export function isTechnicianPubliclyVisible(snapshot: VisibilitySnapshot, now = new Date()) {
  if (snapshot.userStatus !== "ACTIVE") return false;
  if (!snapshot.isEmailVerified) return false;
  if (snapshot.verification !== "VERIFIED") return false;
  if (!hasTechnicianPoliceRecord(snapshot.policeRecordUrl)) return false;
  return hasActivePaidSubscription(snapshot, now);
}

export function buildPublicTechnicianWhere(now = new Date()): Prisma.TechnicianProfileWhereInput {
  return {
    user: { status: "ACTIVE", isEmailVerified: true },
    verification: "VERIFIED",
    NOT: [{ policeRecordUrl: null }, { policeRecordUrl: "" }],
    subscriptionStatus: "ACTIVE",
    subscriptionPlan: { in: ["MONTHLY", "YEARLY"] },
    AND: [{ OR: [{ subscriptionEndDate: null }, { subscriptionEndDate: { gte: now } }] }],
  };
}

export function getTechnicianSubscriptionRestrictionMessage(snapshot: SubscriptionSnapshot, now = new Date()) {
  if (!hasTechnicianPoliceRecord(snapshot.policeRecordUrl)) {
    return POLICE_RECORD_REQUIRED_MESSAGE;
  }

  if (snapshot.subscriptionPlan === "FREE") {
    return "Activa un plan mensual o anual para aparecer en búsquedas y recibir solicitudes en CertiTech.";
  }

  if (snapshot.subscriptionStatus === "PENDING_PAYMENT") {
    return "Tu suscripción está pendiente de pago. Completa la renovación para reactivar tu visibilidad.";
  }

  if (snapshot.subscriptionStatus === "CANCELLED") {
    return "Tu suscripción fue cancelada. Renueva para volver a recibir contactos.";
  }

  if (snapshot.subscriptionStatus === "EXPIRED" || isSubscriptionDateExpired(snapshot.subscriptionEndDate, now)) {
    return "Tu suscripción expiró. Renueva para recuperar visibilidad y nuevos contactos.";
  }

  return "Tu suscripción no permite recibir nuevos contactos en este momento.";
}
