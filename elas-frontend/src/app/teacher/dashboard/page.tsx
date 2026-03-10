"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Section from "@/components/common/Section";
import Reveal from "@/components/common/Reveal";

import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

import { useToast } from "@/components/ui/Toast";
import { getTeacherDashboardSessions, type TeacherDashboardSession } from "@/lib/api/teacher";

import { buildInsightsFromSessions, summarizeTeacherDashboard } from "@/lib/utils/metrics";
import {
  Users,
  PlayCircle,
  BarChart3,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Video,
  FileBarChart,
  PlusCircle,
  LayoutGrid,
  ClipboardList,
  TrendingUp,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useUI } from "@/components/layout/Providers";

function KPI({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl p-5 transition-shadow duration-200",
        accent
          ? "bg-gradient-to-br from-primary-muted/40 to-primary-muted/10 ring-1 ring-[rgb(var(--primary))]/20 shadow-soft"
          : "bg-surface-subtle/80 ring-1 ring-[color:var(--border)]/20 hover:ring-[color:var(--border)]/30"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted">{label}</div>
          <div className="mt-2 text-2xl md:text-3xl font-bold text-fg tracking-tight">{value}</div>
          <div className="mt-1 text-xs text-muted">{hint}</div>
        </div>
        <div
          className={cn(
            "shrink-0 inline-flex h-12 w-12 items-center justify-center rounded-xl",
            accent ? "bg-[rgb(var(--primary))]/20 text-[rgb(var(--primary))]" : "bg-surface text-[rgb(var(--primary))] shadow-soft"
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function Insight({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl bg-surface-subtle/60 p-4 ring-1 ring-[color:var(--border)]/15 hover:ring-[color:var(--border)]/25 transition-shadow">
      <div className="font-semibold text-fg">{title}</div>
      <div className="text-sm mt-1.5 text-muted leading-relaxed">{text}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: Session["status"] }) {
  if (status === "active") return <Badge variant="success" className="gap-1.5"><span className="inline-flex h-1.5 w-1.5 rounded-full bg-current animate-pulse" /> LIVE</Badge>;
  if (status === "finished") return <Badge className="bg-surface-subtle text-muted">Завершена</Badge>;
  return <Badge variant="warning">Черновик</Badge>;
}

function SessionCard({ session }: { session: Session }) {
  const qualityLabel = session.quality === "good" ? "Хорошо" : session.quality === "medium" ? "Средне" : "Низко";
  return (
    <div className="group rounded-2xl bg-surface-subtle/50 ring-1 ring-[color:var(--border)]/20 hover:ring-[color:var(--border)]/35 p-4 md:p-5 transition-all duration-200 hover:shadow-soft">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-fg truncate">{session.title}</div>
          <div className="mt-1 text-sm text-muted">
            {session.group} · {new Date(session.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-2">
            <StatusBadge status={session.status} />
            <span className="text-xs text-muted">Качество: {qualityLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/teacher/session/${session.id}`}>
            <Button size="sm" className="gap-1.5 shadow-soft">
              <Video size={14} />
              Монитор
            </Button>
          </Link>
          <Link href={`/teacher/session/${session.id}/analytics`}>
            <Button size="sm" variant="outline" className="gap-1.5">
              <FileBarChart size={14} />
              Аналитика
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

const QUICK_ACTIONS = [
  { label: "Создать сессию", href: "/teacher/sessions/new", icon: PlusCircle, primary: true },
  { label: "Все сессии", href: "/teacher/sessions", icon: PlayCircle },
  { label: "Группы", href: "/teacher/groups", icon: LayoutGrid },
  { label: "Отчёты", href: "/teacher/reports", icon: ClipboardList },
  { label: "Сравнение", href: "/teacher/compare", icon: TrendingUp },
];

export default function TeacherDashboard() {
  const toast = useToast();
  const ui = useUI();

  const [sessions, setSessions] = useState<TeacherDashboardSession[]>([]);
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

  const recentSessions = sessions.slice(0, 6);
  const live = summary.live;
  const liveNow = live[0];

  const status = ui.state.status ?? null;
  const statusBanner =
    status === "pending"
      ? {
          label: "Аккаунт ожидает одобрения",
          text: "Вы можете использовать дашборд и демо‑сессии. Полный доступ появится после одобрения администратором.",
        }
      : status === "limited"
      ? {
          label: "Ограниченный доступ",
          text: "Сейчас включён ограниченный режим: часть функций может быть недоступна. Для полного доступа обратитесь к администратору.",
        }
      : null;

  return (
    <div className="pb-16">
      <Breadcrumbs items={[{ label: "Преподаватель", href: "/teacher/dashboard" }, { label: "Дашборд" }]} />

      <PageHero
        title="Обзор преподавателя"
        subtitle="Сессии, live-мониторинг, аналитика и отчёты — в одном месте."
        right={
          <div className="flex flex-wrap items-center gap-2">
            {live.length > 0 && (
              <Badge variant="success" className="gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-[rgb(var(--success))] animate-pulse" />
                Live: {live.length}
              </Badge>
            )}
            <Link href="/teacher/sessions/new">
              <Button className="gap-2 shadow-soft">
                Создать сессию <ArrowRight size={16} />
              </Button>
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

      {statusBanner && (
        <Section spacing="none" className="mt-3">
          <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 flex flex-col gap-1">
            <div className="font-medium">{statusBanner.label}</div>
            <div className="text-xs text-amber-100/90">{statusBanner.text}</div>
          </div>
        </Section>
      )}

      {/* Быстрые действия — всегда на виду */}
      <Section spacing="none" className="mt-6">
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map(({ label, href, icon: Icon, primary }) => (
            <Link key={href} href={href}>
              <Button variant={primary ? "primary" : "outline"} size="sm" className="gap-2 rounded-xl">
                <Icon size={16} />
                {label}
              </Button>
            </Link>
          ))}
        </div>
      </Section>

      <Section spacing="none" className="mt-8 space-y-8">
        {/* KPI + LIVE */}
        <div className="grid gap-6 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <Card variant="elevated">
              <CardContent className="p-6 md:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider text-muted">Сводка</div>
                    <h2 className="mt-2 text-xl font-bold text-fg">Ключевые показатели</h2>
                    <p className="mt-1 text-sm text-muted leading-relaxed">
                      Обзор по сессиям за сегодня и последним занятиям.
                    </p>
                  </div>
                  <Badge className="bg-primary/10 text-[rgb(var(--primary))]">Dashboard</Badge>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <KPI icon={<Users size={22} />} label="Групп в работе" value={`${summary.activeGroups}`} hint="Active groups" />
                  <KPI icon={<PlayCircle size={22} />} label="Сессий сегодня" value={`${summary.sessionsToday}`} hint="Sessions today" accent={summary.sessionsToday > 0} />
                  <KPI icon={<BarChart3 size={22} />} label="Средняя вовлечённость" value={`${summary.avgEngagement}%`} hint="По сессиям" />
                  <KPI icon={<AlertTriangle size={22} />} label="Маркеры внимания" value={`${summary.attentionAlerts}`} hint="Attention alerts" />
                </div>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal className="lg:col-span-5">
            <Card variant="elevated" className={liveNow ? "ring-[rgb(var(--primary))]/20" : ""}>
              <CardContent className="p-6 md:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Zap size={18} className="text-[rgb(var(--primary))]" />
                      <span className="text-xs font-medium uppercase tracking-wider text-muted">Live</span>
                    </div>
                    <h2 className="mt-2 text-xl font-bold text-fg">
                      {liveNow ? "Сессия в эфире" : "Сейчас нет LIVE"}
                    </h2>
                    <p className="mt-1 text-sm text-muted leading-relaxed">
                      {liveNow
                        ? `${liveNow.title} · ${liveNow.group}`
                        : "Запустите сессию для live-монитора и аналитики."}
                    </p>
                  </div>
                  <Badge variant={liveNow ? "success" : "default"} className={liveNow ? "gap-1.5" : ""}>
                    {liveNow && <span className="inline-flex h-1.5 w-1.5 rounded-full bg-current animate-pulse" />}
                    {liveNow ? "LIVE" : "Idle"}
                  </Badge>
                </div>

                <div className="mt-6 space-y-3">
                  {liveNow ? (
                    <>
                      <Link href={`/teacher/session/${liveNow.id}`} className="block">
                        <Button size="lg" className="w-full gap-2">
                          <Video size={18} />
                          Открыть монитор
                        </Button>
                      </Link>
                      <Link href={`/teacher/session/${liveNow.id}/analytics`} className="block">
                        <Button size="lg" variant="outline" className="w-full gap-2">
                          <FileBarChart size={18} />
                          Аналитика сессии
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <Link href="/teacher/sessions/new" className="block">
                      <Button size="lg" className="w-full gap-2">
                        <PlusCircle size={18} />
                        Создать сессию
                      </Button>
                    </Link>
                  )}
                  <p className="text-xs text-muted leading-relaxed">
                    Совет: для демо запустите лекцию, подключите студента — затем откройте таймлайн и инсайты.
                  </p>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </div>

        {/* Недавние сессии — карточки без таблицы */}
        <Reveal>
          <Card variant="elevated">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted">Недавние</div>
                  <h2 className="mt-2 text-xl font-bold text-fg">Сессии и быстрые действия</h2>
                  <p className="mt-1 text-sm text-muted leading-relaxed">
                    Откройте монитор или аналитику в пару кликов.
                  </p>
                </div>
                <Link href="/teacher/sessions">
                  <Button variant="outline" size="sm" className="rounded-xl">
                    Все сессии →
                  </Button>
                </Link>
              </div>

              <div className="mt-6 space-y-3">
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 rounded-2xl bg-surface-subtle/50 animate-pulse" />
                  ))
                ) : recentSessions.length === 0 ? (
                  <div className="rounded-2xl bg-surface-subtle/50 ring-1 ring-[color:var(--border)]/20 p-8 text-center">
                    <p className="text-muted">Нет сессий.</p>
                    <Link href="/teacher/sessions/new" className="mt-3 inline-block">
                      <Button size="sm" className="gap-2">
                        <PlusCircle size={16} />
                        Создать первую сессию
                      </Button>
                    </Link>
                  </div>
                ) : (
                  recentSessions.map((s) => <SessionCard key={s.id} session={s} />)
                )}
              </div>
            </CardContent>
          </Card>
        </Reveal>

        {/* Insights */}
        <Reveal>
          <Card variant="elevated">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted">
                    <Sparkles size={14} className="text-[rgb(var(--primary))]" />
                    Insights
                  </div>
                  <h2 className="mt-2 text-xl font-bold text-fg">Авто-рекомендации</h2>
                  <p className="mt-1 text-sm text-muted leading-relaxed">
                    Подсказки по паттернам сессий (пока детерминированно).
                  </p>
                </div>
                <Badge className="bg-primary/10 text-[rgb(var(--primary))]">smart</Badge>
              </div>

              <div className="mt-6 space-y-3">
                {insights.length === 0 ? (
                  <div className="rounded-xl bg-surface-subtle/50 p-5 text-center text-sm text-muted">
                    Запустите сессии — появятся рекомендации.
                  </div>
                ) : (
                  insights.map((it, i) => <Insight key={i} title={it.title} text={it.text} />)
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-[color:var(--border)]/20 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="gap-2 rounded-xl"
                  onClick={() =>
                    toast.push({ type: "success", title: "Итог сформирован", text: "Краткая сводка по сессии." })
                  }
                >
                  Сформировать итог
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() =>
                    toast.push({ type: "info", title: "Экспорт", text: "Отчёт появится в разделе «Отчёты»." })
                  }
                >
                  Экспорт
                </Button>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      </Section>
    </div>
  );
}
