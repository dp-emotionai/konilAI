"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

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
  CheckCircle2,
  Gauge,
  Zap,
} from "lucide-react";

import {
  getTeacherDashboardSessions,
  type TeacherDashboardSession,
} from "@/lib/api/teacher";
import {
  summarizeTeacherDashboard,
  getSessionMetrics,
  type DashboardSession,
} from "@/lib/utils/metrics";
import { useUI } from "@/components/layout/Providers";

function getHomeHref(isLoggedIn: boolean, role: "student" | "teacher" | "admin" | null) {
  if (!isLoggedIn || !role) return "/";
  if (role === "teacher") return "/teacher/dashboard";
  if (role === "student") return "/student/dashboard";
  return "/admin";
}

export default function HomePage() {
  const { state } = useUI();
  const isLoggedIn = !!state.loggedIn;
  const role = state.role ?? null;

  const [sessions, setSessions] = useState<TeacherDashboardSession[]>([]);
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

  const summary = useMemo(
    () => summarizeTeacherDashboard(sessions as unknown as DashboardSession[]),
    [sessions]
  );

  const previewSession =
    summary.live[0] ?? summary.today[0] ?? (sessions[0] as DashboardSession | undefined);

  const previewMetrics = previewSession ? getSessionMetrics(previewSession) : null;

  const previewLabel = previewSession
    ? previewSession.status === "active"
      ? "LIVE"
      : "Последняя сессия"
    : "Preview";

  const previewSub = previewSession
    ? `${previewSession.title} • ${previewSession.group}`
    : "Демонстрация данных…";

  const dashboardHref = getHomeHref(isLoggedIn, role);

  const heroSubtitle = isLoggedIn
    ? "Продолжайте проводить live-занятия, следить за динамикой группы и работать с отчётами — всё в одном месте."
    : "KonilAI — платформа для живых занятий: видео, чат и аналитика вовлечённости в реальном времени с фокусом на этику и приватность.";

  return (
    <main className="relative bg-bg">
      {/* 1. HERO SECTION */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-32 overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            <div className="lg:col-span-6 flex flex-col items-start text-left">
              <Badge variant="primary" className="mb-6 py-1.5 px-3">
                <ShieldCheck size={14} className="mr-1 inline" />
                Студенческое согласие (Consent-first)
              </Badge>

              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-fg md:text-5xl lg:text-[54px]">
                {isLoggedIn ? (
                  <>
                    Продолжайте обучение в <span className="text-[rgb(var(--primary))]">KonilAI</span>
                  </>
                ) : (
                  <>
                    Уроки в реальном времени с <span className="text-[rgb(var(--primary))]">AI-аналитикой</span>
                  </>
                )}
              </h1>

              <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
                {heroSubtitle}
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                {isLoggedIn ? (
                  <>
                    <Link href={dashboardHref}>
                      <Button size="lg" className="px-6 text-base font-semibold shadow-md">
                        Открыть кабинет <ArrowRight size={18} className="ml-1" />
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/auth/register">
                      <Button size="lg" className="px-6 text-base font-semibold shadow-md">
                        Начать бесплатно <ArrowRight size={18} className="ml-1" />
                      </Button>
                    </Link>
                    <Link href="/auth/login">
                      <Button variant="outline" size="lg" className="bg-surface">
                        Войти
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              <div className="mt-12 flex flex-wrap items-center gap-6 text-sm font-medium text-muted-2">
                <span className="flex items-center gap-2"><Video size={16}/> WebRTC Видео</span>
                <span className="flex items-center gap-2"><Lock size={16}/> Без записи лиц</span>
                <span className="flex items-center gap-2"><BarChart3 size={16}/> Метрики в real-time</span>
              </div>
            </div>

            {/* PRODUCT PREVIEW UI */}
            <div className="lg:col-span-6 relative z-10 w-full max-w-md mx-auto lg:mx-0">
              <div className="absolute -inset-4 bg-primary-muted rounded-full blur-3xl opacity-50"></div>
              <Card variant="elevated" className="overflow-hidden shadow-elevated border-[color:var(--border)] relative bg-surface p-1">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] pb-4">
                    <div className="flex items-center gap-2 text-sm text-[rgb(var(--primary))] font-medium bg-primary/10 px-2.5 py-1 rounded-sm">
                      <Activity size={16} /> Live-мониторинг
                    </div>
                    <Badge variant="outline" className="text-xs">{previewLabel}</Badge>
                  </div>

                  <div className="pt-5 truncate text-lg font-semibold text-fg">
                    {previewSub}
                  </div>
                  <div className="text-sm text-muted mt-1">Анонимизированный поток, нет записи raw-видео.</div>

                  <div className="mt-6 grid grid-cols-3 gap-3">
                    <Kpi label="Вовлечённость" value={`${summary.avgEngagement || 85}%`} />
                    <Kpi label="Стресс-фактор" value={previewMetrics ? String(previewMetrics.stress) : "12%"} />
                    <Kpi label="Внимания" value={String(summary.attentionAlerts || 3)} />
                  </div>

                  <div className="mt-6 rounded-elas bg-surface-subtle p-4 border border-[color:var(--border)]">
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">Динамика внимания</div>
                    <div className="h-16">
                      {previewMetrics ? (
                        <SparkArea values={previewMetrics.series} height={64} />
                      ) : (
                        <div className="h-16 rounded-sm bg-surface animate-pulse" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* 2. TRUSTED BY */}
      <section className="border-t border-b border-[color:var(--border)] bg-surface py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-sm font-semibold uppercase tracking-widest text-muted-2 shrink-0">
            Нам доверяют лидеры
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 w-full md:w-auto gap-4 lg:gap-12 opacity-70 grayscale">
            {["Narxoz University", "KnewIT Academy", "KonilAI Lab", "Digital Eng"].map((logo) => (
              <div key={logo} className="text-base font-bold text-fg tracking-tight text-center">
                {logo}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. CORE BENEFITS */}
      <section className="py-24 bg-surface-subtle">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-fg md:text-4xl">
            Понятная аналитика, <span className="text-[rgb(var(--primary))]">без нарушения</span> приватности
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted">
            Наш подход ставит согласие на первое место. Преподаватель получает полезные инсайты без организации массовой слежки.
          </p>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <Feature icon={<ShieldCheck size={24} />} title="Consent-first" text="Обязательное согласие от каждого участника. Отзыв согласия возможен в один клик без потери доступа к уроку." />
            <Feature icon={<Activity size={24} />} title="Живой мониторинг" text="Таймлайн вовлечённости и уровней стресса в режиме реального времени помогает скорректировать темп." />
            <Feature icon={<BarChart3 size={24} />} title="Отчёты и сравнение" text="Детальные отчёты по каждым сессиям, KPI и статистика группы для постоянного улучшения." />
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section className="py-24 bg-surface">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-fg md:text-4xl">
              Три простых шага к эффективным урокам
            </h2>
          </div>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-12 relative lg:px-12">
            <div className="hidden md:block absolute top-[44px] left-[20%] right-[20%] h-0.5 bg-surface-subtle" />
            <Step num={1} title="Регистрация и Группы" text="Преподаватель создаёт класс и отправляет приглашения студентам для прозрачного управления." />
            <Step num={2} title="Запуск живой сессии" text="Участники заходят по ссылке-коду. Видеопоток анализируется локально, на сервер уходят только цифры." />
            <Step num={3} title="Инсайты и Аналитика" text="Получайте автоматические рекомендации, анализируя тренды внимания курса." />
          </div>
        </div>
      </section>

      {/* 5. FOR ROLES */}
      <section className="py-24 bg-surface-subtle">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-3">
            <RoleCard icon={<Gauge size={24} />} role="Преподаватель" title="Контроль процесса" text="Мониторинг сложных моментов урока, быстрая корректировка темпа и автоматические отчёты о занятии." />
            <RoleCard icon={<Users size={24} />} role="Студент" title="Конфиденциальность" text="Удобный вход за несколько секунд, личный сводный дашборд успеваемости и полное управление согласиями." />
            <RoleCard icon={<Zap size={24} />} role="Организация" title="Качество обучения" text="Агрегированные данные для факультетов, мониторинг вовлечённости во всём учебном заведении." />
          </div>
        </div>
      </section>

      {/* 6. ETHICS & PRIVACY */}
      <section className="py-24 bg-surface border-y border-[color:var(--border)]">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <Badge variant="secondary" className="mb-4">Этика KonilAI</Badge>
          <h2 className="text-3xl font-bold tracking-tight text-fg md:text-4xl">
            Аналитика без записи лиц и стресса обучающихся
          </h2>
          <p className="mt-6 text-lg text-muted">
            Платформа спроектирована так, чтобы предотвращать использование данных для наказаний. Никакая видеозапись не сохраняется, мы передаем только анонимизированные векторы для машинного обучения.
          </p>

          <div className="mt-10 flex gap-4 justify-center">
            <Link href="/privacy">
              <Button variant="outline">Политика конфиденциальности</Button>
            </Link>
            <Link href="/ethics">
              <Button variant="outline">Этические принципы</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 7. CTA */}
      <section className="py-32 bg-bg relative overflow-hidden">
        <div className="absolute inset-0 bg-[rgb(var(--primary))]/5"></div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <h2 className="text-4xl font-bold tracking-tight text-fg md:text-5xl">
            Готовы провести свой первый умный урок?
          </h2>
          <p className="mt-6 text-xl text-muted">
            Начните использовать платформу бесплатно сегодня.
          </p>
          <div className="mt-10 flex gap-4 justify-center">
            {isLoggedIn ? (
              <Link href={dashboardHref}>
                <Button size="lg" className="shadow-elevated px-8">В кабинет</Button>
              </Link>
            ) : (
              <>
                <Link href="/auth/register">
                  <Button size="lg" className="shadow-elevated px-8">Зарегистрироваться</Button>
                </Link>
                <Link href="/demo">
                  <Button variant="outline" size="lg" className="bg-surface px-8">Узнать больше</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-l-2 border-[color:var(--border)] pl-3">
      <div className="text-[10px] uppercase font-semibold text-muted tracking-wide">{label}</div>
      <div className="text-lg font-bold text-fg">{value}</div>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <Card variant="default" className="bg-surface border-transparent shadow-soft">
      <CardContent className="p-8">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-elas-sm bg-primary/10 text-[rgb(var(--primary))] mb-6">
          {icon}
        </div>
        <h3 className="text-xl font-bold text-fg">{title}</h3>
        <p className="mt-3 text-muted leading-relaxed">{text}</p>
      </CardContent>
    </Card>
  );
}

function Step({ num, title, text }: { num: number; title: string; text: string }) {
  return (
    <div className="relative text-center z-10 bg-surface md:bg-transparent">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface border-4 border-surface-subtle text-xl font-bold text-[rgb(var(--primary))] shadow-sm mb-6">
        {num}
      </div>
      <h3 className="text-lg font-bold text-fg">{title}</h3>
      <p className="mt-3 text-muted leading-relaxed max-w-sm mx-auto">{text}</p>
    </div>
  );
}

function RoleCard({ icon, role, title, text }: { icon: React.ReactNode; role: string; title: string; text: string }) {
  return (
    <Card variant="outline" className="bg-surface relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-[color:var(--border-strong)]">
      <CardContent className="p-8">
        <div className="inline-flex items-center gap-2 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-elas-sm bg-surface-subtle text-[rgb(var(--primary))]">
            {icon}
          </div>
          <span className="text-sm font-semibold uppercase tracking-wider text-muted-2">{role}</span>
        </div>
        <h3 className="text-2xl font-bold text-fg">{title}</h3>
        <p className="mt-3 text-muted leading-relaxed">{text}</p>
      </CardContent>
    </Card>
  );
}