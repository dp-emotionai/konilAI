"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useUI } from "@/components/layout/Providers";
import { cn } from "@/lib/cn";
import {
  getStudentSessionsList,
  getInvitations,
  acceptInvitation,
  declineInvitation,
  getStudentGroups,
  type StudentSessionRow,
  type InvitationRow,
  type StudentGroupRow,
} from "@/lib/api/student";
import { getApiBaseUrl, getStoredAuth, hasAuth } from "@/lib/api/client";
import {
  VideoIcon,
  Users2,
  CalendarDays,
  MenuSquare,
  MessageSquare,
  ArrowRight,
  ChevronRight,
  Bell,
  Clock,
  ChevronLeft,
} from "lucide-react";
import {
  buildMonthCells,
  formatSessionTime,
  isSameCalendarDay,
  parseSessionTimestamp,
} from "@/lib/utils/sessionCalendar";

export default function StudentDashboardPage() {
  const { state } = useUI();
  const [sessions, setSessions] = useState<StudentSessionRow[]>([]);
  const [groups, setGroups] = useState<StudentGroupRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const apiAvailable = getApiBaseUrl() && hasAuth();
  const [displayName, setDisplayName] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionData, groupData, invitationData] = await Promise.all([
        getStudentSessionsList(),
        getStudentGroups(),
        getInvitations(),
      ]);
      setSessions(sessionData);
      setGroups(groupData);
      setInvitations(invitationData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (apiAvailable) {
      fetchAll();
    } else {
      setLoading(false);
    }
  }, [apiAvailable, fetchAll]);

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth?.fullName) setDisplayName(auth.fullName);
    else if (auth?.firstName) setDisplayName(auth.firstName);
    else if (auth?.email) setDisplayName(auth.email.split("@")[0] || auth.email);
  }, [state.loggedIn]);

  const upcoming = useMemo(
    () => sessions.filter((session) => session.status === "upcoming").slice(0, 3),
    [sessions]
  );
  const live = useMemo(
    () => sessions.filter((session) => session.status === "live"),
    [sessions]
  );
  const monthCells = useMemo(() => buildMonthCells(currentDate), [currentDate]);
  const sessionsThisMonth = useMemo(
    () =>
      sessions.filter((session) => {
        const parsed = parseSessionTimestamp(session.scheduledAt ?? session.date);
        return (
          parsed &&
          parsed.getFullYear() === currentDate.getFullYear() &&
          parsed.getMonth() === currentDate.getMonth()
        );
      }),
    [currentDate, sessions]
  );

  return (
    <div className="min-h-screen bg-[#FAFAFB]">
      <div className="mx-auto max-w-[1440px] space-y-8 px-4 py-8 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-slate-900">
              Привет, {displayName ?? "студент"}!
            </h1>
            <p className="mt-1.5 text-[15px] text-slate-500">
              Продолжай учиться и следи за ближайшими занятиями по реальному расписанию.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-8 xl:grid-cols-[1fr_340px]">
          <div className="min-w-0 space-y-8">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="flex h-[120px] flex-col justify-between rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                <div className="flex items-start gap-3 text-slate-600">
                  <div className="rounded-xl bg-purple-50 p-2 text-purple-600">
                    <VideoIcon size={20} strokeWidth={2.5} />
                  </div>
                  <span className="my-auto text-[13px] font-medium">Мои сессии</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-slate-900">{sessions.length}</span>
                  <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-600">
                    {live.length} активные
                  </span>
                </div>
              </div>

              <div className="flex h-[120px] flex-col justify-between rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                <div className="flex items-start gap-3 text-slate-600">
                  <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                    <Users2 size={20} strokeWidth={2.5} />
                  </div>
                  <span className="my-auto text-[13px] font-medium">Мои группы</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-slate-900">{groups.length}</span>
                </div>
              </div>

              <div className="flex h-[120px] flex-col justify-between rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                <div className="flex items-start gap-3 text-slate-600">
                  <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
                    <Clock size={20} strokeWidth={2.5} />
                  </div>
                  <span className="my-auto text-[13px] font-medium">Ближайшие</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-slate-900">{upcoming.length}</span>
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                    запланировано
                  </span>
                </div>
              </div>

              <div className="flex h-[120px] flex-col justify-between rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                <div className="flex items-start gap-3 text-slate-600">
                  <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                    <CalendarDays size={20} strokeWidth={2.5} />
                  </div>
                  <span className="my-auto text-[13px] font-medium">В этом месяце</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-slate-900">{sessionsThisMonth.length}</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                    по расписанию
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-semibold text-slate-900">Ближайшие занятия</h3>
                  <Link href="/student/sessions" className="text-xs font-medium text-purple-600 hover:opacity-80">
                    Смотреть все
                  </Link>
                </div>
                <div className="space-y-1 rounded-3xl border border-slate-100 bg-white p-2 text-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                  {upcoming.length > 0 || live.length > 0 ? (
                    [...live, ...upcoming].slice(0, 2).map((session, index) => (
                      <div
                        key={session.id}
                        className={cn(
                          "flex items-center justify-between rounded-2xl p-3",
                          index === 0 && "bg-slate-50/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "rounded-xl p-2",
                              session.status === "live"
                                ? "bg-purple-100 text-purple-600"
                                : "bg-slate-100 text-slate-500"
                            )}
                          >
                            <VideoIcon size={16} />
                          </div>
                          <div>
                            <div className="max-w-[150px] truncate font-medium text-slate-900">
                              {session.title}
                            </div>
                            <div className="max-w-[150px] truncate text-xs text-slate-400">
                              {session.teacher}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end text-right">
                          <span className="text-xs text-slate-500">
                            {session.date || "Дата не указана"}
                          </span>
                          {session.status === "live" ? (
                            <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-500">
                              Сейчас
                            </span>
                          ) : (
                            <span className="mt-0.5 text-[10px] font-medium text-amber-500">
                              Запланировано
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 py-8 text-center text-xs text-slate-400">
                      Нет предстоящих занятий
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-semibold text-slate-900">
                    Приглашения{" "}
                    <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                      {invitations.length}
                    </span>
                  </h3>
                </div>
                <div className="space-y-1 rounded-3xl border border-slate-100 bg-white p-2 text-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                  {invitations.length > 0 ? (
                    invitations.slice(0, 2).map((invitation, index) => (
                      <div
                        key={invitation.id}
                        className={cn(
                          "flex items-center justify-between rounded-2xl p-3",
                          index === 0 && "bg-slate-50/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-blue-50 p-2 text-blue-500">
                            <Users2 size={16} />
                          </div>
                          <div>
                            <div className="max-w-[120px] truncate font-medium text-slate-900">
                              {invitation.groupName || "Группа"}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-400">
                              Требуется реакция
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => declineInvitation(invitation.id).then(fetchAll)}
                            className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
                          >
                            Отклонить
                          </button>
                          <button
                            onClick={() => acceptInvitation(invitation.id).then(fetchAll)}
                            className="rounded-lg bg-purple-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-purple-700"
                          >
                            Принять
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 py-8 text-center text-xs text-slate-400">
                      Нет активных приглашений
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-[15px] font-semibold text-slate-900">Быстрый доступ</h3>
              <div className="grid grid-cols-3 gap-3">
                <Link
                  href="/student/resources"
                  className="group relative flex h-[90px] flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-[#7448FF] to-[#8c67fd] p-4 text-white transition-shadow hover:shadow-lg"
                >
                  <div className="absolute right-0 top-0 p-4 opacity-10 transition-transform group-hover:scale-110">
                    <MenuSquare size={40} />
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="rounded-lg bg-white/20 p-1.5">
                      <MenuSquare size={14} />
                    </span>
                    Мои материалы
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/80">
                    Перейти к материалам
                    <ArrowRight size={14} />
                  </div>
                </Link>

                <Link
                  href="/student/calendar"
                  className="group relative flex h-[90px] flex-col justify-between overflow-hidden rounded-3xl border border-blue-50 bg-[#EBF2FF] p-4 text-[#1D4ED8] transition-shadow hover:shadow-md"
                >
                  <div className="absolute right-0 top-0 p-4 opacity-5 transition-transform group-hover:scale-110">
                    <CalendarDays size={40} />
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    <span className="rounded-lg bg-blue-500 p-1.5 text-white">
                      <CalendarDays size={14} />
                    </span>
                    Календарь
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    Посмотреть расписание
                    <ArrowRight size={14} />
                  </div>
                </Link>

                <Link
                  href="/student/messages"
                  className="group relative flex h-[90px] flex-col justify-between overflow-hidden rounded-3xl border border-orange-50 bg-[#FFF4ED] p-4 text-[#C2410C] transition-shadow hover:shadow-md"
                >
                  <div className="absolute right-0 top-0 p-4 opacity-5 transition-transform group-hover:scale-110">
                    <MessageSquare size={40} />
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    <span className="rounded-lg bg-orange-500 p-1.5 text-white">
                      <MessageSquare size={14} />
                    </span>
                    Сообщения
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    Написать преподавателю
                    <ArrowRight size={14} />
                  </div>
                </Link>
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[15px] font-semibold text-slate-900">Мои сессии</h3>
                <Link href="/student/sessions" className="text-xs font-medium text-purple-600 hover:opacity-80">
                  Смотреть все
                </Link>
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white text-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                <div className="grid grid-cols-12 gap-4 border-b border-slate-50 px-6 py-4 text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  <div className="col-span-4">Сессия</div>
                  <div className="col-span-2">Тип</div>
                  <div className="col-span-3">Время</div>
                  <div className="col-span-2">Статус</div>
                  <div className="col-span-1 min-w-[50px] text-right" />
                </div>

                <div className="divide-y divide-slate-50">
                  {sessions.length > 0 ? (
                    sessions.slice(0, 5).map((session) => (
                      <div
                        key={session.id}
                        className="group grid grid-cols-12 items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50/50"
                      >
                        <div className="col-span-4 flex items-center gap-3">
                          <span
                            className={cn(
                              "h-1.5 w-1.5 shrink-0 rounded-full",
                              session.status === "live"
                                ? "bg-emerald-500"
                                : session.status === "upcoming"
                                ? "bg-amber-400"
                                : "bg-slate-300"
                            )}
                          />
                          <div className="truncate font-medium text-slate-900">{session.title}</div>
                        </div>
                        <div className="col-span-2 truncate text-xs text-slate-500">
                          {session.type === "exam" ? "Экзамен" : "Лекция"}
                        </div>
                        <div className="col-span-3 text-xs text-slate-500">
                          {session.date || "Не указано"}
                        </div>
                        <div className="col-span-2">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-[10px] font-medium",
                              session.status === "live"
                                ? "bg-emerald-50 text-emerald-600"
                                : session.status === "upcoming"
                                ? "bg-amber-50 text-amber-600"
                                : "bg-slate-100 text-slate-500"
                            )}
                          >
                            {session.status === "live"
                              ? "Активная"
                              : session.status === "upcoming"
                              ? "Предстоит"
                              : "Завершена"}
                          </span>
                        </div>
                        <div className="col-span-1 flex justify-end text-right">
                          <Link
                            href={`/student/session/${session.id}`}
                            className="text-xs font-medium text-purple-600 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            Перейти
                          </Link>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-sm text-slate-400">
                      Вы пока не прикреплены к активным сессиям
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
              <div className="mb-4 flex items-center justify-between">
                <button
                  onClick={() =>
                    setCurrentDate(
                      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                    )
                  }
                  className="text-slate-400 hover:text-slate-900"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-[13px] font-semibold uppercase text-slate-900">
                  {currentDate.toLocaleString("ru-RU", { month: "long" })}{" "}
                  <span className="font-medium text-slate-500">{currentDate.getFullYear()}</span>
                </span>
                <button
                  onClick={() =>
                    setCurrentDate(
                      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                    )
                  }
                  className="text-slate-400 hover:text-slate-900"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
                  <div
                    key={day}
                    className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400"
                  >
                    {day}
                  </div>
                ))}

                {monthCells.map(({ date, inCurrentMonth }) => {
                  const daySessions = sessions.filter((session) => {
                    const parsed = parseSessionTimestamp(session.scheduledAt ?? session.date);
                    return parsed ? isSameCalendarDay(parsed, date) : false;
                  });

                  return (
                    <div
                      key={date.toISOString()}
                      className={cn(
                        "min-h-[58px] rounded-2xl border p-2",
                        inCurrentMonth
                          ? "border-slate-100 bg-slate-50/50"
                          : "border-slate-100 bg-white opacity-45"
                      )}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-semibold text-slate-600">
                          {date.getDate()}
                        </span>
                        {daySessions.length > 0 && (
                          <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-[#7448FF] shadow-sm">
                            {daySessions.length}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4 text-xs font-medium text-purple-600">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={14} />
                    <span>{sessionsThisMonth.length} сессий в этом месяце</span>
                  </div>
                  <Link href="/student/calendar" className="inline-flex items-center gap-1">
                    Открыть
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-[14px] font-semibold text-slate-900">Уведомления</h3>
              </div>

              <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                <Bell size={24} className="mb-3 text-slate-300" strokeWidth={1.5} />
                <div className="text-center text-xs font-medium">Нет новых уведомлений</div>
                <div className="mt-1 text-[10px] text-slate-300">
                  Ожидайте новых сообщений системы
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-1.5 px-2 text-center text-[11px] text-slate-400">
              <div>© 2026 KonilAI. Все права защищены.</div>
              <div className="flex items-center justify-center gap-4">
                <Link href="#" className="hover:text-slate-600">
                  Поддержка
                </Link>
                <Link href="#" className="hover:text-slate-600">
                  Документация
                </Link>
                <Link href="#" className="hover:text-slate-600">
                  Политика
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
