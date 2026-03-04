"use client";

import { useEffect, useState } from "react";
import {Card} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { ChatClient } from "@/lib/ws/chatClient";
import { getSessionMessages, postSessionMessage, type SessionMessage } from "@/lib/api/teacher";

type Props = {
  sessionId: string;
  role: "teacher" | "student" | "admin";
  type: "lecture" | "exam";
};

export function SessionChatPanel({ sessionId, role, type }: Props) {
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [input, setInput] = useState("");
  const [channel] = useState<"public" | "help">(type === "exam" ? "help" : "public");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getSessionMessages(sessionId, { channel })
      .then((list) => {
        if (mounted) setMessages(list);
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [sessionId, channel]);

  useEffect(() => {
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
      // socket will auto close when component unmounts
    };
  }, [sessionId, channel]);

  const canSend = channel === "public" ? true : true; // help-channel тоже разрешён
  const placeholder =
    type === "exam" && role === "student"
      ? "Напишите в канал помощи (проблемы с камерой/связью)…"
      : "Сообщение в чат сессии…";

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    try {
      const msg = await postSessionMessage(sessionId, { type: "message", text, channel });
      setMessages((prev) => [...prev, msg]);
    } catch (e) {
      console.error("postSessionMessage", e);
    }
  };

  return (
    <Card className="p-4 md:p-5 h-full flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm text-white/60">Чат сессии</div>
          <div className="text-lg font-semibold text-zinc-100">
            {type === "exam" ? "Exam help-channel" : "Lecture chat"}
          </div>
          <p className="mt-1 text-xs text-white/50">
            {type === "exam"
              ? role === "student"
                ? "Канал помощи: видно только вам и преподавателю."
                : "Сообщения студентов по тех. вопросам и дисциплине."
              : "Вопросы по теме, быстрые реплики и реакции."}
          </p>
        </div>
        <Badge className="bg-white/10 text-xs text-white/70">{channel === "help" ? "Help" : "Public"}</Badge>
      </div>

      <div className="mt-4 flex-1 min-h-35 max-h-64 overflow-y-auto space-y-2 text-sm">
        {loading && <div className="h-16 rounded-2xl bg-white/5 animate-pulse" />}
        {!loading && messages.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/30 px-3 py-4 text-xs text-zinc-500">
            Пока нет сообщений. Начните обсуждение.
          </div>
        )}
        {!loading &&
          messages
            .slice()
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map((m) => (
              <div
                key={m.id}
                className="rounded-2xl bg-white/5 px-3 py-2 text-sm text-zinc-100 flex items-start gap-2"
              >
                <span className="text-xs text-zinc-500 mt-0.5">
                  {new Date(m.createdAt).toLocaleTimeString()}
                </span>
                <p className="whitespace-pre-wrap flex-1">{m.text}</p>
              </div>
            ))}
      </div>

      <div className="mt-3 space-y-2">
        <textarea
          rows={2}
          className="w-full rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-400/40"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={!canSend}
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1 text-xs text-zinc-500">
            <span>Быстрые реакции:</span>
            <button type="button" onClick={() => setInput((v) => (v ? v + " 👍" : "👍"))}>
              👍
            </button>
            <button type="button" onClick={() => setInput((v) => (v ? v + " ❓" : "❓"))}>
              ❓
            </button>
            <button type="button" onClick={() => setInput((v) => (v ? v + " 🐢" : "🐢"))}>
              🐢
            </button>
            <button type="button" onClick={() => setInput((v) => (v ? v + " 🔁" : "🔁"))}>
              🔁
            </button>
          </div>
          <Button size="sm" onClick={handleSend} disabled={!canSend || !input.trim()}>
            Отправить
          </Button>
        </div>
      </div>
    </Card>
  );
}

