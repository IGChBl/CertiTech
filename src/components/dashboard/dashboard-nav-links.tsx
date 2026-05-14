"use client";

import Link from "next/link";
import { useUnreadMessagesCount } from "@/lib/chat/unread-count-store";

type DashboardRole = "CLIENT" | "TECHNICIAN" | "ADMIN";

type DashboardLink = {
  href: string;
  label: string;
};

function inferRoleFromLinks(links: DashboardLink[]): DashboardRole {
  const firstHref = links[0]?.href ?? "";

  if (firstHref.startsWith("/dashboard/cliente")) {
    return "CLIENT";
  }

  if (firstHref.startsWith("/dashboard/tecnico")) {
    return "TECHNICIAN";
  }

  return "ADMIN";
}

function formatUnreadCount(unreadCount: number) {
  if (unreadCount > 9) {
    return "9+";
  }

  return String(unreadCount);
}

export function DashboardNavLinks({
  links,
  role,
}: {
  links: DashboardLink[];
  role?: DashboardRole;
}) {
  const resolvedRole = role ?? inferRoleFromLinks(links);
  const { unreadCount } = useUnreadMessagesCount(resolvedRole);

  return (
    <>
      {links.map((link) => {
        const isChatsLink = link.href.endsWith("/chats");
        const showUnreadBadge =
          isChatsLink && (resolvedRole === "CLIENT" || resolvedRole === "TECHNICIAN") && unreadCount > 0;

        return (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <span className="inline-flex items-center gap-2">
              <span>{link.label}</span>
              {showUnreadBadge ? (
                <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                  {formatUnreadCount(unreadCount)}
                </span>
              ) : null}
            </span>
          </Link>
        );
      })}
    </>
  );
}
