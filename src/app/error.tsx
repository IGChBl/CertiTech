"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

const DB_BUSY_MESSAGE =
  "La base de datos está ocupada temporalmente. Intenta nuevamente en unos segundos.";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app][error-boundary]", error);
  }, [error]);

  // En desarrollo el mensaje del error es visible; en producción Next lo
  // reemplaza por uno genérico, así que mostramos un texto neutro de reintento.
  const isBusy = error.message?.includes("ocupada");
  const message = isBusy
    ? DB_BUSY_MESSAGE
    : "No pudimos cargar esta sección en este momento.";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Algo salió mal</h1>
      <p className="max-w-md text-slate-600">{message}</p>
      <Button onClick={() => reset()}>Reintentar</Button>
    </div>
  );
}
