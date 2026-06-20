"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard } from "lucide-react";

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

export function PaymentForm({
  serviceRequestId,
  amount,
}: {
  serviceRequestId: string;
  amount: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);

    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceRequestId,
        cardHolder: String(fd.get("cardHolder") ?? ""),
        cardNumber: (fd.get("cardNumber") as string ?? "").replace(/\s/g, ""),
        expiry: String(fd.get("expiry") ?? ""),
        cvv: String(fd.get("cvv") ?? ""),
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error ?? "No se pudo procesar el pago. Intenta de nuevo.");
      setLoading(false);
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
        <Input name="cardHolder" required placeholder="Como aparece en la tarjeta" autoComplete="cc-name" />
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
          />
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      <Button type="submit" disabled={loading} className="w-full text-base py-6">
        {loading ? "Procesando..." : `Pagar C$ ${amount.toLocaleString()}`}
      </Button>

      <p className="text-center text-xs text-slate-400">
        El pago quedará retenido hasta que confirmes la recepción del servicio.
      </p>
    </form>
  );
}
