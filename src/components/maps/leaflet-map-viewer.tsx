"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

interface LeafletMapViewerProps {
  lat: number;
  lng: number;
  displayName: string;
  businessName?: string | null;
}

export default function LeafletMapViewer({
  lat,
  lng,
  displayName,
  businessName,
}: LeafletMapViewerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Dynamically inject Leaflet CSS stylesheet in head
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    link.crossOrigin = "";
    document.head.appendChild(link);

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 15,
      zoomControl: true,
      scrollWheelZoom: false, // Prevents intercepting page scroll zoom
    });

    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Premium marker icon
    const customIcon = L.divIcon({
      className: "custom-viewer-marker",
      html: `
        <div class="relative flex h-10 w-10 items-center justify-center">
          <div class="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-indigo-500 opacity-60"></div>
          <div class="relative rounded-full h-6 w-6 bg-indigo-600 border-2 border-white shadow-md flex items-center justify-center">
            <div class="h-2 w-2 rounded-full bg-white"></div>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

    // Beautiful custom styled popup
    const popupContent = `
      <div class="p-1 font-sans">
        <h3 class="font-bold text-slate-900 text-sm leading-tight">${displayName}</h3>
        ${businessName ? `<p class="text-xs text-indigo-600 font-semibold mt-0.5">${businessName}</p>` : ""}
        <p class="text-[10px] text-slate-500 font-medium mt-1">Ubicación del taller de servicio</p>
      </div>
    `;

    marker.bindPopup(popupContent).openPopup();

    const timeout = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timeout);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      document.head.removeChild(link);
    };
  }, [lat, lng, displayName, businessName]);

  return (
    <div 
      ref={mapContainerRef} 
      className="h-[300px] w-full rounded-xl border border-slate-200 bg-slate-100 shadow-inner overflow-hidden relative z-0" 
    />
  );
}
