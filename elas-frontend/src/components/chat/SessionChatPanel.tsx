"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { ChatClient } from "@/lib/ws/chatClient";
import {
  getSessionMessages,
  postSessionMessage,
  getSessionChatPolicy,
  type SessionMessage,
  type SessionChatPolicy,
} from "@/lib/api/teacher";
import { getStoredAuth, isRealSessionId } from "@/lib/api/client";
import { MessageCircle, Lock, LifeBuoy, SendHorizonal } from "lucide-react";

type Props = {
  sessionId: string;
  role: "teacher" | "student" | "admin";
  type: "lecture" | "exam";
};

const QUICK_REACTIONS = ["👍", "❓", "🐢", "🔁", "👏", "⚠️"];

export function SessionChatPanel({ sessionId, role, type }: Props) {
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [input, setInput] = useState("");
  const [channel] = useState<"public" | "help">(type === "exam" ? "help" : "public");
  const [loading, setLoading] = useState(false);
  const [policy, setPolicy] = useState<SessionChatPolicy | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const realSession = isRealSessionId(sessionId);

  useEffect(() => {
    if (!realSession) return;
    let mounted = true;
    getSessionChatPolicy(sessionId).then((p) => {
      if (mounted) setPolicy(p ?? null);
    });
    return () => {
      mounted = false;
    };
  }, [sessionId, realSession]);

  useEffect(() => {
    if (!realSession) {
      setMessages([]);
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);

    getSessionMessages(sessionId, { channel })
      .then((list) => {
        if (mounted) setMessages(list);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [sessionId, channel, realSession]);

  useEffect(() => {
    if (!realSession) return;

    const client = new ChatClient((event) => {
      if (event?.event?.scope === "session" && event.event.kind === "message:new") {
        const msg: SessionMessage = event.event.message;
        if (msg.sessionId === sessionId && msg.channel === channel) {
          setMessages((prev) => (prev.find((m) => m.id === msg.id) ? prev : [...prev, msg]));
        }
      }
    });

    client.connect();
    client.joinSession(sessionId);

    return () => {
      // auto close on unmount
    };
  }, [sessionId, channel, realSession]);

  const orderedMessages = useMemo(
    () =>
      messages
        .slice()
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages]
  );

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [orderedMessages.length]);

  const chatLocked = policy?.mode === "locked" && role === "student";
  const questionsOnly = policy?.mode === "questions_only" && role === "student";
  const canSend = realSession && !chatLocked;

  const placeholder = !realSession
    ? "Чат доступен только для сессий, созданных в системе."
    : chatLocked
      ? "Чат закрыт преподавателем."
      : type === "exam" && role === "student"
        ? "Напишите в канал помощи (проблемы с камерой/связью)…"
        : questionsOnly
          ? "Только вопросы (введите ваш вопрос)…"
          : "Сообщение в чат сессии…";

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !realSession) return;

    setInput("");
    setSendError(null);

    const messageType = questionsOnly ? "question" : "message";
    const msg = await postSessionMessage(sessionId, { type: messageType, text, channel });

    if (msg) {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    } else {
      setSendError("Не удалось отправить сообщение");
      setInput(text);
    }
  };

  const title = type === "exam" ? "Exam help-channel" : "Lecture chat";

  const subtitle = chatLocked
    ? "Чат временно закрыт преподавателем."
    : type === "exam"
      ? role === "student"
        ? "Канал помощи: видно только вам и преподавателю."
        : "Сообщения студентов по тех. вопросам и дисциплине."
      : questionsOnly
        ? "Разрешены только сообщения с типом «Вопрос»."
        : "Вопросы по теме, быстрые реплики и реакции.";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      {/* header */}
      <div className="shrink-0 border-b border-white/10 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80">
                {channel === "help" ? <LifeBuoy size={15} /> : <MessageCircle size={15} />}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white">{title}</div>
                <div className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-white/42">
                  {subtitle}
                </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {chatLocked && (
              <Badge className="border border-amber-400/20 bg-amber-500/15 text-amber-300">
                <Lock size={12} className="mr-1" />
                Locked
              </Badge>
            )}
            <Badge className="border border-white/10 bg-white/5 text-white/65">
              {channel === "help" ? "Help" : "Public"}
            </Badge>
          </div>
        </div>
      </div>

      {/* messages — scrollable container */}
      <div className="min-h-0 max-h-[40vh] flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-2.5">
        {!realSession && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-4 text-xs text-white/45">
            Чат доступен для сессий, созданных в системе. Откройте сессию с реальным ID.
          </div>
        )}

        {realSession && loading && (
          <div className="space-y-2.5">
            <div className="h-14 animate-pulse rounded-2xl bg-white/5" />
            <div className="ml-auto h-14 w-[82%] animate-pulse rounded-2xl bg-white/[0.04]" />
            <div className="h-14 w-[88%] animate-pulse rounded-2xl bg-white/5" />
          </div>
        )}

        {realSession && !loading && orderedMessages.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-4 py-5 text-center text-xs text-white/45">
            Пока нет сообщений. Начните обсуждение.
          </div>
        )}

        {!loading &&
          orderedMessages.map((m) => {
            const auth = getStoredAuth();
            const isYou = auth?.email && m.senderEmail === auth.email;
            const displayName = isYou
              ? "Вы"
              : m.senderName || m.senderEmail || m.senderId || "Участник";
            const initial =
              displayName === "Вы"
                ? "В"
                : (displayName.charAt(0) || "?").toUpperCase();

            return (
              <div
                key={m.id}
                className={`flex items-end gap-2.5 ${isYou ? "justify-end" : "justify-start"}`}
              >
                {!isYou && (
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-[11px] font-medium text-zinc-200"
                    title={m.senderEmail ?? undefined}
                  >
                    {initial}
                  </div>
                )}

                <div
                  className={`max-w-[86%] rounded-2xl px-3.5 py-3 ${
                    isYou
                      ? "border border-violet-400/20 bg-violet-500/15 text-white"
                      : "border border-white/10 bg-white/5 text-zinc-100"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        isYou ? "text-violet-100" : "text-zinc-100"
                      }`}
                    >
                      {displayName}
                    </span>
                    <span className="text-[10px] text-white/38">
                      {new Date(m.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                    {m.text}
                  </p>
                </div>

                {isYou && (
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-violet-400/20 bg-violet-500/20 text-[11px] font-medium text-violet-100"
                    title={m.senderEmail ?? undefined}
                  >
                    {initial}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* composer */}
      <div className="shrink-0 border-t border-white/10 bg-black/10 px-4 py-3">
        {sendError && <p className="mb-2 text-xs text-red-400">{sendError}</p>}

        <div className="space-y-3">
          <textarea
            rows={2}
            className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-400/35"
            placeholder={placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!canSend}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                void handleSend();
              }
            }}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[10px] uppercase tracking-[0.18em] text-white/30">
                Quick
              </span>
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setInput((v) => (v ? `${v} ${emoji}` : emoji))}
                  className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-sm text-white/75 transition hover:bg-white/10"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden text-[11px] text-white/30 sm:inline">
                Ctrl/Cmd + Enter
              </span>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={!canSend || !input.trim()}
                className="gap-2"
              >
                <SendHorizonal size={14} />
                Отправить
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}