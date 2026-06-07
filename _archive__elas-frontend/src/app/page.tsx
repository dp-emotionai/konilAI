"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";

import {
  ShieldCheck,
  Activity,
  BarChart3,
  Video,
  Users,
  ArrowRight,
  Lock,
  Gauge,
  Zap,
} from "lucide-react";

import {
  getTeacherDashboardSessions,
  type TeacherDashboardSession,
} from "@/lib/api/teacher";
import { useUI } from "@/components/layout/Providers";
import { formatSessionDateTime } from "@/lib/utils/sessionCalendar";

function getHomeHref(
  isLoggedIn: boolean,
  role: "student" | "teacher" | "admin" | null
) {
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

  useEffect(() => {
    let mounted = true;
    getTeacherDashboardSessions().then((data) => {
      if (mounted) setSessions(data);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const liveSessions = useMemo(
    () => sessions.filter((session) => session.status === "active"),
    [sessions]
  );

  const todaySessions = useMemo(
    () =>
      sessions.filter((session) => {
        const parsed = new Date(session.date);
        const now = new Date();
        return (
          !Number.isNaN(parsed.getTime()) &&
          parsed.getFullYear() === now.getFullYear() &&
          parsed.getMonth() === now.getMonth() &&
          parsed.getDate() === now.getDate()
        );
      }),
    [sessions]
  );

  const groupCount = useMemo(
    () => new Set(sessions.map((session) => session.group).filter(Boolean)).size,
    [sessions]
  );

  const previewSession = liveSessions[0] ?? todaySessions[0] ?? sessions[0] ?? null;
  const previewLabel =
    previewSession == null
      ? "Нет live-данных"
      : previewSession.status === "active"
      ? "LIVE"
      : "Сессия";
  const previewSub =
    previewSession == null
      ? "Реальные сессии появятся после подключения backend и входа в кабинет."
      : `${previewSession.title} • ${previewSession.group}`;

  const dashboardHref = getHomeHref(isLoggedIn, role);

  const heroSubtitle = isLoggedIn
    ? "Продолжайте проводить live-занятия, следить за динамикой группы и работать с отчётами в одном кабинете."
    : "KonilAI — платформа для живых занятий с видео, чатом и аналитикой, построенной вокруг этики и privacy-first подхода.";

  return (
    <main className="relative bg-bg">
      <section className="relative overflow-hidden pb-20 pt-24 md:pb-32 md:pt-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            <div className="flex flex-col items-start text-left lg:col-span-6">
              <Badge variant="primary" className="mb-6 px-3 py-1.5">
                <ShieldCheck size={14} className="mr-1 inline" />
                Consent-first
              </Badge>

              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-fg md:text-5xl lg:text-[54px]">
                {isLoggedIn ? (
                  <>
                    Продолжайте обучение в{" "}
                    <span className="text-[rgb(var(--primary))]">KonilAI</span>
                  </>
                ) : (
                  <>
                    Уроки в реальном времени с{" "}
                    <span className="text-[rgb(var(--primary))]">AI-аналитикой</span>
                  </>
                )}
              </h1>

              <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
                {heroSubtitle}
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                {isLoggedIn ? (
                  <Link href={dashboardHref}>
                    <Button size="lg" className="px-6 text-base font-semibold shadow-md">
                      Открыть кабинет <ArrowRight size={18} className="ml-1" />
                    </Button>
                  </Link>
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
                <span className="flex items-center gap-2">
                  <Video size={16} /> WebRTC видео
                </span>
                <span className="flex items-center gap-2">
                  <Lock size={16} /> Без записи лиц
                </span>
                <span className="flex items-center gap-2">
                  <BarChart3 size={16} /> Реальные session counts
                </span>
              </div>
            </div>

            <div className="relative z-10 mx-auto w-full max-w-md lg:col-span-6 lg:mx-0">
              <div className="absolute -inset-4 rounded-full bg-primary-muted opacity-50 blur-3xl" />
              <Card
                variant="elevated"
                className="relative overflow-hidden border-[color:var(--border)] bg-surface p-1 shadow-elevated"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] pb-4">
                    <div className="flex items-center gap-2 rounded-sm bg-primary/10 px-2.5 py-1 text-sm font-medium text-[rgb(var(--primary))]">
                      <Activity size={16} /> Live overview
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {previewLabel}
                    </Badge>
                  </div>

                  <div className="truncate pt-5 text-lg font-semibold text-fg">{previewSub}</div>
                  <div className="mt-1 text-sm text-muted">
                    Показываем только реальные session counts и metadata, без synthetic ML-превью.
                  </div>

                  <div className="mt-6 grid grid-cols-3 gap-3">
                    <Kpi label="LIVE" value={String(liveSessions.length)} />
                    <Kpi label="Сегодня" value={String(todaySessions.length)} />
                    <Kpi label="Группы" value={String(groupCount)} />
                  </div>

                  <div className="mt-6 rounded-elas border border-[color:var(--border)] bg-surface-subtle p-4">
                    <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">
                      Состояние сессии
                    </div>
                    {previewSession ? (
                      <div className="space-y-2 text-sm text-muted">
                        <div className="flex items-center justify-between gap-3">
                          <span>Тип</span>
                          <span className="font-semibold text-fg">
                            {previewSession.type === "exam" ? "Экзамен" : "Лекция"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Время</span>
                          <span className="font-semibold text-fg">
                            {formatSessionDateTime(previewSession.date)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Статус</span>
                          <span className="font-semibold text-fg">
                            {previewSession.status === "active"
                              ? "Активная"
                              : previewSession.status === "draft"
                              ? "Запланирована"
                              : "Завершена"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-sm bg-surface px-3 py-4 text-sm text-muted">
                        Здесь появится реальный preview сессии, когда в системе будут доступные занятия.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-t border-[color:var(--border)] bg-surface py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 sm:px-6 md:flex-row">
          <div className="shrink-0 text-sm font-semibold uppercase tracking-widest text-muted-2">
            Нам доверяют
          </div>
          <div className="grid w-full grid-cols-2 gap-4 opacity-70 grayscale md:w-auto md:grid-cols-4 lg:gap-12">
            {["Narxoz University", "KnewIT Academy", "KonilAI Lab", "Digital Eng"].map(
              (logo) => (
                <div key={logo} className="text-center text-base font-bold tracking-tight text-fg">
                  {logo}
                </div>
              )
            )}
          </div>
        </div>
      </section>

      <section className="bg-surface-subtle py-24">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight text-fg md:text-4xl">
            Понятная аналитика, <span className="text-[rgb(var(--primary))]">без нарушения</span>{" "}
            приватности
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
            Подход KonilAI ставит согласие на первое место и не подменяет реальные данные декоративными цифрами.
          </p>

          <div className="mt-16 grid grid-cols-1 gap-8 text-left md:grid-cols-3">
            <Feature
              icon={<ShieldCheck size={24} />}
              title="Consent-first"
              text="Явное согласие каждого участника и прозрачная работа с аналитикой."
            />
            <Feature
              icon={<Activity size={24} />}
              title="Живой мониторинг"
              text="Во время live-сессии преподаватель получает актуальные сигналы, а не фейковые сводки."
            />
            <Feature
              icon={<BarChart3 size={24} />}
              title="Отчёты и сравнение"
              text="После уроков доступны сводки и аналитика там, где backend уже реально их поддерживает."
            />
          </div>
        </div>
      </section>

      <section className="bg-surface py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-fg md:text-4xl">
              Три шага к эффективным live-урокам
            </h2>
          </div>
          <div className="relative mt-16 grid grid-cols-1 gap-12 md:grid-cols-3 lg:px-12">
            <div className="absolute left-[20%] right-[20%] top-[44px] hidden h-0.5 bg-surface-subtle md:block" />
            <Step
              num={1}
              title="Группы и приглашения"
              text="Преподаватель создаёт группу и приглашает студентов по email."
            />
            <Step
              num={2}
              title="Запуск live-сессии"
              text="Участники подключаются к занятию, а аналитика обрабатывается по согласованному privacy-потоку."
            />
            <Step
              num={3}
              title="Отчёты и выводы"
              text="После занятия преподаватель возвращается к сводке и улучшает следующие уроки."
            />
          </div>
        </div>
      </section>

      <section className="bg-surface-subtle py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-3">
            <RoleCard
              icon={<Gauge size={24} />}
              role="Преподаватель"
              title="Контроль процесса"
              text="Управление группами, live-сессиями, заметками и аналитикой там, где она действительно поддерживается backend."
            />
            <RoleCard
              icon={<Users size={24} />}
              role="Студент"
              title="Прозрачность"
              text="Быстрый вход, понятный кабинет и доступ только к тем данным, которые реально доступны пользователю."
            />
            <RoleCard
              icon={<Zap size={24} />}
              role="Организация"
              title="Качество обучения"
              text="Платформа даёт организационные сигналы без подделки метрик и скрытых фолбэков."
            />
          </div>
        </div>
      </section>

      <section className="border-y border-[color:var(--border)] bg-surface py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <Badge variant="secondary" className="mb-4">
            Этика KonilAI
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight text-fg md:text-4xl">
            Аналитика без записи лиц и давления на обучающихся
          </h2>
          <p className="mt-6 text-lg text-muted">
            Платформа спроектирована так, чтобы не подменять учебный процесс скрытым наблюдением и не рисовать несуществующие показатели.
          </p>

          <div className="mt-10 flex justify-center gap-4">
            <Link href="/privacy">
              <Button variant="outline">Политика конфиденциальности</Button>
            </Link>
            <Link href="/ethics">
              <Button variant="outline">Этические принципы</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-bg py-32">
        <div className="absolute inset-0 bg-[rgb(var(--primary))]/5" />
        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-4xl font-bold tracking-tight text-fg md:text-5xl">
            Готовы провести свой первый умный урок?
          </h2>
          <p className="mt-6 text-xl text-muted">
            Начните пользоваться платформой и двигайтесь к рабочему live-потоку без фейковых данных.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            {isLoggedIn ? (
              <Link href={dashboardHref}>
                <Button size="lg" className="px-8 shadow-elevated">
                  В кабинет
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/auth/register">
                  <Button size="lg" className="px-8 shadow-elevated">
                    Зарегистрироваться
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button variant="outline" size="lg" className="bg-surface px-8">
                    Узнать больше
                  </Button>
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
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </div>
      <div className="text-lg font-bold text-fg">{value}</div>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <Card variant="default" className="border-transparent bg-surface shadow-soft">
      <CardContent className="p-8">
        <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-elas-sm bg-primary/10 text-[rgb(var(--primary))]">
          {icon}
        </div>
        <h3 className="text-xl font-bold text-fg">{title}</h3>
        <p className="mt-3 leading-relaxed text-muted">{text}</p>
      </CardContent>
    </Card>
  );
}

function Step({
  num,
  title,
  text,
}: {
  num: number;
  title: string;
  text: string;
}) {
  return (
    <div className="relative z-10 bg-surface text-center md:bg-transparent">
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border-4 border-surface-subtle bg-surface text-xl font-bold text-[rgb(var(--primary))] shadow-sm">
        {num}
      </div>
      <h3 className="text-lg font-bold text-fg">{title}</h3>
      <p className="mx-auto mt-3 max-w-sm leading-relaxed text-muted">{text}</p>
    </div>
  );
}

function RoleCard({
  icon,
  role,
  title,
  text,
}: {
  icon: ReactNode;
  role: string;
  title: string;
  text: string;
}) {
  return (
    <Card
      variant="outline"
      className="relative overflow-hidden border-[color:var(--border-strong)] bg-surface transition-all duration-300 hover:shadow-md"
    >
      <CardContent className="p-8">
        <div className="mb-6 inline-flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-elas-sm bg-surface-subtle text-[rgb(var(--primary))]">
            {icon}
          </div>
          <span className="text-sm font-semibold uppercase tracking-wider text-muted-2">
            {role}
          </span>
        </div>
        <h3 className="text-2xl font-bold text-fg">{title}</h3>
        <p className="mt-3 leading-relaxed text-muted">{text}</p>
      </CardContent>
    </Card>
  );
}
