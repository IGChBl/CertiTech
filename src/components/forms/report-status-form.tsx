"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ReportStatusForm({ reportId, currentStatus }: { reportId: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);

  async function onChange(nextStatus: string) {
    setSaving(true);
    const response = await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: reportId, status: nextStatus }),
    });

    if (response.ok) {
      setStatus(nextStatus);
    }

    setSaving(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {(["OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"] as const).map((item) => (
        <Button
          key={item}
          type="button"
          variant={status === item ? "primary" : "secondary"}
          className="px-2 py-1 text-xs"
          onClick={() => onChange(item)}
          disabled={saving}
        >
          {item}
        </Button>
      ))}
    </div>
  );
}
