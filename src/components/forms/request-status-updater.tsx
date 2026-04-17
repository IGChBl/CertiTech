"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const statuses = ["PENDING", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELED"] as const;

export function RequestStatusUpdater({
  requestId,
  currentStatus,
}: {
  requestId: string;
  currentStatus: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);

  async function updateStatus(nextStatus: string) {
    setSaving(true);
    const response = await fetch(`/api/service-requests/${requestId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    if (response.ok) {
      setStatus(nextStatus);
    }

    setSaving(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Estado actual: {status}</span>
      {statuses.map((option) => (
        <Button
          key={option}
          type="button"
          variant={option === status ? "primary" : "secondary"}
          onClick={() => updateStatus(option)}
          disabled={saving}
          className="px-3 py-1.5 text-xs"
        >
          {option}
        </Button>
      ))}
    </div>
  );
}
