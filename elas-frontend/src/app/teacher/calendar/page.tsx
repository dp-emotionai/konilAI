"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, VideoIcon } from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";

import { getTeacherGroups, type TeacherGroup } from "@/lib/api/teacher";
import { createCalendarEvent, deleteCalendarEvent, getCalendarEvents, type CalendarEvent } from "@/lib/api/calendar";
import {
  buildMonthCells,
  formatSessionDateTime,
  formatSessionTime,
  isSameCalendarDay,
  isToday,
  parseSessionTimestamp,
} from "@/lib/utils/sessionCalendar";
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

function statusLabel(value: string) {
  const status = value;
  if (status === "live") return "Активная";
  if (status === "ended") return "Завершена";
  return "Запланирована";
}

function eventHref(event: CalendarEvent) {
  return event.sessionId ? `/teacher/session/${event.sessionId}` : "#";
}

export default function TeacherCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [groups, setGroups] = useState<TeacherGroup[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: "",
    kind: "session",
    groupId: "",
    sessionId: "",
    startsAt: "",
    endsAt: "",
  });
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([getCalendarEvents(), getTeacherGroups()])
      .then(([ev, gr]) => {
        if (!mounted) return;
        setEvents(Array.isArray(ev) ? ev : []);
        setGroups(Array.isArray(gr) ? gr : []);
      })
      .catch(() => {
        if (!mounted) return;
        setEvents([]);
        setGroups([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const monthCells = useMemo(() => buildMonthCells(currentDate), [currentDate]);

  const scheduledSessions = useMemo(
    () =>
      events
        .map((event) => ({
          event,
          scheduledAt: parseSessionTimestamp(event.startsAt),
        }))
        .filter(
          (
            item
          ): item is {
            event: CalendarEvent;
            scheduledAt: Date;
          } => Boolean(item.scheduledAt)
        )
        .sort((left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime()),
    [events]
  );

  const unscheduledSessions = useMemo(
    () => events.filter((event) => !parseSessionTimestamp(event.startsAt)),
    [events]
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

  const reloadEvents = useCallback(async () => {
    try {
      const list = await getCalendarEvents();
      setEvents(Array.isArray(list) ? list : []);
    } catch {
      setEvents([]);
    }
  }, []);

  const handleCreate = useCallback(async () => {
    const title = createForm.title.trim();
    if (!title || !createForm.startsAt) return;

    await createCalendarEvent({
      title,
      kind: createForm.kind?.trim() || "session",
      groupId: createForm.groupId?.trim() ? createForm.groupId.trim() : null,
      sessionId: createForm.sessionId?.trim() ? createForm.sessionId.trim() : null,
      startsAt: new Date(createForm.startsAt).toISOString(),
      endsAt: createForm.endsAt ? new Date(createForm.endsAt).toISOString() : null,
    });

    setCreateOpen(false);
    setCreateForm({ title: "", kind: "session", groupId: "", sessionId: "", startsAt: "", endsAt: "" });
    await reloadEvents();
  }, [createForm, reloadEvents]);

  return (
    <div className="min-h-screen bg-[#FAFAFB]">
      <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Календарь</h1>
            <p className="mt-1.5 text-[15px] text-slate-500">
              Реальные преподавательские сессии из backend-списка без фальшивых событий и моковых дедлайнов.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const today = new Date();
                setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
                setSelectedDate(today);
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              Сегодня
            </button>
            <Button onClick={() => setCreateOpen(true)}>Создать событие</Button>
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                onClick={() => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                className="rounded-lg px-2 py-1 text-slate-600 transition-colors hover:bg-slate-50"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
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
                <div className="text-[13px] font-medium uppercase tracking-wide text-slate-400">Месяц</div>
                <div className="text-2xl font-bold text-slate-900">
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                <div className="text-[12px] font-semibold text-slate-400">Сессий в месяце</div>
                <div className="text-lg font-bold text-[#7448FF]">{monthSessions.length}</div>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {DAYS.map((day) => (
                <div key={day} className="pb-2 text-center text-[12px] font-semibold uppercase tracking-wide text-slate-400">
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
                      {daySessions.slice(0, 2).map(({ event, scheduledAt }) => (
                        <div
                          key={event.id}
                          className="truncate rounded-xl bg-white px-2.5 py-2 text-[11px] font-medium text-slate-600 shadow-sm"
                        >
                          <div className="truncate text-slate-900">{event.title}</div>
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
                    <p className="mt-1 text-sm text-slate-500">Сессии на выбранную дату</p>
                  </div>
                  <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                    {selectedDaySessions.length}
                  </span>
                </div>
              </div>

              <div className="max-h-[420px] space-y-3 overflow-y-auto p-6">
                {loading ? (
                  <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-400">
                    Загружаем календарь...
                  </div>
                ) : selectedDaySessions.length > 0 ? (
                  selectedDaySessions.map(({ event, scheduledAt }) => (
                    <Link
                      key={event.id}
                      href={eventHref(event)}
                      onClick={(e) => {
                        if (!event.sessionId) e.preventDefault();
                      }}
                      className="block rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition-colors hover:bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-900">{event.title}</div>
                          <div className="mt-1 text-sm text-slate-500">
                            {event.groupId ? `Group: ${event.groupId}` : "Группа не указана"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                              event.sessionId ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                            )}
                          >
                            {event.sessionId ? "Сессия" : statusLabel(event.kind || "")}
                          </span>

                          {!event.sessionId && (
                            <button
                              type="button"
                              className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!confirm("Удалить событие?")) return;
                                await deleteCalendarEvent(event.id);
                                await reloadEvents();
                              }}
                            >
                              Удалить
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Clock size={14} className="text-slate-400" />
                          {formatSessionDateTime(scheduledAt.toISOString())}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <VideoIcon size={14} className="text-slate-400" />
                          {statusLabel(event.kind || "")}
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-5 py-8 text-center">
                    <CalendarDays size={28} className="mx-auto text-slate-300" />
                    <p className="mt-3 text-sm font-medium text-slate-700">На эту дату сессий нет</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Выберите другой день или проверьте блок с занятиями без времени ниже.
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
                    Сессии, для которых backend пока не отдал точный timestamp.
                  </p>
                </div>
                <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                  {unscheduledSessions.length}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {unscheduledSessions.length > 0 ? (
                  unscheduledSessions.map((event) => (
                    <Link
                      key={event.id}
                      href={eventHref(event)}
                      onClick={(e) => {
                        if (!event.sessionId) e.preventDefault();
                      }}
                      className="block rounded-2xl border border-slate-100 bg-slate-50/60 p-4 transition-colors hover:bg-slate-50"
                    >
                      <div className="font-medium text-slate-900">{event.title}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {event.groupId ? `Group: ${event.groupId}` : "Группа не указана"}
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center text-sm text-slate-500">
                    Все найденные сессии уже привязаны ко времени.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Создать событие"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button onClick={() => void handleCreate()} disabled={!createForm.title.trim() || !createForm.startsAt}>
              Создать
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            placeholder="Название"
            value={createForm.title}
            onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              placeholder="kind (например: session)"
              value={createForm.kind}
              onChange={(e) => setCreateForm((p) => ({ ...p, kind: e.target.value }))}
            />
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm"
              value={createForm.groupId}
              onChange={(e) => setCreateForm((p) => ({ ...p, groupId: e.target.value }))}
            >
              <option value="">Группа (опц.)</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            placeholder="sessionId (опц.)"
            value={createForm.sessionId}
            onChange={(e) => setCreateForm((p) => ({ ...p, sessionId: e.target.value }))}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-500">startsAt</div>
              <Input
                type="datetime-local"
                value={createForm.startsAt}
                onChange={(e) => setCreateForm((p) => ({ ...p, startsAt: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-500">endsAt (опц.)</div>
              <Input
                type="datetime-local"
                value={createForm.endsAt}
                onChange={(e) => setCreateForm((p) => ({ ...p, endsAt: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </Modal>

      </div>
    </div>
  );
}
