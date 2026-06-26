"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { refreshUnreadMessagesCount } from "@/lib/chat/unread-count-store";
import {
  HandCoins, X, Check, Clock, CheckCircle, XCircle,
  Paperclip, FileText, Download, CreditCard, AlertCircle,
  RefreshCw, Ban,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatItem = {
  id: string;
  participants: Array<{ userId: string; name: string; avatarUrl?: string | null }>;
  latestMessage?: { content?: string } | null;
};

type OfferPayload = {
  type: "offer";
  price: number;
  status: "pending" | "accepted" | "rejected";
  paidAt?: string;
};

type DocumentPayload = {
  type: "document";
  url: string;
  name: string;
  size: number;
  mimeType: string;
};

type OfferStatus = "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELED" | "SUPERSEDED";

// Persisted offer (DB source of truth) attached to its anchor message.
type PersistentOffer = {
  id: string;
  status: OfferStatus;
  amount: number;
  currency: string;
  description: string | null;
  clientId: string;
  technicianProfileId: string;
  messageId: string | null;
};

type ChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string; avatarUrl?: string | null };
  offer?: PersistentOffer | null;
};

// ─── Parsers ──────────────────────────────────────────────────────────────────

function tryParseOffer(content: string): OfferPayload | null {
  if (!content.startsWith("{")) return null;
  try {
    const p = JSON.parse(content);
    if (p?.type === "offer" && typeof p.price === "number") return p as OfferPayload;
  } catch { /* noop */ }
  return null;
}

function tryParseDocument(content: string): DocumentPayload | null {
  if (!content.startsWith("{")) return null;
  try {
    const p = JSON.parse(content);
    if (p?.type === "document" && p.url && p.name) return p as DocumentPayload;
  } catch { /* noop */ }
  return null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Document card ────────────────────────────────────────────────────────────

function DocumentCard({ doc, isMine }: { doc: DocumentPayload; isMine: boolean }) {
  const isPdf = doc.mimeType === "application/pdf";
  const isImage = doc.mimeType.startsWith("image/");

  return (
    <div className={`rounded-2xl border px-4 py-3 w-64 shadow-sm ${
      isMine ? "border-slate-700 bg-slate-800 text-white" : "border-slate-200 bg-white text-slate-900"
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <FileText className={`h-4 w-4 shrink-0 ${isMine ? "text-slate-300" : "text-slate-500"}`} />
        <span className={`text-xs font-semibold truncate ${isMine ? "text-slate-200" : "text-slate-600"}`}>
          {isPdf ? "PDF" : isImage ? "Imagen" : "Documento"}
        </span>
      </div>
      <p className={`text-sm font-medium truncate mb-0.5 ${isMine ? "text-white" : "text-slate-900"}`}>
        {doc.name}
      </p>
      <p className={`text-xs mb-3 ${isMine ? "text-slate-400" : "text-slate-500"}`}>
        {formatBytes(doc.size)}
      </p>
      <a
        href={doc.url}
        download={doc.name}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold py-1.5 transition ${
          isMine
            ? "bg-white/10 text-white hover:bg-white/20"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`}
      >
        <Download className="h-3.5 w-3.5" />
        Descargar
      </a>
    </div>
  );
}

// ─── Payment modal ────────────────────────────────────────────────────────────

function PaymentModal({
  offer,
  onConfirm,
  onCancel,
  confirming,
}: {
  offer: OfferPayload;
  onConfirm: () => void;
  onCancel: () => void;
  confirming: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[var(--brand-teal)]" />
            <h2 className="text-base font-semibold text-slate-900">Confirmar pago</h2>
          </div>
          <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Amount */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-slate-600">Total a pagar</span>
            <span className="text-2xl font-bold text-slate-900">C$ {offer.price.toLocaleString()}</span>
          </div>

          {/* Card fields (UI only — real gateway se integra aquí) */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre en la tarjeta</label>
              <input
                type="text"
                placeholder="Ej. Juan Pérez"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand-teal)] focus:ring-2 focus:ring-[var(--brand-teal-ring)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Número de tarjeta</label>
              <input
                type="text"
                placeholder="•••• •••• •••• ••••"
                maxLength={19}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand-teal)] focus:ring-2 focus:ring-[var(--brand-teal-ring)] font-mono tracking-widest"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Vencimiento</label>
                <input
                  type="text"
                  placeholder="MM / AA"
                  maxLength={7}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand-teal)] focus:ring-2 focus:ring-[var(--brand-teal-ring)] font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">CVV</label>
                <input
                  type="text"
                  placeholder="•••"
                  maxLength={4}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--brand-teal)] focus:ring-2 focus:ring-[var(--brand-teal-ring)] font-mono"
                />
              </div>
            </div>
          </div>

          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            Tus datos están protegidos con encriptación SSL.
          </p>
        </div>

        <div className="px-6 pb-5 flex gap-3">
          <Button type="button" variant="ghost" onClick={onCancel} className="flex-1" disabled={confirming}>
            Cancelar
          </Button>
          <Button type="button" onClick={onConfirm} className="flex-1" disabled={confirming}>
            {confirming ? "Procesando..." : `Pagar C$ ${offer.price.toLocaleString()}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Legacy offer card (historical JSON-in-content offers) ──────────────────────

function OfferCard({
  offer,
  messageId,
  isMine,
  showRejectOptions,
  onAcceptClick,
  onRejectClick,
  onCounterOffer,
  onStopNegotiating,
}: {
  offer: OfferPayload;
  messageId: string;
  isMine: boolean;
  showRejectOptions: boolean;
  onAcceptClick: (messageId: string, offer: OfferPayload) => void;
  onRejectClick: (messageId: string) => void;
  onCounterOffer: (price: number) => void;
  onStopNegotiating: (messageId: string) => void;
}) {
  const isPending = offer.status === "pending";
  const isAccepted = offer.status === "accepted";
  const isRejected = offer.status === "rejected";

  return (
    <div className="space-y-2">
      <div className={`rounded-2xl border px-4 py-3 text-sm w-64 shadow-sm transition-all
        ${isAccepted ? "border-emerald-200 bg-emerald-50" : ""}
        ${isRejected ? "border-rose-200 bg-rose-50" : ""}
        ${isPending ? (isMine ? "border-blue-200 bg-blue-50" : "border-amber-200 bg-amber-50") : ""}
      `}>
        <div className="flex items-center gap-2 mb-2">
          {isPending && <HandCoins className="h-4 w-4 text-slate-500 shrink-0" />}
          {isAccepted && <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />}
          {isRejected && <XCircle className="h-4 w-4 text-rose-500 shrink-0" />}
          <span className={`text-xs font-semibold
            ${isAccepted ? "text-emerald-700" : ""}
            ${isRejected ? "text-rose-600" : ""}
            ${isPending ? "text-slate-600" : ""}
          `}>
            {isPending ? "Propuesta de precio" : isAccepted ? "Oferta aceptada" : "Oferta rechazada"}
          </span>
        </div>

        <p className={`text-2xl font-bold mb-1
          ${isAccepted ? "text-emerald-700" : ""}
          ${isRejected ? "text-rose-600 line-through opacity-70" : ""}
          ${isPending ? "text-slate-900" : ""}
        `}>
          C$ {offer.price.toLocaleString()}
        </p>

        {isPending && isMine && (
          <p className="flex items-center gap-1 text-xs text-slate-500 mt-2">
            <Clock className="h-3 w-3" />
            Esperando respuesta...
          </p>
        )}

        {isPending && !isMine && (
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => onAcceptClick(messageId, offer)}
              className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold py-1.5 hover:bg-emerald-700 transition"
            >
              <Check className="h-3.5 w-3.5" />
              Aceptar
            </button>
            <button
              type="button"
              onClick={() => onRejectClick(messageId)}
              className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-rose-100 text-rose-700 text-xs font-semibold py-1.5 hover:bg-rose-200 transition"
            >
              <X className="h-3.5 w-3.5" />
              Rechazar
            </button>
          </div>
        )}

        {isAccepted && offer.paidAt && (
          <p className="text-xs text-emerald-700 mt-1 font-medium flex items-center gap-1">
            <CreditCard className="h-3 w-3" /> Pago confirmado
          </p>
        )}
        {isAccepted && !offer.paidAt && (
          <p className="text-xs text-emerald-700 mt-1 font-medium">✓ Trato cerrado</p>
        )}
        {isRejected && !showRejectOptions && (
          <p className="text-xs text-rose-500 mt-1">Esta oferta fue rechazada.</p>
        )}
      </div>

      {/* Reject options panel — shown to the person who just rejected */}
      {isPending && showRejectOptions && (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 w-64 shadow-sm space-y-2">
          <p className="text-xs font-semibold text-slate-700">¿Qué querés hacer?</p>
          <button
            type="button"
            onClick={() => onCounterOffer(offer.price)}
            className="flex w-full items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100 transition"
          >
            <RefreshCw className="h-3.5 w-3.5 shrink-0" />
            Hacer contra oferta
          </button>
          <button
            type="button"
            onClick={() => onStopNegotiating(messageId)}
            className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
          >
            <Ban className="h-3.5 w-3.5 shrink-0" />
            No seguir ofertando
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Persistent offer card (DB source of truth for new offers) ──────────────────

function PersistentOfferCard({
  offer,
  currentUserId,
  deciding,
  onDecide,
}: {
  offer: PersistentOffer;
  currentUserId: string;
  deciding: boolean;
  onDecide: (offerId: string, action: "accept" | "reject") => void;
}) {
  const isClient = offer.clientId === currentUserId;
  const isPending = offer.status === "SENT";
  const isAccepted = offer.status === "ACCEPTED";
  const isRejected = offer.status === "REJECTED";
  const isClosed = !isPending && !isAccepted && !isRejected; // EXPIRED / CANCELED / SUPERSEDED

  const closedLabel =
    offer.status === "EXPIRED"
      ? "Oferta expirada"
      : offer.status === "CANCELED"
        ? "Oferta cancelada"
        : "Oferta reemplazada";

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm w-64 shadow-sm transition-all
        ${isAccepted ? "border-emerald-200 bg-emerald-50" : ""}
        ${isRejected ? "border-rose-200 bg-rose-50" : ""}
        ${isClosed ? "border-slate-200 bg-slate-50" : ""}
        ${isPending ? (isClient ? "border-amber-200 bg-amber-50" : "border-blue-200 bg-blue-50") : ""}
      `}
    >
      <div className="flex items-center gap-2 mb-2">
        {isPending && <HandCoins className="h-4 w-4 text-slate-500 shrink-0" />}
        {isAccepted && <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />}
        {isRejected && <XCircle className="h-4 w-4 text-rose-500 shrink-0" />}
        {isClosed && <Clock className="h-4 w-4 text-slate-400 shrink-0" />}
        <span
          className={`text-xs font-semibold
          ${isAccepted ? "text-emerald-700" : ""}
          ${isRejected ? "text-rose-600" : ""}
          ${isClosed ? "text-slate-500" : ""}
          ${isPending ? "text-slate-600" : ""}
        `}
        >
          {isPending
            ? "Propuesta de precio"
            : isAccepted
              ? "Oferta aceptada"
              : isRejected
                ? "Oferta rechazada"
                : closedLabel}
        </span>
      </div>

      <p
        className={`text-2xl font-bold mb-1
        ${isAccepted ? "text-emerald-700" : ""}
        ${isRejected ? "text-rose-600 line-through opacity-70" : ""}
        ${isClosed ? "text-slate-500" : ""}
        ${isPending ? "text-slate-900" : ""}
      `}
      >
        C$ {offer.amount.toLocaleString()}
      </p>

      {isPending && !isClient && (
        <p className="flex items-center gap-1 text-xs text-slate-500 mt-2">
          <Clock className="h-3 w-3" />
          Esperando respuesta del cliente
        </p>
      )}

      {isPending && isClient && (
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            disabled={deciding}
            onClick={() => onDecide(offer.id, "accept")}
            className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold py-1.5 hover:bg-emerald-700 transition disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            Aceptar
          </button>
          <button
            type="button"
            disabled={deciding}
            onClick={() => onDecide(offer.id, "reject")}
            className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-rose-100 text-rose-700 text-xs font-semibold py-1.5 hover:bg-rose-200 transition disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
            Rechazar
          </button>
        </div>
      )}

      {isAccepted && <p className="text-xs text-emerald-700 mt-1 font-medium">✓ Trato cerrado</p>}
      {isRejected && <p className="text-xs text-rose-500 mt-1">Esta oferta fue rechazada.</p>}
    </div>
  );
}

// ─── Socket singleton ─────────────────────────────────────────────────────────

let socketRef: Socket | null = null;

// ─── ChatPanel ────────────────────────────────────────────────────────────────

export function ChatPanel({
  initialChats,
  currentUserId,
}: {
  initialChats: ChatItem[];
  currentUserId: string;
}) {
  const [chats, setChats] = useState(initialChats);
  const [activeChatId, setActiveChatId] = useState(initialChats[0]?.id ?? null);
  const activeChatIdRef = useRef<string | null>(initialChats[0]?.id ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Offer modal
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerDraft, setOfferDraft] = useState("");
  const [sendingOffer, setSendingOffer] = useState(false);
  // Persistent offer ids currently being accepted/rejected (guards double-clicks).
  const [decidingOfferIds, setDecidingOfferIds] = useState<string[]>([]);

  // Payment modal (legacy JSON-in-content offers only)
  const [paymentTarget, setPaymentTarget] = useState<{ messageId: string; offer: OfferPayload } | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);

  // Reject options (legacy JSON-in-content offers only)
  const [pendingRejectId, setPendingRejectId] = useState<string | null>(null);

  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const markCurrentChatAsRead = useCallback(async (chatId: string) => {
    await fetch(`/api/chats/${chatId}/read`, { method: "POST" }).catch(() => null);
    socketRef?.emit("message-read", { chatId });
    refreshUnreadMessagesCount();
  }, []);

  useEffect(() => { activeChatIdRef.current = activeChatId; }, [activeChatId]);

  useEffect(() => {
    let mounted = true;

    async function initSocket() {
      await fetch("/api/socket");
      socketRef = io({ path: "/api/socket_io" });

      socketRef.on("message:new", (message: ChatMessage & { chatId: string }) => {
        if (message.chatId === activeChatIdRef.current && mounted) {
          setMessages((prev) => [...prev, message]);
          if (message.sender.id !== currentUserId) void markCurrentChatAsRead(message.chatId);
        }
        setChats((prev) =>
          prev.map((chat) =>
            chat.id === message.chatId
              ? { ...chat, latestMessage: { content: getPreviewText(message.content) } }
              : chat,
          ),
        );
        if (message.sender.id !== currentUserId) refreshUnreadMessagesCount();
      });

      // Legacy real-time offer status updates (old JSON-in-content offers).
      socketRef.on("message:update", (update: { id: string; chatId: string; content: string }) => {
        if (!mounted) return;
        setMessages((prev) =>
          prev.map((msg) => (msg.id === update.id ? { ...msg, content: update.content } : msg)),
        );
      });

      // DB-first persistent offer created by the technician.
      socketRef.on("offer:new", (message: ChatMessage & { chatId: string }) => {
        if (!mounted) return;

        if (message.chatId === activeChatIdRef.current) {
          setMessages((prev) =>
            prev.some((msg) => msg.id === message.id) ? prev : [...prev, message],
          );
          if (message.sender.id !== currentUserId) void markCurrentChatAsRead(message.chatId);
        }

        setChats((prev) =>
          prev.map((chat) =>
            chat.id === message.chatId
              ? { ...chat, latestMessage: { content: "💰 Propuesta de precio" } }
              : chat,
          ),
        );

        if (message.sender.id !== currentUserId) refreshUnreadMessagesCount();
      });

      // DB-first persistent offer decision (accepted/rejected/...).
      socketRef.on(
        "offer:update",
        (update: { offerId: string; chatId: string; status: OfferStatus }) => {
          if (!mounted) return;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.offer && msg.offer.id === update.offerId
                ? { ...msg, offer: { ...msg.offer, status: update.status } }
                : msg,
            ),
          );
        },
      );
    }

    void initSocket();
    return () => {
      mounted = false;
      socketRef?.disconnect();
      socketRef = null;
    };
  }, [currentUserId, markCurrentChatAsRead]);

  useEffect(() => {
    if (!activeChatId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingMessages(true);
    fetch(`/api/chats/${activeChatId}/messages`)
      .then((r) => r.json())
      .then((data) => setMessages(data.messages ?? []))
      .finally(() => setLoadingMessages(false));
    void markCurrentChatAsRead(activeChatId);
    socketRef?.emit("join-chat", activeChatId);
  }, [activeChatId, markCurrentChatAsRead]);

  const activeChat = useMemo(() => chats.find((c) => c.id === activeChatId), [chats, activeChatId]);
  const activeOther = useMemo(
    () => activeChat?.participants.find((p) => p.userId !== currentUserId),
    [activeChat, currentUserId],
  );

  // ── Send text message ──────────────────────────────────────────────────────

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim() || !activeChatId) return;
    const content = draft.trim();
    setDraft("");
    if (socketRef) {
      socketRef.emit("send-message", { chatId: activeChatId, content });
    } else {
      await fetch(`/api/chats/${activeChatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
    }
  }

  // ── Send offer (persistent — Offer is the source of truth) ───────────────────

  async function sendOffer() {
    const price = parseInt(offerDraft.replace(/\D/g, ""), 10);
    if (!price || price <= 0 || !activeChatId || sendingOffer) return;

    setSendingOffer(true);
    try {
      const response = await fetch(`/api/chats/${activeChatId}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: price }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        // Keep the modal open so the technician can retry / read the reason.
        window.alert(data?.error ?? "No se pudo enviar la propuesta.");
        return;
      }

      // Append from the authoritative response immediately. The offer:new
      // socket broadcast (which also reaches this sender's room) is deduped by
      // message id, so this never double-inserts.
      if (data?.message) {
        const message = data.message as ChatMessage & { chatId: string };
        if (message.chatId === activeChatId) {
          setMessages((prev) =>
            prev.some((msg) => msg.id === message.id) ? prev : [...prev, message],
          );
        }
      }

      setOfferDraft("");
      setShowOfferModal(false);
    } finally {
      setSendingOffer(false);
    }
  }

  // ── Decide persistent offer (accept / reject via API) ────────────────────────

  async function handleOfferDecision(offerId: string, action: "accept" | "reject") {
    if (decidingOfferIds.includes(offerId)) return;

    setDecidingOfferIds((prev) => [...prev, offerId]);
    try {
      const response = await fetch(`/api/offers/${offerId}/${action}`, { method: "POST" });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        window.alert(data?.error ?? "No se pudo procesar la respuesta.");
        return;
      }

      // Reconcile from the authoritative API response. The offer:update socket
      // event will also land for both participants.
      if (data?.offer) {
        const updatedStatus = data.offer.status as OfferStatus;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.offer && msg.offer.id === offerId
              ? { ...msg, offer: { ...msg.offer, status: updatedStatus } }
              : msg,
          ),
        );
      }
    } finally {
      setDecidingOfferIds((prev) => prev.filter((id) => id !== offerId));
    }
  }

  // ── Legacy offer status mutation (historical JSON-in-content offers only) ─────

  async function updateLegacyOfferStatus(messageId: string, newContent: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, content: newContent } : m)),
    );
    if (socketRef) {
      socketRef.emit("update-message", { chatId: activeChatId, messageId, newContent });
    } else {
      await fetch(`/api/chats/${activeChatId}/messages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, content: newContent }),
      });
    }
  }

  // ── Legacy accept → open payment modal ───────────────────────────────────────

  function handleAcceptClick(messageId: string, offer: OfferPayload) {
    setPaymentTarget({ messageId, offer });
  }

  async function handleConfirmPayment() {
    if (!paymentTarget) return;
    setConfirmingPayment(true);
    const newContent = JSON.stringify({
      ...paymentTarget.offer,
      status: "accepted",
      paidAt: new Date().toISOString(),
    } satisfies OfferPayload);
    await updateLegacyOfferStatus(paymentTarget.messageId, newContent);
    setConfirmingPayment(false);
    setPaymentTarget(null);
  }

  // ── Legacy reject → show options ─────────────────────────────────────────────

  function handleRejectClick(messageId: string) {
    setPendingRejectId(messageId);
  }

  function handleCounterOffer(price: number) {
    setPendingRejectId(null);
    setOfferDraft(String(price));
    setShowOfferModal(true);
  }

  async function handleStopNegotiating(messageId: string) {
    const message = messages.find((m) => m.id === messageId);
    if (!message) return;
    const offer = tryParseOffer(message.content);
    if (!offer) return;
    const newContent = JSON.stringify({ ...offer, status: "rejected" } satisfies OfferPayload);
    await updateLegacyOfferStatus(messageId, newContent);
    setPendingRejectId(null);
  }

  // ── File upload ────────────────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeChatId) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al subir archivo.");
      const content = JSON.stringify({
        type: "document",
        url: data.url,
        name: data.name,
        size: data.size,
        mimeType: data.mimeType,
      } satisfies DocumentPayload);
      if (socketRef) {
        socketRef.emit("send-message", { chatId: activeChatId, content });
      } else {
        await fetch(`/api/chats/${activeChatId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
      }
    } catch (err) {
      console.error("[chat] upload error", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function getPreviewText(content: string): string {
    if (content === "💰 Propuesta de precio") return content;
    if (tryParseOffer(content)) return "💰 Propuesta de precio";
    if (tryParseDocument(content)) return "📎 Documento adjunto";
    return content;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Payment modal (legacy offers only) */}
      {paymentTarget && (
        <PaymentModal
          offer={paymentTarget.offer}
          onConfirm={() => void handleConfirmPayment()}
          onCancel={() => setPaymentTarget(null)}
          confirming={confirmingPayment}
        />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        {/* Chat list */}
        <Card className="space-y-2 p-3">
          <h3 className="text-sm font-semibold text-slate-900">Conversaciones</h3>
          <div className="space-y-1">
            {chats.map((chat) => {
              const other = chat.participants.find((p) => p.userId !== currentUserId);
              const isActive = chat.id === activeChatId;
              return (
                <button
                  key={chat.id}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                    isActive ? "bg-slate-900 text-white" : "hover:bg-slate-100"
                  }`}
                  onClick={() => setActiveChatId(chat.id)}
                  type="button"
                >
                  <div className="flex items-center gap-2">
                    <UserAvatar name={other?.name ?? "Conversación"} src={other?.avatarUrl} size={30} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{other?.name ?? "Conversación"}</p>
                      <p className={`truncate text-xs ${isActive ? "text-slate-200" : "text-slate-500"}`}>
                        {getPreviewText(chat.latestMessage?.content ?? "")}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Active chat window */}
        <Card className="flex min-h-[420px] flex-col p-0">
          {/* Header */}
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="text-sm font-semibold text-slate-900">
              {activeChat ? (
                <span className="flex items-center gap-2">
                  <UserAvatar name={activeOther?.name} src={activeOther?.avatarUrl} size={28} />
                  {activeOther?.name ?? "Conversación"}
                </span>
              ) : (
                "Selecciona una conversación"
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {loadingMessages && <p className="text-sm text-slate-500">Cargando mensajes...</p>}
            {!messages.length && !loadingMessages && (
              <p className="text-sm text-slate-500">No hay mensajes aún.</p>
            )}
            {messages.map((message) => {
              const mine = message.sender.id === currentUserId;
              // Persisted offers (DB source of truth) take precedence; only fall
              // back to legacy JSON-in-content parsing for historical messages.
              const persistentOffer = message.offer ?? null;
              const legacyOffer = persistentOffer ? null : tryParseOffer(message.content);
              const doc = persistentOffer || legacyOffer ? null : tryParseDocument(message.content);

              return (
                <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`flex max-w-[85%] items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                    <UserAvatar
                      name={message.sender.name}
                      src={message.sender.avatarUrl}
                      size={28}
                      className={mine ? "opacity-90" : ""}
                    />
                    {persistentOffer ? (
                      <PersistentOfferCard
                        offer={persistentOffer}
                        currentUserId={currentUserId}
                        deciding={decidingOfferIds.includes(persistentOffer.id)}
                        onDecide={(id, action) => void handleOfferDecision(id, action)}
                      />
                    ) : legacyOffer ? (
                      <OfferCard
                        offer={legacyOffer}
                        messageId={message.id}
                        isMine={mine}
                        showRejectOptions={pendingRejectId === message.id}
                        onAcceptClick={handleAcceptClick}
                        onRejectClick={handleRejectClick}
                        onCounterOffer={handleCounterOffer}
                        onStopNegotiating={(id) => void handleStopNegotiating(id)}
                      />
                    ) : doc ? (
                      <DocumentCard doc={doc} isMine={mine} />
                    ) : (
                      <div className={`rounded-2xl px-3 py-2 text-sm ${
                        mine ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-900"
                      }`}>
                        {!mine && <p className="mb-1 text-xs font-semibold">{message.sender.name}</p>}
                        <p>{message.content}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Offer modal panel */}
          {showOfferModal && (
            <div className="border-t border-slate-200 bg-amber-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <HandCoins className="h-4 w-4 text-amber-600" />
                  Proponer un precio
                </p>
                <button
                  type="button"
                  onClick={() => { setShowOfferModal(false); setOfferDraft(""); }}
                  className="text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-500 text-sm font-semibold pointer-events-none">
                    C$
                  </span>
                  <input
                    type="number"
                    min={1}
                    placeholder="Ej. 2500"
                    value={offerDraft}
                    onChange={(e) => setOfferDraft(e.target.value)}
                    className="w-full rounded-xl border border-amber-300 bg-white pl-8 pr-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void sendOffer(); } }}
                    autoFocus
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => void sendOffer()}
                  disabled={sendingOffer || !offerDraft || parseInt(offerDraft) <= 0}
                  className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
                >
                  {sendingOffer ? "Enviando..." : "Enviar oferta"}
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                La otra persona podrá aceptar o rechazar tu propuesta en el chat.
              </p>
            </div>
          )}

          {/* Input bar */}
          <form className="border-t border-slate-200 p-3" onSubmit={sendMessage}>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
            />
            <div className="flex gap-2">
              {/* File attach button */}
              {activeChatId && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  title="Adjuntar documento"
                  className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition shrink-0 disabled:opacity-50"
                  aria-label="Adjuntar documento"
                >
                  {uploading
                    ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                    : <Paperclip className="h-5 w-5" />
                  }
                </button>
              )}

              {/* Offer button */}
              {activeChatId && !showOfferModal && (
                <button
                  type="button"
                  onClick={() => setShowOfferModal(true)}
                  title="Proponer precio"
                  className="flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-amber-600 hover:bg-amber-50 hover:border-amber-300 transition shrink-0"
                  aria-label="Proponer precio"
                >
                  <HandCoins className="h-5 w-5" />
                </button>
              )}

              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Escribe un mensaje..."
              />
              <Button type="submit" disabled={!activeChatId}>
                Enviar
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
