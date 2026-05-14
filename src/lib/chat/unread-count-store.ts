"use client";

import { useEffect, useSyncExternalStore } from "react";

type SupportedRole = "CLIENT" | "TECHNICIAN";
type Role = SupportedRole | "ADMIN" | null | undefined;

type UnreadCountSnapshot = {
  unreadCount: number;
};

const POLLING_INTERVAL_MS = 30_000;

let snapshot: UnreadCountSnapshot = {
  unreadCount: 0,
};

let activeSubscribers = 0;
let intervalRef: ReturnType<typeof setInterval> | null = null;
let requestInFlight = false;

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function setSnapshot(next: Partial<UnreadCountSnapshot>) {
  snapshot = { ...snapshot, ...next };
  emitChange();
}

async function fetchUnreadCount() {
  if (requestInFlight) {
    return;
  }

  requestInFlight = true;

  try {
    const response = await fetch("/api/chats/unread-count", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    });

    if (!response.ok) {
      setSnapshot({ unreadCount: 0 });
      return;
    }

    const data = (await response.json().catch(() => null)) as { unreadCount?: number } | null;
    const unreadCount = typeof data?.unreadCount === "number" ? Math.max(0, data.unreadCount) : 0;
    setSnapshot({ unreadCount });
  } catch {
    setSnapshot({ unreadCount: 0 });
  } finally {
    requestInFlight = false;
  }
}

function startPolling() {
  if (intervalRef) {
    return;
  }

  void fetchUnreadCount();

  intervalRef = setInterval(() => {
    void fetchUnreadCount();
  }, POLLING_INTERVAL_MS);
}

function stopPolling() {
  if (!intervalRef) {
    return;
  }

  clearInterval(intervalRef);
  intervalRef = null;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

function isSupportedRole(role: Role): role is SupportedRole {
  return role === "CLIENT" || role === "TECHNICIAN";
}

export function refreshUnreadMessagesCount() {
  void fetchUnreadCount();
}

export function useUnreadMessagesCount(role: Role) {
  useEffect(() => {
    if (!isSupportedRole(role)) {
      return;
    }

    activeSubscribers += 1;
    startPolling();

    return () => {
      activeSubscribers -= 1;
      if (activeSubscribers <= 0) {
        activeSubscribers = 0;
        stopPolling();
      }
    };
  }, [role]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    unreadCount: isSupportedRole(role) ? value.unreadCount : 0,
  };
}
