"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Send, Paperclip, X } from "lucide-react";

import { cn } from "@/lib/cn";
import { getStoredAuth, getToken } from "@/lib/api/client";
import { getSessionMessages, postSessionMessage } from "@/lib/api/teacher";
import { resolveDownloadUrl, uploadMaterialFile } from "@/lib/api/materials";
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
  type?: string | null;
  attachment?: ChatAttachment | null;
};

type MessageNewEvent = {
  type?: string;
  scope?: string | null;
  sessionId?: string | null;
  roomId?: string | null;
  session_id?: string | null;
  event?: Record<string, unknown> | null;
};

type TypingUser = {
  userId: string;
  name: string;
  email: string | null;
  sessionId: string | null;
};

type TypingEvent = {
  type?: string;
  userId?: string | null;
  senderId?: string | null;
  name?: string | null;
  senderName?: string | null;
  email?: string | null;
  senderEmail?: string | null;
  sessionId?: string | null;
  roomId?: string | null;
  session_id?: string | null;
  isTyping?: boolean | null;
};

type NormalizedChatMessage = {
  id: string;
  text: string;
  type: string;
  attachment: ChatAttachment | null;
  senderId: string | null;
  senderName: string;
  senderEmail: string | null;
  senderRole: string;
  createdAt: string;
  channel: "public" | "help";
  sessionId: string | null;
};

type ChatAttachment = {
  storageKey?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  size?: number | null;
  url?: string | null;
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
  const hasAttachment = Boolean(raw.attachment?.storageKey || raw.attachment?.url);
  if (!text.trim() && !hasAttachment) return null;

  return {
    id:
        raw.id ||
        raw.messageId ||
        `${raw.senderId || raw.userId || "anon"}:${raw.createdAt || raw.timestamp || Date.now()}:${text}`,
    text: text.trim(),
    type: raw.type || (hasAttachment ? "file" : "message"),
    attachment: raw.attachment ?? null,
    senderId: raw.senderId ?? raw.userId ?? null,
    senderName: normalizeSenderName(raw),
    senderEmail:
        raw.senderEmail?.trim()?.toLowerCase() || raw.email?.trim()?.toLowerCase() || null,
    senderRole: raw.senderRole || raw.role || "student",
    createdAt: raw.createdAt || raw.timestamp || new Date().toISOString(),
    channel: raw.channel === "help" ? "help" : "public",
    sessionId: raw.sessionId ?? raw.roomId ?? raw.session_id ?? null,
  };
}

function extractRealtimeMessage(raw: unknown): RawChatMessage | null {
  if (!raw || typeof raw !== "object") return null;

  const packet = raw as MessageNewEvent;
  if (packet.type !== "message.new") return null;

  const event = packet.event;
  if (!event || typeof event !== "object") return null;

  const message = event as Record<string, unknown>;
  const channel =
      typeof message.channel === "string" ? message.channel : null;
  const sessionId =
      (typeof message.sessionId === "string" ? message.sessionId : null) ??
      (typeof message.roomId === "string" ? message.roomId : null) ??
      (typeof message.session_id === "string" ? message.session_id : null) ??
      packet.sessionId ??
      packet.roomId ??
      packet.session_id ??
      null;

  return {
    ...(message as RawChatMessage),
    channel,
    sessionId,
  };
}

function extractTypingEvent(raw: unknown): TypingEvent | null {
  if (!raw || typeof raw !== "object") return null;

  const packet = raw as TypingEvent;
  if (packet.type !== "typing") return null;

  return packet;
}

function getTypingName(event: TypingEvent) {
  return (
      event.name?.trim() ||
      event.senderName?.trim() ||
      event.senderEmail?.trim() ||
      event.email?.trim() ||
      "Участник"
  );
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
  const [messages, setMessages] = useState<NormalizedChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedAttachment, setSelectedAttachment] = useState<File | null>(null);
  const [attachmentNotice, setAttachmentNotice] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const listRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatClientRef = useRef<ChatClient | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef(false);

  const activeChannel: "public" | "help" = type === "exam" ? "help" : "public";
  const currentUserId = useMemo(() => {
    const maybeAuth = auth as { id?: string | null; email?: string | null } | null;
    return maybeAuth?.id ?? maybeAuth?.email ?? null;
  }, [auth]);
  const currentUserEmail = auth?.email?.toLowerCase?.() ?? null;
  const authFullName = auth?.fullName?.trim().toLowerCase() ?? null;
  const currentDisplayName =
      auth?.fullName?.trim() ||
      [auth?.firstName, auth?.lastName].filter(Boolean).join(" ").trim() ||
      auth?.email?.trim() ||
      "Участник";

  useEffect(() => {
    setAuth(getStoredAuth());
  }, []);

  const appendMessage = useCallback(
      (incoming: NormalizedChatMessage) => {
        if (incoming.channel !== activeChannel) return;
        if (incoming.sessionId && incoming.sessionId !== sessionId) return;

        setMessages((prev) => {
          if (prev.some((message) => message.id === incoming.id)) return prev;
          return [...prev, incoming];
        });
      },
      [activeChannel, sessionId]
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
    } catch (error) {
      console.error("getSessionMessages failed", error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [activeChannel, sessionId]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const sendTypingState = useCallback(
      (isTyping: boolean) => {
        if (!getToken()) return;
        if (!chatClientRef.current) return;

        if (lastTypingSentRef.current === isTyping) return;
        lastTypingSentRef.current = isTyping;

        chatClientRef.current.sendTyping(sessionId, isTyping, {
          name: currentDisplayName,
          email: auth?.email ?? null,
        });
      },
      [auth?.email, currentDisplayName, sessionId]
  );

  const scheduleStopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingState(false);
    }, 1200);
  }, [sendTypingState]);

  const handleDraftChange = useCallback(
      (value: string) => {
        setDraft(value);

        if (value.trim()) {
          sendTypingState(true);
          scheduleStopTyping();
        } else {
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
          }
          sendTypingState(false);
        }
      },
      [scheduleStopTyping, sendTypingState]
  );

  useEffect(() => {
    if (!getToken()) return;

    const client = new ChatClient((raw) => {
      try {
        const typing = extractTypingEvent(raw);
        if (typing) {
          const typingSessionId =
              typing.sessionId ??
              typing.session_id ??
              (typing.roomId?.startsWith("session:") ? typing.roomId.slice("session:".length) : null);

          if (typingSessionId && typingSessionId !== sessionId) return;

          const typingUserId = typing.userId ?? typing.senderId ?? typing.email ?? typing.senderEmail ?? null;
          if (!typingUserId) return;
          if (currentUserId && typingUserId === currentUserId) return;
          if (currentUserEmail && (typing.email === currentUserEmail || typing.senderEmail === currentUserEmail)) return;

          if (typing.isTyping === false) {
            setTypingUsers((prev) => prev.filter((user) => user.userId !== typingUserId));
            return;
          }

          const nextUser: TypingUser = {
            userId: typingUserId,
            name: getTypingName(typing),
            email: typing.email ?? typing.senderEmail ?? null,
            sessionId: typingSessionId ?? null,
          };

          setTypingUsers((prev) => {
            const withoutSameUser = prev.filter((user) => user.userId !== nextUser.userId);
            return [...withoutSameUser, nextUser];
          });

          window.setTimeout(() => {
            setTypingUsers((prev) => prev.filter((user) => user.userId !== typingUserId));
          }, 2500);
          return;
        }

        const realtime = extractRealtimeMessage(raw);
        if (!realtime) return;

        const normalized = normalizeMessage(realtime);
        if (!normalized) return;

        appendMessage(normalized);
      } catch (error) {
        console.error("chat Socket.IO packet parse failed", error);
      }
    });

    chatClientRef.current = client;
    client.connect();
    client.joinSession(sessionId);

    return () => {
      sendTypingState(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      chatClientRef.current = null;
      client.disconnect();
    };
  }, [appendMessage, currentUserEmail, currentUserId, sendTypingState, sessionId]);

  useEffect(() => {
    const element = listRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if ((!text && !selectedAttachment) || sending) return;

    if (false && false && selectedAttachment) {
      setAttachmentNotice(
          "Файл выбран и будет отправлен вместе с сообщением."
      );
      if (!text) return;
    }

    setSending(true);
    setAttachmentNotice(null);
    try {
      const uploaded = selectedAttachment ? await uploadMaterialFile(selectedAttachment) : null;
      const response = await postSessionMessage(sessionId, {
        type: uploaded ? "file" : "message",
        text,
        channel: activeChannel,
        attachment: uploaded
            ? {
              storageKey: uploaded.storageKey,
              fileName: uploaded.fileName,
              mimeType: uploaded.mimeType,
              size: uploaded.size,
            }
            : null,
      });

      const normalized = response ? normalizeMessage(response as RawChatMessage) : null;
      if (normalized) {
        appendMessage(normalized);
      } else {
        await loadMessages();
      }

      setDraft("");
      sendTypingState(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (selectedAttachment) {
        setSelectedAttachment(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("postSessionMessage failed", error);
      setAttachmentNotice(error instanceof Error ? error.message : "Не удалось отправить сообщение.");
    } finally {
      setSending(false);
    }
  }, [activeChannel, appendMessage, draft, loadMessages, selectedAttachment, sendTypingState, sending, sessionId]);

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
      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
        <div
            ref={listRef}
            className="custom-scrollbar flex-1 min-h-0 space-y-3 overflow-y-auto overscroll-y-contain px-4 py-4"
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
                      <div className={cn("min-w-0 max-w-[85%] sm:max-w-[82%]", isMine ? "items-end" : "items-start")}>
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
                          {message.text && <div>{message.text}</div>}
                          {message.attachment && (
                              <button
                                  type="button"
                                  onClick={() => {
                                    const url =
                                        message.attachment?.url ||
                                        (message.attachment?.storageKey
                                            ? resolveDownloadUrl(`/uploads/${message.attachment.storageKey}`)
                                            : "");
                                    if (url) window.open(url, "_blank", "noreferrer");
                                  }}
                                  className={cn(
                                      "mt-2 flex max-w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold",
                                      isMine ? "bg-white/15 text-white" : "bg-slate-50 text-slate-700"
                                  )}
                              >
                                <Paperclip size={14} />
                                <span className="truncate">{message.attachment.fileName || "Файл"}</span>
                              </button>
                          )}
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
          <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setSelectedAttachment(file);
                window.setTimeout(() => {
                  setAttachmentNotice(file ? "Файл выбран и будет отправлен вместе с сообщением." : null);
                }, 0);
                setAttachmentNotice(
                    file
                        ? "Файл выбран и будет отправлен вместе с сообщением."
                        : null
                );
              }}
          />

          {selectedAttachment && (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <div className="min-w-0 truncate font-medium">
                  {selectedAttachment.name}
                </div>
                <button
                    type="button"
                    onClick={() => {
                      setSelectedAttachment(null);
                      setAttachmentNotice(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="shrink-0 rounded-full p-1 text-amber-700 transition hover:bg-amber-100"
                    aria-label="Clear selected file"
                >
                  <X size={14} />
                </button>
              </div>
          )}

          {attachmentNotice && (
              <div className="mb-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                {attachmentNotice}
              </div>
          )}

          {typingUsers.length > 0 && (
              <div className="mb-3 flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
                <span className="flex items-center gap-0.5" aria-hidden="true">
                  <span className="animate-bounce">•</span>
                  <span className="animate-bounce [animation-delay:120ms]">•</span>
                  <span className="animate-bounce [animation-delay:240ms]">•</span>
                </span>
                <span>
                  {typingUsers.length === 1
                      ? `${typingUsers[0].name} печатает...`
                      : `${typingUsers[0].name} и ещё ${typingUsers.length - 1} человек печатают...`}
                </span>
              </div>
          )}

          <div className="flex items-end gap-2">
            <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
            <textarea
                value={draft}
                onChange={(event) => handleDraftChange(event.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Сообщение в чат сессии..."
                className="w-full resize-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
            </div>

            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
                aria-label="Attach"
            >
              <Paperclip size={16} />
            </button>

            <button
                type="button"
                onClick={() => void handleSend()}
                disabled={(!draft.trim() && !selectedAttachment) || sending}
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
