"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard } from "lucide-react";

export type SimulatedPayment = {
  id?: string;
  status: string;
};

function formatCardNumber(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

// Demo-only simulated reference. Stands in for a gateway token; carries no card data.
function buildSimulatedReference() {
  return `SIM-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

/**
 * Reusable simulated card-entry form. Renders on the /pago page and inside the
 * in-chat payment modal. All card validation is local; raw PAN/CVV/expiry stay
 * in component state and are NEVER sent to the backend — only the cardholder
 * name, last four digits, and a simulated reference are posted.
 *
 * When `onSuccess` is provided it is called with the created payment (modal flow);
 * otherwise the form falls back to the legacy /pago redirect (page flow).
 */
export function PaymentForm({
  serviceRequestId,
  amount,
  onSuccess,
  onCancel,
}: {
  serviceRequestId: string;
  amount: number;
  onSuccess?: (payment: SimulatedPayment) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  function validateLocally(): string | null {
    if (cardHolder.trim().length < 3) return "Ingresa el nombre del titular.";
    const digits = cardNumber.replace(/\D/g, "");
    if (digits.length !== 16) return "El número de tarjeta debe tener 16 dígitos.";
    const expMatch = expiry.match(/^(\d{2})\/(\d{2})$/);
    if (!expMatch) return "Vencimiento inválido (MM/AA).";
    const month = Number(expMatch[1]);
    if (month < 1 || month > 12) return "Mes de vencimiento inválido.";
    if (!/^\d{3}$/.test(cvv)) return "CVV inválido.";
    return null;
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const validationError = validateLocally();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    // Only sanitized, non-sensitive simulation data leaves the browser.
    const cardLastFour = cardNumber.replace(/\D/g, "").slice(-4);

    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceRequestId,
        cardHolder: cardHolder.trim(),
        cardLastFour,
        simulatedReference: buildSimulatedReference(),
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "No se pudo procesar el pago. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    if (onSuccess) {
      onSuccess(data.payment as SimulatedPayment);
      return;
    }

    router.push("/dashboard/cliente/solicitudes?pago=ok");
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="flex items-center gap-2 mb-2">
        <CreditCard className="h-5 w-5 text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-700">Datos de la tarjeta</h2>
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700">Nombre del titular</label>
        <Input
          name="cardHolder"
          required
          placeholder="Como aparece en la tarjeta"
          autoComplete="cc-name"
          value={cardHolder}
          onChange={(e) => setCardHolder(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700">Número de tarjeta</label>
        <Input
          name="cardNumber"
          required
          placeholder="0000 0000 0000 0000"
          autoComplete="cc-number"
          inputMode="numeric"
          value={cardNumber}
          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
          maxLength={19}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">Vencimiento</label>
          <Input
            name="expiry"
            required
            placeholder="MM/AA"
            inputMode="numeric"
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            maxLength={5}
            autoComplete="cc-exp"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-700">CVV</label>
          <Input
            name="cvv"
            required
            placeholder="123"
            inputMode="numeric"
            maxLength={3}
            autoComplete="cc-csc"
            value={cvv}
            onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))}
          />
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      <div className="flex gap-3">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={loading} className="flex-1">
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={loading} className="flex-1 text-base py-6">
          {loading ? "Procesando..." : `Procesar pago C$ ${amount.toLocaleString()}`}
        </Button>
      </div>

      <p className="text-center text-xs text-slate-400">
        Pago simulado — no se procesará dinero real. El pago quedará retenido hasta que confirmes la recepción del servicio.
      </p>
    </form>
  );
}
