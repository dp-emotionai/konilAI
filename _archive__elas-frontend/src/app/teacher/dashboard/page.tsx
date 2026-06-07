"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { getTeacherDashboardSessions, type TeacherDashboardSession } from "@/lib/api/teacher";
import { getStoredAuth, hasAuth, api } from "@/lib/api/client";
import {
  Video,
  Users,
  ClipboardList,
  Clock,
  Plus,
  BarChart2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Database,
} from "lucide-react";
import {
  buildMonthCells,
  formatSessionDateTime,
  formatSessionTime,
  isSameCalendarDay,
  isToday,
  parseSessionTimestamp,
} from "@/lib/utils/sessionCalendar";

type MeRes = {
  id: string;
  email: string;
  role: string;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
};

function KPI({
  icon: Icon,
  title,
  value,
  subtitle,
  iconBg,
  iconColor,
}: {
  icon: ComponentType<{ size?: number }>;
  title: string;
  value: string;
  subtitle: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
      <div>
        <div
          className={cn(
            "mb-4 flex h-10 w-10 items-center justify-center rounded-xl",
            iconBg,
            iconColor
          )}
        >
          <Icon size={20} />
        </div>
        <div className="mb-1 text-[13px] font-medium text-slate-500">{title}</div>
        <div className="mb-2 text-3xl font-bold text-slate-900">{value}</div>
      </div>
      <div className="text-[11px] font-medium text-slate-500">{subtitle}</div>
    </div>
  );
}

function QuickAccessCard({
  icon: Icon,
  title,
  subtitle,
  bgClass,
  textClass,
  href,
}: {
  icon: ComponentType<{ size?: number }>;
  title: string;
  subtitle: string;
  bgClass: string;
  textClass: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn("block rounded-2xl p-5 transition-transform hover:-translate-y-0.5", bgClass)}
    >
      <div className="mb-3 flex items-start justify-between">
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl bg-white/50",
            textClass
          )}
        >
          <Icon size={20} />
        </div>
        <div className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white/40 text-slate-900 transition-colors hover:bg-white/60">
          <Plus size={14} />
        </div>
      </div>
      <div>
        <div className="text-[15px] font-bold text-slate-900">{title}</div>
        <div className="mt-0.5 text-[12px] leading-tight text-slate-600">{subtitle}</div>
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: TeacherDashboardSession["status"] }) {
  if (status === "active") {
    return (
      <span className="rounded bg-emerald-50 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-600">
        Активная
      </span>
    );
  }
  if (status === "draft") {
    return (
      <span className="rounded bg-orange-50 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-orange-600">
        Запланирована
      </span>
    );
  }
  return (
    <span className="rounded bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">
      Завершена
    </span>
  );
}

export default function TeacherDashboard() {
  const [sessions, setSessions] = useState<TeacherDashboardSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeRes | null>(null);
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const auth = getStoredAuth();
        if (auth && mounted) {
          setMe({
            id: "local",
            email: auth.email,
            role: auth.role,
            fullName: auth.fullName,
            firstName: auth.firstName,
            lastName: auth.lastName,
          });
        }
        if (hasAuth()) {
          api
            .get<MeRes>("auth/me")
            .then((data) => {
              if (mounted) setMe(data);
            })
            .catch(() => {});
        }
        const data = await getTeacherDashboardSessions();
        if (mounted) setSessions(data);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, []);

  const firstName =
    me?.firstName || (me?.fullName ? me.fullName.split(" ")[0] : "Преподаватель");

  const liveSessions = useMemo(
    () => sessions.filter((session) => session.status === "active"),
    [sessions]
  );
  const scheduledSessions = useMemo(
    () => sessions.filter((session) => session.status === "draft"),
    [sessions]
  );
  const finishedSessions = useMemo(
    () => sessions.filter((session) => session.status === "finished"),
    [sessions]
  );
  const activeGroups = useMemo(
    () => new Set(sessions.map((session) => session.group).filter(Boolean)).size,
    [sessions]
  );
  const sessionsToday = useMemo(
    () =>
      sessions.filter((session) => {
        const parsed = parseSessionTimestamp(session.date);
        return parsed ? isToday(parsed) : false;
      }).length,
    [sessions]
  );
  const monthCells = useMemo(() => buildMonthCells(currentDate), [currentDate]);
  const monthSessions = useMemo(
    () =>
      sessions.filter((session) => {
        const parsed = parseSessionTimestamp(session.date);
        return (
          parsed &&
          parsed.getFullYear() === currentDate.getFullYear() &&
          parsed.getMonth() === currentDate.getMonth()
        );
      }),
    [currentDate, sessions]
  );

  const upcomingList = useMemo(
    () =>
      [...liveSessions, ...scheduledSessions]
        .sort((left, right) => {
          const leftTime = parseSessionTimestamp(left.date)?.getTime() ?? 0;
          const rightTime = parseSessionTimestamp(right.date)?.getTime() ?? 0;
          return leftTime - rightTime;
        })
        .slice(0, 3),
    [liveSessions, scheduledSessions]
  );

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#FAFAFB] pb-16 pt-8 md:pt-12">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-10">
            <div>
              <h1 className="flex items-center gap-3 text-[32px] font-bold tracking-tight text-slate-900">
                Добрый день, {firstName}
              </h1>
              <p className="mt-2 text-[15px] text-slate-500">
                У вас{" "}
                <span className="font-semibold text-slate-700">
                  {liveSessions.length} активных сессий
                </span>{" "}
                и{" "}
                <span className="font-semibold text-slate-700">
                  {scheduledSessions.length} запланированных занятий
                </span>{" "}
                на текущий период.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KPI
                icon={Video}
                title="Активные сессии"
                value={String(liveSessions.length)}
                subtitle="По реальным live-сессиям"
                iconBg="bg-purple-50"
                iconColor="text-[#7448FF]"
              />
              <KPI
                icon={Users}
                title="Группы"
                value={String(activeGroups)}
                subtitle="Уникальные группы сессий"
                iconBg="bg-blue-50"
                iconColor="text-blue-500"
              />
              <KPI
                icon={ClipboardList}
                title="Сегодня"
                value={String(sessionsToday)}
                subtitle="Сессий на текущую дату"
                iconBg="bg-pink-50"
                iconColor="text-pink-500"
              />
              <KPI
                icon={Clock}
                title="Завершено"
                value={String(finishedSessions.length)}
                subtitle="История завершённых уроков"
                iconBg="bg-orange-50"
                iconColor="text-orange-500"
              />
            </div>

            <div>
              <h2 className="mb-5 text-[17px] font-bold text-slate-900">Быстрый доступ</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <QuickAccessCard
                  icon={Video}
                  title="Новая сессия"
                  subtitle="Создать новую сессию"
                  bgClass="bg-[#F0ECFF]"
                  textClass="text-[#7448FF]"
                  href="/teacher/sessions/new"
                />
                <QuickAccessCard
                  icon={Users}
                  title="Мои группы"
                  subtitle="Управление группами и студентами"
                  bgClass="bg-[#EBF5FF]"
                  textClass="text-blue-600"
                  href="/teacher/groups"
                />
                <QuickAccessCard
                  icon={BarChart2}
                  title="Отчёты"
                  subtitle="Открыть раздел аналитики"
                  bgClass="bg-[#FFF7ED]"
                  textClass="text-orange-600"
                  href="/teacher/reports"
                />
              </div>
            </div>

            <div>
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-[17px] font-bold text-slate-900">Недавние сессии</h2>
              </div>
              <div className="overflow-hidden rounded-[20px] border border-slate-100 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="px-6 py-4 text-[12px] font-medium text-slate-400">
                          Сессия
                        </th>
                        <th className="px-6 py-4 text-[12px] font-medium text-slate-400">
                          Группа
                        </th>
                        <th className="px-6 py-4 text-[12px] font-medium text-slate-400">
                          Время
                        </th>
                        <th className="px-6 py-4 text-[12px] font-medium text-slate-400">
                          Статус
                        </th>
                        <th className="px-6 py-4 text-right text-[12px] font-medium text-slate-400">
                          Действия
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                            Загрузка сессий...
                          </td>
                        </tr>
                      ) : sessions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                            Нет недавних сессий.
                          </td>
                        </tr>
                      ) : (
                        sessions.slice(0, 5).map((session) => (
                          <tr
                            key={session.id}
                            className="border-b border-slate-50 transition-colors hover:bg-slate-50"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <span
                                  className={cn(
                                    "h-2 w-2 rounded-full",
                                    session.status === "active"
                                      ? "bg-emerald-500"
                                      : session.status === "finished"
                                      ? "bg-purple-500"
                                      : "bg-orange-500"
                                  )}
                                />
                                <span className="text-[14px] font-semibold text-slate-900">
                                  {session.title}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-[13px] font-medium text-slate-600">
                              {session.group || "Без группы"}
                            </td>
                            <td className="px-6 py-4 text-[13px] text-slate-500">
                              {formatSessionDateTime(session.date)}
                            </td>
                            <td className="px-6 py-4">
                              <StatusBadge status={session.status} />
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Link
                                href={`/teacher/session/${session.id}`}
                                className="text-[13px] font-semibold text-[#7448FF] transition-colors hover:text-[#623ce6]"
                              >
                                Открыть
                              </Link>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="rounded-[20px] border border-slate-100 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
              <div className="mb-6 flex items-center justify-between">
                <button
                  onClick={() =>
                    setCurrentDate(
                      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                    )
                  }
                  className="text-slate-400 transition-colors hover:text-slate-700"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="text-[15px] font-bold capitalize text-slate-900">
                  {currentDate.toLocaleString("ru-RU", { month: "long" })}{" "}
                  <span className="ml-1 font-medium text-slate-400">
                    {currentDate.getFullYear()}
                  </span>
                </div>
                <button
                  onClick={() =>
                    setCurrentDate(
                      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                    )
                  }
                  className="text-slate-400 transition-colors hover:text-slate-700"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
                  <div
                    key={day}
                    className="pb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                  >
                    {day}
                  </div>
                ))}

                {monthCells.map(({ date, inCurrentMonth }) => {
                  const daySessions = sessions.filter((session) => {
                    const parsed = parseSessionTimestamp(session.date);
                    return parsed ? isSameCalendarDay(parsed, date) : false;
                  });

                  return (
                    <div
                      key={date.toISOString()}
                      className={cn(
                        "min-h-[72px] rounded-2xl border p-2.5",
                        inCurrentMonth
                          ? "border-slate-100 bg-slate-50/40"
                          : "border-slate-100 bg-white opacity-45"
                      )}
                    >
                      <div
                        className={cn(
                          "text-xs font-semibold",
                          isToday(date)
                            ? "inline-flex rounded-full bg-slate-900 px-2 py-0.5 text-white"
                            : "text-slate-600"
                        )}
                      >
                        {date.getDate()}
                      </div>

                      {daySessions.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {daySessions.slice(0, 2).map((session) => (
                            <div
                              key={session.id}
                              className="truncate rounded-lg bg-white px-2 py-1 text-[10px] font-medium text-slate-600 shadow-sm"
                            >
                              {session.title}
                            </div>
                          ))}
                          {daySessions.length > 2 && (
                            <div className="text-[10px] font-medium text-slate-400">
                              +{daySessions.length - 2}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center justify-between rounded-[14px] bg-purple-50 p-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#7448FF] shadow-sm">
                    <CalendarIcon size={18} />
                  </div>
                  <div>
                    <div className="text-[14px] font-bold text-[#7448FF]">В календаре</div>
                    <div className="mt-0.5 text-[12px] font-medium text-purple-400">
                      {monthSessions.length} сессий в текущем месяце
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[16px] font-bold text-slate-900">Ближайшие занятия</h3>
                <Link href="/teacher/sessions" className="text-[12px] font-semibold text-[#7448FF]">
                  Показать все
                </Link>
              </div>

              <div className="space-y-3">
                {upcomingList.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-start justify-between rounded-[16px] border border-slate-100 bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                          session.status === "active"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-orange-50 text-orange-600"
                        )}
                      >
                        {session.status === "active" ? <Video size={18} /> : <Database size={18} />}
                      </div>
                      <div>
                        <div className="mb-0.5 text-[12px] font-semibold text-slate-500">
                          {formatSessionTime(session.date)}
                        </div>
                        <div className="text-[14px] font-bold leading-tight text-slate-900">
                          {session.title}
                        </div>
                        <div className="mt-0.5 text-[12px] text-slate-500">
                          Группа {session.group || "без названия"}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={session.status} />
                  </div>
                ))}

                {upcomingList.length === 0 && !loading && (
                  <div className="rounded-[16px] border border-slate-100 bg-white p-4 text-center text-[13px] text-slate-500">
                    Нет запланированных занятий
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-[16px] font-bold text-slate-900">Недавние отчёты</h3>
                <Link href="/teacher/reports" className="text-[12px] font-semibold text-[#7448FF]">
                  Смотреть все
                </Link>
              </div>

              <div className="space-y-3">
                <div className="rounded-[16px] border border-slate-100 bg-white p-4 text-center text-[13px] text-slate-500">
                  Отдельный backend-feed отчётов пока не подключён.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
