"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Inbox,
  Loader2,
  Megaphone,
  MessageSquare,
  Search,
  Send,
  Users,
} from "lucide-react";

import { cn } from "@/lib/cn";
import { getStoredAuth } from "@/lib/api/client";
import {
  getGroupMessages,
  postGroupMessage,
  type GroupMessage,
} from "@/lib/api/teacher";

type WorkspaceRole = "teacher" | "student";
type MessagesTab = "announcements" | "chat";

export type WorkspaceGroupItem = {
  id: string;
  name: string;
  subtitle?: string | null;
  teacherName?: string | null;
};

type GroupMessagesWorkspaceProps = {
  role: WorkspaceRole;
  title: string;
  description: string;
  groups: WorkspaceGroupItem[];
  loadingGroups?: boolean;
  loadParticipantMap: (groupId: string) => Promise<Record<string, string>>;
  resolveSenderName?: (
    group: WorkspaceGroupItem,
    message: GroupMessage,
    participants: Record<string, string>
  ) => string;
  emptyGroupsTitle: string;
  emptyGroupsDescription: string;
};

function formatMessageTime(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function defaultSenderName(
  group: WorkspaceGroupItem,
  message: GroupMessage,
  participants: Record<string, string>
) {
  if (message.senderId && participants[message.senderId]) {
    return participants[message.senderId];
  }

  if (message.type === "announcement") {
    return group.teacherName?.trim() || "Преподаватель";
  }

  return "Участник группы";
}

function tabLabel(tab: MessagesTab) {
  return tab === "announcements" ? "Объявления" : "Чат";
}

export function GroupMessagesWorkspace({
  role,
  title,
  description,
  groups,
  loadingGroups = false,
  loadParticipantMap,
  resolveSenderName = defaultSenderName,
  emptyGroupsTitle,
  emptyGroupsDescription,
}: GroupMessagesWorkspaceProps) {
  const auth = useMemo(() => getStoredAuth(), []);
  const [search, setSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<MessagesTab>("chat");
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [participantMaps, setParticipantMaps] = useState<Record<string, Record<string, string>>>({});
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return groups;

    return groups.filter((group) => {
      const haystack = `${group.name} ${group.subtitle || ""} ${group.teacherName || ""}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [groups, search]);

  useEffect(() => {
    if (!filteredGroups.length) {
      setSelectedGroupId("");
      return;
    }

    if (!selectedGroupId || !filteredGroups.some((group) => group.id === selectedGroupId)) {
      setSelectedGroupId(filteredGroups[0].id);
    }
  }, [filteredGroups, selectedGroupId]);

  const selectedGroup =
    filteredGroups.find((group) => group.id === selectedGroupId) ||
    groups.find((group) => group.id === selectedGroupId) ||
    null;

  const participantMap = selectedGroupId ? participantMaps[selectedGroupId] ?? {} : {};

  const loadMessages = useCallback(async () => {
    if (!selectedGroupId) {
      setMessages([]);
      return;
    }

    setMessagesLoading(true);
    setError("");

    try {
      const next = await getGroupMessages(selectedGroupId, activeTab);
      setMessages(Array.isArray(next) ? next : []);
    } catch (err) {
      setMessages([]);
      setError(err instanceof Error ? err.message : "Не удалось загрузить сообщения.");
    } finally {
      setMessagesLoading(false);
    }
  }, [activeTab, selectedGroupId]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!selectedGroupId || participantMaps[selectedGroupId]) return;

    let cancelled = false;

    loadParticipantMap(selectedGroupId)
      .then((map) => {
        if (cancelled) return;
        setParticipantMaps((prev) => ({
          ...prev,
          [selectedGroupId]: map,
        }));
      })
      .catch(() => {
        if (cancelled) return;
        setParticipantMaps((prev) => ({
          ...prev,
          [selectedGroupId]: {},
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [loadParticipantMap, participantMaps, selectedGroupId]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [messages]);

  const canCompose = Boolean(
    selectedGroup &&
      (activeTab === "chat" || (activeTab === "announcements" && role === "teacher"))
  );

  const draftPlaceholder =
    activeTab === "announcements"
      ? "Напишите объявление для группы..."
      : role === "teacher"
      ? "Сообщение для группы..."
      : "Напишите преподавателю и группе...";

  const sendType: "announcement" | "message" =
    activeTab === "announcements" ? "announcement" : "message";

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!selectedGroupId || !text || !canCompose || sending) return;

    setSending(true);
    setError("");

    try {
      const created = await postGroupMessage(selectedGroupId, {
        type: sendType,
        text,
      });

      setMessages((prev) => [...prev, created]);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить сообщение.");
    } finally {
      setSending(false);
    }
  }, [canCompose, draft, selectedGroupId, sendType, sending]);

  return (
    <div className="min-h-screen bg-[#FAFAFB]">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-8 md:px-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1.5 text-[15px] text-slate-500">{description}</p>
        </div>

        <div className="grid min-h-[calc(100vh-220px)] grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="flex min-h-[420px] flex-col overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            <div className="border-b border-slate-100 px-5 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-bold text-slate-900">Группы</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {loadingGroups ? "Загружаем группы..." : `${groups.length} доступно`}
                  </div>
                </div>
                <div className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                  {groups.length}
                </div>
              </div>

              <div className="relative mt-4">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Поиск по группе..."
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#7448FF]/25 focus:bg-white focus:ring-4 focus:ring-[#7448FF]/10"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              {loadingGroups ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  <Loader2 size={18} className="mr-2 animate-spin" />
                  Загружаем группы...
                </div>
              ) : filteredGroups.length > 0 ? (
                <div className="space-y-2">
                  {filteredGroups.map((group) => {
                    const active = group.id === selectedGroupId;
                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => setSelectedGroupId(group.id)}
                        className={cn(
                          "w-full rounded-2xl border px-4 py-3 text-left transition-all",
                          active
                            ? "border-[#7448FF]/25 bg-[#F4F1FF]"
                            : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <div className="font-semibold text-slate-900">{group.name}</div>
                        {group.subtitle && (
                          <div className="mt-1 text-sm text-slate-500">{group.subtitle}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <Inbox size={44} strokeWidth={1.5} className="text-slate-200" />
                  <div className="mt-4 text-sm font-semibold text-slate-700">{emptyGroupsTitle}</div>
                  <div className="mt-1 text-xs leading-relaxed text-slate-400">
                    {emptyGroupsDescription}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex min-h-[420px] min-w-0 flex-col overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            {selectedGroup ? (
              <>
                <div className="border-b border-slate-100 px-6 py-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-slate-900">
                        <Users size={18} className="text-[#7448FF]" />
                        <h2 className="truncate text-xl font-bold">{selectedGroup.name}</h2>
                      </div>
                      {selectedGroup.subtitle && (
                        <p className="mt-1 text-sm text-slate-500">{selectedGroup.subtitle}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(["chat", "announcements"] as const).map((tab) => {
                        const active = activeTab === tab;
                        return (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                              active
                                ? "border-[#7448FF]/25 bg-[#F4F1FF] text-[#7448FF]"
                                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                            )}
                          >
                            {tab === "announcements" ? <Megaphone size={16} /> : <MessageSquare size={16} />}
                            {tabLabel(tab)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div
                  ref={listRef}
                  className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50/40 px-6 py-6"
                >
                  {messagesLoading ? (
                    <div className="rounded-2xl bg-white px-4 py-6 text-sm text-slate-400 shadow-sm">
                      Загружаем сообщения...
                    </div>
                  ) : messages.length > 0 ? (
                    messages.map((message) => {
                      const senderName = resolveSenderName(selectedGroup, message, participantMap);
                      const isMine = Boolean(auth?.id && message.senderId === auth.id);

                      return (
                        <div
                          key={message.id}
                          className={cn("flex", isMine ? "justify-end" : "justify-start")}
                        >
                          <div className={cn("max-w-[88%] min-w-0", isMine ? "items-end" : "items-start")}>
                            <div className="mb-1 px-1 text-[11px] font-semibold text-slate-500">
                              {isMine ? "Вы" : senderName}
                            </div>
                            <div
                              className={cn(
                                "rounded-2xl px-4 py-3 text-sm shadow-sm",
                                message.type === "announcement"
                                  ? "border border-amber-100 bg-amber-50 text-slate-800"
                                  : isMine
                                  ? "bg-[#7448FF] text-white"
                                  : "border border-slate-100 bg-white text-slate-800"
                              )}
                            >
                              <div className="break-words whitespace-pre-wrap">{message.text}</div>
                            </div>
                            <div className="mt-1 px-1 text-[10px] text-slate-400">
                              {formatMessageTime(message.createdAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
                      {activeTab === "announcements" ? (
                        <Megaphone size={34} className="text-slate-300" />
                      ) : (
                        <MessageSquare size={34} className="text-slate-300" />
                      )}
                      <div className="mt-4 text-sm font-semibold text-slate-700">
                        {activeTab === "announcements"
                          ? "Пока нет объявлений"
                          : "Пока нет сообщений в чате"}
                      </div>
                      <div className="mt-1 max-w-md text-xs leading-relaxed text-slate-400">
                        {activeTab === "announcements"
                          ? "Первое объявление появится здесь после публикации преподавателем."
                          : "Начните диалог с преподавателем и участниками вашей группы."}
                      </div>
                    </div>
                  )}
                </div>

                <div className="shrink-0 border-t border-slate-100 bg-white px-6 py-4">
                  {error && (
                    <div className="mb-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  {canCompose ? (
                    <div className="flex items-end gap-3">
                      <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <textarea
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" && !event.shiftKey) {
                              event.preventDefault();
                              void handleSend();
                            }
                          }}
                          rows={1}
                          placeholder={draftPlaceholder}
                          className="min-h-[24px] w-full resize-none bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => void handleSend()}
                        disabled={!draft.trim() || sending}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#7448FF] text-white transition-opacity disabled:opacity-50"
                        aria-label="Send"
                      >
                        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      В разделе объявлений писать может только преподаватель. Переключитесь на чат, чтобы отправить сообщение.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
                <MessageSquare size={40} className="text-slate-300" />
                <div className="mt-4 text-lg font-semibold text-slate-900">Выберите группу</div>
                <div className="mt-1 max-w-md text-sm text-slate-500">
                  Когда группа выбрана, здесь появится история сообщений и объявлений.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
