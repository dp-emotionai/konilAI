"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@/lib/mock/sessions";

import Section from "@/components/common/Section";
import SectionDark from "@/components/common/SectionDark";
import SectionLightStrip from "@/components/common/SectionLightStrip";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import SparkArea from "@/components/common/SparkArea";

import {
  ShieldCheck,
  Activity,
  BarChart3,
  Video,
  Users,
  ArrowRight,
  Lock,
  Gauge,
  CheckCircle2,
  Zap,
} from "lucide-react";

import { getTeacherDashboardSessions } from "@/lib/api/teacher";
import { summarizeTeacherDashboard, getSessionMetrics } from "@/lib/utils/metrics";

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

  const previewSession = summary.live[0] ?? summary.today[0] ?? sessions[0];
  const previewMetrics = previewSession ? getSessionMetrics(previewSession) : null;

  const previewLabel = previewSession
    ? previewSession.status === "active"
      ? "LIVE"
      : "Последняя сессия"
    : "Preview";

  const previewSub = previewSession
    ? `${previewSession.title} • ${previewSession.group}`
    : "Загрузка данных…";

  return (
    <main className="relative">
      {/* Hero-only glow (не “полоса” на всю страницу) */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[520px] overflow-hidden">
        <div
          className="absolute inset-0 opacity-100 dark:opacity-0"
          style={{
            background:
              "radial-gradient(ellipse 100% 80% at 50% -20%, rgba(142,91,255,0.05) 0%, rgba(142,91,255,0.02) 36%, rgba(142,91,255,0.006) 62%, transparent 78%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-0 dark:opacity-100"
          style={{
            background:
              "radial-gradient(ellipse 110% 85% at 50% -15%, rgba(142,91,255,0.12) 0%, rgba(142,91,255,0.055) 28%, rgba(142,91,255,0.02) 52%, rgba(142,91,255,0.006) 72%, transparent 86%)",
          }}
        />
      </div>

      {/* HERO — без SectionLightStrip, чтобы не было “кирпича” */}
      <Section spacing="loose" className="pt-20 md:pt-28 relative">
        <div className="grid gap-10 lg:grid-cols-12 items-start">
          {/* Left */}
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-surface/80 dark:bg-surface-subtle/70 backdrop-blur-sm ring-1 ring-[color:var(--border)]/40 px-4 py-2.5 text-sm text-muted shadow-soft">
              <span className="h-2 w-2 rounded-full bg-[rgb(var(--primary))] shadow-soft" />
              Live lessons • WebRTC • Chat • Analytics
              <Badge className="ml-2" variant="primary">
                Consent-first
              </Badge>
            </div>

            <h1 className="mt-8 text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-fg leading-[1.06]">
              Real-time уроки с{" "}
              <span className="text-[rgb(var(--primary))]">AI-аналитикой</span>
            </h1>

            <p className="mt-6 text-base md:text-lg text-muted leading-relaxed max-w-xl">
              Konilai — платформа для live-занятий: WebRTC видео, чат внутри сессии и аналитика вовлечённости в реальном времени — с фокусом
              на этику, согласие и приватность.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/auth/register">
                <Button size="lg" className="gap-2 text-base px-6">
                  Начать бесплатно <ArrowRight size={18} />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button variant="outline" size="lg">
                  Войти
                </Button>
              </Link>
              <Link href="/privacy">
                <Button variant="ghost">Конфиденциальность</Button>
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <MiniPill icon={<Users size={18} />} title="Rooms" value="Session-based" />
              <MiniPill icon={<Video size={18} />} title="Transport" value="WebRTC + чат" />
              <MiniPill icon={<Lock size={18} />} title="Privacy" value="Consent-first" />
            </div>
          </div>

          {/* Right: один цельный “preview panel” */}
          <div className="lg:col-span-6 lg:pl-6">
            <Card variant="elevated" interactive className="overflow-hidden">
              <CardContent className="p-6 md:p-7">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <ShieldCheck size={18} className="text-[rgb(var(--primary))]" />
                      Consent-first preview
                      <Badge variant="primary">{previewLabel}</Badge>
                    </div>
                    <div className="mt-2 text-lg font-semibold text-fg truncate">{previewSub}</div>
                    <div className="mt-1 text-sm text-muted">
                      Без хранения raw-видео. Только агрегированные метрики и события.
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <Kpi label="Engagement" value={`${summary.avgEngagement || 0}%`} />
                  <Kpi label="Stress" value={previewMetrics ? String(previewMetrics.stress) : "—"} />
                  <Kpi label="Drops" value={String(summary.attentionAlerts || 0)} />
                </div>

                <div className="mt-5 rounded-elas-lg bg-surface-subtle/70 ring-1 ring-[color:var(--border)]/25 p-3">
                  <div className="text-xs text-muted mb-2">Engagement flow</div>
                  <div className="h-20">
                    {previewMetrics ? (
                      <SparkArea values={previewMetrics.series} height={72} />
                    ) : (
                      <div className="h-20 rounded-xl bg-surface animate-pulse" />
                    )}
                  </div>
                  {updatedAt ? (
                    <div className="mt-2 text-[10px] text-muted">
                      Updated{" "}
                      {updatedAt.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-2">
                  <Link href="/privacy">
                    <Button variant="outline" size="sm">
                      Privacy
                    </Button>
                  </Link>
                  <Link href="/ethics">
                    <Button variant="outline" size="sm">
                      Ethics
                    </Button>
                  </Link>
                  <span className="text-xs text-muted">
                    Preview без личной оценки личности.
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Section>

      {/* Trust — делаем светлее и “тоньше”, не кирпич */}
      <Section spacing="loose" className="pt-6">
        <div className="rounded-elas-lg bg-surface/70 dark:bg-surface-subtle/40 ring-1 ring-[color:var(--border)]/25 shadow-soft px-6 py-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-xs font-medium uppercase tracking-wider text-muted">
              Trusted by innovative teams
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {["Narxoz", "KnewIT", "ELAS Lab", "Digital Eng"].map((x) => (
                <div
                  key={x}
                  className="rounded-elas bg-surface ring-1 ring-[color:var(--border)]/25 px-4 py-2 text-center text-fg"
                >
                  {x}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Features — светлая полоса (можно), но без ощущения “плит” */}
      <SectionLightStrip>
        <Section spacing="loose" className="relative">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-fg">
              Понятная аналитика,{" "}
              <span className="text-[rgb(var(--primary))]">без вреда</span>{" "}
              для приватности
            </h2>
            <p className="mt-5 text-muted leading-relaxed text-base md:text-lg">
              Consent-first подход, без хранения raw-видео. Учитель получает агрегированные инсайты и инструменты для улучшения урока.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            <Feature icon={<ShieldCheck size={22} />} title="Consent-first" text="Согласие до начала аналитики. Отзыв в любой момент." />
            <Feature icon={<Activity size={22} />} title="Live monitoring" text="Таймлайн вовлечённости/стресса, события и подсказки." />
            <Feature icon={<BarChart3 size={22} />} title="Reports & comparison" text="Отчёты по занятиям, KPI и сравнение сессий." />
          </div>
        </Section>
      </SectionLightStrip>

      {/* How it works */}
      <SectionLightStrip>
        <Section spacing="loose" className="relative">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-fg">
              Как это <span className="text-[rgb(var(--primary))]">работает</span>
            </h2>
            <p className="mt-5 text-muted leading-relaxed text-base md:text-lg">
              Три шага от регистрации до live-сессии с аналитикой вовлечённости.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            <Step num={1} icon={<Users size={28} />} title="Регистрация и группа" text="Создайте аккаунт. Преподаватель создаёт группу и приглашает по email." />
            <Step num={2} icon={<Video size={28} />} title="Создание сессии" text="Запустите сессию. Участники заходят по коду. Камера — только для аналитики, без записи." />
            <Step num={3} icon={<BarChart3 size={28} />} title="Мониторинг и отчёты" text="Смотрите таймлайн и события в real-time. После — отчёты и сравнение." />
          </div>
        </Section>
      </SectionLightStrip>

      {/* Image + copy */}
      <SectionDark spacing="loose">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          <div className="relative order-2 lg:order-1">
            <div className="relative rounded-elas-lg overflow-hidden ring-1 ring-white/10 shadow-elevated aspect-[4/3] max-h-[420px]">
              <Image
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80"
                alt="Совместная работа и обучение"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent pointer-events-none" />
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-2xl bg-[rgb(var(--primary))]/18 backdrop-blur-sm ring-1 ring-[rgb(var(--primary))]/25 flex items-center justify-center">
              <Zap className="text-[rgb(var(--primary))]" size={40} />
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <p className="text-xs font-medium uppercase tracking-wider text-[rgb(var(--primary))]">Live-аналитика</p>
            <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight text-white">
              Учебный процесс в реальном времени
            </h2>
            <p className="mt-6 text-white/70 leading-relaxed">
              ELAS объединяет видеозвонки, чат и этичную аналитику вовлечённости. Преподаватель видит динамику группы без записи видео —
              только агрегированные метрики и подсказки.
            </p>

            <ul className="mt-8 space-y-4">
              {["WebRTC без записи потока", "Таймлайн вовлечённости и стресса", "Отчёты и сравнение сессий"].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-white/90">
                  <CheckCircle2 size={20} className="shrink-0 text-[rgb(var(--primary))]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <Link href="/auth/register">
                <Button size="lg" className="gap-2">
                  Начать бесплатно <ArrowRight size={18} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </SectionDark>

      {/* Roles / For whom */}
      <SectionLightStrip>
        <Section spacing="loose" className="relative">
          <div className="mx-auto max-w-3xl text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-fg">
              Для кого ELAS
            </h2>
            <p className="mt-4 text-muted leading-relaxed">
              Платформа для преподавателей, студентов и учебных организаций.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <Card variant="elevated" interactive className="overflow-hidden">
              <CardContent className="p-10">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-elas-lg bg-primary-muted text-[rgb(var(--primary))] ring-1 ring-[rgb(var(--primary))]/15">
                  <Gauge size={24} />
                </div>
                <div className="mt-5 text-xs font-medium uppercase tracking-wider text-muted">Teacher</div>
                <div className="mt-2 text-2xl font-bold text-fg">Для преподавателя</div>
                <p className="mt-3 text-muted leading-relaxed">
                  Запуск сессии, мониторинг группы, заметки, аналитика и отчёты — без лишнего шума.
                </p>
                <div className="mt-8 h-44 rounded-elas-lg bg-surface-subtle/70 ring-1 ring-[color:var(--border)]/25" />
              </CardContent>
            </Card>

            <Card variant="elevated" interactive className="overflow-hidden">
              <CardContent className="p-10">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-elas-lg bg-primary-muted text-[rgb(var(--primary))] ring-1 ring-[rgb(var(--primary))]/15">
                  <Users size={24} />
                </div>
                <div className="mt-5 text-xs font-medium uppercase tracking-wider text-muted">Student</div>
                <div className="mt-2 text-2xl font-bold text-fg">Для студента</div>
                <p className="mt-3 text-muted leading-relaxed">
                  Простой вход в сессию, камера-чек, управление согласием и личная сводка (опционально).
                </p>
                <div className="mt-8 h-36 rounded-elas-lg bg-surface-subtle/70 ring-1 ring-[color:var(--border)]/25" />
              </CardContent>
            </Card>

            <Card variant="elevated" interactive className="overflow-hidden">
              <CardContent className="p-10">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-elas-lg bg-primary-muted text-[rgb(var(--primary))] ring-1 ring-[rgb(var(--primary))]/15">
                  <Users size={24} />
                </div>
                <div className="mt-5 text-xs font-medium uppercase tracking-wider text-muted">Institution</div>
                <div className="mt-2 text-2xl font-bold text-fg">Для университетов и школ</div>
                <p className="mt-3 text-muted leading-relaxed">
                  Обзор качества занятий, риск‑группы и отчёты для аккредитации — без хранения видео и с учётом согласия.
                </p>
                <div className="mt-8 h-36 rounded-elas-lg bg-surface-subtle/70 ring-1 ring-[color:var(--border)]/25" />
              </CardContent>
            </Card>
          </div>
        </Section>
      </SectionLightStrip>

      {/* Ethics / privacy highlight */}
      <SectionDark spacing="loose">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-white/55">
            Этичная аналитика
          </p>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight text-white">
            Аналитика без записи видео и оценки личности
          </h2>
          <p className="mt-4 text-sm md:text-base text-white/70 leading-relaxed">
            ELAS проектирован как consent‑first система: студент сам решает, участвовать ли в аналитике,
            а преподаватель получает только агрегированные метрики для улучшения урока.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3 text-left">
            <div className="rounded-elas-lg bg-white/5 ring-1 ring-white/10 px-4 py-4">
              <div className="text-sm font-semibold text-white/85">Без хранения raw‑видео</div>
              <div className="mt-2 text-sm text-white/70">
                В хранилище попадают только числовые метрики и события, а не потоки с камеры.
              </div>
            </div>
            <div className="rounded-elas-lg bg-white/5 ring-1 ring-white/10 px-4 py-4">
              <div className="text-sm font-semibold text-white/85">Контроль у студента</div>
              <div className="mt-2 text-sm text-white/70">
                Согласие можно дать или отозвать в центре согласия — для каждой сессии.
              </div>
            </div>
            <div className="rounded-elas-lg bg-white/5 ring-1 ring-white/10 px-4 py-4">
              <div className="text-sm font-semibold text-white/85">Не для оценивания</div>
              <div className="mt-2 text-sm text-white/70">
                Метрики не используются для выставления оценок или наказаний, только для поддержки преподавателя.
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/privacy">
              <Button variant="outline" size="sm">
                Политика конфиденциальности
              </Button>
            </Link>
            <Link href="/ethics">
              <Button variant="ghost" size="sm">
                Этические принципы
              </Button>
            </Link>
          </div>
        </div>
      </SectionDark>

      {/* Final CTA */}
      <SectionDark spacing="loose">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-medium uppercase tracking-wider text-white/50">Get started</p>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight text-white">
            Войдите или зарегистрируйтесь, чтобы пользоваться live-занятиями и аналитикой.
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link href="/auth/register">
              <Button size="lg">Регистрация</Button>
            </Link>
            <Link href="/auth/login">
              <Button
                variant="outline"
                size="lg"
                className="!bg-white/10 !text-white !ring-white/20 hover:!bg-white/20"
              >
                Войти
              </Button>
            </Link>
          </div>

          <div className="mt-10 flex items-center justify-center gap-2 text-sm text-white/60">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
              <ShieldCheck size={16} />
            </span>
            Consent-first. Без хранения raw-видео. Только агрегированные метрики.
          </div>
        </div>
      </SectionDark>

      <div className="h-24" />
    </main>
  );
}

/* ---- building blocks ---- */

function MiniPill({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-elas-lg bg-surface ring-1 ring-[color:var(--border)]/25 shadow-soft px-5 py-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-fg">{title}</div>
        <span className="text-[rgb(var(--primary))] opacity-80">{icon}</span>
      </div>
      <div className="mt-1.5 text-sm text-muted">{value}</div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-elas-lg bg-surface-subtle/70 ring-1 ring-[color:var(--border)]/25 px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1 text-lg font-bold text-fg">{value}</div>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Card variant="elevated" interactive>
      <CardContent className="p-8">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-elas-lg bg-primary-muted text-[rgb(var(--primary))] ring-1 ring-[rgb(var(--primary))]/15">
          {icon}
        </div>
        <div className="mt-5 text-xl font-bold text-fg">{title}</div>
        <p className="mt-3 text-muted leading-relaxed">{text}</p>
      </CardContent>
    </Card>
  );
}

function Step({
  num,
  icon,
  title,
  text,
}: {
  num: number;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Card variant="elevated" interactive className="text-center">
      <CardContent className="p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-muted text-[rgb(var(--primary))] ring-2 ring-[rgb(var(--primary))]/18 text-xl font-bold">
          {num}
        </div>
        <div className="mt-5 flex justify-center text-[rgb(var(--primary))]">{icon}</div>
        <div className="mt-4 text-lg font-bold text-fg">{title}</div>
        <p className="mt-3 text-muted leading-relaxed">{text}</p>
      </CardContent>
    </Card>
  );
}

function Stat({
  title,
  value,
  desc,
}: {
  title: string;
  value: string;
  desc: string;
}) {
  return (
    <div className="rounded-elas-lg bg-white/5 ring-1 ring-white/10 px-6 py-6 text-center">
      <div className="text-sm font-medium text-white/70">{title}</div>
      <div className="mt-3 text-4xl font-bold text-white">{value}</div>
      <div className="mt-2 text-sm text-white/60">{desc}</div>
    </div>
  );
}