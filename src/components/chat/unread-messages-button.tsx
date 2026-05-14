"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useUnreadMessagesCount } from "@/lib/chat/unread-count-store";

type Role = "CLIENT" | "TECHNICIAN" | "ADMIN";

function formatUnreadCount(unreadCount: number) {
  if (unreadCount > 9) {
    return "9+";
  }

  return String(unreadCount);
}

export function UnreadMessagesButton({ role }: { role: Role }) {
  const { unreadCount } = useUnreadMessagesCount(role);

  if (role !== "CLIENT" && role !== "TECHNICIAN") {
    return null;
  }

  const targetHref = role === "CLIENT" ? "/dashboard/cliente/chats" : "/dashboard/tecnico/chats";

  return (
    <Link
      href={targetHref}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
      aria-label={`Mensajes${unreadCount > 0 ? `, ${unreadCount} sin leer` : ""}`}
    >
      <span className="relative inline-flex">
        <MessageCircle className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-2.5 -top-2 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
            {formatUnreadCount(unreadCount)}
          </span>
        ) : null}
      </span>
      <span className="hidden sm:inline">Mensajes</span>
    </Link>
  );
}
