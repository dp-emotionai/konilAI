"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Send, Paperclip } from "lucide-react";
import { cn } from "@/lib/cn";
import { getStoredAuth } from "@/lib/api/client";
import { getWsBaseUrl } from "@/lib/env";
import {
  getSessionMessages,
  postSessionMessage,
} from "@/lib/api/teacher";

type ChatRole = "teacher" | "student";
type ChatType = "lecture" | "exam";

type RawChatMessage = {
  id?: string;
  messageId?: string;
  text?: string;
  message?: string;
  body?: string;
  senderId?: string | null;
  userId?: string | null;
  senderName?: string | null;
  fullName?: string | null;
  name?: string | null;
  email?: string | null;
  senderRole?: string | null;
  role?: string | null;
  createdAt?: string | null;
  timestamp?: string | null;
  channel?: "public" | "help" | string | null;
  scope?: string | null;
};

type NormalizedChatMessage = {
  id: string;
  text: string;
  senderId: string | null;
  senderName: string;
  senderRole: string;
  createdAt: string;
  channel: "public" | "help";
};

function normalizeSenderName(raw: RawChatMessage) {
  return (
    raw.senderName?.trim() ||
    raw.fullName?.trim() ||
    raw.name?.trim() ||
    raw.email?.trim() ||
    "Участник"
  );
}

function normalizeMessage(raw: RawChatMessage): NormalizedChatMessage | null {
  const text = raw.text ?? raw.message ?? raw.body ?? "";
  if (!text.trim()) return null;

  return {
    id:
      raw.id ||
      raw.messageId ||
      `${raw.senderId || raw.userId || "anon"}:${raw.createdAt || raw.timestamp || Date.now()}:${text}`,
    text: text.trim(),
    senderId: raw.senderId ?? raw.userId ?? null,
    senderName: normalizeSenderName(raw),
    senderRole: raw.senderRole || raw.role || "student",
    createdAt: raw.createdAt || raw.timestamp || new Date().toISOString(),
    channel: raw.channel === "help" ? "help" : "public",
  };
}

function unwrapEvent(raw: any): any {
  if (!raw) return null;
  if (raw.event) return raw.event;
  return raw;
}

function eventLooksLikeChatMessage(payload: any) {
  if (!payload) return false;

  const type = payload.type || payload.eventType || payload.kind || "";
  const hasMessageFields =
    typeof payload.text === "string" ||
    typeof payload.message === "string" ||
    typeof payload.body === "string";

  if (hasMessageFields) return true;

  return [
    "message.new",
    "chat.message",
    "session.message",
    "message",
    "new_message",
  ].includes(type);
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function SessionChatPanel({
  sessionId,
  role,
  type,
}: {
  sessionId: string;
  role: ChatRole;
  type: ChatType;
}) {
  const auth = useMemo(() => getStoredAuth(), []);
  const currentUserId = useMemo(() => {
    const maybeAuth = auth as { id?: string | null; email?: string | null } | null;
    return maybeAuth?.id ?? maybeAuth?.email ?? null;
  }, [auth]);

  const currentUserEmail = auth?.email?.toLowerCase?.() ?? null;

  const [messages, setMessages] = useState<NormalizedChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const listRef = useRef<HTMLDivElement | null>(null);

  const activeChannel: "public" | "help" = type === "exam" ? "help" : "public";

  const appendMessage = useCallback((incoming: NormalizedChatMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === incoming.id)) return prev;
      return [...prev, incoming];
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const raw = await getSessionMessages(sessionId);
        if (cancelled) return;

        const normalized = Array.isArray(raw)
          ? raw
              .map((item) => normalizeMessage(item as RawChatMessage))
              .filter(Boolean) as NormalizedChatMessage[]
          : [];

        setMessages(normalized);
      } catch (err) {
        console.error("getSessionMessages failed", err);
        if (!cancelled) setMessages([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    const wsBase = getWsBaseUrl();
    if (!wsBase?.startsWith("ws")) return;

    const socket = new WebSocket(`${wsBase}/ws`);

    socket.onopen = () => {
      try {
        socket.send(
          JSON.stringify({
            type: "subscribe",
            scope: "session",
            sessionId,
          })
        );
      } catch (err) {
        console.error("chat subscribe failed", err);
      }
    };

    socket.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        const payload = unwrapEvent(raw);

        if (!eventLooksLikeChatMessage(payload)) return;

        const scope = payload.scope || payload.channel || "public";
        const payloadSessionId = payload.sessionId || payload.roomId || payload.session_id;

        if (payloadSessionId && payloadSessionId !== sessionId) return;
        if (!["session", "public", "help"].includes(scope)) return;

        const normalized = normalizeMessage(payload as RawChatMessage);
        if (!normalized) return;

        appendMessage(normalized);
      } catch (err) {
        console.error("chat websocket parse failed", err);
      }
    };

    socket.onerror = (err) => {
      console.error("chat websocket error", err);
    };

    return () => {
      socket.close();
    };
  }, [appendMessage, sessionId]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      const response = await postSessionMessage(sessionId, {
        type: "message",
        text,
        channel: activeChannel,
      });

      const normalized = normalizeMessage(response as RawChatMessage);
      if (normalized) {
        appendMessage(normalized);
      } else {
        appendMessage({
          id: `local:${Date.now()}`,
          text,
          senderId: currentUserId,
          senderName: auth?.fullName || auth?.email || "Вы",
          senderRole: role,
          createdAt: new Date().toISOString(),
          channel: activeChannel,
        });
      }

      setDraft("");
    } catch (err) {
      console.error("postSessionMessage failed", err);
    } finally {
      setSending(false);
    }
  }, [activeChannel, appendMessage, auth?.email, auth?.fullName, currentUserId, draft, role, sending, sessionId]);

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        await handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={listRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar"
      >
        {loading ? (
          <div className="text-sm text-slate-400">Загрузка сообщений...</div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-slate-400">Сообщений пока нет</div>
        ) : (
          messages.map((msg) => {
            const senderEmail = (msg.senderName || "").toLowerCase();
            const isMine =
              (currentUserId && msg.senderId && msg.senderId === currentUserId) ||
              (currentUserEmail && senderEmail === currentUserEmail) ||
              msg.senderRole === role;

            return (
              <div
                key={msg.id}
                className={cn("flex", isMine ? "justify-end" : "justify-start")}
              >
                <div className={cn("max-w-[82%]", isMine ? "items-end" : "items-start")}>
                  <div className="mb-1 text-[11px] font-semibold text-slate-500 px-1">
                    {isMine ? "Вы" : msg.senderName}
                  </div>
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 text-sm shadow-sm break-words",
                      isMine
                        ? "bg-[#7448FF] text-white rounded-br-md"
                        : "bg-white border border-slate-100 text-slate-800 rounded-bl-md"
                    )}
                  >
                    {msg.text}
                  </div>
                  <div className="mt-1 px-1 text-[10px] text-slate-400">
                    {formatTime(msg.createdAt)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-3">
        <div className="flex items-end gap-2">
          <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Сообщение в чат сессии..."
              className="w-full resize-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>

          <button
            type="button"
            className="h-11 w-11 rounded-2xl border border-slate-200 bg-white text-slate-400 flex items-center justify-center"
            disabled
            aria-label="Attach"
          >
            <Paperclip size={16} />
          </button>

          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!draft.trim() || sending}
            className="h-11 w-11 rounded-2xl bg-[#7448FF] text-white flex items-center justify-center disabled:opacity-50"
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}