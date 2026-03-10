"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Section from "@/components/common/Section";
import Reveal from "@/components/common/Reveal";

import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Table, { THead, TBody, TRow, TCell, TH, TMuted } from "@/components/ui/Table";

import { getTeacherAllSessions, updateSessionStatus, type GroupSession } from "@/lib/api/teacher";
import { hasAuth, getApiBaseUrl } from "@/lib/api/client";

const statusToBackend = (next: string): "active" | "finished" | "draft" =>
  next === "live" ? "active" : next === "ended" ? "finished" : "draft";

function statusBadge(status: GroupSession["status"]) {
  if (status === "live") return <Badge variant="success">В эфире</Badge>;
  if (status === "ended") return <Badge>Завершена</Badge>;
  return <Badge variant="warning">Ожидает</Badge>;
}

export default function TeacherSessionsPage() {
  const [tick, setTick] = useState(0);
  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "live" | "waiting" | "ended">("all");

  const apiAvailable = getApiBaseUrl() && hasAuth();

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTeacherAllSessions();
      setSessions(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions, tick]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();

    return sessions.filter((it) => {
      if (filter !== "all") {
        if (filter === "live" && it.status !== "live") return false;
        if (filter === "ended" && it.status !== "ended") return false;
        if (filter === "waiting" && it.status !== "upcoming") return false;
      }

      if (!s) return true;

      const hay = `${it.title} ${it.groupId} ${it.status}`.toLowerCase();
      return hay.includes(s);
    });
  }, [sessions, q, filter]);

  const handleLifecycle = async (s: GroupSession) => {
    const action =
      s.status === "upcoming"
        ? { label: "Start", next: "live" as const }
        : s.status === "live"
          ? { label: "End", next: "ended" as const }
          : { label: "Reopen", next: "upcoming" as const };

    setActioningId(s.id);
    try {
      await updateSessionStatus(s.id, statusToBackend(action.next));
      setTick((x) => x + 1);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="pb-12">
      <Breadcrumbs items={[{ label: "Преподаватель", href: "/teacher/dashboard" }, { label: "Сессии" }]} />

      <PageHero
        title="Все сессии"
        subtitle="Создайте сессию, нажмите «Старт» — студенты увидят её в эфире и смогут подключиться."
        right={
          <Link href="/teacher/sessions/new">
            <Button>Создать сессию</Button>
          </Link>
        }
      />

      <Section spacing="none" className="mt-8 space-y-6">
        <Reveal>
          <Card>
            <CardContent className="p-6 md:p-7">
              {/* controls */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-[240px] flex-1">
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по названию или группе…" />
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => void loadSessions()} disabled={loading}>
                    Обновить
                  </Button>
                  <div className="inline-flex items-center gap-1 rounded-full bg-surface-subtle p-1">
                    {[
                      { id: "all", label: "Все" },
                      { id: "live", label: "LIVE" },
                      { id: "waiting", label: "Ожидают" },
                      { id: "ended", label: "Заверш." },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setFilter(t.id as any)}
                        className={[
                          "px-3 py-2 text-sm rounded-full transition",
                          filter === (t.id as any) ? "bg-surface shadow-soft text-fg" : "text-muted hover:text-fg",
                        ].join(" ")}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  <Badge className="bg-primary/10">{filtered.length} items</Badge>
                </div>
              </div>

              {/* table */}
              <div className="mt-6">
                <Table>
                  <THead>
                    <TRow>
                      <TH className="w-[40%]">Название</TH>
                      <TH className="w-[20%]">Группа</TH>
                      <TH className="w-[15%]">Статус</TH>
                      <TH className="w-[25%] text-right">Действия</TH>
                    </TRow>
                  </THead>
                  <TBody>
                    {loading ? (
                      <TRow>
                        <TCell colSpan={4}>
                          <div className="h-10 rounded-elas-lg bg-surface-subtle animate-pulse" />
                        </TCell>
                      </TRow>
                    ) : filtered.length === 0 ? (
                      <TRow>
                        <TCell colSpan={4} className="py-8 text-center">
                          {sessions.length === 0 ? (
                            <>
                              <div className="text-sm font-medium text-fg">Нет сессий</div>
                              <div className="mt-2 text-sm text-muted">Создайте первую сессию.</div>
                              <Link href="/teacher/sessions/new" className="mt-4 inline-block">
                                <Button size="sm">Создать сессию</Button>
                              </Link>
                            </>
                          ) : (
                            <>
                              <div className="text-sm font-medium text-fg">Ничего не найдено</div>
                              <div className="mt-2 text-sm text-muted">Попробуйте изменить поиск или фильтр.</div>
                            </>
                          )}
                        </TCell>
                      </TRow>
                    ) : (
                      filtered.map((s) => {
                        const action =
                          s.status === "upcoming"
                            ? { label: "Start", next: "live" as const }
                            : s.status === "live"
                              ? { label: "End", next: "ended" as const }
                              : { label: "Reopen", next: "upcoming" as const };
                        const label =
                          action.label === "Start"
                            ? "Старт"
                            : action.label === "End"
                            ? "Завершить"
                            : "Повторно открыть";

                        return (
                          <TRow key={s.id}>
                            <TCell>
                              <div className="font-medium">{s.title}</div>
                              <TMuted>ID: {s.id}</TMuted>
                            </TCell>
                            <TCell>{s.groupId}</TCell>
                            <TCell>{statusBadge(s.status)}</TCell>
                            <TCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleLifecycle(s)}
                                  disabled={actioningId === s.id}
                                >
                                  {actioningId === s.id ? "…" : label}
                                </Button>
                                <Link href={`/teacher/session/${s.id}`}>
                                  <Button size="sm" variant="outline">
                                    Открыть
                                  </Button>
                                </Link>
                              </div>
                            </TCell>
                          </TRow>
                        );
                      })
                    )}
                  </TBody>
                </Table>
              </div>

            </CardContent>
          </Card>
        </Reveal>
      </Section>
    </div>
  );
}
