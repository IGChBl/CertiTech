"use client";

import { FormEvent, useState } from "react";
import type { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

function toDateInputValue(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

type AdminSubscriptionActionsProps = {
  profileId: string;
  currentPlan: SubscriptionPlan;
  currentStatus: SubscriptionStatus;
  currentEndDate?: Date | null;
  currentFeaturedUntil?: Date | null;
  autoRenew: boolean;
};

export function AdminSubscriptionActions({
  profileId,
  currentPlan,
  currentStatus,
  currentEndDate,
  currentFeaturedUntil,
  autoRenew,
}: AdminSubscriptionActionsProps) {
  const router = useRouter();
  const [plan, setPlan] = useState<SubscriptionPlan>(currentPlan);
  const [status, setStatus] = useState<SubscriptionStatus>(currentStatus);
  const [endDate, setEndDate] = useState(toDateInputValue(currentEndDate));
  const [extendDays, setExtendDays] = useState("");
  const [featuredUntil, setFeaturedUntil] = useState(toDateInputValue(currentFeaturedUntil));
  const [featuredDays, setFeaturedDays] = useState("");
  const [localAutoRenew, setLocalAutoRenew] = useState(autoRenew);
  const [registerPaymentNow, setRegisterPaymentNow] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/admin/subscriptions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId,
        plan,
        status,
        endDate: endDate || null,
        extendDays: extendDays ? Number(extendDays) : undefined,
        featuredUntil: featuredUntil || null,
        featuredDays: featuredDays ? Number(featuredDays) : undefined,
        autoRenew: localAutoRenew,
        registerPaymentNow,
        note: note.trim() || undefined,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(data.error ?? "No se pudo actualizar la suscripción.");
      setSaving(false);
      return;
    }

    setMessage("Suscripción actualizada.");
    setSaving(false);
    router.refresh();
  }

  return (
    <form className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3" onSubmit={onSubmit}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <select
          value={plan}
          onChange={(event) => setPlan(event.target.value as SubscriptionPlan)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
        >
          <option value="FREE">FREE</option>
          <option value="MONTHLY">MONTHLY</option>
          <option value="YEARLY">YEARLY</option>
        </select>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as SubscriptionStatus)}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
          <option value="EXPIRED">EXPIRED</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-medium text-slate-600">Vencimiento</p>
          <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-slate-600">Extender (días)</p>
          <Input
            type="number"
            min={1}
            placeholder="Ej: 30"
            value={extendDays}
            onChange={(event) => setExtendDays(event.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-medium text-slate-600">Destacado hasta</p>
          <Input type="date" value={featuredUntil} onChange={(event) => setFeaturedUntil(event.target.value)} />
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-slate-600">Extender destacado (días)</p>
          <Input
            type="number"
            min={1}
            placeholder="Ej: 7"
            value={featuredDays}
            onChange={(event) => setFeaturedDays(event.target.value)}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-slate-700">
        <input
          type="checkbox"
          checked={localAutoRenew}
          onChange={(event) => setLocalAutoRenew(event.target.checked)}
          className="h-4 w-4"
        />
        Auto renovación
      </label>
      <label className="flex items-center gap-2 text-xs text-slate-700">
        <input
          type="checkbox"
          checked={registerPaymentNow}
          onChange={(event) => setRegisterPaymentNow(event.target.checked)}
          className="h-4 w-4"
        />
        Registrar pago ahora
      </label>

      <Textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
        placeholder="Nota administrativa (opcional)"
      />

      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{message}</p> : null}

      <Button type="submit" disabled={saving} className="w-full">
        {saving ? "Guardando..." : "Guardar suscripción"}
      </Button>
    </form>
  );
}
