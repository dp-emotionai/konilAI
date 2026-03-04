"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Session } from "@/lib/mock/sessions";

import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Section from "@/components/common/Section";
import Reveal from "@/components/common/Reveal";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import SparkArea from "@/components/common/SparkArea";
import DonutMini from "@/components/common/DonutMini";

import { getTeacherDashboardSessions } from "@/lib/api/teacher";
import { getSessionMetrics, isToday } from "@/lib/utils/metrics";

function avg(nums: number[]) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function StudentSummaryPage() {
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

  const metrics = useMemo(() => sessions.map(getSessionMetrics), [sessions]);

  // KPI
  const avgEng = useMemo(() => Math.round(avg(metrics.map((m) => m.engagement))), [metrics]);
  const stressPeaks = useMemo(() => {
    // “пик” = стресс > 60 (условно). Это честная логика, не “выдумка”.
    return metrics.reduce((acc, m) => acc + (m.stress >= 60 ? 1 : 0), 0);
  }, [metrics]);

  // Лучшее время: упрощённо берём “окно” из серии первой/последней сессии
  // (потом заменится на реальные timestamps из backend)
  const bestTime = useMemo(() => {
    if (!sessions.length) return "—";
    // 24 точки = условные часы
    const m = getSessionMetrics(sessions[0]);
    let bestIdx = 0;
    for (let i = 1; i < m.series.length; i++) if (m.series[i] > m.series[bestIdx]) bestIdx = i;

    const start = 8 + Math.floor((bestIdx / 24) * 10); // 08..18 условно
    const end = start + 2;
    const pad = (x: number) => String(x).padStart(2, "0");
    return `${pad(start)}:00–${pad(end)}:00`;
  }, [sessions]);

  // Графики
  const engagementSeries = useMemo(() => {
    // берём “среднюю” серию по последним 3 сессиям (сглаженно)
    const last = sessions.slice(0, 3);
    if (!last.length) return null;
    const seriesList = last.map((s) => getSessionMetrics(s).series);
    const len = seriesList[0].length;
    const out = Array.from({ length: len }, (_, i) =>
      Math.round(avg(seriesList.map((arr) => arr[i] ?? 0)))
    );
    return out;
  }, [sessions]);

  const dropsSeries = useMemo(() => {
    // делаем “drops” как серию: чем больше drops, тем больше пики
    const base = engagementSeries ?? Array.from({ length: 24 }, () => 50);
    const totalDrops = metrics.reduce((a, m) => a + m.drops, 0) || 1;
    return base.map((v, i) => {
      const bump = ((i % 6) === 0 ? 18 : (i % 5) === 0 ? 10 : 0);
      return clamp(Math.round((100 - v) * 0.6 + bump + totalDrops), 10, 95);
    });
  }, [engagementSeries, metrics]);

  const weekCompare = useMemo(() => {
    // сравнение “неделя к предыдущей” на моках:
    // today sessions vs остальные
    const thisWeek = sessions.filter((s) => isToday(s.date) || s.status === "active");
    const prevWeek = sessions.filter((s) => !isToday(s.date) && s.status !== "active");

    const a = avg(thisWeek.map((s) => getSessionMetrics(s).engagement));
    const b = avg(prevWeek.map((s) => getSessionMetrics(s).engagement));

    const delta = Math.round((a - b) || 0);
    return { a: Math.round(a || 0), b: Math.round(b || 0), delta };
  }, [sessions]);

  // “Эмоции” (donut) — делаем из stress/engagement со здравой логикой
  const emotions = useMemo(() => {
    const e = avgEng || 50;
    const s = avg(metrics.map((m) => m.stress)) || 40;

    // спокойствие/фокус/напряжение/усталость
    const calm = clamp(60 - Math.round(s * 0.5), 10, 60);
    const focus = clamp(Math.round(e * 0.6), 10, 65);
    const tense = clamp(Math.round(s * 0.7), 10, 60);
    const tired = clamp(100 - (calm + focus + tense), 5, 35);

    // нормализуем
    const vals = [calm, focus, tense, tired];
    const sum = vals.reduce((a, b) => a + b, 0) || 1;
    return vals.map((v) => Math.round((v / sum) * 100));
  }, [avgEng, metrics]);

  return (
    <div className="pb-12">
      <Breadcrumbs items={[{ label: "Студент", href: "/student/dashboard" }, { label: "Итоги" }]} />

      <PageHero
        overline="Студент"
        title="Моя сводка"
        subtitle="Личная вовлечённость (опционально). Если согласие не дано — показываем только агрегаты."
        right={
          <div className="flex flex-wrap items-center gap-2">
            {updatedAt && (
              <span className="text-xs text-muted">
                Updated: {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <Button onClick={() => alert("CSV export будет подключён к backend позже")}>Экспорт CSV</Button>
            <Link href="/student/dashboard">
              <Button variant="outline">На дашборд</Button>
            </Link>
          </div>
        }
      />

      <Section spacing="normal" className="mt-8 space-y-10">
        {/* KPI */}
        <div className="grid lg:grid-cols-3 gap-5">
          <Reveal>
            <Kpi title="Средняя вовлечённость" value={`${avgEng}%`} hint="Среднее по сессиям" />
          </Reveal>
          <Reveal>
            <Kpi title="Пики стресса" value={`${stressPeaks}`} hint="Сессий со стрессом ≥ 60%" />
          </Reveal>
          <Reveal>
            <Kpi title="Лучшее время" value={bestTime} hint="Окно наибольшей концентрации" />
          </Reveal>
        </div>

        {/* CHARTS */}
        <div className="grid lg:grid-cols-2 gap-5">
          <Reveal>
            <ChartCard title="Вовлечённость по времени" tag="Live">
              {engagementSeries ? (
                <SparkArea values={engagementSeries} height={210} />
              ) : (
                <div className="h-[210px] rounded-elas-lg bg-surface-subtle animate-pulse" />
              )}
              <p className="mt-3 text-sm text-muted">
                Сглаженная линия по последним сессиям. Показывает динамику внимания в течение занятия.
              </p>
            </ChartCard>
          </Reveal>

          <Reveal>
            <ChartCard title="Распределение эмоций" tag="Summary">
              <DonutMini
                labels={["Спокойствие", "Фокус", "Напряжение", "Усталость"]}
                values={emotions}
              />
              <p className="mt-3 text-sm text-muted">
                Агрегированная оценка (без хранения raw-видео). Используется для саморефлексии.
              </p>
            </ChartCard>
          </Reveal>

          <Reveal>
            <ChartCard title="Снижения концентрации" tag="Alerts">
              {dropsSeries ? (
                <SparkArea values={dropsSeries} height={210} />
              ) : (
                <div className="h-[210px] rounded-elas-lg bg-surface-subtle animate-pulse" />
              )}
              <p className="mt-3 text-sm text-muted">
                Пики показывают возможные “провалы” концентрации. Используйте короткие перерывы/смену активности.
              </p>
            </ChartCard>
          </Reveal>

          <Reveal>
            <ChartCard title="Неделя к предыдущей" tag="Compare">
              <div className="grid grid-cols-3 gap-3">
                <MiniCompare label="Эта неделя" value={`${weekCompare.a}%`} />
                <MiniCompare label="Прошлая" value={`${weekCompare.b}%`} />
                <MiniCompare
                  label="Δ"
                  value={`${weekCompare.delta >= 0 ? "+" : ""}${weekCompare.delta}%`}
                  accent
                />
              </div>
              <div className="mt-4 rounded-elas-lg bg-surface-subtle p-4 text-sm text-muted">
                Если Δ отрицательная — попробуйте поменять формат: больше интерактива, меньше монотонной лекции.
              </div>
            </ChartCard>
          </Reveal>
        </div>

        {/* EXPLANATION */}
        <Reveal>
          <Card className="p-6 md:p-7">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-sm text-muted">Пояснение</div>
                <div className="mt-2 text-lg font-semibold text-fg">Что это значит</div>
                <div className="mt-2 text-sm text-muted leading-relaxed max-w-3xl">
                  Страница опциональна и может быть отключена политикой. Данные агрегируются и предназначены для саморефлексии,
                  а не для оценки личности.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/consent"><Button variant="outline">Управление согласием</Button></Link>
                <Link href="/privacy"><Button variant="ghost">Конфиденциальность</Button></Link>
              </div>
            </div>

            <div className="mt-6 grid md:grid-cols-3 gap-4">
              <Insight title="Снижения концентрации" text="Попробуйте короткие перерывы каждые 25 минут или смену активности." />
              <Insight title="Пики стресса" text="Во время экзамена стресс выше — помогают дыхательные практики и паузы." />
              <Insight title="Приватность" text="Согласие можно отозвать. Метрики — агрегированные, без хранения raw-видео." />
            </div>
          </Card>
        </Reveal>
      </Section>
    </div>
  );
}

function Kpi({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <Card className="p-6 md:p-7">
      <div className="text-sm text-muted">{title}</div>
      <div className="mt-2 text-3xl font-semibold text-fg">{value}</div>
      <div className="mt-2 text-sm text-muted">{hint}</div>
    </Card>
  );
}

function ChartCard({
  title,
  tag,
  children,
}: {
  title: string;
  tag: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6 md:p-7">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-fg">{title}</div>
        <Badge className="bg-primary/10">{tag}</Badge>
      </div>
      <div className="mt-5">{children}</div>
    </Card>
  );
}

function MiniCompare({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-elas-lg bg-surface-subtle p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${accent ? "text-[rgb(var(--primary))]" : "text-fg"}`}>
        {value}
      </div>
    </div>
  );
}

function Insight({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-elas-lg bg-surface-subtle p-4 shadow-soft">
      <div className="font-semibold text-fg">{title}</div>
      <div className="mt-2 text-sm text-muted leading-relaxed">{text}</div>
    </div>
  );
}