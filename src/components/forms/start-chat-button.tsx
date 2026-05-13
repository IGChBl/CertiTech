"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function StartChatButton({ recipientUserId }: { recipientUserId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startChat() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/chats/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientUserId }),
    });

    if (response.ok) {
      router.push("/dashboard/cliente/chats");
      router.refresh();
    } else {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "No se pudo abrir el chat en este momento.");
    }

    setLoading(false);
  }

  return (
    <div className="space-y-2">
      <Button type="button" onClick={startChat} disabled={loading}>
        {loading ? "Abriendo chat..." : "Contactar"}
      </Button>
      {error ? <p className="max-w-xs text-xs text-rose-700">{error}</p> : null}
    </div>
  );
}
