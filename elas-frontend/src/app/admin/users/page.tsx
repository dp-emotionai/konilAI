"use client";

import { useEffect, useMemo, useState } from "react";

import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Reveal from "@/components/common/Reveal";
import { Card, CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Table, {
  THead,
  TBody,
  TRow,
  TH,
  TCell,
  TMuted,
} from "@/components/ui/Table";
import type { AdminUser } from "@/lib/api/admin";
import { getAdminUsers, approveAdminUser, blockAdminUser, updateAdminUser } from "@/lib/api/admin";

type RoleFilter = "all" | "student" | "teacher" | "admin";
type StatusFilter = "all" | "approved" | "pending" | "limited" | "blocked";

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<RoleFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");

  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [editRoleValue, setEditRoleValue] = useState<"student" | "teacher" | "admin">("student");
  const [editStatusValue, setEditStatusValue] =
    useState<"approved" | "pending" | "limited" | "blocked">("approved");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const list = await getAdminUsers();
      if (!mounted) return;
      setUsers(list.length ? list : null);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const source: AdminUser[] = users ?? [];

  const data = useMemo(() => {
    return source
      .filter((u) => (role === "all" ? true : u.role === role))
      .filter((u) => (status === "all" ? true : u.status === status))
      .filter((u) =>
        q.trim() ? u.email.toLowerCase().includes(q.trim().toLowerCase()) : true
      );
  }, [q, role, status, source]);

  const resetFilters = () => {
    setQ("");
    setRole("all");
    setStatus("all");
  };

  const openEdit = (user: AdminUser) => {
    setSelected(user);
    setEditRoleValue(user.role);
    setEditStatusValue(user.status);
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selected) {
      setEditOpen(false);
      return;
    }
    setActionUserId(selected.id);
    try {
      const updated = await updateAdminUser(selected.id, {
        role: editRoleValue,
        status: editStatusValue,
      });
      if (!updated) return;
      setUsers((prev) =>
        prev ? prev.map((u) => (u.id === updated.id ? updated : u)) : prev
      );
      setSelected(updated);
      setEditOpen(false);
    } finally {
      setActionUserId(null);
    }
  };

  const handleApprove = async (user: AdminUser) => {
    setActionUserId(user.id);
    try {
      const updated = await approveAdminUser(user.id);
      if (!updated) return;
      setUsers((prev) =>
        prev ? prev.map((u) => (u.id === updated.id ? updated : u)) : prev
      );
    } finally {
      setActionUserId(null);
    }
  };

  const handleToggleBlock = async (user: AdminUser) => {
    setActionUserId(user.id);
    try {
      const updated = await blockAdminUser(user.id);
      if (!updated) return;
      setUsers((prev) =>
        prev ? prev.map((u) => (u.id === updated.id ? updated : u)) : prev
      );
    } finally {
      setActionUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Админ", href: "/admin/dashboard" },
          { label: "Пользователи" },
        ]}
      />

      <PageHero
        overline="Администрирование"
        title="Пользователи"
        subtitle="Поиск, роли, блокировка и сброс пароля. Интерфейс управления находится в доработке."
        right={<Badge variant="secondary">{data.length} всего</Badge>}
      />

      <Reveal>
        <Card>
          <CardContent className="p-6">
            <div className="grid gap-3 md:grid-cols-4">
              <Input
                placeholder="Поиск по email…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />

              <select
                value={role}
                onChange={(e) => setRole(e.target.value as RoleFilter)}
                className="h-11 rounded-2xl border border-[color:var(--border)] bg-surface px-4 text-sm text-fg outline-none transition focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]/35"
              >
                <option value="all">Все роли</option>
                <option value="student">Студент</option>
                <option value="teacher">Преподаватель</option>
                <option value="admin">Админ</option>
              </select>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusFilter)}
                className="h-11 rounded-2xl border border-[color:var(--border)] bg-surface px-4 text-sm text-fg outline-none transition focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]/35"
              >
                <option value="all">Любой статус</option>
                <option value="approved">Подтверждён</option>
                <option value="pending">Ожидает одобрения</option>
                <option value="limited">Ограничен</option>
                <option value="blocked">Заблокирован</option>
              </select>

              <Button variant="outline" onClick={resetFilters}>
                Сбросить фильтры
              </Button>
            </div>
          </CardContent>
        </Card>
      </Reveal>

      <Reveal>
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[color:var(--border)] bg-surface-subtle px-6 py-5">
            <div>
              <div className="text-sm text-muted">Список пользователей</div>
              <div className="mt-1 font-semibold text-fg">Роли и доступ</div>
            </div>

            <Button variant="outline">Экспорт (CSV)</Button>
          </div>

          <div className="p-6">
            <Table>
              <THead>
                <TRow>
                  <TH>Пользователь</TH>
                  <TH>Роль</TH>
                  <TH>Статус</TH>
                  <TH className="text-right">Действия</TH>
                </TRow>
              </THead>

              <TBody>
                {data.map((u) => (
                  <TRow key={u.id}>
                    <TCell>
                      <div className="font-medium text-fg">{u.email}</div>
                      <TMuted>
                        Создан: {new Date(u.createdAt).toLocaleDateString()}
                      </TMuted>
                    </TCell>

                    <TCell>
                      <Badge variant="secondary">{u.role.toUpperCase()}</Badge>
                    </TCell>

                    <TCell>
                      {u.status === "blocked" && (
                        <span className="text-red-300">Заблокирован</span>
                      )}
                      {u.status === "approved" && (
                        <span className="text-emerald-300">Подтверждён</span>
                      )}
                      {u.status === "pending" && (
                        <span className="text-yellow-300">Ожидает одобрения</span>
                      )}
                      {u.status === "limited" && (
                        <span className="text-sky-300">Ограничен</span>
                      )}
                    </TCell>

                    <TCell>
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(u)}>
                          Изменить
                        </Button>

                        {u.status === "pending" && (
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={actionUserId === u.id}
                            onClick={() => handleApprove(u)}
                          >
                            {actionUserId === u.id ? "..." : "Одобрить"}
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant={u.status === "blocked" ? "primary" : "outline"}
                          disabled={actionUserId === u.id}
                          onClick={() => handleToggleBlock(u)}
                        >
                          {actionUserId === u.id
                            ? "..."
                            : u.status === "blocked"
                            ? "Разблокировать"
                            : "Заблокировать"}
                        </Button>
                      </div>
                    </TCell>
                  </TRow>
                ))}
              </TBody>
            </Table>

            {data.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-surface-subtle px-4 py-8 text-center text-sm text-muted">
                По заданным фильтрам ничего не найдено.
              </div>
            ) : null}
          </div>
        </Card>
      </Reveal>

      <Modal
        open={editOpen}
        title="Редактировать пользователя"
        onClose={() => setEditOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveEdit} disabled={actionUserId === selected?.id}>
              {actionUserId === selected?.id ? "Сохранение…" : "Сохранить"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Изменить роль и статус. Интерфейс пока в разработке.
          </p>

          <div className="rounded-2xl border border-[color:var(--border)] bg-surface-subtle p-4">
            <div className="text-sm text-muted">Email</div>
            <div className="mt-1 font-medium text-fg">{selected?.email ?? "-"}</div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-[color:var(--border)] bg-surface-subtle p-4">
              <div className="text-sm text-muted">Роль</div>
              <select
                className="mt-2 h-11 w-full rounded-2xl border border-[color:var(--border)] bg-surface px-4 text-sm text-fg outline-none transition focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]/35"
                value={editRoleValue}
                onChange={(e) =>
                  setEditRoleValue(e.target.value as "student" | "teacher" | "admin")
                }
              >
                <option value="student">student</option>
                <option value="teacher">teacher</option>
                <option value="admin">admin</option>
              </select>
            </div>

            <div className="rounded-2xl border border-[color:var(--border)] bg-surface-subtle p-4">
              <div className="text-sm text-muted">Статус</div>
              <select
                className="mt-2 h-11 w-full rounded-2xl border border-[color:var(--border)] bg-surface px-4 text-sm text-fg outline-none transition focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]/35"
                value={editStatusValue}
                onChange={(e) =>
                  setEditStatusValue(
                    e.target.value as "approved" | "pending" | "limited" | "blocked"
                  )
                }
              >
                <option value="approved">approved</option>
                <option value="pending">pending</option>
                <option value="limited">limited</option>
                <option value="blocked">blocked</option>
              </select>
            </div>
          </div>

          {selected ? (
            <div className="text-xs text-muted">
              ID: <span className="text-fg">{selected.id}</span>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}