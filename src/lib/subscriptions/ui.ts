import type { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import type { BadgeVariant } from "@/components/ui/badge";

export function getSubscriptionPlanLabel(plan: SubscriptionPlan) {
  const labels: Record<SubscriptionPlan, string> = {
    FREE: "Free",
    MONTHLY: "Mensual",
    YEARLY: "Anual",
  };

  return labels[plan];
}

export function getSubscriptionStatusLabel(status: SubscriptionStatus) {
  const labels: Record<SubscriptionStatus, string> = {
    ACTIVE: "Activa",
    EXPIRED: "Expirada",
    CANCELLED: "Cancelada",
    PENDING_PAYMENT: "Pendiente de pago",
  };

  return labels[status];
}

export function getSubscriptionPlanBadgeVariant(plan: SubscriptionPlan): BadgeVariant {
  const variants: Record<SubscriptionPlan, BadgeVariant> = {
    FREE: "neutral",
    MONTHLY: "info",
    YEARLY: "premium",
  };

  return variants[plan];
}

export function getSubscriptionStatusBadgeVariant(status: SubscriptionStatus): BadgeVariant {
  const variants: Record<SubscriptionStatus, BadgeVariant> = {
    ACTIVE: "success",
    EXPIRED: "danger",
    CANCELLED: "neutral",
    PENDING_PAYMENT: "warning",
  };

  return variants[status];
}

