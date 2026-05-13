"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getVerificationLabel } from "@/lib/verification-ui";

type VerificationActionsProps = {
  targetType: "CLIENT" | "TECHNICIAN";
  profileId: string;
  currentStatus: string;
  allowedStatuses: string[];
  initialReason?: string | null;
  initialNote?: string | null;
};

export function AdminVerificationActions({
  targetType,
  profileId,
  currentStatus,
  allowedStatuses,
  initialReason,
  initialNote,
}: VerificationActionsProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [reason, setReason] = useState(initialReason ?? "");
  const [note, setNote] = useState(initialNote ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    if (status === "REJECTED" && !reason.trim()) {
      setError("Debes indicar un motivo de rechazo.");
      setSaving(false);
      return;
    }

    const response = await fetch("/api/admin/verifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetType,
        profileId,
        status,
        reason: reason.trim() || undefined,
        note: note.trim() || undefined,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "No se pudo actualizar la verificación.");
      setSaving(false);
      return;
    }

    setMessage("Estado actualizado correctamente.");
    setSaving(false);
    router.refresh();
  }

  return (
    <form className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3" onSubmit={onSubmit}>
      <select
        value={status}
        onChange={(event) => setStatus(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
      >
        {allowedStatuses.map((item) => (
          <option key={`${targetType}-${profileId}-${item}`} value={item}>
            {getVerificationLabel(item)}
          </option>
        ))}
      </select>

      <Input
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Motivo de rechazo (requerido al rechazar)"
      />

      <Textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
        placeholder="Nota interna o comentario para el usuario (opcional)"
      />

      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}
      {message ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{message}</p> : null}

      <Button type="submit" disabled={saving} className="w-full">
        {saving ? "Guardando..." : "Guardar estado"}
      </Button>
    </form>
  );
}
