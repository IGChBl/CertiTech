"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function FavoriteButton({ technicianProfileId }: { technicianProfileId: string }) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function toggleFavorite() {
    setLoading(true);
    const response = await fetch("/api/favorites", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ technicianProfileId }),
    });

    if (response.ok) {
      const data = await response.json();
      setSaved(Boolean(data.isFavorite));
    }

    setLoading(false);
  }

  return (
    <Button type="button" variant={saved ? "secondary" : "primary"} onClick={toggleFavorite} disabled={loading}>
      {loading ? "Guardando..." : saved ? "Guardado" : "Guardar favorito"}
    </Button>
  );
}
