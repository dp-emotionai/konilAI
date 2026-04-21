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
import { MessageCircle, Lock, LifeBuoy, SendHorizonal, Paperclip } from "lucide-react";

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
  const [auth, setAuth] = useState<{ email?: string; name?: string | null; role?: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAuth(getStoredAuth());
  }, []);

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

    const client = new ChatClient((rawEvent) => {
      // Support both `event.event.scope` (wrapped) and `event.scope` (flat) payloads
      const payload = rawEvent?.event || rawEvent;
      
      const isSessionScope = payload?.scope === "session";
      const isNewMessage = payload?.kind === "message:new" || payload?.type === "message";
      
      if (isSessionScope && isNewMessage) {
        const msg: SessionMessage = payload.message || payload;
        if (msg && msg.id && msg.sessionId === sessionId && msg.channel === channel) {
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
    <div className="flex h-full min-h-0 flex-col bg-transparent font-sans">
      {/* messages — scrollable container */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 custom-scrollbar">
        <div className="space-y-6">
        {!realSession && (
          <div className="rounded-[20px] bg-slate-50 border border-slate-100 px-4 py-4 text-[13px] font-medium text-slate-500 text-center mx-4">
            Чат доступен для сессий, созданных в системе.
          </div>
        )}

        {realSession && loading && (
          <div className="space-y-4">
            <div className="h-16 animate-pulse rounded-[24px] bg-slate-50/80 mx-4" />
            <div className="h-16 animate-pulse rounded-[24px] bg-slate-50/80 mx-4 ml-12" />
          </div>
        )}

        {realSession && !loading && orderedMessages.length === 0 && (
          <div className="rounded-[20px] bg-slate-50 border border-slate-100 px-4 py-8 text-center text-[13px] font-medium text-slate-400 mx-4">
             Сообщений пока нет.
          </div>
        )}

        {!loading &&
          orderedMessages.map((m) => {
            const isYou = auth?.email && m.senderEmail === auth.email;
            const displayName = isYou
              ? "Вы"
              : m.senderName || "Участник";
            const initial = displayName.charAt(0).toUpperCase();
            const timeStr = mounted ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";

            if (isYou) {
              return (
                <div key={m.id} className="flex flex-col items-end gap-1.5 w-full">
                  <div className="bg-[#F4F0FF] rounded-t-[20px] rounded-bl-[20px] rounded-br-[4px] px-5 py-3.5 max-w-[85%] shadow-sm">
                    <div className="text-[14px] text-[#333333] leading-relaxed font-medium whitespace-pre-wrap">
                      {m.text}
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-slate-300 pr-2">{timeStr}</div>
                </div>
              );
            }

            return (
              <div key={m.id} className="flex items-start gap-3 w-full">
                <div className="w-8 h-8 rounded-full border border-slate-100 bg-white shadow-sm shrink-0 flex items-center justify-center overflow-hidden text-[12px] font-bold text-slate-500 mt-1">
                   {initial}
                </div>
                <div className="flex flex-col items-start gap-1 max-w-[85%]">
                  <div className="text-[12px] font-bold text-slate-900 ml-1">{displayName}</div>
                  <div className="bg-[#F8F9FA] rounded-t-[20px] rounded-tr-[20px] rounded-bl-[4px] rounded-br-[20px] px-5 py-3.5 border border-slate-100/50 shadow-sm">
                    <div className="text-[14px] text-[#333333] leading-relaxed font-medium whitespace-pre-wrap">
                      {m.text}
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-slate-300 pl-2">{timeStr}</div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* composer */}
      <div className="shrink-0 px-5 pt-2 pb-5 bg-transparent">
        {sendError && <p className="mb-2 text-[11px] font-bold text-rose-500 px-2">{sendError}</p>}
        
        <div className="relative flex items-end gap-1.5 bg-[#F8F9FA] rounded-[28px] p-2 pl-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] focus-within:ring-2 focus-within:ring-[#7448FF]/20 transition-all">
          <input
            type="text"
            className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-[14px] font-medium text-slate-800 placeholder-slate-400 h-10 min-w-0"
            placeholder={placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!canSend}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleSend();
              }
            }}
          />
          <button className="w-10 h-10 rounded-full text-slate-400 hover:text-slate-600 flex items-center justify-center shrink-0 transition-colors">
            <Paperclip size={18} />
          </button>
          <button 
             onClick={handleSend}
             disabled={!canSend || !input.trim()}
             className="w-10 h-10 bg-[#7448FF] hover:bg-purple-600 rounded-full flex items-center justify-center text-white shrink-0 ml-1 shadow-[0_4px_12px_rgba(116,72,255,0.25)] disabled:opacity-50 disabled:shadow-none transition-all"
          >
            <SendHorizonal size={16} className="-ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}