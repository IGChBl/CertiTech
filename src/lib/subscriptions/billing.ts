import type { SubscriptionPlan } from "@prisma/client";

export type BillingCycle = "monthly" | "yearly";

export type PlanCatalogItem = {
  plan: SubscriptionPlan;
  label: string;
  priceUsd: number;
  cycle: BillingCycle | null;
  badge?: string;
  description: string;
  benefits: string[];
};

export const PLAN_CATALOG: Record<SubscriptionPlan, PlanCatalogItem> = {
  FREE: {
    plan: "FREE",
    label: "Plan Free",
    priceUsd: 0,
    cycle: null,
    description: "Completa tu perfil y prepara tu cuenta para activar visibilidad profesional.",
    benefits: [
      "Registro y configuración de perfil técnico",
      "Carga de información y evidencias",
      "Sin visibilidad pública ni recepción de solicitudes",
    ],
  },
  MONTHLY: {
    plan: "MONTHLY",
    label: "Plan Mensual",
    priceUsd: 10,
    cycle: "monthly",
    badge: "Popular",
    description: "Ideal para técnicos que quieren comenzar a captar clientes de inmediato.",
    benefits: [
      "Apareces en búsquedas públicas",
      "Recibes solicitudes y nuevos chats",
      "Insignia premium de técnico suscrito",
    ],
  },
  YEARLY: {
    plan: "YEARLY",
    label: "Plan Anual",
    priceUsd: 100,
    cycle: "yearly",
    badge: "Mejor valor",
    description: "Mayor visibilidad anual con mejor costo total y prioridad en listados.",
    benefits: [
      "Todos los beneficios del plan mensual",
      "Mejor costo anual (2 meses de ahorro)",
      "Prioridad superior en resultados destacados",
    ],
  },
};

export function calculateSubscriptionEndDate(plan: SubscriptionPlan, startDate: Date) {
  if (plan === "FREE") return null;

  const next = new Date(startDate);
  if (plan === "MONTHLY") {
    next.setMonth(next.getMonth() + 1);
    return next;
  }

  next.setFullYear(next.getFullYear() + 1);
  return next;
}
