"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { cn } from "@/lib/cn";
import { formatSessionDateTime, parseSessionTimestamp } from "@/lib/utils/sessionCalendar";
import {
  getTeacherAllSessions,
  updateSessionStatus,
  type GroupSession,
} from "@/lib/api/teacher";

import {
  Search,
  Plus,
  Video,
  PlayCircle,
  BookOpen,
  ClipboardList,
  Calendar as CalendarIcon,
  ArrowRight,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

type TabValue = "all" | "live" | "upcoming" | "ended";

const statusToBackend = (next: GroupSession["status"]): "active" | "finished" | "draft" =>
  next === "live" ? "active" : next === "ended" ? "finished" : "draft";

const tabs: Array<{ id: TabValue; label: string }> = [
  { id: "all", label: "Все сессии" },
  { id: "live", label: "Активные" },
  { id: "upcoming", label: "Запланированные" },
  { id: "ended", label: "Завершённые" },
];

function getIconForSession(type: GroupSession["type"], status: GroupSession["status"]) {
  if (status === "live") {
    return { icon: PlayCircle, color: "text-emerald-600", bg: "bg-emerald-50" };
  }

  if (type === "exam") {
    return { icon: ClipboardList, color: "text-amber-600", bg: "bg-amber-50" };
  }

  return { icon: BookOpen, color: "text-[#7448FF]", bg: "bg-[#F4F1FF]" };
}

function getStatusMeta(status: GroupSession["status"]) {
  if (status === "live") {
    return {
      label: "Активная",
      badgeClass: "bg-emerald-50 text-emerald-700",
      lifecycleLabel: "Завершить",
      nextStatus: "ended" as const,
    };
  }

  if (status === "ended") {
    return {
      label: "Завершена",
      badgeClass: "bg-slate-100 text-slate-600",
      lifecycleLabel: "Открыть снова",
      nextStatus: "upcoming" as const,
    };
  }

  return {
    label: "Запланирована",
    badgeClass: "bg-orange-50 text-orange-700",
    lifecycleLabel: "Начать",
    nextStatus: "live" as const,
  };
}

function getSessionTimestamp(session: GroupSession): string | null {
  return session.startsAt ?? session.createdAt ?? null;
}

function getSessionTimingCopy(session: GroupSession): string {
  const timestamp = getSessionTimestamp(session);
  if (!timestamp) return "Время не назначено в backend";

  const parsed = parseSessionTimestamp(timestamp);
  if (!parsed) return "Время не назначено в backend";

  const prefix =
    session.status === "live"
      ? "Идёт сейчас"
      : session.status === "upcoming"
        ? "Запланировано"
        : "Проведена";

  return `${prefix} · ${formatSessionDateTime(timestamp)}`;
}

function getActionHref(session: GroupSession): string {
  if (session.status === "ended") {
    return `/teacher/session/${session.id}/analytics`;
  }

  return `/teacher/session/${session.id}`;
}

function getActionLabel(session: GroupSession): string {
  if (session.status === "live") return "Открыть монитор";
  if (session.status === "ended") return "Открыть отчет";
  return "Открыть сессию";
}

export default function TeacherSessionsPage() {
  const [tick, setTick] = useState(0);
  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [confirmEndSession, setConfirmEndSession] = useState<GroupSession | null>(null);

  const [q, setQ] = useState("");
  const [activeTab, setActiveTab] = useState<TabValue>("all");

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTeacherAllSessions();
      setSessions(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions, tick]);

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();

    const byTab = sessions.filter((session) => {
      if (activeTab === "all") return true;
      return session.status === activeTab;
    });

    const bySearch = byTab.filter((session) => {
      if (!search) return true;

      const haystack = [session.title, session.groupName, session.groupId, session.type, session.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search);
    });

    return [...bySearch].sort((left, right) => {
      const leftTs = parseSessionTimestamp(getSessionTimestamp(left))?.getTime() ?? 0;
      const rightTs = parseSessionTimestamp(getSessionTimestamp(right))?.getTime() ?? 0;
      return rightTs - leftTs;
    });
  }, [sessions, q, activeTab]);

  const counts = useMemo(
    () => ({
      all: sessions.length,
      live: sessions.filter((session) => session.status === "live").length,
      upcoming: sessions.filter((session) => session.status === "upcoming").length,
      ended: sessions.filter((session) => session.status === "ended").length,
    }),
    [sessions]
  );

  const handleLifecycle = async (session: GroupSession) => {
    const nextStatus = getStatusMeta(session.status).nextStatus;

    setActioningId(session.id);
    setConfirmEndSession(null);

    try {
      await updateSessionStatus(session.id, statusToBackend(nextStatus));
      setTick((value) => value + 1);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#FAFAFB] pb-16 pt-8 md:pt-12">
      <div className="mx-auto max-w-[1240px] px-4 md:px-8">
        <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span>{counts.all} всего</span>
              <span>•</span>
              <span>{counts.live} live</span>
              <span>•</span>
              <span>{counts.upcoming} запланировано</span>
            </div>

            <h1 className="mb-6 mt-2 text-[32px] font-bold tracking-tight text-slate-900">Сессии</h1>

            <div className="flex flex-wrap items-center gap-6 border-b border-slate-200">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative pb-3 text-[14px] font-bold transition-colors",
                    activeTab === tab.id ? "text-[#7448FF]" : "text-slate-400 hover:text-slate-700"
                  )}
                >
                  {tab.label}
                  <span className="ml-2 text-slate-400">
                    {tab.id === "all"
                      ? counts.all
                      : tab.id === "live"
                        ? counts.live
                        : tab.id === "upcoming"
                          ? counts.upcoming
                          : counts.ended}
                  </span>
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 h-[3px] w-full rounded-t-full bg-[#7448FF]" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <Link
            href="/teacher/sessions/new"
            className="mb-1 inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-[#7448FF] px-5 py-2.5 text-[14px] font-bold text-white shadow-sm transition-colors hover:bg-[#623ce6] md:self-auto"
          >
            <Plus size={18} />
            Создать сессию
          </Link>
        </div>

        <div className="mb-6 flex items-center gap-4">
          <div className="relative max-w-xl flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по сессиям..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-[14px] outline-none transition-colors hover:border-slate-300 focus:border-[#7448FF] shadow-sm"
            />
          </div>
        </div>

        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-28 rounded-[16px] bg-surface-subtle/50 animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <div className="rounded-[20px] border border-slate-100 bg-white py-16 text-center shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <Video size={48} className="mx-auto mb-4 text-slate-200" />
              <h3 className="text-lg font-bold text-slate-900">Сессии не найдены</h3>
              <p className="mx-auto mt-1 max-w-sm text-[14px] text-slate-500">
                Либо в этой категории пока нет сессий, либо поиск не дал совпадений.
              </p>
            </div>
          ) : (
            filtered.map((session) => {
              const { icon: Icon, bg, color } = getIconForSession(session.type, session.status);
              const statusMeta = getStatusMeta(session.status);
              const isEnding = session.status === "live";
              const groupLabel = session.groupName?.trim() || session.groupId;

              return (
                <div
                  key={session.id}
                  className="group rounded-[20px] border border-slate-100 bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all hover:border-slate-200 hover:shadow-md"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-4">
                        <div
                          className={cn(
                            "flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px]",
                            bg,
                            color
                          )}
                        >
                          <Icon size={22} strokeWidth={1.8} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-[16px] font-bold text-slate-900">{session.title}</h3>
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                                statusMeta.badgeClass
                              )}
                            >
                              {statusMeta.label}
                            </span>
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                              {session.type === "exam" ? "Экзамен" : "Занятие"}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-slate-500">
                            <span className="font-medium text-slate-600">Группа {groupLabel}</span>
                            <span className="flex items-center gap-1.5">
                              <CalendarIcon size={14} />
                              {getSessionTimingCopy(session)}
                            </span>
                          </div>

                          <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-[12px] text-slate-500">
                            {session.status === "live"
                              ? "Состав участников и live-метрики доступны в мониторе сессии."
                              : session.status === "ended"
                                ? "Детальная аналитика и история доступны на странице отчёта."
                                : "Сессия создана, но backend ещё не передаёт отдельные поля расписания и состава участников."}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                      <Link
                        href={getActionHref(session)}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold transition-colors",
                          session.status === "live"
                            ? "bg-[#7448FF] text-white shadow-sm hover:bg-[#623ce6]"
                            : "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                        )}
                      >
                        {getActionLabel(session)}
                        <ArrowRight size={15} />
                      </Link>

                      <Button
                        variant="ghost"
                        disabled={actioningId === session.id}
                        className="rounded-xl px-4 py-2.5 text-[13px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        onClick={() => {
                          if (isEnding) {
                            setConfirmEndSession(session);
                            return;
                          }

                          void handleLifecycle(session);
                        }}
                      >
                        {actioningId === session.id ? "Обновляем..." : statusMeta.lifecycleLabel}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {filtered.length > 0 && (
          <div className="mt-6 rounded-[16px] border border-slate-100 bg-white px-4 py-3 text-sm text-slate-500 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            Показано {filtered.length} {filtered.length === 1 ? "сессия" : filtered.length < 5 ? "сессии" : "сессий"}.
            Отдельная пагинация не нужна, пока backend возвращает компактный список.
          </div>
        )}
      </div>

      <Modal
        open={!!confirmEndSession}
        onClose={() => setConfirmEndSession(null)}
        title="Завершить сессию?"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmEndSession(null)}>
              Отмена
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-600"
              onClick={() => confirmEndSession && void handleLifecycle(confirmEndSession)}
            >
              Завершить
            </Button>
          </div>
        }
      >
        {confirmEndSession && (
          <p className="text-sm text-slate-500">
            Сессия «{confirmEndSession.title}» будет завершена. Участники будут отключены, а live-монитор
            перейдёт в состояние завершённой сессии.
          </p>
        )}
      </Modal>
    </div>
  );
}
