"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Send, Paperclip } from "lucide-react";
import { cn } from "@/lib/cn";
import { getStoredAuth, getToken } from "@/lib/api/client";
import { getWsBaseUrl } from "@/lib/env";
import { getSessionMessages, postSessionMessage } from "@/lib/api/teacher";

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
    "РЈС‡Р°СЃС‚РЅРёРє"
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
  const auth = useMemo(() => getStoredAuth(), []);
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

  const appendMessage = useCallback(
    (incoming: NormalizedChatMessage) => {
      if (incoming.channel !== activeChannel) return;

      setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;
        return [...prev, incoming];
      });
    },
    [activeChannel]
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const raw = await getSessionMessages(sessionId, { channel: activeChannel });
        if (cancelled) return;

        const normalized = Array.isArray(raw)
          ? raw
              .map((item) => normalizeMessage(item as RawChatMessage))
              .filter((item): item is NormalizedChatMessage => Boolean(item))
              .filter((item) => item.channel === activeChannel)
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
  }, [activeChannel, sessionId]);

  useEffect(() => {
    const wsBase = getWsBaseUrl();
    if (!wsBase?.startsWith("ws")) return;

    const token = getToken();
    const socket = new WebSocket(`${wsBase}/ws-chat`);

    socket.onopen = () => {
      try {
        if (token) {
          socket.send(JSON.stringify({ type: "auth", token }));
        }
        socket.send(JSON.stringify({ type: "join", room: "session", id: sessionId }));
      } catch (err) {
        console.error("chat join failed", err);
      }
    };

    socket.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        const payload = extractRealtimeMessage(raw);
        if (!payload) return;
        if (payload.sessionId && payload.sessionId !== sessionId) return;

        const normalized = normalizeMessage(payload);
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
      try {
        socket.send(JSON.stringify({ type: "leave", room: "session", id: sessionId }));
      } catch {}
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

      const normalized = response ? normalizeMessage(response as RawChatMessage) : null;
      if (normalized) {
        appendMessage(normalized);
      } else {
        appendMessage({
          id: `local:${Date.now()}`,
          text,
          senderId: currentUserId,
          senderName: auth?.fullName || auth?.email || "Р’С‹",
          senderEmail: currentUserEmail,
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
  }, [
    activeChannel,
    appendMessage,
    auth?.email,
    auth?.fullName,
    currentUserEmail,
    currentUserId,
    draft,
    role,
    sending,
    sessionId,
  ]);

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
          <div className="text-sm text-slate-400">Р—Р°РіСЂСѓР·РєР° СЃРѕРѕР±С‰РµРЅРёР№...</div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-slate-400">РЎРѕРѕР±С‰РµРЅРёР№ РїРѕРєР° РЅРµС‚</div>
        ) : (
          messages.map((msg) => {
            const senderName = msg.senderName.trim().toLowerCase();
            const isMine =
              (currentUserId && msg.senderId && msg.senderId === currentUserId) ||
              (currentUserEmail && msg.senderEmail === currentUserEmail) ||
              (authFullName && senderName === authFullName) ||
              (currentUserEmail && senderName === currentUserEmail);

            return (
              <div
                key={msg.id}
                className={cn("flex", isMine ? "justify-end" : "justify-start")}
              >
                <div className={cn("max-w-[82%]", isMine ? "items-end" : "items-start")}>
                  <div className="mb-1 text-[11px] font-semibold text-slate-500 px-1">
                    {isMine ? "Р’С‹" : msg.senderName}
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
              placeholder="РЎРѕРѕР±С‰РµРЅРёРµ РІ С‡Р°С‚ СЃРµСЃСЃРёРё..."
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
