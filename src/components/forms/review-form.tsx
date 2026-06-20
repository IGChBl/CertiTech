"use client";

import { useState } from "react";
import { Star, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const LABELS = ["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"];

interface ReviewFormProps {
  serviceRequestId: string;
  technicianProfileId: string;
  technicianName: string;
}

export function ReviewForm({ serviceRequestId, technicianProfileId, technicianName }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { setError("Seleccioná una calificación."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceRequestId,
          technicianProfileId,
          rating,
          comment: comment.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al enviar la valoración.");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
        ¡Gracias por tu valoración! Ayuda a otros clientes a elegir mejor.
      </div>
    );
  }

  const active = hovered || rating;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm text-slate-600">
        ¿Cómo calificás el trabajo de <strong className="text-slate-800">{technicianName}</strong>?
      </p>

      {/* Interactive star selector */}
      <div className="flex items-center gap-0.5" onMouseLeave={() => setHovered(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHovered(n)}
            className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
            aria-label={`${n} estrellas`}
          >
            <Star
              className={`h-7 w-7 transition-colors duration-100 ${
                n <= active ? "fill-amber-400 text-amber-400" : "text-slate-300"
              }`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-sm font-medium text-slate-600">{LABELS[rating]}</span>
        )}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Contá tu experiencia (opcional)..."
        maxLength={900}
        rows={3}
        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-[var(--brand-teal)] focus:ring-2 focus:ring-[var(--brand-teal-ring)]"
      />

      {error && <p className="text-xs text-rose-600">{error}</p>}

      <Button type="submit" disabled={submitting || rating === 0} className="h-9 px-5 text-sm">
        {submitting ? "Enviando..." : "Publicar valoración"}
      </Button>
    </form>
  );
}
