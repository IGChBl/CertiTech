"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";

const DEFAULT_LAT = 12.1364;
const DEFAULT_LNG = -86.2514;

interface LeafletMapSelectorProps {
  initialLat?: number | null;
  initialLng?: number | null;
  onChange: (lat: number | null, lng: number | null) => void;
}

export default function LeafletMapSelector({
  initialLat,
  initialLng,
  onChange,
}: LeafletMapSelectorProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [lat, setLat] = useState<number | null>(initialLat ?? null);
  const [lng, setLng] = useState<number | null>(initialLng ?? null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Dynamically inject Leaflet CSS stylesheet in head
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    link.crossOrigin = "";
    document.head.appendChild(link);

    const startLat = initialLat || DEFAULT_LAT;
    const startLng = initialLng || DEFAULT_LNG;

    const map = L.map(mapContainerRef.current, {
      center: [startLat, startLng],
      zoom: 13,
      zoomControl: true,
    });

    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Premium glowing pulsing marker using pure Tailwind CSS
    const customIcon = L.divIcon({
      className: "custom-pulse-marker",
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

    // Place marker if initial coordinates are present
    if (initialLat && initialLng) {
      const marker = L.marker([initialLat, initialLng], {
        icon: customIcon,
        draggable: true,
      }).addTo(map);
      markerRef.current = marker;

      marker.on("dragend", () => {
        const position = marker.getLatLng();
        setLat(position.lat);
        setLng(position.lng);
        onChange(position.lat, position.lng);
      });
    }

    // Capture click on map to set or move marker
    map.on("click", (e) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      setLat(clickLat);
      setLng(clickLng);
      onChange(clickLat, clickLng);

      if (markerRef.current) {
        markerRef.current.setLatLng([clickLat, clickLng]);
      } else {
        const marker = L.marker([clickLat, clickLng], {
          icon: customIcon,
          draggable: true,
        }).addTo(map);
        markerRef.current = marker;

        marker.on("dragend", () => {
          const position = marker.getLatLng();
          setLat(position.lat);
          setLng(position.lng);
          onChange(position.lat, position.lng);
        });
      }
    });

    // Invalidate size once after a minor delay to make sure rendering matches the viewport
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
  }, []);

  const handleClear = () => {
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
    setLat(null);
    setLng(null);
    onChange(null, null);
  };

  return (
    <div className="space-y-3">
      <div 
        ref={mapContainerRef} 
        className="h-[350px] w-full rounded-xl border border-slate-200 bg-slate-100 shadow-inner overflow-hidden relative z-0" 
      />
      <div className="flex items-center justify-between px-1">
        <div className="text-xs text-slate-500 font-medium">
          {lat && lng ? (
            <p className="flex items-center gap-1.5 text-slate-700">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              Coordenadas: <span className="font-semibold text-slate-900 font-mono">{lat.toFixed(6)}, {lng.toFixed(6)}</span>
            </p>
          ) : (
            <p className="text-amber-600 flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse"></span>
              Haz clic en el mapa para marcar la ubicación de tu taller en Managua.
            </p>
          )}
        </div>
        {lat && lng && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline transition-colors"
          >
            Quitar ubicación
          </button>
        )}
      </div>
    </div>
  );
}
