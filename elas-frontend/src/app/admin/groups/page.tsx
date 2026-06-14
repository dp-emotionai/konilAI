"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Download,
  FolderOpen,
  Layers3,
  Loader2,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";

import {
  getTeacherGroups,
  type TeacherGroup,
} from "@/lib/api/teacher";
import { getApiBaseUrl, hasAuth } from "@/lib/api/client";
import { cn } from "@/lib/cn";

type SessionFilter = "all" | "with-sessions" | "without-sessions";

const REFERENCE_NOW = Date.now();

const CARD =
  "rounded-[22px] border border-slate-200/80 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.045)]";

function formatNumber(value: number) {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function formatDate(value?: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "violet" | "blue" | "emerald" | "amber";
}) {
  const toneClass = {
    violet: "bg-violet-100 text-violet-600",
    blue: "bg-blue-100 text-blue-600",
    emerald: "bg-emerald-100 text-emerald-600",
    amber: "bg-amber-100 text-amber-600",
  }[tone];

  return (
    <article className={cn(CARD, "flex items-center gap-4 px-5 py-5")}>
      <span
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
          toneClass
        )}
      >
        {icon}
      </span>

      <div>
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-extrabold tracking-[-0.03em] text-slate-950">
          {formatNumber(value)}
        </p>
      </div>
    </article>
  );
}

function SessionStateBadge({ count }: { count: number }) {
  const hasSessions = count > 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset",
        hasSessions
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-slate-50 text-slate-600 ring-slate-200"
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {hasSessions ? "Есть сессии" : "Без сессий"}
    </span>
  );
}

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<TeacherGroup[]>([]);
  const [query, setQuery] = useState("");
  const [sessionFilter, setSessionFilter] =
    useState<SessionFilter>("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const backendConfigured = Boolean(getApiBaseUrl() && hasAuth());

  useEffect(() => {
    let mounted = true;

    getTeacherGroups()
      .then((rows) => {
        if (!mounted) return;
        setGroups(Array.isArray(rows) ? rows : []);
      })
      .catch((error: unknown) => {
        if (!mounted) return;

        setGroups([]);
        setLoadError(
          error instanceof Error
            ? error.message
            : "Не удалось загрузить список групп."
        );
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return groups.filter((group) => {
      const sessionCount = group.sessionCount ?? 0;

      const matchesSessionFilter =
        sessionFilter === "all" ||
        (sessionFilter === "with-sessions" && sessionCount > 0) ||
        (sessionFilter === "without-sessions" && sessionCount === 0);

      const searchable = [
        group.id,
        group.name,
        group.teacherId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery =
        !normalized || searchable.includes(normalized);

      return matchesSessionFilter && matchesQuery;
    });
  }, [groups, query, sessionFilter]);

  const summary = useMemo(() => {
    const withSessions = groups.filter(
      (group) => (group.sessionCount ?? 0) > 0
    ).length;

    const totalSessions = groups.reduce(
      (sum, group) => sum + (group.sessionCount ?? 0),
      0
    );

    const recentlyCreated = groups.filter((group) => {
      if (!group.createdAt) return false;

      const createdAt = new Date(group.createdAt).getTime();

      return (
        Number.isFinite(createdAt) &&
        REFERENCE_NOW - createdAt <= 30 * 24 * 60 * 60 * 1000
      );
    }).length;

    return {
      total: groups.length,
      withSessions,
      totalSessions,
      recentlyCreated,
    };
  }, [groups]);

  function resetFilters() {
    setQuery("");
    setSessionFilter("all");
  }

  function exportCsv() {
    const rows = [
      [
        "Название",
        "ID группы",
        "ID преподавателя",
        "Количество сессий",
        "Дата создания",
      ],
      ...filteredGroups.map((group) => [
        group.name,
        group.id,
        group.teacherId,
        group.sessionCount ?? 0,
        formatDate(group.createdAt),
      ]),
    ];

    const csv = rows
      .map((row) => row.map(csvCell).join(";"))
      .join("\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = "konilai-groups.csv";
    anchor.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5 pb-14">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">
            Администрирование
          </p>

          <h1 className="mt-3 text-[30px] font-extrabold tracking-[-0.035em] text-slate-950 md:text-[34px]">
            Группы
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Обзор учебных групп, назначенных преподавателей и связанных
            сессий.
          </p>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm">
          <Layers3 size={16} className="text-violet-500" />
          {loading
            ? "Загрузка…"
            : `${filteredGroups.length} из ${groups.length}`}
        </div>
      </header>

      {!backendConfigured ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Backend API или авторизация не настроены. Реальный список групп
          появится после подключения сервиса.
        </div>
      ) : null}

      {loadError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {loadError}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Всего групп"
          value={summary.total}
          icon={<UsersRound size={20} />}
          tone="violet"
        />

        <SummaryCard
          label="С активными данными"
          value={summary.withSessions}
          icon={<BookOpen size={20} />}
          tone="emerald"
        />

        <SummaryCard
          label="Сессий в группах"
          value={summary.totalSessions}
          icon={<FolderOpen size={20} />}
          tone="blue"
        />

        <SummaryCard
          label="Создано за 30 дней"
          value={summary.recentlyCreated}
          icon={<CalendarDays size={20} />}
          tone="amber"
        />
      </section>

      <section className={cn(CARD, "p-4 md:p-5")}>
        <div className="grid gap-3 md:grid-cols-[1fr_0.75fr_auto]">
          <label className="relative block">
            <span className="sr-only">Поиск групп</span>

            <Search
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по названию, ID или преподавателю..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
            />
          </label>

          <div className="relative">
            <select
              aria-label="Фильтр по наличию сессий"
              value={sessionFilter}
              onChange={(event) =>
                setSessionFilter(event.target.value as SessionFilter)
              }
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
            >
              <option value="all">Все группы</option>
              <option value="with-sessions">Есть сессии</option>
              <option value="without-sessions">Без сессий</option>
            </select>

            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </div>

          <button
            type="button"
            onClick={resetFilters}
            className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Сбросить
          </button>
        </div>
      </section>

      <section className={cn(CARD, "overflow-hidden")}>
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Учебная структура
            </p>

            <h2 className="mt-1 text-base font-extrabold text-slate-950">
              Справочник групп
            </h2>
          </div>

          <button
            type="button"
            onClick={exportCsv}
            disabled={filteredGroups.length === 0}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={16} />
            Экспорт CSV
          </button>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left">
                <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                  Группа
                </th>

                <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                  Преподаватель
                </th>

                <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                  Сессии
                </th>

                <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                  Состояние
                </th>

                <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                  Создана
                </th>

                <th className="px-5 py-3 text-right text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                  Действие
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan={6} className="px-5 py-4">
                        <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
                      </td>
                    </tr>
                  ))
                : filteredGroups.map((group) => {
                    const sessionCount = group.sessionCount ?? 0;

                    return (
                      <tr
                        key={group.id}
                        className="transition-colors hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700">
                              <Layers3 size={18} />
                            </span>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-900">
                                {group.name}
                              </p>

                              <p className="mt-0.5 truncate text-xs text-slate-400">
                                ID: {group.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <UserRound
                              size={15}
                              className="shrink-0 text-slate-400"
                            />
                            <span className="max-w-[220px] truncate">
                              {group.teacherId || "Не назначен"}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm font-bold text-slate-900">
                          {formatNumber(sessionCount)}
                        </td>

                        <td className="px-5 py-4">
                          <SessionStateBadge count={sessionCount} />
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-500">
                          {formatDate(group.createdAt)}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/admin/group/${group.id}`}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                          >
                            Открыть
                            <ArrowRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="p-4">
                  <div className="h-32 animate-pulse rounded-xl bg-slate-100" />
                </div>
              ))
            : filteredGroups.map((group) => {
                const sessionCount = group.sessionCount ?? 0;

                return (
                  <article key={group.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-700">
                        <Layers3 size={18} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {group.name}
                        </p>

                        <p className="mt-1 truncate text-xs text-slate-400">
                          ID: {group.id}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Сессии
                        </p>

                        <p className="mt-1 text-sm font-bold text-slate-900">
                          {sessionCount}
                        </p>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                          Создана
                        </p>

                        <p className="mt-1 text-sm font-bold text-slate-900">
                          {formatDate(group.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <SessionStateBadge count={sessionCount} />

                      <Link
                        href={`/admin/group/${group.id}`}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700"
                      >
                        Открыть
                        <ArrowRight size={14} />
                      </Link>
                    </div>
                  </article>
                );
              })}
        </div>

        {!loading && filteredGroups.length === 0 ? (
          <div className="grid min-h-[240px] place-items-center px-5 py-10 text-center">
            <div>
              <Layers3 size={36} className="mx-auto text-slate-300" />

              <p className="mt-4 text-sm font-bold text-slate-700">
                Группы не найдены
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Измени поисковый запрос или фильтр
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <section className={cn(CARD, "flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between")}>
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">
            Структура аналитики группы
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Группа → Сессии → Участники → ML-метрики → Отчёты
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700">
          <Loader2 size={14} className="animate-spin [animation-duration:3s]" />
          Детальная страница развивается отдельно
        </div>
      </section>
    </div>
  );
}
