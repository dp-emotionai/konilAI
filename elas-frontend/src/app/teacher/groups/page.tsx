"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Section from "@/components/common/Section";
import Reveal from "@/components/common/Reveal";

import { Card, CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

import { getTeacherGroups, createGroup, type TeacherGroup } from "@/lib/api/teacher";
import { hasAuth, getApiBaseUrl } from "@/lib/api/client";

import { Users, Plus, ArrowRight, Search, LayoutGrid, PlayCircle, Edit3 } from "lucide-react";
import { cn } from "@/lib/cn";

type GroupRow = {
  id: string;
  name: string;
  program?: string;
  description?: string;
  imageUrl?: string;
  sessionCount: number;
  studentsCount: number;
};

function GroupAvatar({ name, imageUrl, className }: { name: string; imageUrl?: string; className?: string }) {
  const initial = name.slice(0, 2).toUpperCase();
  if (imageUrl) {
    return (
      <div
        className={cn("relative overflow-hidden rounded-2xl bg-surface-subtle bg-cover bg-center", className)}
        style={{ backgroundImage: `url(${imageUrl})` }}
        role="img"
        aria-label={name}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-2xl bg-gradient-to-br from-primary-muted/60 to-primary-muted/20 text-[rgb(var(--primary))] font-bold text-lg",
        className
      )}
    >
      {initial}
    </div>
  );
}

export default function TeacherGroupsPage() {
  const [q, setQ] = useState("");
  const [apiGroups, setApiGroups] = useState<TeacherGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupProgram, setNewGroupProgram] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const apiAvailable = getApiBaseUrl() && hasAuth();

  async function refresh() {
    if (!apiAvailable) {
      setLoading(false);
      setLoadError(null);
      return;
    }
    setLoadError(null);
    setLoading(true);
    try {
      const list = await getTeacherGroups();
      setApiGroups(list);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Не удалось загрузить список групп.");
      setApiGroups([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
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
      setNewGroupProgram("");
      setShowCreate(false);
      await refresh();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Ошибка создания группы.");
    } finally {
      setCreating(false);
    }
  };

  const list: GroupRow[] = useMemo(
    () =>
      apiGroups.map((g) => ({
        id: g.id,
        name: g.name,
        program: undefined,
        description: undefined,
        imageUrl: undefined,
        sessionCount: g.sessionCount ?? 0,
        studentsCount: 0,
      })),
    [apiGroups]
  );

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return list.filter((g) => {
      if (!s) return true;
      return (
        g.name.toLowerCase().includes(s) ||
        (g.program && g.program.toLowerCase().includes(s)) ||
        (g.description && g.description.toLowerCase().includes(s)) ||
        g.id.toLowerCase().includes(s)
      );
    });
  }, [list, q]);

  const totalStudents = useMemo(() => list.reduce((acc, g) => acc + g.studentsCount, 0), [list]);
  const totalSessions = useMemo(() => list.reduce((acc, g) => acc + g.sessionCount, 0), [list]);

  return (
    <div className="pb-16">
      <Breadcrumbs items={[{ label: "Преподаватель", href: "/teacher/dashboard" }, { label: "Группы" }]} />

      <PageHero
        title="Мои группы"
        subtitle="Управляйте группами, участниками и сессиями. Добавляйте описание и обложки."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/teacher/sessions/new">
              <Button variant="outline" size="sm" className="gap-2 rounded-xl">
                <PlayCircle size={16} />
                Создать сессию
              </Button>
            </Link>
            {apiAvailable && (
              <Button
                size="sm"
                className="gap-2 rounded-xl shadow-soft"
                onClick={() => {
                  setShowCreate((v) => !v);
                  setCreateError("");
                  setNewGroupName("");
                  setNewGroupProgram("");
                }}
              >
                <Plus size={16} />
                {showCreate ? "Закрыть" : "Создать группу"}
              </Button>
            )}
          </div>
        }
      />

      {/* Сводка */}
      <Section spacing="none" className="mt-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-surface-subtle/80 ring-1 ring-[color:var(--border)]/20 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-muted/50 text-[rgb(var(--primary))]">
                <LayoutGrid size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-fg">{filtered.length}</div>
                <div className="text-xs text-muted">Групп</div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-surface-subtle/80 ring-1 ring-[color:var(--border)]/20 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-muted/50 text-[rgb(var(--primary))]">
                <Users size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-fg">{totalStudents}</div>
                <div className="text-xs text-muted">Студентов</div>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-surface-subtle/80 ring-1 ring-[color:var(--border)]/20 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-muted/50 text-[rgb(var(--primary))]">
                <PlayCircle size={24} />
              </div>
              <div>
                <div className="text-2xl font-bold text-fg">{totalSessions}</div>
                <div className="text-xs text-muted">Сессий</div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section spacing="none" className="mt-8 space-y-6">
        <Reveal>
          <Card variant="elevated">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted">Каталог</div>
                  <h2 className="mt-2 text-xl font-bold text-fg">Все группы</h2>
                  <p className="mt-1 text-sm text-muted">
                    Откройте группу, чтобы управлять участниками, приглашениями и сессиями.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/10 text-[rgb(var(--primary))]">{filtered.length} групп</Badge>
                  {!apiAvailable && <Badge className="bg-surface-subtle">Demo</Badge>}
                </div>
              </div>

              {apiAvailable && showCreate && (
                <div className="mt-6 rounded-2xl bg-surface-subtle/60 ring-1 ring-[color:var(--border)]/20 p-6">
                  <div className="text-sm font-semibold text-fg mb-3">Новая группа</div>
                  <div className="flex flex-wrap gap-4">
                    <div className="min-w-[200px] flex-1 space-y-1">
                      <label className="text-xs text-muted">Название</label>
                      <Input
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="Например: AI-21"
                        onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="min-w-[200px] flex-1 space-y-1">
                      <label className="text-xs text-muted">Программа (необязательно)</label>
                      <Input
                        value={newGroupProgram}
                        onChange={(e) => setNewGroupProgram(e.target.value)}
                        placeholder="Artificial Intelligence"
                        className="rounded-xl"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <Button onClick={handleCreateGroup} disabled={creating} className="rounded-xl">
                        {creating ? "Создание…" : "Создать"}
                      </Button>
                      <Button variant="ghost" onClick={() => setShowCreate(false)} className="rounded-xl">
                        Отмена
                      </Button>
                    </div>
                  </div>
                  {createError && <div className="mt-2 text-sm text-error">{createError}</div>}
                </div>
              )}

              <div className="mt-6 relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Поиск по названию, программе или описанию…"
                  className="pl-11 rounded-xl"
                />
              </div>

              {loadError && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-elas-lg bg-red-500/10 px-4 py-3 text-sm text-red-100 ring-1 ring-red-400/20">
                  <span>{loadError}</span>
                  <Button variant="outline" size="sm" onClick={() => void refresh()}>
                    Повторить
                  </Button>
                </div>
              )}

              {loading ? (
                <div className="mt-6 space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-28 rounded-2xl bg-surface-subtle/50 animate-pulse" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="mt-6 rounded-2xl bg-surface-subtle/50 ring-1 ring-[color:var(--border)]/20 p-12 text-center">
                  <LayoutGrid size={48} className="mx-auto text-muted opacity-50" />
                  <p className="mt-4 font-medium text-fg">Группы не найдены</p>
                  <p className="mt-1 text-sm text-muted">
                    {apiAvailable ? "Создайте группу или измените запрос поиска." : "Измените запрос."}
                  </p>
                  {apiAvailable && !showCreate && (
                    <Button className="mt-4 gap-2 rounded-xl" onClick={() => setShowCreate(true)}>
                      <Plus size={16} />
                      Создать группу
                    </Button>
                  )}
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {filtered.map((g) => (
                    <Link key={g.id} href={`/teacher/group/${g.id}`} className="block">
                      <div
                        className={cn(
                          "group rounded-2xl ring-1 transition-all duration-200",
                          "bg-surface-subtle/40 ring-[color:var(--border)]/20 hover:ring-[color:var(--border)]/40 hover:shadow-soft",
                          "p-5 md:p-6 flex flex-col sm:flex-row sm:items-center gap-4"
                        )}
                      >
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <GroupAvatar name={g.name} imageUrl={g.imageUrl} className="h-16 w-16 shrink-0" />
                          <div className="min-w-0">
                            <div className="font-semibold text-fg truncate">{g.name}</div>
                            {g.program && (
                              <div className="mt-0.5 text-sm text-muted truncate">{g.program}</div>
                            )}
                            {g.description && (
                              <div className="mt-1 text-sm text-muted line-clamp-2">{g.description}</div>
                            )}
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="inline-flex items-center gap-1 text-xs text-muted">
                                <Users size={12} />
                                {g.studentsCount} участников
                              </span>
                              <span className="inline-flex items-center gap-1 text-xs text-muted">
                                <PlayCircle size={12} />
                                {g.sessionCount} сессий
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm ring-1 ring-[color:var(--border)]/30 bg-surface text-fg">
                            <Edit3 size={14} />
                            Настроить
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm bg-[rgb(var(--primary))] text-white shadow-soft">
                            Открыть
                            <ArrowRight size={14} />
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Reveal>
      </Section>
    </div>
  );
}
