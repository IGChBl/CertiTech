"use client";

import { useEffect, useSyncExternalStore } from "react";

type SupportedRole = "CLIENT" | "TECHNICIAN";
type Role = SupportedRole | "ADMIN" | null | undefined;

type UnreadCountSnapshot = {
  unreadCount: number;
};

// Cadencia base del sondeo en segundo plano. Los chats abiertos se refrescan al
// instante vía refreshUnreadMessagesCount(), por lo que el sondeo solo cubre la
// señal pasiva del badge: 60s es suficiente y reduce la carga sobre Supabase.
const POLLING_INTERVAL_MS = 60_000;

// Backoff exponencial ante fallos consecutivos (DbBusy/401/red) para no martillar
// la BD justo cuando está saturada. Se reinicia en cuanto una petición tiene éxito.
const MAX_BACKOFF_INTERVAL_MS = 5 * 60_000;

let snapshot: UnreadCountSnapshot = {
  unreadCount: 0,
};

let activeSubscribers = 0;
let timeoutRef: ReturnType<typeof setTimeout> | null = null;
let requestInFlight = false;
let consecutiveFailures = 0;
let visibilityListenerAttached = false;

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function setSnapshot(next: Partial<UnreadCountSnapshot>) {
  snapshot = { ...snapshot, ...next };
  emitChange();
}

async function fetchUnreadCount(): Promise<boolean> {
  if (requestInFlight) {
    return true;
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
      return false;
    }

    const data = (await response.json().catch(() => null)) as { unreadCount?: number } | null;
    const unreadCount = typeof data?.unreadCount === "number" ? Math.max(0, data.unreadCount) : 0;
    setSnapshot({ unreadCount });
    return true;
  } catch {
    setSnapshot({ unreadCount: 0 });
    return false;
  } finally {
    requestInFlight = false;
  }
}

function isHidden() {
  return typeof document !== "undefined" && document.visibilityState === "hidden";
}

function nextDelayMs() {
  if (consecutiveFailures === 0) {
    return POLLING_INTERVAL_MS;
  }

  const backoff = POLLING_INTERVAL_MS * 2 ** consecutiveFailures;
  return Math.min(backoff, MAX_BACKOFF_INTERVAL_MS);
}

// Bucle auto-reprogramado: nos permite variar el siguiente retraso según el
// backoff y saltar la petición de red cuando la pestaña está en segundo plano.
function scheduleNext() {
  if (timeoutRef) {
    clearTimeout(timeoutRef);
  }

  timeoutRef = setTimeout(runPollTick, nextDelayMs());
}

async function runPollTick() {
  // No consumimos red en pestañas ocultas; se reanuda al volver a ser visibles.
  if (!isHidden()) {
    const ok = await fetchUnreadCount();
    consecutiveFailures = ok ? 0 : consecutiveFailures + 1;
  }

  if (timeoutRef) {
    scheduleNext();
  }
}

function handleVisibilityChange() {
  if (isHidden()) {
    return;
  }

  // Al volver al primer plano: reiniciamos el backoff, refrescamos de inmediato
  // y reprogramamos la cadencia normal.
  consecutiveFailures = 0;
  void fetchUnreadCount();
  if (timeoutRef) {
    scheduleNext();
  }
}

function startPolling() {
  if (timeoutRef) {
    return;
  }

  if (typeof document !== "undefined" && !visibilityListenerAttached) {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    visibilityListenerAttached = true;
  }

  consecutiveFailures = 0;
  void fetchUnreadCount();

  // Marcamos el bucle como activo antes de programar el primer tick.
  timeoutRef = setTimeout(runPollTick, nextDelayMs());
}

function stopPolling() {
  if (timeoutRef) {
    clearTimeout(timeoutRef);
    timeoutRef = null;
  }

  if (typeof document !== "undefined" && visibilityListenerAttached) {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    visibilityListenerAttached = false;
  }

  consecutiveFailures = 0;
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
