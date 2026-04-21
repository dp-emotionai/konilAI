"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Send, Paperclip } from "lucide-react";

import { cn } from "@/lib/cn";
import { getStoredAuth, getToken } from "@/lib/api/client";
import { getWsBaseUrl } from "@/lib/env";
import { getSessionMessages, postSessionMessage } from "@/lib/api/teacher";
import { ChatClient } from "@/lib/ws/chatClient";

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
  senderEmail?: string | null;
  senderRole?: string | null;
  role?: string | null;
  createdAt?: string | null;
  timestamp?: string | null;
  channel?: "public" | "help" | string | null;
  scope?: string | null;
  sessionId?: string | null;
  roomId?: string | null;
  session_id?: string | null;
};

type NormalizedChatMessage = {
  id: string;
  text: string;
  senderId: string | null;
  senderName: string;
  senderEmail: string | null;
  senderRole: string;
  createdAt: string;
  channel: "public" | "help";
};

function normalizeSenderName(raw: RawChatMessage) {
  return (
    raw.senderName?.trim() ||
    raw.fullName?.trim() ||
    raw.name?.trim() ||
    raw.senderEmail?.trim() ||
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
    senderEmail:
      raw.senderEmail?.trim()?.toLowerCase() || raw.email?.trim()?.toLowerCase() || null,
    senderRole: raw.senderRole || raw.role || "student",
    createdAt: raw.createdAt || raw.timestamp || new Date().toISOString(),
    channel: raw.channel === "help" ? "help" : "public",
  };
}

function parseSessionIdFromRoom(room?: string | null) {
  if (!room || typeof room !== "string") return null;
  if (!room.startsWith("session_")) return null;
  return room.slice("session_".length);
}

function extractRealtimeMessage(raw: unknown): RawChatMessage | null {
  if (!raw || typeof raw !== "object") return null;

  const envelope = raw as {
    type?: string;
    room?: string;
    channel?: string | null;
    scope?: string | null;
    sessionId?: string | null;
    roomId?: string | null;
    session_id?: string | null;
    event?: Record<string, unknown>;
    message?: Record<string, unknown>;
    payload?: Record<string, unknown>;
  };

  const event =
    envelope.event && typeof envelope.event === "object" ? envelope.event : null;

  const payload =
    event?.message && typeof event.message === "object"
      ? (event.message as Record<string, unknown>)
      : envelope.message && typeof envelope.message === "object"
        ? envelope.message
        : event?.payload && typeof event.payload === "object"
          ? (event.payload as Record<string, unknown>)
          : envelope.payload && typeof envelope.payload === "object"
            ? envelope.payload
            : event && typeof event.text === "string"
              ? event
              : envelope;

  const eventRecord = (event ?? {}) as Record<string, unknown>;
  const payloadRecord = payload as Record<string, unknown>;

  const eventTypes = [
    envelope.type,
    typeof eventRecord.type === "string" ? eventRecord.type : null,
    typeof eventRecord.kind === "string" ? eventRecord.kind : null,
    typeof payloadRecord.type === "string" ? payloadRecord.type : null,
    typeof payloadRecord.eventType === "string" ? String(payloadRecord.eventType) : null,
    typeof payloadRecord.kind === "string" ? String(payloadRecord.kind) : null,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.toLowerCase());

  const hasMessageFields =
    typeof payloadRecord.text === "string" ||
    typeof payloadRecord.message === "string" ||
    typeof payloadRecord.body === "string";

  const looksLikeMessage =
    hasMessageFields ||
    eventTypes.some((value) =>
      [
        "chat-event",
        "message.new",
        "message:new",
        "chat.message",
        "session.message",
        "message",
        "new_message",
      ].includes(value)
    );

  if (!looksLikeMessage) return null;

  return {
    ...(payload as RawChatMessage),
    channel:
      (typeof payloadRecord.channel === "string" ? payloadRecord.channel : null) ??
      (typeof eventRecord.channel === "string" ? eventRecord.channel : null) ??
      (typeof envelope.channel === "string" ? envelope.channel : null) ??
      null,
    scope:
      (typeof payloadRecord.scope === "string" ? payloadRecord.scope : null) ??
      (typeof eventRecord.scope === "string" ? eventRecord.scope : null) ??
      envelope.scope ??
      null,
    sessionId:
      (typeof payloadRecord.sessionId === "string" ? payloadRecord.sessionId : null) ??
      (typeof payloadRecord.roomId === "string" ? payloadRecord.roomId : null) ??
      (typeof payloadRecord.session_id === "string" ? payloadRecord.session_id : null) ??
      (typeof eventRecord.sessionId === "string" ? eventRecord.sessionId : null) ??
      (typeof eventRecord.roomId === "string" ? eventRecord.roomId : null) ??
      (typeof eventRecord.session_id === "string" ? eventRecord.session_id : null) ??
      envelope.sessionId ??
      envelope.roomId ??
      envelope.session_id ??
      parseSessionIdFromRoom(envelope.room) ??
      null,
  };
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
  const [auth, setAuth] = useState<ReturnType<typeof getStoredAuth>>(null);
  const currentUserId = useMemo(() => {
    const maybeAuth = auth as { id?: string | null; email?: string | null } | null;
    return maybeAuth?.id ?? maybeAuth?.email ?? null;
  }, [auth]);

  const currentUserEmail = auth?.email?.toLowerCase?.() ?? null;
  const authFullName = auth?.fullName?.trim().toLowerCase() ?? null;

  const [messages, setMessages] = useState<NormalizedChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const listRef = useRef<HTMLDivElement | null>(null);
  const activeChannel: "public" | "help" = type === "exam" ? "help" : "public";

  useEffect(() => {
    setAuth(getStoredAuth());
  }, []);

  const appendMessage = useCallback(
    (incoming: NormalizedChatMessage) => {
      if (incoming.channel !== activeChannel) return;

      setMessages((prev) => {
        if (prev.some((message) => message.id === incoming.id)) return prev;
        return [...prev, incoming];
      });
    },
    [activeChannel]
  );

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await getSessionMessages(sessionId, { channel: activeChannel });
      const normalized = Array.isArray(raw)
        ? raw
            .map((item) => normalizeMessage(item as RawChatMessage))
            .filter((item): item is NormalizedChatMessage => Boolean(item))
            .filter((item) => item.channel === activeChannel)
        : [];

      setMessages(normalized);
    } catch (err) {
      console.error("getSessionMessages failed", err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [activeChannel, sessionId]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    const wsBase = getWsBaseUrl();
    if (!wsBase?.startsWith("ws") || !getToken()) return;

    const client = new ChatClient((raw) => {
      try {
        const payload = extractRealtimeMessage(raw);
        if (!payload) return;
        if (payload.sessionId && payload.sessionId !== sessionId) return;

        const normalized = normalizeMessage(payload);
        if (!normalized) return;

        appendMessage(normalized);
      } catch (err) {
        console.error("chat websocket parse failed", err);
      }
    });

    client.connect();
    client.joinSession(sessionId);

    return () => {
      client.disconnect();
    };
  }, [appendMessage, sessionId]);

  useEffect(() => {
    const element = listRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
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

      const normalized = response ? normalizeMessage(response as RawChatMessage) : null;
      if (normalized) {
        appendMessage(normalized);
      } else {
        await loadMessages();
      }

      setDraft("");
    } catch (err) {
      console.error("postSessionMessage failed", err);
    } finally {
      setSending(false);
    }
  }, [activeChannel, appendMessage, draft, loadMessages, sending, sessionId]);

  const handleKeyDown = useCallback(
    async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        await handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={listRef}
        className="custom-scrollbar flex-1 min-h-0 space-y-3 overflow-y-auto px-4 py-4"
      >
        {loading ? (
          <div className="text-sm text-slate-400">Загрузка сообщений...</div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-slate-400">Сообщений пока нет</div>
        ) : (
          messages.map((message) => {
            const senderName = message.senderName.trim().toLowerCase();
            const isMine =
              (currentUserId && message.senderId && message.senderId === currentUserId) ||
              (currentUserEmail && message.senderEmail === currentUserEmail) ||
              (authFullName && senderName === authFullName) ||
              (currentUserEmail && senderName === currentUserEmail);

            return (
              <div
                key={message.id}
                className={cn("flex", isMine ? "justify-end" : "justify-start")}
              >
                <div className={cn("max-w-[82%]", isMine ? "items-end" : "items-start")}>
                  <div className="mb-1 px-1 text-[11px] font-semibold text-slate-500">
                    {isMine ? "Вы" : message.senderName}
                  </div>
                  <div
                    className={cn(
                      "break-words rounded-2xl px-4 py-3 text-sm shadow-sm",
                      isMine
                        ? "rounded-br-md bg-[#7448FF] text-white"
                        : "rounded-bl-md border border-slate-100 bg-white text-slate-800"
                    )}
                  >
                    {message.text}
                  </div>
                  <div className="mt-1 px-1 text-[10px] text-slate-400">
                    {formatTime(message.createdAt)}
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
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Сообщение в чат сессии..."
              className="w-full resize-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
          </div>

          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400"
            disabled
            aria-label="Attach"
          >
            <Paperclip size={16} />
          </button>

          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!draft.trim() || sending}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#7448FF] text-white disabled:opacity-50"
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
