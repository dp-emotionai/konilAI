"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Layers3,
  Loader2,
  Mail,
  Radio,
  RefreshCw,
  UserRound,
  UsersRound,
} from "lucide-react";

import {
  getGroupById,
  type FullGroup,
  type GroupSession,
} from "@/lib/api/teacher";
import {
  getApiBaseUrl,
  hasAuth,
} from "@/lib/api/client";
import { cn } from "@/lib/cn";

const CARD =
  "rounded-[22px] border border-slate-200/80 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.045)]";

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function sessionStatusLabel(status: GroupSession["status"]) {
  if (status === "live") return "Идёт сейчас";
  if (status === "ended") return "Завершена";
  return "Предстоящая";
}

function sessionStatusClass(status: GroupSession["status"]) {
  if (status === "live") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "ended") {
    return "bg-slate-50 text-slate-700 ring-slate-200";
  }

  return "bg-blue-50 text-blue-700 ring-blue-200";
}

function SessionStatusBadge({
  status,
}: {
  status: GroupSession["status"];
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset",
        sessionStatusClass(status)
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {sessionStatusLabel(status)}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  icon,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  icon: ReactNode;
  tone: "violet" | "blue" | "emerald" | "amber";
}) {
  const toneClass = {
    violet: "bg-violet-100 text-violet-600",
    blue: "bg-blue-100 text-blue-600",
    emerald: "bg-emerald-100 text-emerald-600",
    amber: "bg-amber-100 text-amber-600",
  }[tone];

  return (
    <article className={cn(CARD, "p-5")}>
      <span
        className={cn(
          "grid h-10 w-10 place-items-center rounded-xl",
          toneClass
        )}
      >
        {icon}
      </span>

      <p className="mt-5 text-xs font-semibold text-slate-500">{label}</p>

      <p className="mt-1 text-2xl font-extrabold tracking-[-0.03em] text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">{helper}</p>
    </article>
  );
}

export default function AdminGroupDetailPage() {
  const params = useParams<{ id: string }>();
  const groupId = params?.id ?? "";

  const apiAvailable = Boolean(getApiBaseUrl() && hasAuth());

  const [group, setGroup] = useState<FullGroup | null>(null);
  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [loading, setLoading] = useState(() =>
    Boolean(apiAvailable && groupId)
  );
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;

    if (!apiAvailable || !groupId) {
      return;
    }


    getGroupById(groupId)
      .then((result) => {
        if (!mounted) return;

        setGroup(result?.group ?? null);
        setSessions(result?.sessions ?? []);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [apiAvailable, groupId, reloadKey]);

  function reloadGroup() {
    setLoading(true);
    setReloadKey((value) => value + 1);
  }

  const summary = useMemo(() => {
    const live = sessions.filter((session) => session.status === "live").length;
    const upcoming = sessions.filter(
      (session) => session.status === "upcoming"
    ).length;
    const ended = sessions.filter(
      (session) => session.status === "ended"
    ).length;

    return {
      live,
      upcoming,
      ended,
    };
  }, [sessions]);

  if (loading) {
    return (
      <div className="grid min-h-[540px] place-items-center">
        <div className="text-center">
          <Loader2
            size={34}
            className="mx-auto animate-spin text-violet-600"
          />
          <p className="mt-4 text-sm font-bold text-slate-700">
            Загрузка группы…
          </p>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="space-y-5 pb-14">
        <Link
          href="/admin/groups"
          className="inline-flex items-center gap-2 text-sm font-bold text-violet-600 transition hover:text-violet-700"
        >
          <ArrowLeft size={16} />
          Назад к группам
        </Link>

        <section className={cn(CARD, "grid min-h-[420px] place-items-center p-8 text-center")}>
          <div>
            <Layers3 size={44} className="mx-auto text-slate-300" />

            <h1 className="mt-5 text-2xl font-extrabold text-slate-950">
              Группа не найдена
            </h1>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Данные группы не удалось получить. Проверь ID, авторизацию и
              доступ администратора к endpoint группы.
            </p>

            <button
              type="button"
              onClick={reloadGroup}
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white transition hover:bg-violet-700"
            >
              <RefreshCw size={16} />
              Повторить
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-14">
      <header className="space-y-4">
        <Link
          href="/admin/groups"
          className="inline-flex items-center gap-2 text-sm font-bold text-violet-600 transition hover:text-violet-700"
        >
          <ArrowLeft size={16} />
          Назад к группам
        </Link>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">
              Администрирование · Группа
            </p>

            <h1 className="mt-3 text-[30px] font-extrabold tracking-[-0.035em] text-slate-950 md:text-[34px]">
              {group.name}
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {group.description?.trim() ||
                "Обзор преподавателя, участников и сессий учебной группы."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ring-1 ring-inset",
                group.status === "active"
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                  : "bg-slate-50 text-slate-700 ring-slate-200"
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {group.status === "active" ? "Активна" : "В архиве"}
            </span>

            <button
              type="button"
              onClick={reloadGroup}
              className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw size={14} />
              Обновить
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Участников"
          value={String(group.students.length)}
          helper="Студенты группы"
          icon={<UsersRound size={19} />}
          tone="violet"
        />

        <SummaryCard
          label="Сессий всего"
          value={String(sessions.length)}
          helper={`${summary.live} идут сейчас`}
          icon={<BookOpen size={19} />}
          tone="blue"
        />

        <SummaryCard
          label="Предстоящие"
          value={String(summary.upcoming)}
          helper="Запланированные занятия"
          icon={<CalendarDays size={19} />}
          tone="amber"
        />

        <SummaryCard
          label="Завершённые"
          value={String(summary.ended)}
          helper="История занятий"
          icon={<CheckCircle2 size={19} />}
          tone="emerald"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <aside className={cn(CARD, "self-start overflow-hidden")}>
          <div className="border-b border-slate-100 px-5 py-5">
            <p className="text-xs font-medium text-slate-500">Ответственный</p>
            <h2 className="mt-1 text-base font-extrabold text-slate-950">
              Преподаватель
            </h2>
          </div>

          <div className="p-5">
            <div className="flex items-center gap-4 rounded-2xl bg-violet-50 p-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-violet-600 text-white">
                <UserRound size={21} />
              </span>

              <div className="min-w-0">
                <p className="truncate text-base font-extrabold text-slate-950">
                  {group.teacher.fullName}
                </p>

                <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-500">
                  <Mail size={13} />
                  {group.teacher.email}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                  ID преподавателя
                </p>
                <p className="mt-2 break-all text-sm font-bold text-slate-900">
                  {group.teacher.id}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                  Программа
                </p>
                <p className="mt-2 text-sm font-bold text-slate-900">
                  {group.program || group.name}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                  Создана
                </p>
                <p className="mt-2 text-sm font-bold text-slate-900">
                  {formatDate(group.createdAt)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                  ID группы
                </p>
                <p className="mt-2 break-all text-sm font-bold text-slate-900">
                  {group.id}
                </p>
              </div>
            </div>
          </div>
        </aside>

        <div className={cn(CARD, "overflow-hidden")}>
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-5">
            <div>
              <p className="text-xs font-medium text-slate-500">Участники</p>
              <h2 className="mt-1 text-base font-extrabold text-slate-950">
                Студенты группы
              </h2>
            </div>

            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">
              {group.students.length}
            </span>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[620px] border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left">
                  <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                    Студент
                  </th>

                  <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                    Email
                  </th>

                  <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                    ID
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {group.students.map((student) => (
                  <tr
                    key={student.id}
                    className="transition-colors hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                          <GraduationCap size={16} />
                        </span>

                        <p className="max-w-[220px] truncate text-sm font-bold text-slate-900">
                          {student.fullName}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {student.email || "—"}
                    </td>

                    <td className="px-5 py-4">
                      <p className="max-w-[200px] truncate text-xs text-slate-400">
                        {student.id}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-100 md:hidden">
            {group.students.map((student) => (
              <article key={student.id} className="p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                    <GraduationCap size={16} />
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {student.fullName}
                    </p>

                    <p className="mt-1 truncate text-xs text-slate-500">
                      {student.email || "Email не указан"}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {group.students.length === 0 ? (
            <div className="grid min-h-[260px] place-items-center text-center">
              <div>
                <UsersRound size={36} className="mx-auto text-slate-300" />
                <p className="mt-4 text-sm font-bold text-slate-700">
                  Участников пока нет
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Добавленные студенты появятся здесь
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className={cn(CARD, "overflow-hidden")}>
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-5">
          <div>
            <p className="text-xs font-medium text-slate-500">Занятия</p>
            <h2 className="mt-1 text-base font-extrabold text-slate-950">
              Сессии группы
            </h2>
          </div>

          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            {sessions.length}
          </span>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left">
                <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                  Сессия
                </th>

                <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                  Тип
                </th>

                <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                  Статус
                </th>

                <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                  Дата
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {sessions.map((session) => (
                <tr
                  key={session.id}
                  className="transition-colors hover:bg-slate-50/70"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                          session.status === "live"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-blue-100 text-blue-700"
                        )}
                      >
                        {session.status === "live" ? (
                          <Radio size={16} />
                        ) : (
                          <BookOpen size={16} />
                        )}
                      </span>

                      <div className="min-w-0">
                        <p className="max-w-[280px] truncate text-sm font-bold text-slate-900">
                          {session.title}
                        </p>

                        <p className="mt-1 max-w-[280px] truncate text-[10px] text-slate-400">
                          {session.id}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                    {session.type === "exam" ? "Экзамен" : "Лекция"}
                  </td>

                  <td className="px-5 py-4">
                    <SessionStatusBadge status={session.status} />
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-500">
                    {formatDate(session.startsAt || session.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {sessions.map((session) => (
            <article key={session.id} className="p-4">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                    session.status === "live"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-blue-100 text-blue-700"
                  )}
                >
                  <BookOpen size={16} />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {session.title}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {session.type === "exam" ? "Экзамен" : "Лекция"}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <SessionStatusBadge status={session.status} />

                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                  <Clock3 size={13} />
                  {formatDate(session.startsAt || session.createdAt)}
                </span>
              </div>
            </article>
          ))}
        </div>

        {sessions.length === 0 ? (
          <div className="grid min-h-[260px] place-items-center text-center">
            <div>
              <CalendarDays size={36} className="mx-auto text-slate-300" />
              <p className="mt-4 text-sm font-bold text-slate-700">
                Сессий пока нет
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Созданные занятия появятся здесь
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <section
        className={cn(
          CARD,
          "flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
        )}
      >
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">
            Режим просмотра администратора
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Страница только читает существующие данные группы и не изменяет
            участников, преподавателя или сессии.
          </p>
        </div>

        <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
          <CheckCircle2 size={15} className="text-emerald-500" />
          Read-only
        </span>
      </section>
    </div>
  );
}
