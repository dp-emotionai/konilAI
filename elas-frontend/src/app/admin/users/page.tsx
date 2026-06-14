"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  Check,
  ChevronDown,
  Download,
  Loader2,
  Mail,
  Pencil,
  Search,
  ShieldCheck,
  UserCog,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react";

import Modal from "@/components/ui/Modal";
import {
  approveAdminUser,
  blockAdminUser,
  getAdminUsers,
  updateAdminUser,
  type AdminUser,
} from "@/lib/api/admin";
import { getApiBaseUrl, hasAuth } from "@/lib/api/client";
import { cn } from "@/lib/cn";

type RoleFilter = "all" | AdminUser["role"];
type StatusFilter = "all" | AdminUser["status"];

const CARD =
  "rounded-[22px] border border-slate-200/80 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.045)]";

const roleLabel: Record<AdminUser["role"], string> = {
  student: "Студент",
  teacher: "Преподаватель",
  admin: "Администратор",
};

const statusLabel: Record<AdminUser["status"], string> = {
  approved: "Подтверждён",
  pending: "Ожидает одобрения",
  limited: "Ограничен",
  blocked: "Заблокирован",
};

const statusClass: Record<AdminUser["status"], string> = {
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  limited: "bg-sky-50 text-sky-700 ring-sky-200",
  blocked: "bg-rose-50 text-rose-700 ring-rose-200",
};

function getUserName(user: AdminUser) {
  const fullName = user.fullName?.trim();
  if (fullName) return fullName;

  const composed = `${user.firstName?.trim() ?? ""} ${
    user.lastName?.trim() ?? ""
  }`.trim();

  return composed || user.email;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function csvCell(value: unknown) {
  const text = String(value ?? "").replaceAll('"', '""');
  return `"${text}"`;
}

function SelectField({
  value,
  onChange,
  children,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  ariaLabel: string;
}) {
  return (
    <div className="relative">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  );
}

function StatusBadge({ status }: { status: AdminUser["status"] }) {
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

function RoleBadge({ role }: { role: AdminUser["role"] }) {
  return (
    <span className="inline-flex items-center rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700 ring-1 ring-inset ring-violet-200">
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
  tone: "violet" | "emerald" | "amber" | "slate";
}) {
  const toneClass = {
    violet: "bg-violet-100 text-violet-600",
    emerald: "bg-emerald-100 text-emerald-600",
    amber: "bg-amber-100 text-amber-600",
    slate: "bg-slate-100 text-slate-600",
  }[tone];

  return (
    <div className={cn(CARD, "flex items-center gap-4 px-4 py-4")}>
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
          {value}
        </p>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editRole, setEditRole] = useState<AdminUser["role"]>("student");
  const [editStatus, setEditStatus] =
    useState<AdminUser["status"]>("approved");

  const backendConfigured = Boolean(getApiBaseUrl() && hasAuth());

  useEffect(() => {
    let mounted = true;

    getAdminUsers()
      .then((rows) => {
        if (mounted) setUsers(rows);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return users.filter((user) => {
      const matchesRole =
        roleFilter === "all" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" || user.status === statusFilter;

      const searchable = [
        user.email,
        user.fullName,
        user.firstName,
        user.lastName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery =
        !normalizedQuery || searchable.includes(normalizedQuery);

      return matchesRole && matchesStatus && matchesQuery;
    });
  }, [query, roleFilter, statusFilter, users]);

  const summary = useMemo(
    () => ({
      total: users.length,
      students: users.filter((user) => user.role === "student").length,
      teachers: users.filter((user) => user.role === "teacher").length,
      pending: users.filter((user) => user.status === "pending").length,
    }),
    [users]
  );

  function resetFilters() {
    setQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
  }

  function openEdit(user: AdminUser) {
    setSelectedUser(user);
    setEditRole(user.role);
    setEditStatus(user.status);
    setActionError(null);
    setEditOpen(true);
  }

  function updateLocalUser(updated: AdminUser) {
    setUsers((current) =>
      current.map((user) => (user.id === updated.id ? updated : user))
    );
    setSelectedUser(updated);
  }

  async function handleApprove(user: AdminUser) {
    setActionUserId(user.id);
    setActionError(null);

    try {
      const updated = await approveAdminUser(user.id);

      if (!updated) {
        setActionError("Не удалось одобрить пользователя.");
        return;
      }

      updateLocalUser(updated);
    } finally {
      setActionUserId(null);
    }
  }

  async function handleToggleBlock(user: AdminUser) {
    setActionUserId(user.id);
    setActionError(null);

    try {
      const updated =
        user.status === "blocked"
          ? await updateAdminUser(user.id, {
              role: user.role,
              status: "approved",
            })
          : await blockAdminUser(user.id);

      if (!updated) {
        setActionError(
          user.status === "blocked"
            ? "Не удалось разблокировать пользователя."
            : "Не удалось заблокировать пользователя."
        );
        return;
      }

      updateLocalUser(updated);
    } finally {
      setActionUserId(null);
    }
  }

  async function handleSaveEdit() {
    if (!selectedUser) return;

    setActionUserId(selectedUser.id);
    setActionError(null);

    try {
      const updated = await updateAdminUser(selectedUser.id, {
        role: editRole,
        status: editStatus,
      });

      if (!updated) {
        setActionError("Не удалось сохранить изменения.");
        return;
      }

      updateLocalUser(updated);
      setEditOpen(false);
    } finally {
      setActionUserId(null);
    }
  }

  function exportCsv() {
    const rows = [
      ["Имя", "Email", "Роль", "Статус", "Дата создания"],
      ...filteredUsers.map((user) => [
        getUserName(user),
        user.email,
        roleLabel[user.role],
        statusLabel[user.status],
        formatDate(user.createdAt),
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
    anchor.download = "konilai-users.csv";
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
            Пользователи
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Поиск, управление ролями, одобрение заявок и ограничение доступа.
          </p>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-sm">
          <UsersRound size={16} className="text-violet-500" />
          {loading ? "Загрузка…" : `${filteredUsers.length} из ${users.length}`}
        </div>
      </header>

      {!backendConfigured ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Backend API или авторизация не настроены. Список пользователей может
          быть пустым.
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Всего пользователей"
          value={summary.total}
          icon={<UsersRound size={20} />}
          tone="violet"
        />
        <SummaryCard
          label="Студенты"
          value={summary.students}
          icon={<UserRound size={20} />}
          tone="emerald"
        />
        <SummaryCard
          label="Преподаватели"
          value={summary.teachers}
          icon={<ShieldCheck size={20} />}
          tone="slate"
        />
        <SummaryCard
          label="Ожидают одобрения"
          value={summary.pending}
          icon={<UserCog size={20} />}
          tone="amber"
        />
      </section>

      <section className={cn(CARD, "p-4 md:p-5")}>
        <div className="grid gap-3 md:grid-cols-[1.35fr_0.8fr_0.8fr_auto]">
          <label className="relative block">
            <span className="sr-only">Поиск пользователей</span>
            <Search
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по имени или email..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
            />
          </label>

          <SelectField
            ariaLabel="Фильтр по роли"
            value={roleFilter}
            onChange={(value) => setRoleFilter(value as RoleFilter)}
          >
            <option value="all">Все роли</option>
            <option value="student">Студенты</option>
            <option value="teacher">Преподаватели</option>
            <option value="admin">Администраторы</option>
          </SelectField>

          <SelectField
            ariaLabel="Фильтр по статусу"
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as StatusFilter)}
          >
            <option value="all">Любой статус</option>
            <option value="approved">Подтверждён</option>
            <option value="pending">Ожидает одобрения</option>
            <option value="limited">Ограничен</option>
            <option value="blocked">Заблокирован</option>
          </SelectField>

          <button
            type="button"
            onClick={resetFilters}
            className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Сбросить
          </button>
        </div>
      </section>

      {actionError ? (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            aria-label="Закрыть сообщение"
            className="rounded-lg p-1 hover:bg-rose-100"
          >
            <XCircle size={17} />
          </button>
        </div>
      ) : null}

      <section className={cn(CARD, "overflow-hidden")}>
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Список пользователей
            </p>
            <h2 className="mt-1 text-base font-extrabold text-slate-950">
              Роли и доступ
            </h2>
          </div>

          <button
            type="button"
            onClick={exportCsv}
            disabled={filteredUsers.length === 0}
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
                  Пользователь
                </th>
                <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                  Роль
                </th>
                <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                  Статус
                </th>
                <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                  Создан
                </th>
                <th className="px-5 py-3 text-right text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">
                  Действия
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan={5} className="px-5 py-4">
                        <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
                      </td>
                    </tr>
                  ))
                : filteredUsers.map((user) => {
                    const busy = actionUserId === user.id;

                    return (
                      <tr
                        key={user.id}
                        className="transition-colors hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-100 text-sm font-extrabold text-violet-700">
                              {getUserName(user).slice(0, 1).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-900">
                                {getUserName(user)}
                              </p>
                              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                                <Mail size={12} />
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <RoleBadge role={user.role} />
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge status={user.status} />
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-500">
                          {formatDate(user.createdAt)}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(user)}
                              disabled={busy}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                              <Pencil size={14} />
                              Изменить
                            </button>

                            {user.status === "pending" ? (
                              <button
                                type="button"
                                onClick={() => void handleApprove(user)}
                                disabled={busy}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-xs font-bold text-white transition hover:bg-violet-700 disabled:opacity-50"
                              >
                                {busy ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Check size={14} />
                                )}
                                Одобрить
                              </button>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => void handleToggleBlock(user)}
                              disabled={busy}
                              className={cn(
                                "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition disabled:opacity-50",
                                user.status === "blocked"
                                  ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                  : "border-rose-200 text-rose-700 hover:bg-rose-50"
                              )}
                            >
                              {busy ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Ban size={14} />
                              )}
                              {user.status === "blocked"
                                ? "Разблокировать"
                                : "Заблокировать"}
                            </button>
                          </div>
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
                  <div className="h-28 animate-pulse rounded-xl bg-slate-100" />
                </div>
              ))
            : filteredUsers.map((user) => {
                const busy = actionUserId === user.id;

                return (
                  <article key={user.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-100 text-sm font-extrabold text-violet-700">
                        {getUserName(user).slice(0, 1).toUpperCase()}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-900">
                          {getUserName(user)}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <RoleBadge role={user.role} />
                      <StatusBadge status={user.status} />
                    </div>

                    <p className="mt-3 text-xs text-slate-400">
                      Создан: {formatDate(user.createdAt)}
                    </p>

                    <div className="mt-4 grid gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(user)}
                        disabled={busy}
                        className="h-10 rounded-xl border border-slate-200 text-sm font-bold text-slate-700"
                      >
                        Изменить
                      </button>

                      {user.status === "pending" ? (
                        <button
                          type="button"
                          onClick={() => void handleApprove(user)}
                          disabled={busy}
                          className="h-10 rounded-xl bg-violet-600 text-sm font-bold text-white"
                        >
                          Одобрить
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => void handleToggleBlock(user)}
                        disabled={busy}
                        className={cn(
                          "h-10 rounded-xl border text-sm font-bold",
                          user.status === "blocked"
                            ? "border-emerald-200 text-emerald-700"
                            : "border-rose-200 text-rose-700"
                        )}
                      >
                        {user.status === "blocked"
                          ? "Разблокировать"
                          : "Заблокировать"}
                      </button>
                    </div>
                  </article>
                );
              })}
        </div>

        {!loading && filteredUsers.length === 0 ? (
          <div className="grid min-h-[220px] place-items-center px-5 py-10 text-center">
            <div>
              <UsersRound size={34} className="mx-auto text-slate-300" />
              <p className="mt-4 text-sm font-bold text-slate-700">
                Пользователи не найдены
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Измени фильтры или поисковый запрос
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Редактировать пользователя"
        description="Изменение роли и статуса доступа"
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={() => void handleSaveEdit()}
              disabled={
                !selectedUser || actionUserId === selectedUser.id
              }
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-50"
            >
              {actionUserId === selectedUser?.id ? (
                <Loader2 size={16} className="animate-spin" />
              ) : null}
              Сохранить
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold text-slate-500">
              Пользователь
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {selectedUser ? getUserName(selectedUser) : "—"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {selectedUser?.email ?? "—"}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-bold text-slate-600">Роль</span>
              <SelectField
                ariaLabel="Роль пользователя"
                value={editRole}
                onChange={(value) =>
                  setEditRole(value as AdminUser["role"])
                }
              >
                <option value="student">Студент</option>
                <option value="teacher">Преподаватель</option>
                <option value="admin">Администратор</option>
              </SelectField>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-bold text-slate-600">Статус</span>
              <SelectField
                ariaLabel="Статус пользователя"
                value={editStatus}
                onChange={(value) =>
                  setEditStatus(value as AdminUser["status"])
                }
              >
                <option value="approved">Подтверждён</option>
                <option value="pending">Ожидает одобрения</option>
                <option value="limited">Ограничен</option>
                <option value="blocked">Заблокирован</option>
              </SelectField>
            </label>
          </div>

          {selectedUser ? (
            <p className="text-xs text-slate-400">
              ID: {selectedUser.id}
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
