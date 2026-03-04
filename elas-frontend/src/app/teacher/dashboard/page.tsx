"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Section from "@/components/common/Section";
import Reveal from "@/components/common/Reveal";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Table, { THead, TRow, TCell, TMuted } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { getTeacherDashboardSessions } from "@/lib/api/teacher";
import type { Session } from "@/lib/mock/sessions";

import { buildInsightsFromSessions, summarizeTeacherDashboard } from "@/lib/utils/metrics";
import { Activity, BarChart3, Users, AlertTriangle, PlayCircle, Sparkles } from "lucide-react";

function KPI({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="p-6 md:p-7">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm text-muted">{label}</div>
          <div className="mt-1 text-3xl font-semibold tracking-tight text-fg">{value}</div>
          <div className="text-sm text-muted">{hint}</div>
        </div>

        <div className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-elas-lg bg-surface-subtle shadow-soft text-[rgb(var(--primary))]">
          {icon}
        </div>
      </div>
    </Card>
  );
}

function Insight({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-elas-lg bg-surface-subtle p-4 shadow-soft hover:opacity-95 transition">
      <div className="font-semibold text-fg">{title}</div>
      <div className="text-sm mt-1 text-muted leading-relaxed">{text}</div>
    </div>
  );
}

function Step({
  n,
  title,
  text,
  actions,
}: {
  n: number;
  title: string;
  text: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="rounded-elas-lg bg-surface-subtle p-5 shadow-soft h-full flex flex-col">
      <div className="flex items-center gap-3">
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[rgb(var(--primary))] text-white text-sm font-semibold shadow-glow">
          {n}
        </div>
        <div className="font-semibold text-fg">{title}</div>
      </div>

      <p className="mt-3 text-sm text-muted leading-relaxed flex-1">{text}</p>

      {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

function StatusBadge({ s }: { s: Session }) {
  const label =
    s.status === "active" ? "LIVE" : s.status === "draft" ? "Заплан." : "Заверш.";
  return (
    <Badge className={s.status === "active" ? "bg-primary/10" : "bg-surface-subtle"}>
      {label}
    </Badge>
  );
}

export default function TeacherDashboard() {
  const toast = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    getTeacherDashboardSessions().then((data) => {
      if (!mounted) return;
      setSessions(data);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const summary = useMemo(() => summarizeTeacherDashboard(sessions), [sessions]);
  const insights = useMemo(() => buildInsightsFromSessions(sessions), [sessions]);

  const today = sessions.slice(0, 5);
  const live = summary.live;

  return (
    <div className="pb-12">
      <Breadcrumbs items={[{ label: "Преподаватель", href: "/teacher/dashboard" }, { label: "Дашборд" }]} />

      <PageHero
        title="Обзор преподавателя"
        subtitle="Сессии, live-мониторинг, аналитика и отчёты — в одном месте."
        right={
          <div className="flex flex-wrap items-center gap-2">
            {live.length > 0 && (
              <span className="inline-flex items-center gap-2 rounded-full bg-surface-subtle px-3 py-1 text-xs font-medium text-fg shadow-soft">
                <span className="h-2 w-2 rounded-full bg-[rgb(var(--success))] animate-pulse" />
                Live сейчас: {live.length}
              </span>
            )}
            <Link href="/teacher/sessions/new">
              <Button>Создать сессию</Button>
            </Link>
            <Link href="/teacher/groups">
              <Button variant="outline">Группы</Button>
            </Link>
            <Link href="/teacher/reports">
              <Button variant="outline">Отчёты</Button>
            </Link>
          </div>
        }
      />

      <Section spacing="normal" className="mt-10 space-y-10">
        {/* KPI */}
        <div className="grid md:grid-cols-4 gap-5">
          <Reveal>
            <KPI icon={<Users size={18} />} label="Active groups" value={`${summary.activeGroups}`} hint="Групп в работе" />
          </Reveal>
          <Reveal>
            <KPI icon={<PlayCircle size={18} />} label="Sessions today" value={`${summary.sessionsToday}`} hint="На сегодня" />
          </Reveal>
          <Reveal>
            <KPI icon={<BarChart3 size={18} />} label="Avg engagement" value={`${summary.avgEngagement}%`} hint="Среднее по сессиям" />
          </Reveal>
          <Reveal>
            <KPI icon={<AlertTriangle size={18} />} label="Attention alerts" value={`${summary.attentionAlerts}`} hint="Суммарные маркеры" />
          </Reveal>
        </div>

        {/* LIVE block */}
        {live.length > 0 && (
          <Reveal>
            <Card className="p-6 md:p-7">
              <div className="flex flex-wrap items-center justify-between gap-5">
                <div className="space-y-1">
                  <div className="text-sm text-muted">Live сейчас</div>
                  <div className="text-lg font-semibold text-fg">{live[0].title}</div>
                  <div className="text-sm text-muted">
                    {live[0].group} • {new Date(live[0].date).toLocaleTimeString()}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-primary/10 shadow-soft">LIVE</Badge>
                  <Link href={`/teacher/session/${live[0].id}`}>
                    <Button>Open monitor</Button>
                  </Link>
                  <Link href={`/teacher/session/${live[0].id}/analytics`}>
                    <Button variant="outline">Analytics</Button>
                  </Link>
                </div>
              </div>
            </Card>
          </Reveal>
        )}

        {/* Demo steps */}
        <Reveal>
          <Card className="p-6 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="text-sm text-muted">Быстрый сценарий демонстрации</div>
                <div className="text-lg font-semibold text-fg">Демо за 3 шага</div>
                <p className="text-sm text-muted leading-relaxed max-w-2xl">
                  Создайте сессию → запустите эфир → подключите студента. Затем покажите live-монитор и аналитику.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full bg-surface-subtle px-3 py-1 text-xs text-muted shadow-soft">
                <Activity size={14} className="text-[rgb(var(--primary))]" />
                2–3 минуты на демо
              </div>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              <Step
                n={1}
                title="Создать и запустить"
                text="Откройте «Сессии», создайте новую и запустите LIVE."
                actions={
                  <>
                    <Link href="/teacher/sessions">
                      <Button size="sm" variant="outline">Все сессии</Button>
                    </Link>
                    <Link href="/teacher/sessions/new">
                      <Button size="sm" variant="ghost">Новая сессия</Button>
                    </Link>
                  </>
                }
              />
              <Step
                n={2}
                title="Подключить студента"
                text="В другой вкладке войдите как студент, дайте согласие и подключитесь к LIVE."
                actions={
                  <Link href="/student/sessions">
                    <Button size="sm" variant="outline">Сессии студента</Button>
                  </Link>
                }
              />
              <Step
                n={3}
                title="Показать аналитику"
                text="Откройте монитор, таймлайн, и отчёты. Объясните как интерпретировать пики."
                actions={
                  <Link href="/teacher/reports">
                    <Button size="sm" variant="outline">Библиотека отчётов</Button>
                  </Link>
                }
              />
            </div>
          </Card>
        </Reveal>

        {/* Sessions + Insights */}
        <div className="grid lg:grid-cols-3 gap-5">
          <Reveal className="lg:col-span-2">
            <Card className="p-6 md:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted">Недавние сессии</div>
                  <div className="text-lg font-semibold text-fg">Быстрый доступ к эфиру и аналитике</div>
                  <div className="text-sm text-muted">Откройте монитор или аналитику в пару кликов.</div>
                </div>
                <Link href="/teacher/sessions">
                  <Button variant="outline">Все сессии</Button>
                </Link>
              </div>

              <div className="mt-6">
                <Table>
                  <THead>
                    <div className="grid grid-cols-12 items-center">
                      <div className="col-span-6">Сессия</div>
                      <div className="col-span-2">Статус</div>
                      <div className="col-span-2">Качество</div>
                      <div className="col-span-2 text-right">Действие</div>
                    </div>
                  </THead>

                  {loading ? (
                    <TRow>
                      <div className="col-span-12 h-10 rounded-elas-lg bg-surface-subtle animate-pulse" />
                    </TRow>
                  ) : today.length === 0 ? (
                    <TRow>
                      <div className="col-span-12 py-6 text-center text-sm text-muted">
                        Нет сессий.{" "}
                        <Link href="/teacher/sessions/new" className="text-[rgb(var(--primary))] hover:underline">
                          Создать сессию
                        </Link>
                        .
                      </div>
                    </TRow>
                  ) : (
                    today.map((s) => (
                      <TRow key={s.id}>
                        <div className="grid grid-cols-12 items-center">
                          <div className="col-span-6">
                            <TCell className="font-medium">{s.title}</TCell>
                            <TMuted>
                              {s.group} • {new Date(s.date).toLocaleString()}
                            </TMuted>
                          </div>

                          <div className="col-span-2">
                            <StatusBadge s={s} />
                          </div>

                          <div className="col-span-2">
                            <TCell className="capitalize">
                              {s.quality === "good" ? "Хорошо" : s.quality === "medium" ? "Средне" : "Низко"}
                            </TCell>
                          </div>

                          <div className="col-span-2 flex justify-end gap-2">
                            <Link href={`/teacher/session/${s.id}`}>
                              <Button size="sm" variant="outline">Монитор</Button>
                            </Link>
                            <Link href={`/teacher/session/${s.id}/analytics`}>
                              <Button size="sm" variant="ghost">Аналитика</Button>
                            </Link>
                          </div>
                        </div>
                      </TRow>
                    ))
                  )}
                </Table>
              </div>
            </Card>
          </Reveal>

          <Reveal>
            <Card className="p-6 md:p-7 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-muted">Insights</div>
                  <div className="mt-2 text-lg font-semibold text-fg">Auto-рекомендации</div>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-surface-subtle px-3 py-1 text-xs text-muted shadow-soft">
                  <Sparkles size={14} className="text-[rgb(var(--primary))]" />
                  based on sessions
                </div>
              </div>

              <div className="space-y-3">
                {insights.map((it, i) => (
                  <Insight key={i} title={it.title} text={it.text} />
                ))}
              </div>

              <div className="pt-2 flex flex-wrap gap-2">
                <Button
                  onClick={() =>
                    toast.push({ type: "success", title: "Итог сформирован", text: "Краткая сводка по сессии." })
                  }
                >
                  Сформировать итог
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    toast.push({ type: "info", title: "Экспорт", text: "Отчёт появится в разделе «Отчёты»." })
                  }
                >
                  Экспорт отчёта
                </Button>
              </div>
            </Card>
          </Reveal>
        </div>
      </Section>
    </div>
  );
}