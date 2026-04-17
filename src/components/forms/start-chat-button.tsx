"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function StartChatButton({ recipientUserId }: { recipientUserId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function startChat() {
    setLoading(true);
    const response = await fetch("/api/chats/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientUserId }),
    });

    if (response.ok) {
      router.push("/dashboard/cliente/chats");
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <Button type="button" onClick={startChat} disabled={loading}>
      {loading ? "Abriendo chat..." : "Contactar"}
    </Button>
  );
}
