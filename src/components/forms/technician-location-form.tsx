"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from "lucide-react";

// Load the selector map dynamically to avoid Next.js Server-Side Rendering (SSR) issues
const LeafletMapSelector = dynamic(
  () => import("@/components/maps/leaflet-map-selector"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[350px] w-full rounded-xl border border-slate-200 bg-slate-100 flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500 font-medium">Cargando mapa interactivo...</p>
      </div>
    ),
  }
);

interface TechnicianLocationFormProps {
  initialLat?: number | null;
  initialLng?: number | null;
}

export function TechnicianLocationForm({
  initialLat,
  initialLng,
}: TechnicianLocationFormProps) {
  const router = useRouter();
  const [lat, setLat] = useState<number | null>(initialLat ?? null);
  const [lng, setLng] = useState<number | null>(initialLng ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleLocationChange = (newLat: number | null, newLng: number | null) => {
    setLat(newLat);
    setLng(newLng);
    setError(null);
    setMessage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/technician/profile-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error ?? "Ocurrió un error al actualizar la ubicación.");
      }

      setMessage(data.message ?? "Ubicación del taller actualizada correctamente.");
      router.refresh();
    } catch (err: any) {
      setError(err.message ?? "Ocurrió un error al guardar.");
    } finally {
      setSaving(false);
    }
  };

  // Check if coordinates have actually changed
  const isChanged = lat !== initialLat || lng !== initialLng;

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
          <MapPin className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Ubicación del Taller (Managua)</h2>
          <p className="text-xs text-slate-500">
            Ubica tu taller físico en el mapa para que los clientes puedan ver dónde brindas tus servicios.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <LeafletMapSelector
          initialLat={lat}
          initialLng={lng}
          onChange={handleLocationChange}
        />

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          {error && (
            <p className="text-sm font-semibold text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg mr-auto">
              {error}
            </p>
          )}
          {message && (
            <p className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg mr-auto">
              {message}
            </p>
          )}
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || !isChanged}
          >
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Guardando ubicación...
              </>
            ) : (
              "Guardar Ubicación"
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
