"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Reveal from "@/components/common/Reveal";
import {Card} from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Table, { THead, TRow, TCell, TMuted } from "@/components/ui/Table";
import { mockUsers } from "@/lib/mock/users";

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"all" | "student" | "teacher" | "admin">("all");
  const [status, setStatus] = useState<"all" | "active" | "blocked">("all");

  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<(typeof mockUsers)[number] | null>(null);

  const data = useMemo(() => {
    return mockUsers
      .filter((u) => (role === "all" ? true : u.role === role))
      .filter((u) => (status === "all" ? true : u.status === status))
      .filter((u) => (q.trim() ? u.email.toLowerCase().includes(q.toLowerCase()) : true));
  }, [q, role, status]);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: "Админ", href: "/admin/dashboard" }, { label: "Пользователи" }]} />
      <PageHero
        overline="Администрирование"
        title="Пользователи"
        subtitle="Поиск, роли, блокировка и сброс пароля (интерфейс в разработке)."
        right={<Badge>{data.length} всего</Badge>}
      />

      <Reveal>
        <Card className="p-6">
          <div className="grid md:grid-cols-4 gap-3">
            <Input placeholder="Поиск по email…" value={q} onChange={(e) => setQ(e.target.value)} />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="h-11 rounded-2xl bg-black/30 border border-white/10 px-4 text-white/80 outline-none"
            >
              <option value="all">Все роли</option>
              <option value="student">Студент</option>
              <option value="teacher">Преподаватель</option>
              <option value="admin">Админ</option>
            </select>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="h-11 rounded-2xl bg-black/30 border border-white/10 px-4 text-white/80 outline-none"
            >
              <option value="all">Любой статус</option>
              <option value="active">Активен</option>
              <option value="blocked">Заблокирован</option>
            </select>

            <Button variant="outline" onClick={() => { setQ(""); setRole("all"); setStatus("all"); }}>
              Сбросить фильтры
            </Button>
          </div>
        </Card>
      </Reveal>

      <Reveal>
        <Card className="p-0 overflow-hidden">
          <div className="px-6 py-5 border-b border-white/10 bg-black/20 flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-sm text-white/60">Список пользователей</div>
              <div className="mt-1 font-semibold">Роли и доступ</div>
            </div>
            <Button variant="outline">Экспорт (CSV)</Button>
          </div>

          <div className="p-6">
            <Table>
              <THead>
                <div className="grid grid-cols-12 items-center">
                  <div className="col-span-5 text-sm text-white/60">Пользователь</div>
                  <div className="col-span-2 text-sm text-white/60">Роль</div>
                  <div className="col-span-2 text-sm text-white/60">Статус</div>
                  <div className="col-span-3 text-sm text-white/60 text-right">Действия</div>
                </div>
              </THead>

              {data.map((u) => (
                <TRow key={u.id}>
                  <div className="grid grid-cols-12 items-center">
                    <div className="col-span-5">
                      <TCell className="font-medium text-white">{u.email}</TCell>
                      <TMuted>Создан: {new Date(u.createdAt).toLocaleDateString()}</TMuted>
                    </div>

                    <div className="col-span-2">
                      <Badge>{u.role.toUpperCase()}</Badge>
                    </div>

                    <div className="col-span-2">
                      <TCell className={u.status === "blocked" ? "text-red-300" : "text-emerald-200"}>
                        {u.status === "blocked" ? "Заблокирован" : "Активен"}
                      </TCell>
                    </div>

                    <div className="col-span-3 flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setSelected(u); setEditOpen(true); }}
                      >
                        Изменить
                      </Button>
                      <Button size="sm" variant="ghost">
                        Сброс пароля
                      </Button>
                      <Button size="sm" variant={u.status === "blocked" ? "primary" : "outline"}>
                        {u.status === "blocked" ? "Разблокировать" : "Заблокировать"}
                      </Button>
                    </div>
                  </div>
                </TRow>
              ))}
            </Table>
          </div>
        </Card>
      </Reveal>

      <Modal
        open={editOpen}
        title="Редактировать пользователя"
        description="Изменить роль и статус (интерфейс в разработке)."
        onClose={() => setEditOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Отмена</Button>
            <Button onClick={() => setEditOpen(false)}>Сохранить</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
            <div className="text-sm text-white/60">Email</div>
            <div className="mt-1 font-medium">{selected?.email ?? "-"}</div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="text-sm text-white/60">Роль</div>
              <select className="mt-2 h-11 w-full rounded-2xl bg-black/30 border border-white/10 px-4 text-white/80 outline-none">
                <option>student</option>
                <option>teacher</option>
                <option>admin</option>
              </select>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="text-sm text-white/60">Статус</div>
              <select className="mt-2 h-11 w-full rounded-2xl bg-black/30 border border-white/10 px-4 text-white/80 outline-none">
                <option>active</option>
                <option>blocked</option>
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
