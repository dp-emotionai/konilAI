"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getStudentSessionsList, type StudentSessionRow } from "@/lib/api/student";
import { getApiBaseUrl, hasAuth } from "@/lib/api/client";
import {
  buildMonthCells,
  formatSessionDateTime,
  formatSessionTime,
  isSameCalendarDay,
  isToday,
  parseSessionTimestamp,
} from "@/lib/utils/sessionCalendar";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  VideoIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";

const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function statusLabel(status: StudentSessionRow["status"]) {
  if (status === "live") return "Активная";
  if (status === "ended") return "Завершена";
  return "Запланирована";
}

export default function StudentCalendarPage() {
  const [sessions, setSessions] = useState<StudentSessionRow[]>([]);
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const apiAvailable = Boolean(getApiBaseUrl() && hasAuth());

  useEffect(() => {
    if (!apiAvailable) {
      setLoading(false);
      return;
    }

    getStudentSessionsList()
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [apiAvailable]);

  const monthCells = useMemo(() => buildMonthCells(currentDate), [currentDate]);

  const scheduledSessions = useMemo(
    () =>
      sessions
        .map((session) => ({
          session,
          scheduledAt: parseSessionTimestamp(session.scheduledAt ?? session.date),
        }))
        .filter(
          (
            item
          ): item is {
            session: StudentSessionRow;
            scheduledAt: Date;
          } => Boolean(item.scheduledAt)
        )
        .sort((left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime()),
    [sessions]
  );

  const unscheduledSessions = useMemo(
    () => sessions.filter((session) => !parseSessionTimestamp(session.scheduledAt ?? session.date)),
    [sessions]
  );

  const selectedDaySessions = useMemo(
    () =>
      scheduledSessions.filter(({ scheduledAt }) => isSameCalendarDay(scheduledAt, selectedDate)),
    [scheduledSessions, selectedDate]
  );

  const monthSessions = useMemo(
    () =>
      scheduledSessions.filter(
        ({ scheduledAt }) =>
          scheduledAt.getFullYear() === currentDate.getFullYear() &&
          scheduledAt.getMonth() === currentDate.getMonth()
      ),
    [currentDate, scheduledSessions]
  );

  const goPrevMonth = () =>
    setCurrentDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );

  const goNextMonth = () =>
    setCurrentDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );

  const goToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(today);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFB]">
      <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Календарь</h1>
            <p className="mt-1.5 text-[15px] text-slate-500">
              Реальные сессии из вашего расписания по группам.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goToday}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              Сегодня
            </button>
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                onClick={goPrevMonth}
                className="rounded-lg px-2 py-1 text-slate-600 transition-colors hover:bg-slate-50"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={goNextMonth}
                className="rounded-lg px-2 py-1 text-slate-600 transition-colors hover:bg-slate-50"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <div className="text-[13px] font-medium uppercase tracking-wide text-slate-400">
                  Месяц
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                <div className="text-[12px] font-semibold text-slate-400">
                  Сессий в месяце
                </div>
                <div className="text-lg font-bold text-[#7448FF]">
                  {monthSessions.length}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="pb-2 text-center text-[12px] font-semibold uppercase tracking-wide text-slate-400"
                >
                  {day}
                </div>
              ))}

              {monthCells.map(({ date, inCurrentMonth }) => {
                const daySessions = scheduledSessions.filter(({ scheduledAt }) =>
                  isSameCalendarDay(scheduledAt, date)
                );
                const selected = isSameCalendarDay(date, selectedDate);

                return (
                  <button
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      "min-h-[108px] rounded-[20px] border p-3 text-left transition-all",
                      selected
                        ? "border-[#7448FF]/30 bg-[#F4F1FF]"
                        : "border-slate-100 bg-slate-50/40 hover:border-slate-200 hover:bg-white",
                      !inCurrentMonth && "opacity-45"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "text-sm font-semibold",
                          selected ? "text-[#7448FF]" : "text-slate-700",
                          isToday(date) && "rounded-full bg-slate-900 px-2 py-0.5 text-white"
                        )}
                      >
                        {date.getDate()}
                      </span>

                      {daySessions.length > 0 && (
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500 shadow-sm">
                          {daySessions.length}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 space-y-2">
                      {daySessions.slice(0, 2).map(({ session, scheduledAt }) => (
                        <div
                          key={session.id}
                          className="truncate rounded-xl bg-white px-2.5 py-2 text-[11px] font-medium text-slate-600 shadow-sm"
                        >
                          <div className="truncate text-slate-900">{session.title}</div>
                          <div className="mt-0.5 text-slate-400">
                            {formatSessionTime(scheduledAt.toISOString())}
                          </div>
                        </div>
                      ))}

                      {daySessions.length > 2 && (
                        <div className="text-[11px] font-medium text-slate-400">
                          + ещё {daySessions.length - 2}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="rounded-[24px] border border-slate-100 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
              <div className="border-b border-slate-50 px-6 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      {selectedDate.toLocaleDateString("ru-RU", {
                        day: "numeric",
                        month: "long",
                      })}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Сессии на выбранную дату
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                    {selectedDaySessions.length}
                  </span>
                </div>
              </div>

              <div className="max-h-[420px] space-y-3 overflow-y-auto p-6">
                {loading ? (
                  <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-400">
                    Загрузка календаря...
                  </div>
                ) : selectedDaySessions.length > 0 ? (
                  selectedDaySessions.map(({ session, scheduledAt }) => (
                    <Link
                      key={session.id}
                      href={`/student/session/${session.id}`}
                      className="block rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition-colors hover:bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-900">
                            {session.title}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {session.teacher || "Преподаватель не указан"}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                            session.status === "live"
                              ? "bg-emerald-50 text-emerald-600"
                              : session.status === "ended"
                              ? "bg-slate-100 text-slate-500"
                              : "bg-amber-50 text-amber-600"
                          )}
                        >
                          {statusLabel(session.status)}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Clock size={14} className="text-slate-400" />
                          {formatSessionDateTime(scheduledAt.toISOString())}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <VideoIcon size={14} className="text-slate-400" />
                          {session.type === "exam" ? "Экзамен" : "Лекция"}
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-5 py-8 text-center">
                    <CalendarDays size={28} className="mx-auto text-slate-300" />
                    <p className="mt-3 text-sm font-medium text-slate-700">
                      На эту дату сессий нет
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Выберите другой день или проверьте ближайшие занятия ниже.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Без назначенного времени</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Сессии, у которых backend пока не отдал timestamp.
                  </p>
                </div>
                <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                  {unscheduledSessions.length}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {unscheduledSessions.length > 0 ? (
                  unscheduledSessions.map((session) => (
                    <div
                      key={session.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4"
                    >
                      <div className="font-medium text-slate-900">{session.title}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {session.teacher || "Преподаватель не указан"}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-slate-50/70 px-4 py-5 text-sm text-slate-500">
                    Все доступные сессии уже имеют дату и время.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
