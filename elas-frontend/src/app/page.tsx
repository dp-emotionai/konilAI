"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

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
  LayoutGrid,
  ClipboardList,
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
    : "Загрузка данных…";

  const dashboardHref = getHomeHref(isLoggedIn, role);

  const heroTitle = isLoggedIn
    ? "Продолжайте работу в системе"
    : "Уроки в реальном времени с AI-аналитикой";

  const heroSubtitle = isLoggedIn
    ? "KonilAI помогает проводить live-занятия, следить за динамикой группы и работать с отчётами — всё в одном месте."
    : "KonilAI — платформа для живых занятий: видео, чат и аналитика вовлечённости в реальном времени с фокусом на этику, согласие и приватность.";

  return (
    <main className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[580px] overflow-hidden">
        <div
          className="absolute inset-0 opacity-100 dark:opacity-0"
          style={{
            background:
              "radial-gradient(ellipse 120% 90% at 50% -15%, rgba(124,58,237,0.12) 0%, rgba(124,58,237,0.04) 40%, transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-0 dark:opacity-100"
          style={{
            background:
              "radial-gradient(ellipse 120% 90% at 50% -10%, rgba(120,80,255,0.25) 0%, rgba(124,58,237,0.12) 30%, rgba(124,58,237,0.04) 55%, transparent 80%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-0 dark:opacity-100"
          style={{
            background:
              "radial-gradient(circle at 50% 30%, rgba(80,120,255,0.08) 0%, transparent 50%)",
          }}
        />
      </div>

      <Section spacing="loose" className="relative pt-24 md:pt-32">
        <div className="grid items-start gap-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-surface/80 px-4 py-2.5 text-sm text-muted shadow-soft ring-1 ring-[color:var(--border)]/40 backdrop-blur-sm dark:bg-surface-subtle/70">
              <span className="h-2 w-2 rounded-full bg-[rgb(var(--primary))] shadow-soft" />
              Эфиры • WebRTC • Чат • Аналитика
              <Badge className="ml-2" variant="primary">
                С согласия
              </Badge>
            </div>

            <h1 className="heading-hero mt-10 text-4xl font-bold leading-[1.08] tracking-tight text-fg md:text-5xl lg:text-6xl">
              {isLoggedIn ? (
                <>
                  Продолжайте работу в{" "}
                  <span className="text-[rgb(var(--primary))]">KonilAI</span>
                </>
              ) : (
                <>
                  Уроки в реальном времени с{" "}
                  <span className="text-[rgb(var(--primary))]">AI-аналитикой</span>
                </>
              )}
            </h1>

            <p className="subtitle mt-6 max-w-xl text-lg leading-relaxed text-muted">
              {heroSubtitle}
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              {isLoggedIn ? (
                <>
                  <Link href={dashboardHref}>
                    <Button size="lg" className="gap-2 px-6 text-base">
                      Перейти в кабинет <ArrowRight size={18} />
                    </Button>
                  </Link>

                  {role === "teacher" && (
                    <>
                      <Link href="/teacher/sessions">
                        <Button variant="outline" size="lg">
                          Мои сессии
                        </Button>
                      </Link>
                      <Link href="/teacher/groups">
                        <Button variant="ghost">Группы</Button>
                      </Link>
                    </>
                  )}

                  {role === "student" && (
                    <>
                      <Link href="/student/sessions">
                        <Button variant="outline" size="lg">
                          Мои сессии
                        </Button>
                      </Link>
                      <Link href="/student/summary">
                        <Button variant="ghost">Моя сводка</Button>
                      </Link>
                    </>
                  )}

                  {role === "admin" && (
                    <>
                      <Link href="/admin">
                        <Button variant="outline" size="lg">
                          Панель администратора
                        </Button>
                      </Link>
                      <Link href="/privacy">
                        <Button variant="ghost">Конфиденциальность</Button>
                      </Link>
                    </>
                  )}
                </>
              ) : (
                <>
                  <Link href="/auth/register">
                    <Button size="lg" className="gap-2 px-6 text-base">
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
                </>
              )}
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              <MiniPill icon={<Users size={18} />} title="Сессии" value="По занятиям" />
              <MiniPill icon={<Video size={18} />} title="Транспорт" value="WebRTC + чат" />
              <MiniPill icon={<Lock size={18} />} title="Приватность" value="С согласия" />
            </div>
          </div>

          <div className="lg:col-span-6 lg:pl-8">
            <Card
              variant="elevated"
              interactive
              className="overflow-hidden shadow-elevated ring-1 ring-[color:var(--border)]/30"
            >
              <CardContent className="p-6 md:p-8">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <ShieldCheck size={18} className="text-[rgb(var(--primary))]" />
                      Превью с согласия
                      <Badge variant="primary">{previewLabel}</Badge>
                    </div>
                    <div className="mt-2 truncate text-lg font-semibold text-fg">
                      {previewSub}
                    </div>
                    <div className="mt-1 text-sm text-muted">
                      Без хранения raw-видео. Только агрегированные метрики и события.
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <Kpi label="Вовлечённость" value={`${summary.avgEngagement || 0}%`} />
                  <Kpi
                    label="Стресс"
                    value={previewMetrics ? String(previewMetrics.stress) : "—"}
                  />
                  <Kpi label="События" value={String(summary.attentionAlerts || 0)} />
                </div>

                <div className="mt-6 rounded-elas-lg bg-surface-subtle/80 p-4 ring-1 ring-[color:var(--border)]/25">
                  <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
                    Динамика вовлечённости
                  </div>
                  <div className="h-20">
                    {previewMetrics ? (
                      <SparkArea values={previewMetrics.series} height={72} />
                    ) : (
                      <div className="h-20 animate-pulse rounded-xl bg-surface" />
                    )}
                  </div>
                  {updatedAt ? (
                    <div className="mt-2 text-[10px] text-muted">
                      Обновлено{" "}
                      {updatedAt.toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  ) : null}
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-2">
                  {isLoggedIn ? (
                    <>
                      <Link href={dashboardHref}>
                        <Button size="sm">Открыть кабинет</Button>
                      </Link>

                      {role === "teacher" && (
                        <Link href="/teacher/reports">
                          <Button variant="outline" size="sm">
                            Отчёты
                          </Button>
                        </Link>
                      )}

                      {role === "student" && (
                        <Link href="/student/summary">
                          <Button variant="outline" size="sm">
                            Моя сводка
                          </Button>
                        </Link>
                      )}

                      <span className="text-xs text-muted">Продолжайте с того места, где остановились.</span>
                    </>
                  ) : (
                    <>
                      <Link href="/privacy">
                        <Button variant="outline" size="sm">
                          Конфиденциальность
                        </Button>
                      </Link>
                      <Link href="/ethics">
                        <Button variant="outline" size="sm">
                          Этика
                        </Button>
                      </Link>
                      <span className="text-xs text-muted">Без оценки личности.</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Section>

      <Section spacing="loose" className="pt-6">
        <div className="rounded-elas-lg bg-surface/70 px-6 py-5 shadow-soft ring-1 ring-[color:var(--border)]/25 dark:bg-surface-subtle/40">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-xs font-medium uppercase tracking-wider text-muted">
              Нам доверяют
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              {["Narxoz", "KnewIT", "ELAS Lab", "Digital Eng"].map((x) => (
                <div
                  key={x}
                  className="rounded-elas px-4 py-2 text-center text-fg ring-1 ring-[color:var(--border)]/25 bg-surface"
                >
                  {x}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <SectionLightStrip>
        <Section spacing="loose" className="relative">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-fg md:text-4xl">
              Понятная аналитика,{" "}
              <span className="text-[rgb(var(--primary))]">без вреда</span> для приватности
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted md:text-lg">
              Consent-first подход, без хранения raw-видео. Учитель получает агрегированные инсайты и инструменты для улучшения урока.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            <Feature
              icon={<ShieldCheck size={22} />}
              title="С согласия"
              text="Согласие до начала аналитики. Отзыв в любой момент."
            />
            <Feature
              icon={<Activity size={22} />}
              title="Live-мониторинг"
              text="Таймлайн вовлечённости и стресса, события и подсказки."
            />
            <Feature
              icon={<BarChart3 size={22} />}
              title="Отчёты и сравнение"
              text="Отчёты по занятиям, KPI и сравнение сессий."
            />
          </div>
        </Section>
      </SectionLightStrip>

      <SectionLightStrip>
        <Section spacing="loose" className="relative">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-fg md:text-4xl">
              Как это <span className="text-[rgb(var(--primary))]">работает</span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted md:text-lg">
              Три шага от регистрации до live-сессии с аналитикой вовлечённости.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            <Step
              num={1}
              icon={<Users size={28} />}
              title="Регистрация и группа"
              text="Создайте аккаунт. Преподаватель создаёт группу и приглашает по email."
            />
            <Step
              num={2}
              icon={<Video size={28} />}
              title="Создание сессии"
              text="Запустите сессию. Участники заходят по коду. Камера — только для аналитики, без записи."
            />
            <Step
              num={3}
              icon={<BarChart3 size={28} />}
              title="Мониторинг и отчёты"
              text="Смотрите таймлайн и события в real-time. После — отчёты и сравнение."
            />
          </div>
        </Section>
      </SectionLightStrip>

      <SectionDark spacing="loose">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="relative order-2 lg:order-1">
            <div className="relative aspect-[4/3] max-h-[420px] overflow-hidden rounded-elas-lg shadow-elevated ring-1 ring-white/10">
              <Image
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80"
                alt="Совместная работа и обучение"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
            </div>
            <div className="absolute -bottom-4 -right-4 flex h-24 w-24 items-center justify-center rounded-2xl bg-[rgb(var(--primary))]/18 ring-1 ring-[rgb(var(--primary))]/25 backdrop-blur-sm">
              <Zap className="text-[rgb(var(--primary))]" size={40} />
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <p className="text-xs font-medium uppercase tracking-wider text-[rgb(var(--primary))]">
              Live-аналитика
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
              Учебный процесс в реальном времени
            </h2>
            <p className="mt-6 leading-relaxed text-white/70">
              KonilAI объединяет видеозвонки, чат и этичную аналитику вовлечённости. Преподаватель видит динамику группы без записи видео — только агрегированные метрики и подсказки.
            </p>

            <ul className="mt-8 space-y-4">
              {[
                "WebRTC без записи потока",
                "Таймлайн вовлечённости и стресса",
                "Отчёты и сравнение сессий",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-white/90">
                  <CheckCircle2
                    size={20}
                    className="shrink-0 text-[rgb(var(--primary))]"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <Link href={isLoggedIn ? dashboardHref : "/auth/register"}>
                <Button size="lg" className="gap-2">
                  {isLoggedIn ? "Перейти в кабинет" : "Начать бесплатно"}{" "}
                  <ArrowRight size={18} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </SectionDark>

      <SectionLightStrip>
        <Section spacing="loose" className="relative">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-fg md:text-4xl">
              Для кого KonilAI
            </h2>
            <p className="mt-4 leading-relaxed text-muted">
              Платформа для преподавателей, студентов и учебных организаций.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <Card variant="elevated" interactive className="overflow-hidden">
              <CardContent className="p-10">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-elas-lg bg-primary-muted text-[rgb(var(--primary))] ring-1 ring-[rgb(var(--primary))]/15">
                  <Gauge size={24} />
                </div>
                <div className="mt-5 text-xs font-medium uppercase tracking-wider text-muted">
                  Преподаватель
                </div>
                <div className="mt-2 text-2xl font-bold text-fg">Для преподавателя</div>
                <p className="mt-3 leading-relaxed text-muted">
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
                <div className="mt-5 text-xs font-medium uppercase tracking-wider text-muted">
                  Студент
                </div>
                <div className="mt-2 text-2xl font-bold text-fg">Для студента</div>
                <p className="mt-3 leading-relaxed text-muted">
                  Простой вход в сессию, camera-check, управление согласием и личная сводка.
                </p>
                <div className="mt-8 h-36 rounded-elas-lg bg-surface-subtle/70 ring-1 ring-[color:var(--border)]/25" />
              </CardContent>
            </Card>

            <Card variant="elevated" interactive className="overflow-hidden">
              <CardContent className="p-10">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-elas-lg bg-primary-muted text-[rgb(var(--primary))] ring-1 ring-[rgb(var(--primary))]/15">
                  <Users size={24} />
                </div>
                <div className="mt-5 text-xs font-medium uppercase tracking-wider text-muted">
                  Организация
                </div>
                <div className="mt-2 text-2xl font-bold text-fg">
                  Для университетов и школ
                </div>
                <p className="mt-3 leading-relaxed text-muted">
                  Обзор качества занятий, риск-группы и отчёты для аккредитации — без хранения видео и с учётом согласия.
                </p>
                <div className="mt-8 h-36 rounded-elas-lg bg-surface-subtle/70 ring-1 ring-[color:var(--border)]/25" />
              </CardContent>
            </Card>
          </div>
        </Section>
      </SectionLightStrip>

      <SectionDark spacing="loose">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-white/55">
            Этичная аналитика
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Аналитика без записи видео и оценки личности
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/70 md:text-base">
            KonilAI проектирован как система с приоритетом согласия: студент сам решает, участвовать ли в аналитике, а преподаватель получает только агрегированные метрики для улучшения урока.
          </p>

          <div className="mt-8 grid gap-4 text-left md:grid-cols-3">
            <div className="rounded-elas-lg bg-white/5 px-4 py-4 ring-1 ring-white/10">
              <div className="text-sm font-semibold text-white/85">
                Без хранения raw-видео
              </div>
              <div className="mt-2 text-sm text-white/70">
                В хранилище попадают только числовые метрики и события, а не потоки с камеры.
              </div>
            </div>
            <div className="rounded-elas-lg bg-white/5 px-4 py-4 ring-1 ring-white/10">
              <div className="text-sm font-semibold text-white/85">Контроль у студента</div>
              <div className="mt-2 text-sm text-white/70">
                Согласие можно дать или отозвать в центре согласия — для каждой сессии.
              </div>
            </div>
            <div className="rounded-elas-lg bg-white/5 px-4 py-4 ring-1 ring-white/10">
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

      <SectionDark spacing="loose">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-white/50">
            {isLoggedIn ? "Продолжить работу" : "Get started"}
          </p>

          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
            {isLoggedIn
              ? "Откройте кабинет и продолжайте работать с занятиями и аналитикой."
              : "Войдите или зарегистрируйтесь, чтобы пользоваться live-занятиями и аналитикой."}
          </h2>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            {isLoggedIn ? (
              <>
                <Link href={dashboardHref}>
                  <Button size="lg" className="gap-2">
                    Перейти в кабинет <ArrowRight size={18} />
                  </Button>
                </Link>

                {role === "teacher" && (
                  <Link href="/teacher/sessions">
                    <Button
                      variant="outline"
                      size="lg"
                      className="!bg-white/10 !text-white !ring-white/20 hover:!bg-white/20"
                    >
                      Мои сессии
                    </Button>
                  </Link>
                )}

                {role === "student" && (
                  <Link href="/student/sessions">
                    <Button
                      variant="outline"
                      size="lg"
                      className="!bg-white/10 !text-white !ring-white/20 hover:!bg-white/20"
                    >
                      Мои сессии
                    </Button>
                  </Link>
                )}

                {role === "admin" && (
                  <Link href="/admin">
                    <Button
                      variant="outline"
                      size="lg"
                      className="!bg-white/10 !text-white !ring-white/20 hover:!bg-white/20"
                    >
                      Админ-панель
                    </Button>
                  </Link>
                )}
              </>
            ) : (
              <>
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
              </>
            )}
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
    <div className="rounded-elas-lg bg-surface px-5 py-4 shadow-soft ring-1 ring-[color:var(--border)]/25">
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
    <div className="rounded-elas-lg bg-surface-subtle/70 px-4 py-3 ring-1 ring-[color:var(--border)]/25">
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
        <p className="mt-3 leading-relaxed text-muted">{text}</p>
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
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-muted text-xl font-bold text-[rgb(var(--primary))] ring-2 ring-[rgb(var(--primary))]/18">
          {num}
        </div>
        <div className="mt-5 flex justify-center text-[rgb(var(--primary))]">{icon}</div>
        <div className="mt-4 text-lg font-bold text-fg">{title}</div>
        <p className="mt-3 leading-relaxed text-muted">{text}</p>
      </CardContent>
    </Card>
  );
}