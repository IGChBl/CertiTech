"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/user-avatar";
import { refreshUnreadMessagesCount } from "@/lib/chat/unread-count-store";

type ChatItem = {
  id: string;
  participants: Array<{ userId: string; name: string; avatarUrl?: string | null }>;
  latestMessage?: { content?: string } | null;
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
                  latestMessage: { content: message.content },
                }
              : chat,
          ),
        );

        if (message.sender.id !== currentUserId) {
          refreshUnreadMessagesCount();
        }
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

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
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
                      {chat.latestMessage?.content ?? "Sin mensajes"}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="flex min-h-[420px] flex-col p-0">
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

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {loadingMessages ? <p className="text-sm text-slate-500">Cargando mensajes...</p> : null}
          {!messages.length && !loadingMessages ? (
            <p className="text-sm text-slate-500">No hay mensajes aún.</p>
          ) : null}
          {messages.map((message) => {
            const mine = message.sender.id === currentUserId;
            return (
              <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`flex max-w-[85%] items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                  <UserAvatar
                    name={message.sender.name}
                    src={message.sender.avatarUrl}
                    size={28}
                    className={mine ? "opacity-90" : ""}
                  />
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm ${
                      mine ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-900"
                    }`}
                  >
                    {!mine ? <p className="mb-1 text-xs font-semibold">{message.sender.name}</p> : null}
                    <p>{message.content}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <form className="border-t border-slate-200 p-3" onSubmit={sendMessage}>
          <div className="flex gap-2">
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
