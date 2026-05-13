"use client";

import { useState } from "react";
import type { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PLAN_CATALOG } from "@/lib/subscriptions/billing";
import { getSubscriptionPlanBadgeVariant, getSubscriptionPlanLabel } from "@/lib/subscriptions/ui";

type RenewalProps = {
  currentPlan: SubscriptionPlan;
  currentStatus: SubscriptionStatus;
  defaultAutoRenew: boolean;
  requiresPoliceRecord: boolean;
};

export function TechnicianSubscriptionRenewal({
  currentPlan,
  currentStatus,
  defaultAutoRenew,
  requiresPoliceRecord,
}: RenewalProps) {
  const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlan | null>(null);
  const [autoRenew, setAutoRenew] = useState(defaultAutoRenew);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function requestPlan(plan: SubscriptionPlan) {
    if (plan === "FREE") return;
    if (!requiresPoliceRecord) {
      setError("Debes subir tu récord policial para continuar con el proceso de verificación.");
      setMessage(null);
      return;
    }

    setLoadingPlan(plan);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/technician/subscription/renew", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan,
        autoRenew,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error ?? "No se pudo procesar la solicitud de renovación.");
      setLoadingPlan(null);
      return;
    }

    setMessage(data.message ?? "Solicitud registrada correctamente.");
    setLoadingPlan(null);
  }

  return (
    <div className="space-y-4">
      {!requiresPoliceRecord ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Debes subir tu récord policial para continuar con el proceso de verificación.
        </p>
      ) : null}

      <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={autoRenew}
          onChange={(event) => setAutoRenew(event.target.checked)}
          className="h-4 w-4"
        />
        Activar renovación automática cuando integremos pagos reales.
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        {(["MONTHLY", "YEARLY"] as const).map((plan) => {
          const item = PLAN_CATALOG[plan];
          const current = currentPlan === plan;
          const busy = loadingPlan === plan;

          return (
            <Card key={plan} className="space-y-3 border-slate-200">
              <div className="flex items-center justify-between">
                <Badge variant={getSubscriptionPlanBadgeVariant(plan)}>{getSubscriptionPlanLabel(plan)}</Badge>
                {item.badge ? <Badge variant="premium">{item.badge}</Badge> : null}
              </div>
              <p className="text-3xl font-semibold text-slate-900">${item.priceUsd}</p>
              <p className="text-xs text-slate-500">{plan === "MONTHLY" ? "por mes" : "por año"}</p>
              <p className="text-sm text-slate-600">{item.description}</p>
              <ul className="space-y-1 text-sm text-slate-600">
                {item.benefits.map((benefit) => (
                  <li key={`${plan}-${benefit}`}>- {benefit}</li>
                ))}
              </ul>

              <Button type="button" onClick={() => requestPlan(plan)} disabled={busy || !requiresPoliceRecord} className="w-full">
                {busy
                  ? "Enviando..."
                  : current && currentStatus === "ACTIVE"
                    ? "Renovar plan actual"
                    : `Elegir plan ${getSubscriptionPlanLabel(plan).toLowerCase()}`}
              </Button>
            </Card>
          );
        })}
      </div>

      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
    </div>
  );
}
