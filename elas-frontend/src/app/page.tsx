"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@/lib/mock/sessions";

import Glow from "@/components/common/Glow";
import Section from "@/components/common/Section";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import SparkArea from "@/components/common/SparkArea";

import { ShieldCheck, Activity, BarChart3, Video, Users, Sparkles } from "lucide-react";
import { getTeacherDashboardSessions } from "@/lib/api/teacher";
import { buildInsightsFromSessions, summarizeTeacherDashboard, getSessionMetrics } from "@/lib/utils/metrics";

export default function HomePage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    let mounted = true;
    getTeacherDashboardSessions().then((data) => {
      if (!mounted) return;
      setSessions(data);
      setUpdatedAt(new Date());
    });
    return () => {
      mounted = false;
    };
  }, []);

  const summary = useMemo(() => summarizeTeacherDashboard(sessions), [sessions]);
  const insights = useMemo(() => buildInsightsFromSessions(sessions), [sessions]);

  const previewSession = summary.live[0] ?? summary.today[0] ?? sessions[0];
  const previewMetrics = previewSession ? getSessionMetrics(previewSession) : null;

  const previewLabel = previewSession
    ? previewSession.status === "active"
      ? "LIVE"
      : "Последняя сессия"
    : "Демо";

  const previewSub = previewSession
    ? `${previewSession.title} • ${previewSession.group}`
    : "Загрузка данных…";

  return (
    <main className="relative overflow-hidden">
      <Glow />

      {/* 1) HERO */}
      <Section spacing="loose" className="pt-14 md:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-surface/70 px-4 py-2 text-sm text-muted shadow-soft">
              <span className="h-2 w-2 rounded-full bg-primary shadow-glow" />
              <span className="hidden sm:inline">Live lessons • WebRTC • Chat • Analytics</span>
              <span className="sm:hidden">ELAS Live Platform</span>
            </div>
          </div>

          <h1 className="mt-10 text-4xl md:text-6xl font-semibold tracking-tight">
            Real-time уроки с{" "}
            <span className="text-[rgb(var(--primary))]">AI-аналитикой</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base md:text-lg text-muted leading-relaxed">
            ELAS — Education Live Analytics System. Видеоуроки (WebRTC), чат в сессии и аналитика вовлечённости в реальном времени —
            с фокусом на этику и согласие.
          </p>

          {/* CTA кнопки — обязательно на главной */}
          

          {/* быстрые факты — оставить, но сделать аккуратно */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MiniStat title="Rooms" value="Session-based" icon={<Users size={16} />} />
            <MiniStat title="Transport" value="WS + WebRTC" icon={<Video size={16} />} />
            <MiniStat title="Security" value="JWT + consent" icon={<ShieldCheck size={16} />} />
          </div>
        </div>
      </Section>

      {/* 2) WHY / FEATURES (коротко и понятно) */}
      <Section spacing="loose" className="pt-0">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl md:text-4xl font-semibold tracking-tight">
            Понятная аналитика, <span className="text-[rgb(var(--primary))]">без вреда</span> для приватности
          </h2>
          <p className="mt-4 text-muted leading-relaxed">
            Consent-first подход, без хранения raw-видео. Учитель получает агрегированные инсайты и инструменты для улучшения урока.
          </p>
        </div>

        <div className="mt-10 grid lg:grid-cols-3 gap-5">
          <Feature
            icon={<ShieldCheck size={18} />}
            title="Consent-first"
            text="Студент явно подтверждает согласие. Можно отозвать в любой момент."
            tag="Privacy"
          />
          <Feature
            icon={<Activity size={18} />}
            title="Live monitoring"
            text="Учитель видит динамику группы: вовлечённость/стресс, события и таймлайн."
            tag="Realtime"
          />
          <Feature
            icon={<BarChart3 size={18} />}
            title="Reports & comparison"
            text="Отчёты по занятиям, сравнение сессий и понятные KPI."
            tag="Analytics"
          />
        </div>
      </Section>

      {/* 3) PRODUCT PREVIEW (ОДИН, но сильный) */}
      <Section spacing="loose" className="pt-0">
        <GlassCard className="p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm text-muted">Как это выглядит</div>
              <div className="text-xl font-semibold">Live dashboard</div>
              <div className="text-sm text-muted">{previewSub}</div>
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-end">
              <Badge className="bg-primary/10">{previewLabel}</Badge>
              <Badge>Rooms</Badge>
              <Badge>Analytics</Badge>

              {updatedAt && (
                <span className="ml-2 text-xs text-muted">
                  Updated: {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </div>

          {/* KPI */}
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <Kpi title="Engagement" value={`${summary.avgEngagement || 0}%`} hint="Среднее по сессиям" />
            <Kpi title="Avg stress" value={previewMetrics ? `${previewMetrics.stress}%` : "—"} hint="По выбранной сессии" />
            <Kpi title="Attention drops" value={`${summary.attentionAlerts || 0}`} hint="Сумма маркеров" />
          </div>

          {/* Timeline + Insights */}
          <div className="mt-6 grid gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3 overflow-hidden">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="text-sm text-muted">Timeline</div>
                    <div className="font-semibold">Engagement flow</div>
                  </div>

                  {previewSession?.status === "active" ? (
                    <Badge className="bg-[rgba(61,220,151,0.16)] text-fg">Live</Badge>
                  ) : (
                    <Badge className="hidden sm:inline-flex">Preview</Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                {previewMetrics ? (
                  <SparkArea values={previewMetrics.series} height={176} />
                ) : (
                  <div className="h-44 rounded-elas-lg bg-surface-subtle animate-pulse" />
                )}

                <p className="mt-3 text-xs text-muted">
                  Таймлайн метрик по сессии: пики, падения, события.
                </p>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="pb-0">
                <div className="text-sm text-muted">Insights</div>
                <div className="mt-1 font-semibold">Auto summary</div>
              </CardHeader>

              <CardContent className="pt-6">
                <ul className="space-y-3 text-sm">
                  {insights.map((it, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Dot />
                      <span className="text-muted leading-relaxed">
                        <span className="font-medium text-fg">{it.title}:</span> {it.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 flex items-center gap-2">
                  <Sparkles size={16} className="text-[rgb(var(--primary))]" />
                  <span className="text-xs text-muted">
                    Инсайты генерируются на основе данных сессий (пока — детерминированные метрики).
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </GlassCard>
      </Section>

      {/* 4) TRUST */}
      <Section spacing="loose" className="pt-0">
        <div className="text-center text-sm text-muted">Trusted by innovative teams</div>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {["Narxoz", "KnewIT", "ELAS Lab", "Digital Eng"].map((x) => (
            <div key={x} className="rounded-elas-lg bg-surface/70 px-4 py-3 text-center text-sm text-muted shadow-soft">
              {x}
            </div>
          ))}
        </div>
      </Section>

      {/* 5) FINAL CTA */}
      <Section spacing="loose" className="pt-0 pb-24">
        <Card className="overflow-hidden">
          <CardContent className="py-12 text-center">
            <div className="mx-auto max-w-2xl">
              <div className="text-sm text-muted">Готовы начать?</div>
              <div className="mt-3 text-2xl md:text-3xl font-semibold">
                Войдите или зарегистрируйтесь, чтобы пользоваться live-занятиями и аналитикой.
              </div>

              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link href="/auth/login"><Button>Войти</Button></Link>
                <Link href="/auth/register"><Button variant="outline">Регистрация</Button></Link>
              </div>

              <div className="mt-7 flex items-center justify-center gap-2 text-xs text-muted">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-subtle shadow-soft">
                  <ShieldCheck size={14} />
                </span>
                Consent-first. Без хранения raw-видео. Только агрегированные метрики.
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>
    </main>
  );
}

function Dot() {
  return <span className="mt-2 inline-block h-2 w-2 rounded-full bg-[rgb(var(--primary))] shadow-glow" />;
}

function MiniStat({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-elas-lg bg-surface shadow-soft px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium text-fg">{title}</div>
        <span className="text-muted">{icon}</span>
      </div>
      <div className="mt-1 text-sm text-muted">{value}</div>
    </div>
  );
}

function Kpi({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <Card className="shadow-soft">
      <CardContent className="pt-6">
        <div className="text-sm text-muted">{title}</div>
        <div className="mt-2 text-3xl font-semibold text-fg">{value}</div>
        <div className="mt-2 text-sm text-muted">{hint}</div>
      </CardContent>
    </Card>
  );
}

function Feature({ icon, title, text, tag }: { icon: React.ReactNode; title: string; text: string; tag: string }) {
  return (
    <Card>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-elas-lg bg-surface-subtle text-[rgb(var(--primary))] shadow-soft">
              {icon}
            </span>
            <div className="text-lg font-semibold text-fg">{title}</div>
          </div>
          <Badge>{tag}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <p className="text-sm text-muted leading-relaxed">{text}</p>
      </CardContent>
    </Card>
  );
}