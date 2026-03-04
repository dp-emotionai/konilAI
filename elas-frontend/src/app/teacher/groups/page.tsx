"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Section from "@/components/common/Section";
import Reveal from "@/components/common/Reveal";
import GlassCard from "@/components/ui/GlassCard";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { groups as mockGroups } from "@/lib/mock/groups";
import { getSessionsByGroup } from "@/lib/mock/groupSessions";
import { getTeacherGroups, createGroup, type TeacherGroup } from "@/lib/api/teacher";
import { hasAuth, getApiBaseUrl } from "@/lib/api/client";

type Tone = "neutral" | "success" | "info" | "warning" | "purple";

function ToneBadge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: Tone; className?: string }) {
  const toneClass =
    tone === "success" ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/20"
    : tone === "info" ? "bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/20"
    : tone === "purple" ? "bg-purple-500/15 text-purple-200 ring-1 ring-purple-400/25"
    : "bg-white/10 text-zinc-200 ring-1 ring-white/10";
  return (
    <Badge className={cn("rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur", toneClass, className)}>
      {children}
    </Badge>
  );
}

function fetchGroups(setApiGroups: (g: TeacherGroup[]) => void, setLoading: (v: boolean) => void) {
  setLoading(true);
  getTeacherGroups()
    .then(setApiGroups)
    .finally(() => setLoading(false));
}

export default function TeacherGroupsPage() {
  const [q, setQ] = useState("");
  const [apiGroups, setApiGroups] = useState<TeacherGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const apiAvailable = getApiBaseUrl() && hasAuth();

  useEffect(() => {
    if (!apiAvailable) {
      setLoading(false);
      return;
    }
    let mounted = true;
    getTeacherGroups().then((list) => {
      if (mounted) setApiGroups(list);
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, [apiAvailable]);

  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) {
      setCreateError("Введите название группы.");
      return;
    }
    setCreateError("");
    setCreating(true);
    try {
      await createGroup(name);
      setNewGroupName("");
      setShowCreateGroup(false);
      fetchGroups(setApiGroups, setLoading);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Ошибка создания группы.");
    } finally {
      setCreating(false);
    }
  };

  const list = apiAvailable ? apiGroups : mockGroups.map((g) => ({
    id: g.id,
    name: g.name,
    sessionCount: getSessionsByGroup(g.id).length,
    program: g.program,
    students: g.students,
  }));

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return list.filter((g: { id: string; name: string; program?: string }) => {
      if (!s) return true;
      return g.name.toLowerCase().includes(s) || (g.program && g.program.toLowerCase().includes(s));
    });
  }, [list, q]);

  return (
    <div className="space-y-10 pb-16">
      <Breadcrumbs items={[{ label: "Преподаватель", href: "/teacher/dashboard" }, { label: "Группы" }]} />
      <PageHero
        title="Мои группы"
        subtitle="Работа с учебными группами: сессии, приглашения и аналитика."
        right={
          <Link href="/teacher/sessions/new">
            <Button>Создать сессию</Button>
          </Link>
        }
      />

      <Section>
        <Reveal>
          <GlassCard className="p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-(--text)">Группы</h2>
                <p className="text-sm text-(--muted)">
                  Откройте группу, чтобы создать сессию, увидеть участников и аналитику.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ToneBadge tone="info">{filtered.length} групп</ToneBadge>
                {apiAvailable && (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => {
                      setShowCreateGroup((s) => !s);
                      setCreateError("");
                      setNewGroupName("");
                    }}
                  >
                    {showCreateGroup ? "Отмена" : "Создать группу"}
                  </Button>
                )}
              </div>
            </div>

            {apiAvailable && showCreateGroup && (
              <div className="mt-6 rounded-2xl border border-purple-500/20 bg-purple-500/10 p-5">
                <p className="text-sm font-medium text-slate-900 dark:text-zinc-200 mb-3">Новая группа</p>
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="min-w-[200px] flex-1">
                    <Input
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Название группы, например: AI-21"
                      onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
                    />
                  </div>
                  <Button onClick={handleCreateGroup} disabled={creating}>
                    {creating ? "Создание…" : "Создать"}
                  </Button>
                </div>
                {createError && <p className="mt-2 text-sm text-red-500">{createError}</p>}
              </div>
            )}

            <div className="mt-6">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Поиск по названию группы…"
              />
            </div>

            {loading ? (
              <div className="mt-6 h-32 rounded-2xl bg-white/60 dark:bg-white/5 animate-pulse" />
            ) : filtered.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
                <p className="text-sm text-zinc-200">Групп не найдено.</p>
                <p className="mt-1 text-xs text-zinc-500">
                  {apiAvailable ? "Нажмите «Создать группу» выше или измените поиск." : "Измените запрос поиска."}
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {filtered.map(
                  (g: {
                    id: string;
                    name: string;
                    sessionCount?: number;
                    program?: string;
                    students?: unknown[];
                  }) => (
                    <Link
                      key={g.id}
                      href={`/teacher/group/${g.id}`}
                      className="rounded-3xl border border-black/5 bg-[color:var(--surface)] p-6 shadow-[0_14px_30px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 hover:shadow-elas-soft-light transition block dark:border-white/10 dark:bg-white/5 dark:shadow-[0_18px_45px_rgba(0,0,0,0.65)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-lg font-semibold text-[color:var(--text)]">{g.name}</p>
                          {g.program && <p className="text-sm text-[color:var(--muted)]">{g.program}</p>}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2 flex-wrap">
                        <ToneBadge tone="info">ID: {g.id}</ToneBadge>
                        {typeof g.sessionCount === "number" && (
                          <ToneBadge tone="purple">{g.sessionCount} сессий</ToneBadge>
                        )}
                        {Array.isArray(g.students) && (
                          <ToneBadge tone="purple">{g.students.length} студентов</ToneBadge>
                        )}
                      </div>
                    </Link>
                  ),
                )}
              </div>
            )}
          </GlassCard>
        </Reveal>
      </Section>
    </div>
  );
}
