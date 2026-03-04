"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Section from "@/components/common/Section";
import Reveal from "@/components/common/Reveal";
import GlassCard from "@/components/ui/GlassCard";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Glow from "@/components/common/Glow";
import { cn } from "@/lib/cn";
import { groups, type Group } from "@/lib/mock/groups";

type Tone = "neutral" | "success" | "info" | "warning" | "purple";
function ToneBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/20"
      : tone === "info"
      ? "bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/20"
      : tone === "warning"
      ? "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/20"
      : tone === "purple"
      ? "bg-purple-500/15 text-purple-200 ring-1 ring-purple-400/25"
      : "bg-white/10 text-zinc-200 ring-1 ring-white/10";

  return (
    <Badge className={cn("rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur", toneClass, className)}>
      {children}
    </Badge>
  );
}

function statusTone(s: Group["status"]): Tone {
  return s === "active" ? "success" : "neutral";
}

export default function AdminGroupsPage() {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return groups.filter((g) => {
      if (!s) return true;
      return (
        g.id.toLowerCase().includes(s) ||
        g.name.toLowerCase().includes(s) ||
        g.program.toLowerCase().includes(s) ||
        g.teacher.name.toLowerCase().includes(s) ||
        g.status.toLowerCase().includes(s)
      );
    });
  }, [q]);

  return (
    <div className="relative space-y-14 pb-20">
      <Glow />
      <Breadcrumbs items={[{ label: "Админ", href: "/admin/dashboard" }, { label: "Группы" }]} />

      <PageHero
        title="Группы"
        subtitle="Управление учебной структурой: группы, преподаватели и студенты (пример)."
      />

      <Section>
        <Reveal>
          <GlassCard className="p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-zinc-100">Справочник групп</h2>
                <p className="text-sm text-zinc-400">
                  Поиск групп и переход к деталям: назначение преподавателя, управление студентами.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ToneBadge tone="info">{filtered.length} групп</ToneBadge>
                <Button
                  type="button"
                  className="ring-1 ring-purple-400/25 bg-purple-500/20 hover:bg-purple-500/25 text-purple-100"
                  onClick={() => navigator.clipboard?.writeText("ADMIN_CREATE_GROUP_MOCK")}
                >
                  Создать группу (пример)
                </Button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="min-w-[260px] flex-1">
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по названию, программе, преподавателю…" />
              </div>
              <Button
                type="button"
                className="ring-1 ring-white/10 bg-white/10 hover:bg-white/15 text-zinc-100"
                onClick={() => setQ("")}
              >
                Сбросить
              </Button>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-white/5 text-zinc-400">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Группа</th>
                      <th className="px-4 py-3 text-left font-medium">Программа</th>
                      <th className="px-4 py-3 text-left font-medium">Преподаватель</th>
                      <th className="px-4 py-3 text-left font-medium">Студентов</th>
                      <th className="px-4 py-3 text-left font-medium">Статус</th>
                      <th className="px-4 py-3 text-left font-medium">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.map((g) => (
                      <tr key={g.id} className="bg-black/10 hover:bg-white/5 transition">
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <p className="font-medium text-zinc-200">{g.name}</p>
                            <p className="text-xs text-zinc-500">{g.id}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-zinc-300">{g.program}</td>
                        <td className="px-4 py-3 text-zinc-300">{g.teacher.name}</td>
                        <td className="px-4 py-3 text-zinc-300">{g.students.length}</td>
                        <td className="px-4 py-3">
                          <ToneBadge tone={statusTone(g.status)}>{g.status === "active" ? "Активна" : "В архиве"}</ToneBadge>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/group/${g.id}`}
                            className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm ring-1 ring-white/10 bg-white/10 hover:bg-white/15 text-zinc-100 transition"
                          >
                            Открыть
                          </Link>
                        </td>
                      </tr>
                    ))}

                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center">
                          <p className="text-sm text-zinc-200">Группы не найдены.</p>
                          <p className="mt-1 text-xs text-zinc-500">Измените запрос поиска.</p>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <ToneBadge tone="purple">Архитектура v2</ToneBadge>
              <span className="text-xs text-zinc-500">
                Группа → Сессия → Участники → Аналитика → Отчёты.
              </span>
            </div>
          </GlassCard>
        </Reveal>
      </Section>
    </div>
  );
}