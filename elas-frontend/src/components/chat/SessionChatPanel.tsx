"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Send, Paperclip, Smile } from "lucide-react";
import { cn } from "@/lib/cn";
import { getStoredAuth } from "@/lib/api/client";
import { postSessionMessage } from "@/lib/api/teacher";

/**
 * ВАЖНО:
 * Если у тебя в проекте названия импортов другие,
 * подстрой только эти 2 места:
 *
 * 1) loadSessionMessages
 * 2) createChatClient / subscribe logic
 *
 * Сам layout, normalizeIncomingChatEvent и message rendering
 * уже можно оставлять как есть.
 */

// Если у тебя уже есть реальная загрузка истории сообщений — подставь её сюда.
async function loadSessionMessages(sessionId: string): Promise<any[]> {
  try {
    const res = await fetch(`/api/sessions/${sessionId}/messages`, {
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) return [];

    const data = await res.json();
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.messages)) return data.messages;

    return [];
  } catch {
    return [];
  }
}

// Если у тебя уже есть chat client / ws client — подставь свой импорт сюда.
function createChatClient() {
  let ws: WebSocket | null = null;
  let listeners: Array<(payload: any) => void> = [];

  return {
    connect(url: string) {
      if (ws) return;
      ws = new WebSocket(url);

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          listeners.forEach((fn) => fn(parsed));
        } catch {
          // ignore
        }
      };
    },
    subscribe(fn: (payload: any) => void) {
      listeners.push(fn);
      return () => {
        listeners = listeners.filter((x) => x !== fn);
      };
    },
    disconnect() {
      if (ws) {
        ws.close();
        ws = null;
      }
      listeners = [];
    },
  };
}

type SessionChatPanelProps = {
  sessionId: string;
  role: "teacher" | "student";
  type: "lecture" | "exam";
};

type UiMessage = {
  id: string;
  text: string;
  senderId: string | null;
  senderName: string | null;
  senderRole: string | null;
  createdAt: string;
  pending?: boolean;
};

function formatDisplayName(msg: Partial<UiMessage>) {
  const senderName = msg.senderName?.trim();
  if (senderName) return senderName;

  if (msg.senderRole === "teacher") return "Преподаватель";
  if (msg.senderRole === "student") return "Студент";

  return "Участник";
}

function normalizeSenderName(source: any) {
  const direct =
    source?.senderName ||
    source?.fullName ||
    source?.name ||
    [source?.firstName, source?.lastName].filter(Boolean).join(" ").trim();

  return direct || null;
}

function normalizeIncomingChatEvent(rawEvent: any): UiMessage | null {
  const payload = rawEvent?.event || rawEvent;
  const scope = payload?.scope || rawEvent?.scope;

  if (scope && scope !== "session") return null;

  const message =
    payload?.message?.new ||
    payload?.message ||
    rawEvent?.message?.new ||
    rawEvent?.message ||
    payload?.data?.message ||
    payload?.data ||
    rawEvent?.data ||
    null;

  if (!message) return null;

  const text = message.text || message.content || message.body || "";
  if (!String(text).trim()) return null;

  return {
    id:
      message.id ||
      message.messageId ||
      `${message.senderId || message.userId || "unknown"}-${message.createdAt || message.timestamp || Date.now()}`,
    text: String(text),
    senderId: message.senderId || message.userId || null,
    senderName: normalizeSenderName(message),
    senderRole: message.senderRole || message.role || null,
    createdAt: message.createdAt || message.timestamp || new Date().toISOString(),
  };
}

function normalizeHistoryMessage(raw: any): UiMessage | null {
  if (!raw) return null;

  const text = raw.text || raw.content || raw.body || "";
  if (!String(text).trim()) return null;

  return {
    id: raw.id || raw.messageId || `${raw.senderId || raw.userId || "unknown"}-${raw.createdAt || Date.now()}`,
    text: String(text),
    senderId: raw.senderId || raw.userId || null,
    senderName: normalizeSenderName(raw),
    senderRole: raw.senderRole || raw.role || null,
    createdAt: raw.createdAt || raw.timestamp || new Date().toISOString(),
  };
}

export function SessionChatPanel({ sessionId, role, type }: SessionChatPanelProps) {
  const auth = useMemo(() => getStoredAuth(), []);
  const currentUserId = auth?.id || null;

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const listRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(false);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = listRef.current;
    if (!el) return;

    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  const appendMessage = useCallback((next: UiMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === next.id)) return prev;
      return [...prev, next];
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const raw = await loadSessionMessages(sessionId);
        if (cancelled) return;

        const normalized = raw
          .map(normalizeHistoryMessage)
          .filter(Boolean) as UiMessage[];

        setMessages(normalized);
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
    const wsBase =
      process.env.NEXT_PUBLIC_WS_BASE_URL ||
      process.env.NEXT_PUBLIC_WS_URL ||
      "";

    if (!wsBase) return;

    const client = createChatClient();

    try {
      client.connect(`${wsBase}/ws`);
    } catch {
      return;
    }

    const unsubscribe = client.subscribe((rawEvent) => {
      const normalized = normalizeIncomingChatEvent(rawEvent);
      if (!normalized) return;

      appendMessage(normalized);
    });

    return () => {
      unsubscribe?.();
      client.disconnect();
    };
  }, [appendMessage]);

  useEffect(() => {
    if (!loading) {
      scrollToBottom(false);
    }
  }, [loading, scrollToBottom]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length, scrollToBottom]);

  const onSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending) return;

    const optimisticId = `local-${Date.now()}`;
    const optimisticMessage: UiMessage = {
      id: optimisticId,
      text,
      senderId: currentUserId,
      senderName:
        auth?.fullName ||
        [auth?.firstName, auth?.lastName].filter(Boolean).join(" ").trim() ||
        auth?.email ||
        (role === "teacher" ? "Преподаватель" : "Студент"),
      senderRole: role,
      createdAt: new Date().toISOString(),
      pending: true,
    };

    setDraft("");
    appendMessage(optimisticMessage);
    setSending(true);

    try {
      await postSessionMessage(sessionId, {
        type: "message",
        text,
        channel: type === "exam" ? "help" : "public",
      });

      if (!mountedRef.current) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticId
            ? { ...m, pending: false }
            : m
        )
      );
    } catch {
      if (!mountedRef.current) return;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticId
            ? { ...m, pending: false, text: `${m.text} (не отправлено)` }
            : m
        )
      );
    } finally {
      if (mountedRef.current) setSending(false);
    }
  }, [appendMessage, auth?.email, auth?.firstName, auth?.fullName, auth?.lastName, currentUserId, draft, role, sending, sessionId, type]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void onSend();
      }
    },
    [onSend]
  );

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div
        ref={listRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4"
      >
        {loading ? (
          <div className="h-full flex items-center justify-center text-[13px] font-medium text-slate-400">
            Загрузка сообщений...
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center">
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-5 text-[13px] font-medium text-slate-400">
              Пока сообщений нет. Начните диалог в сессии.
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = currentUserId && msg.senderId ? msg.senderId === currentUserId : msg.senderRole === role;
            const displayName = formatDisplayName(msg);

            return (
              <div
                key={msg.id}
                className={cn("flex", isMine ? "justify-end" : "justify-start")}
              >
                <div className={cn("max-w-[82%] min-w-0", isMine ? "items-end" : "items-start")}>
                  {!isMine && (
                    <div className="mb-1 px-1 text-[11px] font-bold text-slate-500">
                      {displayName}
                    </div>
                  )}

                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 text-[14px] leading-relaxed break-words shadow-sm",
                      isMine
                        ? "bg-[#7448FF] text-white rounded-br-md"
                        : "bg-slate-100 text-slate-900 rounded-bl-md"
                    )}
                  >
                    {msg.text}
                  </div>

                  <div
                    className={cn(
                      "mt-1 px-1 text-[10px] font-medium text-slate-400",
                      isMine ? "text-right" : "text-left"
                    )}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {msg.pending ? " • отправка..." : ""}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="shrink-0 border-t border-slate-100 bg-white px-4 py-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
          <div className="flex items-end gap-3">
            <button
              type="button"
              className="shrink-0 h-10 w-10 rounded-xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center"
              disabled
            >
              <Paperclip size={16} />
            </button>

            <div className="flex-1 min-w-0">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                placeholder="Сообщение в чат сессии..."
                className="w-full resize-none bg-transparent outline-none text-[14px] text-slate-900 placeholder:text-slate-400 min-h-[24px] max-h-32"
              />
            </div>

            <button
              type="button"
              className="shrink-0 h-10 w-10 rounded-xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center"
              disabled
            >
              <Smile size={16} />
            </button>

            <button
              type="button"
              onClick={() => void onSend()}
              disabled={!draft.trim() || sending}
              className={cn(
                "shrink-0 h-11 px-4 rounded-xl flex items-center gap-2 font-semibold transition-all",
                draft.trim() && !sending
                  ? "bg-[#7448FF] text-white hover:bg-[#643de8]"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              )}
            >
              <Send size={16} />
              <span className="hidden sm:inline">Отправить</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SessionChatPanel;