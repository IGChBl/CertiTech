"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const LeafletMapViewer = dynamic(
  () => import("./leaflet-map-viewer"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] w-full rounded-xl border border-slate-200 bg-slate-100 flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm text-slate-500 font-medium">Cargando mapa de ubicación...</p>
      </div>
    ),
  }
);

interface LeafletMapViewerWrapperProps {
  lat: number;
  lng: number;
  displayName: string;
  businessName?: string | null;
}

export function LeafletMapViewerWrapper(props: LeafletMapViewerWrapperProps) {
  return <LeafletMapViewer {...props} />;
}
