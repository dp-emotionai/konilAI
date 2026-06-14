"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Clock3,
  Copy,
  Download,
  FileSearch,
  Filter,
  Info,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  X,
  XCircle,
} from "lucide-react";

import {
  getAuditLog,
  type AuditRow,
} from "@/lib/api/admin";
import {
  getApiBaseUrl,
  hasAuth,
} from "@/lib/api/client";
import { cn } from "@/lib/cn";

type StatusFilter =
  | "all"
  | AuditRow["status"];

type RoleFilter =
  | "all"
  | AuditRow["role"];

const CARD =
  "rounded-[22px] border border-slate-200/80 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.045)]";

const statusLabel: Record<
  AuditRow["status"],
  string
> = {
  ok: "Успешно",
  warn: "Предупреждение",
  fail: "Ошибка",
};

const statusClass: Record<
  AuditRow["status"],
  string
> = {
  ok: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warn: "bg-amber-50 text-amber-700 ring-amber-200",
  fail: "bg-rose-50 text-rose-700 ring-rose-200",
};

const roleLabel: Record<
  AuditRow["role"],
  string
> = {
  admin: "Администратор",
  teacher: "Преподаватель",
  student: "Студент",
  system: "Система",
};

const roleClass: Record<
  AuditRow["role"],
  string
> = {
  admin: "bg-violet-50 text-violet-700 ring-violet-200",
  teacher: "bg-blue-50 text-blue-700 ring-blue-200",
  student: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  system: "bg-slate-50 text-slate-700 ring-slate-200",
};

function csvCell(value: unknown) {
  return `"${String(value ?? "")
    .replaceAll('"', '""')}"`;
}

function StatusBadge({
  status,
}: {
  status: AuditRow["status"];
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset",
        statusClass[status]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabel[status]}
    </span>
  );
}

function RoleBadge({
  role,
}: {
  role: AuditRow["role"];
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset",
        roleClass[role]
      )}
    >
      {roleLabel[role]}
    </span>
  );
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
  tone:
    | "violet"
    | "emerald"
    | "amber"
    | "rose";
}) {
  const toneClass = {
    violet: "bg-violet-100 text-violet-600",
    emerald: "bg-emerald-100 text-emerald-600",
    amber: "bg-amber-100 text-amber-600",
    rose: "bg-rose-100 text-rose-600",
  }[tone];

  return (
    <article
      className={cn(
        CARD,
        "flex items-center gap-4 px-5 py-5"
      )}
    >
      <span
        className={cn(
          "grid h-11 w-11 shrink-0 place-items-center rounded-xl",
          toneClass
        )}
      >
        {icon}
      </span>

      <div>
        <p className="text-xs font-semibold text-slate-500">
          {label}
        </p>

        <p className="mt-1 text-2xl font-extrabold tracking-[-0.03em] text-slate-950">
          {new Intl.NumberFormat("ru-RU").format(
            value
          )}
        </p>
      </div>
    </article>
  );
}

function FilterButton({
  active,
  label,
  count,
  onClick,
  tone = "slate",
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
  tone?:
    | "slate"
    | "emerald"
    | "amber"
    | "rose";
}) {
  const activeClass = {
    slate:
      "border-violet-200 bg-violet-50 text-violet-700",
    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber:
      "border-amber-200 bg-amber-50 text-amber-700",
    rose:
      "border-rose-200 bg-rose-50 text-rose-700",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-xs font-bold transition",
        active
          ? activeClass
          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
      )}
    >
      {label}

      {typeof count === "number" ? (
        <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px]">
          {count}
        </span>
      ) : null}
    </button>
  );
}

function MetaList({
  meta,
}: {
  meta: Record<string, string>;
}) {
  const entries = Object.entries(meta);

  if (!entries.length) {
    return (
      <div className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-400">
        Дополнительных данных нет
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="grid gap-1 px-4 py-3 sm:grid-cols-[130px_1fr]"
        >
          <span className="text-xs font-bold text-slate-500">
            {key}
          </span>

          <span className="break-all text-xs leading-5 text-slate-700">
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AdminAuditPage() {
  const [rows, setRows] = useState<
    AuditRow[]
  >([]);
  const [selected, setSelected] =
    useState<AuditRow | null>(null);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] =
    useState<RoleFilter>("all");

  const [loading, setLoading] =
    useState(true);
  const [loadError, setLoadError] =
    useState<string | null>(null);
  const [copied, setCopied] =
    useState(false);

  const backendConfigured = Boolean(
    getApiBaseUrl() && hasAuth()
  );

  const loadAudit = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const data = await getAuditLog();
      setRows(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      setRows([]);
      setLoadError(
        error instanceof Error
          ? error.message
          : "Не удалось загрузить журнал аудита."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      ok: rows.filter(
        (row) => row.status === "ok"
      ).length,
      warn: rows.filter(
        (row) => row.status === "warn"
      ).length,
      fail: rows.filter(
        (row) => row.status === "fail"
      ).length,
    }),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const normalized =
      query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesStatus =
        statusFilter === "all" ||
        row.status === statusFilter;

      const matchesRole =
        roleFilter === "all" ||
        row.role === roleFilter;

      const searchable = [
        row.id,
        row.actor,
        row.action,
        row.resource,
        row.role,
        row.status,
        ...Object.entries(row.meta).flat(),
      ]
        .join(" ")
        .toLowerCase();

      const matchesQuery =
        !normalized ||
        searchable.includes(normalized);

      return (
        matchesStatus &&
        matchesRole &&
        matchesQuery
      );
    });
  }, [
    query,
    roleFilter,
    rows,
    statusFilter,
  ]);

  function resetFilters() {
    setQuery("");
    setStatusFilter("all");
    setRoleFilter("all");
  }

  async function copySelected() {
    if (!selected) return;

    try {
      await navigator.clipboard.writeText(
        JSON.stringify(selected, null, 2)
      );

      setCopied(true);
      window.setTimeout(
        () => setCopied(false),
        1600
      );
    } catch {
      setLoadError(
        "Не удалось скопировать данные события."
      );
    }
  }

  function exportCsv() {
    const rowsForExport = [
      [
        "Время",
        "ID",
        "Участник",
        "Роль",
        "Действие",
        "Ресурс",
        "Статус",
        "Метаданные",
      ],
      ...filteredRows.map((row) => [
        row.at,
        row.id,
        row.actor,
        roleLabel[row.role],
        row.action,
        row.resource,
        statusLabel[row.status],
        JSON.stringify(row.meta),
      ]),
    ];

    const csv = rowsForExport
      .map((row) =>
        row.map(csvCell).join(";")
      )
      .join("\n");

    const blob = new Blob(
      ["\uFEFF", csv],
      {
        type: "text/csv;charset=utf-8",
      }
    );

    const url =
      URL.createObjectURL(blob);
    const anchor =
      document.createElement("a");

    anchor.href = url;
    anchor.download =
      "konilai-audit.csv";
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
            Журнал аудита
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Просмотр системных событий,
            действий пользователей и
            изменений ресурсов платформы.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              void loadAudit()
            }
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? (
              <Loader2
                size={16}
                className="animate-spin"
              />
            ) : (
              <RefreshCw size={16} />
            )}
            Обновить
          </button>

          <button
            type="button"
            onClick={exportCsv}
            disabled={
              filteredRows.length === 0
            }
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={16} />
            Экспорт CSV
          </button>
        </div>
      </header>

      {!backendConfigured ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle
            size={18}
            className="mt-0.5 shrink-0"
          />

          <p>
            Backend API или авторизация
            не настроены. Журнал может быть
            пустым.
          </p>
        </div>
      ) : null}

      {loadError ? (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>{loadError}</span>

          <button
            type="button"
            onClick={() =>
              setLoadError(null)
            }
            aria-label="Закрыть сообщение"
            className="rounded-lg p-1 hover:bg-rose-100"
          >
            <X size={17} />
          </button>
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Всего событий"
          value={counts.all}
          icon={<Clipboard size={20} />}
          tone="violet"
        />

        <SummaryCard
          label="Успешные"
          value={counts.ok}
          icon={<CheckCircle2 size={20} />}
          tone="emerald"
        />

        <SummaryCard
          label="Предупреждения"
          value={counts.warn}
          icon={<TriangleAlert size={20} />}
          tone="amber"
        />

        <SummaryCard
          label="Ошибки"
          value={counts.fail}
          icon={<XCircle size={20} />}
          tone="rose"
        />
      </section>

      <section
        className={cn(
          CARD,
          "p-4 md:p-5"
        )}
      >
        <div className="grid gap-3 lg:grid-cols-[1.25fr_0.65fr_auto]">
          <label className="relative block">
            <span className="sr-only">
              Поиск по журналу
            </span>

            <Search
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value
                )
              }
              placeholder="Поиск по ID, участнику, действию или ресурсу..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
            />
          </label>

          <div className="relative">
            <select
              aria-label="Фильтр по роли"
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(
                  event.target
                    .value as RoleFilter
                )
              }
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
            >
              <option value="all">
                Все роли
              </option>
              <option value="admin">
                Администраторы
              </option>
              <option value="teacher">
                Преподаватели
              </option>
              <option value="student">
                Студенты
              </option>
              <option value="system">
                Система
              </option>
            </select>

            <Filter
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

        <div className="mt-4 flex flex-wrap gap-2">
          <FilterButton
            active={
              statusFilter === "all"
            }
            label="Все"
            count={counts.all}
            onClick={() =>
              setStatusFilter("all")
            }
          />

          <FilterButton
            active={
              statusFilter === "ok"
            }
            label="Успешные"
            count={counts.ok}
            tone="emerald"
            onClick={() =>
              setStatusFilter("ok")
            }
          />

          <FilterButton
            active={
              statusFilter === "warn"
            }
            label="Предупреждения"
            count={counts.warn}
            tone="amber"
            onClick={() =>
              setStatusFilter("warn")
            }
          />

          <FilterButton
            active={
              statusFilter === "fail"
            }
            label="Ошибки"
            count={counts.fail}
            tone="rose"
            onClick={() =>
              setStatusFilter("fail")
            }
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.45fr_0.8fr]">
        <div
          className={cn(
            CARD,
            "overflow-hidden"
          )}
        >
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500">
                События
              </p>

              <h2 className="mt-1 text-base font-extrabold text-slate-950">
                История действий
              </h2>
            </div>

            <span className="inline-flex w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              {loading
                ? "Загрузка…"
                : `${filteredRows.length} записей`}
            </span>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-left">
                  <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                    Время
                  </th>

                  <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                    Участник
                  </th>

                  <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                    Действие
                  </th>

                  <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                    Статус
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading
                  ? Array.from({
                      length: 6,
                    }).map(
                      (_, index) => (
                        <tr key={index}>
                          <td
                            colSpan={4}
                            className="px-5 py-4"
                          >
                            <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
                          </td>
                        </tr>
                      )
                    )
                  : filteredRows.map(
                      (row) => (
                        <tr
                          key={row.id}
                          onClick={() =>
                            setSelected(
                              row
                            )
                          }
                          className={cn(
                            "cursor-pointer transition-colors hover:bg-slate-50/70",
                            selected?.id ===
                              row.id &&
                              "bg-violet-50/70"
                          )}
                        >
                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-slate-800">
                              {row.at}
                            </p>

                            <p className="mt-1 max-w-[140px] truncate text-[10px] text-slate-400">
                              {row.id}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500">
                                <UserRound
                                  size={
                                    15
                                  }
                                />
                              </span>

                              <div className="min-w-0">
                                <p className="max-w-[170px] truncate text-sm font-bold text-slate-900">
                                  {row.actor}
                                </p>

                                <div className="mt-1">
                                  <RoleBadge
                                    role={
                                      row.role
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="max-w-[280px] truncate text-sm font-bold text-slate-900">
                              {row.action}
                            </p>

                            <p className="mt-1 max-w-[280px] truncate text-xs text-slate-500">
                              {row.resource}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge
                              status={
                                row.status
                              }
                            />
                          </td>
                        </tr>
                      )
                    )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-100 md:hidden">
            {loading
              ? Array.from({
                  length: 4,
                }).map((_, index) => (
                  <div
                    key={index}
                    className="p-4"
                  >
                    <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
                  </div>
                ))
              : filteredRows.map(
                  (row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() =>
                        setSelected(row)
                      }
                      className={cn(
                        "w-full p-4 text-left transition-colors",
                        selected?.id ===
                          row.id
                          ? "bg-violet-50"
                          : "hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {row.action}
                          </p>

                          <p className="mt-1 truncate text-xs text-slate-500">
                            {row.resource}
                          </p>
                        </div>

                        <StatusBadge
                          status={
                            row.status
                          }
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <RoleBadge
                          role={row.role}
                        />

                        <span className="text-xs text-slate-400">
                          {row.at}
                        </span>
                      </div>
                    </button>
                  )
                )}
          </div>

          {!loading &&
          filteredRows.length === 0 ? (
            <div className="grid min-h-[280px] place-items-center px-5 py-10 text-center">
              <div>
                <FileSearch
                  size={38}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-4 text-sm font-bold text-slate-700">
                  События не найдены
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Измени фильтры или
                  поисковый запрос
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <aside
          className={cn(
            CARD,
            "self-start overflow-hidden xl:sticky xl:top-24"
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-5">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Details
              </p>

              <h2 className="mt-1 text-base font-extrabold text-slate-950">
                Детали события
              </h2>
            </div>

            <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
              Panel
            </span>
          </div>

          {!selected ? (
            <div className="grid min-h-[430px] place-items-center px-6 py-10 text-center">
              <div>
                <Info
                  size={36}
                  className="mx-auto text-slate-300"
                />

                <p className="mt-4 text-sm font-bold text-slate-700">
                  Событие не выбрано
                </p>

                <p className="mt-1 max-w-[230px] text-xs leading-5 text-slate-400">
                  Нажми на строку слева,
                  чтобы открыть подробности.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 p-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-extrabold text-slate-900">
                      {selected.action}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {selected.at}
                    </p>
                  </div>

                  <StatusBadge
                    status={
                      selected.status
                    }
                  />
                </div>

                <p className="mt-3 break-all text-[10px] text-slate-400">
                  ID: {selected.id}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                    Участник
                  </p>

                  <p className="mt-2 break-all text-sm font-bold text-slate-900">
                    {selected.actor}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                    Роль
                  </p>

                  <div className="mt-2">
                    <RoleBadge
                      role={
                        selected.role
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                  Ресурс
                </p>

                <p className="mt-2 break-words text-sm leading-6 text-slate-700">
                  {selected.resource}
                </p>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                  Метаданные
                </p>

                <MetaList
                  meta={selected.meta}
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <button
                  type="button"
                  onClick={() =>
                    setSelected(null)
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  <X size={15} />
                  Очистить
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void copySelected()
                  }
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-bold text-white transition hover:bg-violet-700"
                >
                  {copied ? (
                    <CheckCircle2
                      size={15}
                    />
                  ) : (
                    <Copy size={15} />
                  )}
                  {copied
                    ? "Скопировано"
                    : "Копировать"}
                </button>
              </div>
            </div>
          )}
        </aside>
      </section>

      <section
        className={cn(
          CARD,
          "flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
        )}
      >
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-600">
            <ShieldCheck size={18} />
          </span>

          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              Контроль безопасности
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Журнал отображает только
              события, которые возвращает
              текущий backend endpoint.
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Clock3 size={15} />
          Обновляется вручную
        </div>
      </section>
    </div>
  );
}
