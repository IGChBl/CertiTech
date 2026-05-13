"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ResendVerificationButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onResend() {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
      });

      const data = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;

      if (!response.ok) {
        setError(data?.error ?? "No se pudo reenviar el correo.");
        return;
      }

      setMessage(data?.message ?? "Correo de verificación reenviado.");
    } catch {
      setError("No se pudo reenviar el correo en este momento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="secondary" onClick={onResend} disabled={loading}>
        {loading ? "Reenviando..." : "Reenviar correo de verificación"}
      </Button>
      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
