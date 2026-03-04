"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import PageHero from "@/components/common/PageHero";
import Reveal from "@/components/common/Reveal";
import Section from "@/components/common/Section";
import GlassCard from "@/components/ui/GlassCard";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Glow from "@/components/common/Glow";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { cn } from "@/lib/cn";
import { readConsent } from "@/lib/mock/sessionLifecycle";
import { getStudentSessionsList, type StudentSessionRow } from "@/lib/api/student";
import { hasAuth, getApiBaseUrl } from "@/lib/api/client";

const POLL_INTERVAL_MS = 12000;

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
    <Badge
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur",
        toneClass,
        className
      )}
    >
      {children}
    </Badge>
  );
}

function statusTone(s: StudentSessionRow["status"]): Tone {
  if (s === "live") return "warning";
  if (s === "upcoming") return "purple";
  return "neutral";
}

function SkeletonRow() {
  return (
    <div className="h-12 rounded-2xl border border-white/10 bg-white/5 animate-pulse" />
  );
}

export default function StudentSessionsPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [consent, setConsent] = useState(false);
  const [data, setData] = useState<StudentSessionRow[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const apiAvailable = getApiBaseUrl() && hasAuth();

  const fetchSessions = useCallback(() => {
    return getStudentSessionsList().then((rows) => {
      setData(rows);
      setLastUpdated(new Date());
    });
  }, []);

  useEffect(() => {
    setConsent(readConsent());
    const onStorage = () => setConsent(readConsent());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    let mounted = true;
    setInitialLoading(true);
    fetchSessions().finally(() => {
      if (mounted) setInitialLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [fetchSessions]);

  useEffect(() => {
    if (!apiAvailable) return;
    const t = setInterval(() => {
      setLoading(true);
      fetchSessions().finally(() => setLoading(false));
    }, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [apiAvailable, fetchSessions]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return data.filter((x) => {
      if (!s) return true;
      return (
        x.id.toLowerCase().includes(s) ||
        x.title.toLowerCase().includes(s) ||
        x.teacher.toLowerCase().includes(s) ||
        x.type.toLowerCase().includes(s) ||
        x.status.toLowerCase().includes(s)
      );
    });
  }, [data, q]);

  const liveCount = useMemo(() => data.filter((x) => x.status === "live").length, [data]);

  return (
    <div className="relative space-y-12 pb-20">
      <Glow />
      <Breadcrumbs
        items={[
          { label: "Студент", href: "/student/dashboard" },
          { label: "Сессии" },
        ]}
      />
      <PageHero
        title="Мои сессии"
        subtitle={
          apiAvailable
            ? "Список обновляется автоматически. Подключиться можно к сессии со статусом «В эфире» при данном согласии."
            : "Демо: список из моков. Войдите и подключите backend, чтобы видеть сессии преподавателей."
        }
        right={
          apiAvailable && (
            <div className="flex items-center gap-2">
              {liveCount > 0 && (
                <ToneBadge tone="warning">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-400 mr-1.5 animate-pulse" />
                  В эфире: {liveCount}
                </ToneBadge>
              )}
              {lastUpdated && (
                <span className="text-xs text-white/50">
                  Обновлено {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
          )
        }
      />

      <Section>
        <Reveal>
          <GlassCard className="p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-zinc-100">Сессии</h2>
                <p className="text-sm text-slate-500 dark:text-zinc-400">
                  Поиск, статус и вход в сессию. Новые сессии появляются в списке автоматически.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <ToneBadge tone="info">{filtered.length} в списке</ToneBadge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLoading(true);
                    fetchSessions().finally(() => setLoading(false));
                  }}
                  disabled={loading}
                >
                  {loading ? "Обновление…" : "Обновить"}
                </Button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="min-w-[240px] flex-1">
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Поиск по названию, преподавателю, статусу…"
                />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {initialLoading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : filtered.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
                  <p className="text-sm text-zinc-200">Сессий пока нет.</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Когда преподаватель создаст сессию, она появится здесь. Обновите страницу или подождите.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => {
                      setLoading(true);
                      fetchSessions().finally(() => setLoading(false));
                    }}
                  >
                    Обновить список
                  </Button>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[860px] text-sm">
                      <thead className="bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-zinc-400">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Сессия</th>
                          <th className="px-4 py-3 text-left font-medium">Тип</th>
                          <th className="px-4 py-3 text-left font-medium">Преподаватель</th>
                          <th className="px-4 py-3 text-left font-medium">Дата</th>
                          <th className="px-4 py-3 text-left font-medium">Статус</th>
                          <th className="px-4 py-3 text-left font-medium">Действие</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                        {filtered.map((s) => {
                          const canJoin = s.status === "live" && consent;

                          return (
                            <tr key={s.id} className="bg-white hover:bg-slate-50 dark:bg-black/10 dark:hover:bg-white/5 transition">
                              <td className="px-4 py-3">
                                <div className="space-y-0.5">
                                  <p className="text-slate-900 dark:text-zinc-200 font-medium">{s.title}</p>
                                  <p className="text-xs text-slate-500 dark:text-zinc-500">ID: {s.id}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-zinc-300">
                                <ToneBadge tone={s.type === "exam" ? "warning" : "info"}>
                                  {s.type === "exam" ? "Экзамен" : "Лекция"}
                                </ToneBadge>
                              </td>
                              <td className="px-4 py-3 text-zinc-300">{s.teacher}</td>
                              <td className="px-4 py-3 text-zinc-300">{s.date}</td>
                              <td className="px-4 py-3">
                                <ToneBadge tone={statusTone(s.status)}>
                                  {s.status === "live" ? "В эфире" : s.status === "upcoming" ? "Ожидает" : "Завершена"}
                                </ToneBadge>
                              </td>
                              <td className="px-4 py-3">
                                {canJoin ? (
                                  <Link
                                    href={`/student/session/${s.id}`}
                                    className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm ring-1 ring-purple-400/20 bg-purple-500/15 hover:bg-purple-500/20 text-purple-100 transition"
                                  >
                                    Подключиться
                                  </Link>
                                ) : s.status !== "live" ? (
                                  <span className="text-xs text-zinc-500">Подключение после старта сессии</span>
                                ) : (
                                  <Link
                                    href="/consent"
                                    className="text-xs text-amber-200 hover:underline"
                                  >
                                    Нужно согласие
                                  </Link>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        </Reveal>
      </Section>
    </div>
  );
}
