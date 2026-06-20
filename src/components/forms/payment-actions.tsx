"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, RotateCcw } from "lucide-react";

export function PaymentActions({
  paymentId,
  amount,
  requestStatus,
}: {
  paymentId: string;
  amount: number;
  requestStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"release" | "refund" | null>(null);
  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const canConfirm = requestStatus === "COMPLETED" || requestStatus === "IN_PROGRESS" || requestStatus === "ACCEPTED";
  const canRefund = requestStatus !== "CANCELED" && requestStatus !== "COMPLETED";

  async function handleRelease() {
    setLoading("release");
    setError(null);
    const res = await fetch(`/api/payments/${paymentId}/release`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "No se pudo liberar el pago.");
      setLoading(null);
      return;
    }
    router.refresh();
    setLoading(null);
  }

  async function handleRefund() {
    if (!refundReason.trim()) {
      setError("Ingresa el motivo del reembolso.");
      return;
    }
    setLoading("refund");
    setError(null);
    const res = await fetch(`/api/payments/${paymentId}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: refundReason }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "No se pudo procesar el reembolso.");
      setLoading(null);
      return;
    }
    router.refresh();
    setLoading(null);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Acciones de pago — C$ {amount.toLocaleString()} retenidos</p>

      <div className="flex flex-col sm:flex-row gap-2">
        {canConfirm && (
          <Button
            onClick={handleRelease}
            disabled={loading !== null}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <CheckCircle className="h-4 w-4" />
            {loading === "release" ? "Procesando..." : "Confirmar servicio recibido"}
          </Button>
        )}
        {canRefund && (
          <Button
            variant="secondary"
            onClick={() => setShowRefundForm(!showRefundForm)}
            disabled={loading !== null}
            className="flex items-center gap-2 text-rose-600 border-rose-200 hover:bg-rose-50"
          >
            <RotateCcw className="h-4 w-4" />
            Solicitar reembolso
          </Button>
        )}
      </div>

      {showRefundForm && (
        <div className="space-y-2 pt-1">
          <textarea
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 resize-none"
            rows={3}
            placeholder="Motivo del reembolso (ej: el técnico no llegó)"
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
          />
          <Button
            onClick={handleRefund}
            disabled={loading !== null}
            className="bg-rose-600 hover:bg-rose-700 text-white text-sm"
          >
            {loading === "refund" ? "Procesando..." : "Confirmar reembolso"}
          </Button>
        </div>
      )}

      {error && <p className="text-xs text-rose-600">{error}</p>}

      <p className="text-xs text-slate-400">
        Al confirmar el servicio, el pago se libera al técnico. El reembolso cancela la solicitud.
      </p>
    </div>
  );
}
