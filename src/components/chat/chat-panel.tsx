"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { refreshUnreadMessagesCount } from "@/lib/chat/unread-count-store";
import { HandCoins, X, Check, Clock, CheckCircle, XCircle } from "lucide-react";

type ChatItem = {
  id: string;
  participants: Array<{ userId: string; name: string; avatarUrl?: string | null }>;
  latestMessage?: { content?: string } | null;
};

type OfferPayload = {
  type: "offer";
  price: number;
  status: "pending" | "accepted" | "rejected";
};

type ChatMessage = {
  id: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    avatarUrl?: string | null;
  };
};

function tryParseOffer(content: string): OfferPayload | null {
  if (!content.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(content);
    if (parsed?.type === "offer" && typeof parsed.price === "number") {
      return parsed as OfferPayload;
    }
    return null;
  } catch {
    return null;
  }
}

function OfferCard({
  offer,
  messageId,
  isMine,
  onUpdateStatus,
}: {
  offer: OfferPayload;
  messageId: string;
  isMine: boolean;
  onUpdateStatus: (messageId: string, status: "accepted" | "rejected") => void;
}) {
  const isPending = offer.status === "pending";
  const isAccepted = offer.status === "accepted";
  const isRejected = offer.status === "rejected";

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm w-64 shadow-sm transition-all
        ${isAccepted ? "border-emerald-200 bg-emerald-50" : ""}
        ${isRejected ? "border-rose-200 bg-rose-50" : ""}
        ${isPending ? (isMine ? "border-blue-200 bg-blue-50" : "border-amber-200 bg-amber-50") : ""}
      `}
    >
      {/* Icon + label row */}
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

      {/* Price */}
      <p className={`text-2xl font-bold mb-1
        ${isAccepted ? "text-emerald-700" : ""}
        ${isRejected ? "text-rose-600 line-through opacity-70" : ""}
        ${isPending ? "text-slate-900" : ""}
      `}>
        C$ {offer.price.toLocaleString()}
      </p>

      {/* Status / Actions */}
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
            onClick={() => onUpdateStatus(messageId, "accepted")}
            className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-emerald-600 text-white text-xs font-semibold py-1.5 hover:bg-emerald-700 transition"
          >
            <Check className="h-3.5 w-3.5" />
            Aceptar
          </button>
          <button
            type="button"
            onClick={() => onUpdateStatus(messageId, "rejected")}
            className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-rose-100 text-rose-700 text-xs font-semibold py-1.5 hover:bg-rose-200 transition"
          >
            <X className="h-3.5 w-3.5" />
            Rechazar
          </button>
        </div>
      )}

      {isAccepted && (
        <p className="text-xs text-emerald-700 mt-1 font-medium">✓ Trato cerrado</p>
      )}

      {isRejected && (
        <p className="text-xs text-rose-500 mt-1">Esta oferta fue rechazada.</p>
      )}
    </div>
  );
}

let socketRef: Socket | null = null;

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

  // Offer modal state
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerDraft, setOfferDraft] = useState("");
  const [sendingOffer, setSendingOffer] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const markCurrentChatAsRead = useCallback(async (chatId: string) => {
    await fetch(`/api/chats/${chatId}/read`, {
      method: "POST",
    }).catch(() => null);

    socketRef?.emit("message-read", { chatId });
    refreshUnreadMessagesCount();
  }, []);

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    let mounted = true;

    async function initSocket() {
      await fetch("/api/socket");

      socketRef = io({
        path: "/api/socket_io",
      });

      socketRef.on("message:new", (message: ChatMessage & { chatId: string }) => {
        if (message.chatId === activeChatIdRef.current && mounted) {
          setMessages((prev) => [...prev, message]);
          if (message.sender.id !== currentUserId) {
            void markCurrentChatAsRead(message.chatId);
          }
        }

        setChats((prev) =>
          prev.map((chat) =>
            chat.id === message.chatId
              ? {
                  ...chat,
                  latestMessage: { content: tryParseOffer(message.content) ? "💰 Propuesta de precio" : message.content },
                }
              : chat,
          ),
        );

        if (message.sender.id !== currentUserId) {
          refreshUnreadMessagesCount();
        }
      });

      // Listen for real-time offer status updates
      socketRef.on("message:update", (update: { id: string; chatId: string; content: string }) => {
        if (!mounted) return;
        setMessages((prev) =>
          prev.map((msg) => (msg.id === update.id ? { ...msg, content: update.content } : msg)),
        );
      });
    }

    void initSocket();

    return () => {
      mounted = false;
      socketRef?.disconnect();
      socketRef = null;
    };
  }, [currentUserId, markCurrentChatAsRead]);

  useEffect(() => {
    if (!activeChatId) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingMessages(true);

    fetch(`/api/chats/${activeChatId}/messages`)
      .then((response) => response.json())
      .then((data) => {
        setMessages(data.messages ?? []);
      })
      .finally(() => {
        setLoadingMessages(false);
      });

    void markCurrentChatAsRead(activeChatId);

    socketRef?.emit("join-chat", activeChatId);
  }, [activeChatId, markCurrentChatAsRead]);

  const activeChat = useMemo(() => chats.find((chat) => chat.id === activeChatId), [chats, activeChatId]);
  const activeOtherParticipant = useMemo(
    () => activeChat?.participants.find((participant) => participant.userId !== currentUserId),
    [activeChat, currentUserId],
  );

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.trim() || !activeChatId) {
      return;
    }

    const content = draft.trim();
    setDraft("");

    if (socketRef) {
      socketRef.emit("send-message", {
        chatId: activeChatId,
        content,
      });
      return;
    }

    await fetch(`/api/chats/${activeChatId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  }

  async function sendOffer() {
    const price = parseInt(offerDraft.replace(/\D/g, ""), 10);
    if (!price || price <= 0 || !activeChatId) return;

    setSendingOffer(true);

    const offerContent = JSON.stringify({ type: "offer", price, status: "pending" });

    if (socketRef) {
      socketRef.emit("send-message", {
        chatId: activeChatId,
        content: offerContent,
      });
    } else {
      await fetch(`/api/chats/${activeChatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: offerContent }),
      });
    }

    setOfferDraft("");
    setShowOfferModal(false);
    setSendingOffer(false);
  }

  async function handleUpdateOfferStatus(messageId: string, status: "accepted" | "rejected") {
    if (!activeChatId) return;

    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    const offer = tryParseOffer(message.content);
    if (!offer) return;

    const newContent = JSON.stringify({ ...offer, status });

    // Optimistic UI update
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, content: newContent } : m)),
    );

    if (socketRef) {
      socketRef.emit("update-message", {
        chatId: activeChatId,
        messageId,
        newContent,
      });
    } else {
      await fetch(`/api/chats/${activeChatId}/messages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, content: newContent }),
      });
    }
  }

  function getLatestMessagePreview(chat: ChatItem): string {
    const content = chat.latestMessage?.content;
    if (!content) return "Sin mensajes";
    if (content === "💰 Propuesta de precio") return "💰 Propuesta de precio";
    if (tryParseOffer(content)) return "💰 Propuesta de precio";
    return content;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      {/* Chat list */}
      <Card className="space-y-2 p-3">
        <h3 className="text-sm font-semibold text-slate-900">Conversaciones</h3>
        <div className="space-y-1">
          {chats.map((chat) => {
            const other = chat.participants.find((participant) => participant.userId !== currentUserId);
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
                      {getLatestMessagePreview(chat)}
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
                <UserAvatar name={activeOtherParticipant?.name} src={activeOtherParticipant?.avatarUrl} size={28} />
                {activeOtherParticipant?.name ?? "Conversación"}
              </span>
            ) : (
              "Selecciona una conversación"
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {loadingMessages ? <p className="text-sm text-slate-500">Cargando mensajes...</p> : null}
          {!messages.length && !loadingMessages ? (
            <p className="text-sm text-slate-500">No hay mensajes aún.</p>
          ) : null}
          {messages.map((message) => {
            const mine = message.sender.id === currentUserId;
            const offer = tryParseOffer(message.content);

            return (
              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`flex max-w-[85%] items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                  <UserAvatar
                    name={message.sender.name}
                    src={message.sender.avatarUrl}
                    size={28}
                    className={mine ? "opacity-90" : ""}
                  />
                  {offer ? (
                    <OfferCard
                      offer={offer}
                      messageId={message.id}
                      isMine={mine}
                      onUpdateStatus={handleUpdateOfferStatus}
                    />
                  ) : (
                    <div
                      className={`rounded-2xl px-3 py-2 text-sm ${
                        mine ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-900"
                      }`}
                    >
                      {!mine ? <p className="mb-1 text-xs font-semibold">{message.sender.name}</p> : null}
                      <p>{message.content}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Offer modal */}
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
                aria-label="Cerrar"
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
          <div className="flex gap-2">
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
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Escribe un mensaje..."
            />
            <Button type="submit" disabled={!activeChatId}>
              Enviar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
