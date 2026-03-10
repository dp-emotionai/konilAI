"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Section from "@/components/common/Section";
import Reveal from "@/components/common/Reveal";

import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

import SparkArea from "@/components/common/SparkArea";
import DonutMini from "@/components/common/DonutMini";

import { getStudentSessionsList, type StudentSessionRow } from "@/lib/api/student";
import { getSessionMetrics, isToday, type DashboardSession } from "@/lib/utils/metrics";
import { readConsent } from "@/lib/consent";
import { useUI } from "@/components/layout/Providers";

import { Download, ShieldCheck } from "lucide-react";

function avg(nums: number[]) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** адаптер: приводим student row к минимальному формату, который ждёт getSessionMetrics */
function toSessionLike(s: StudentSessionRow): DashboardSession {
  return {
    id: s.id,
    title: s.title,
    group: "", // студенту не всегда нужно
    date: s.date,
    status: s.status === "live" ? "active" : "draft",
    type: s.type,
    quality: "good",
  };
}

export default function StudentSummaryPage() {
  const { state } = useUI();
  const consent = state.consent || readConsent();

  const [sessions, setSessions] = useState<StudentSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getStudentSessionsList()
      .then((data) => {
        if (!mounted) return;
        setSessions(data);
        setUpdatedAt(new Date());
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const sessionLikes = useMemo(() => sessions.map(toSessionLike), [sessions]);
  const metrics = useMemo(() => sessionLikes.map(getSessionMetrics), [sessionLikes]);

  const analyzedCount = sessions.length;

  const avgEng = useMemo(() => Math.round(avg(metrics.map((m) => m.engagement))), [metrics]);

  const stressPeaks = useMemo(() => {
    return metrics.reduce((acc, m) => acc + (m.stress >= 60 ? 1 : 0), 0);
  }, [metrics]);

  const bestTime = useMemo(() => {
    if (!sessionLikes.length) return "—";
    const m = getSessionMetrics(sessionLikes[0]);
    let bestIdx = 0;
    for (let i = 1; i < m.series.length; i++) if (m.series[i] > m.series[bestIdx]) bestIdx = i;

    const start = 8 + Math.floor((bestIdx / 24) * 10);
    const end = start + 2;
    const pad = (x: number) => String(x).padStart(2, "0");
    return `${pad(start)}:00–${pad(end)}:00`;
  }, [sessionLikes]);

  const engagementSeries = useMemo(() => {
    const last = sessionLikes.slice(0, 3);
    if (!last.length) return null;

    const seriesList = last.map((s) => getSessionMetrics(s).series);
    const len = seriesList[0].length;
    return Array.from({ length: len }, (_, i) => Math.round(avg(seriesList.map((arr) => arr[i] ?? 0))));
  }, [sessionLikes]);

  const dropsSeries = useMemo(() => {
    const base = engagementSeries ?? Array.from({ length: 24 }, () => 50);
    const totalDrops = metrics.reduce((a, m) => a + m.drops, 0) || 1;
    return base.map((v, i) => {
      const bump = i % 6 === 0 ? 18 : i % 5 === 0 ? 10 : 0;
      return clamp(Math.round((100 - v) * 0.6 + bump + totalDrops), 10, 95);
    });
  }, [engagementSeries, metrics]);

  const weekCompare = useMemo(() => {
    const thisWeek = sessionLikes.filter((s: any) => isToday(s.date) || s.status === "active");
    const prevWeek = sessionLikes.filter((s: any) => !isToday(s.date) && s.status !== "active");

    const a = avg(thisWeek.map((s: any) => getSessionMetrics(s).engagement));
    const b = avg(prevWeek.map((s: any) => getSessionMetrics(s).engagement));
    const delta = Math.round((a - b) || 0);
    return { a: Math.round(a || 0), b: Math.round(b || 0), delta };
  }, [sessionLikes]);

  const emotions = useMemo(() => {
    const e = avgEng || 50;
    const s = avg(metrics.map((m) => m.stress)) || 40;

    const calm = clamp(60 - Math.round(s * 0.5), 10, 60);
    const focus = clamp(Math.round(e * 0.6), 10, 65);
    const tense = clamp(Math.round(s * 0.7), 10, 60);
    const tired = clamp(100 - (calm + focus + tense), 5, 35);

    const vals = [calm, focus, tense, tired];
    const sum = vals.reduce((a, b) => a + b, 0) || 1;
    return vals.map((v) => Math.round((v / sum) * 100));
  }, [avgEng, metrics]);

  const hasData = analyzedCount > 0 && !loading;

  return (
    <div className="pb-12">
      <Breadcrumbs items={[{ label: "Студент", href: "/student/dashboard" }, { label: "Итоги" }]} />

      <PageHero
        overline="Студент"
        title="Моя сводка"
        subtitle="Личная вовлечённость (опционально). Показываем агрегаты и подсказки для саморефлексии."
        right={
          <div className="flex flex-wrap items-center gap-2">
            {updatedAt && (
              <span className="text-xs text-muted">
                Updated: {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            <Button variant="outline" disabled className="gap-2">
              <Download size={16} /> Export CSV
            </Button>
            <Link href="/student/dashboard">
              <Button variant="outline">На дашборд</Button>
            </Link>
          </div>
        }
      />

      <Section spacing="none" className="mt-8 space-y-6">
        {/* consent hint */}
        {!consent && (
          <Reveal>
            <Card>
              <CardContent className="p-6 md:p-7 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm text-muted">Доступ</div>
                  <div className="mt-2 text-lg font-semibold text-fg">Согласие не дано</div>
                  <div className="mt-2 text-sm text-muted">
                    Вы можете включить аналитику в центре согласия. Сводка останется агрегированной и без raw-видео.
                  </div>
                </div>
                <Link href="/consent">
                  <Button className="gap-2">
                    <ShieldCheck size={18} /> Управление согласием
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </Reveal>
        )}

        {/* KPI */}
        <div className="grid lg:grid-cols-4 gap-5">
          <Reveal><Kpi title="Сессий в расчёте" value={loading ? "…" : String(analyzedCount)} hint="На основе ваших сессий" /></Reveal>
          <Reveal><Kpi title="Средняя вовлечённость" value={hasData ? `${avgEng}%` : "—"} hint="Среднее по сессиям" /></Reveal>
          <Reveal><Kpi title="Пики стресса" value={hasData ? `${stressPeaks}` : "—"} hint="Сессий со стрессом ≥ 60%" /></Reveal>
          <Reveal><Kpi title="Лучшее время" value={hasData ? bestTime : "—"} hint="Окно концентрации" /></Reveal>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-5">
          <Reveal>
            <ChartCard title="Вовлечённость по времени" tag="Trend">
              {loading ? (
                <div className="h-[210px] rounded-elas-lg bg-surface-subtle animate-pulse" />
              ) : engagementSeries ? (
                <SparkArea values={engagementSeries} height={210} />
              ) : (
                <EmptyChart />
              )}
              <p className="mt-3 text-sm text-muted">
                Сглаженная линия по последним сессиям. Показывает динамику внимания в течение занятия.
              </p>
            </ChartCard>
          </Reveal>

          <Reveal>
            <ChartCard title="Распределение эмоций" tag="Summary">
              {loading ? (
                <div className="h-[210px] rounded-elas-lg bg-surface-subtle animate-pulse" />
              ) : hasData ? (
                <DonutMini labels={["Спокойствие", "Фокус", "Напряжение", "Усталость"]} values={emotions} />
              ) : (
                <EmptyChart />
              )}
              <p className="mt-3 text-sm text-muted">
                Агрегированная оценка (без хранения raw-видео). Используется для саморефлексии.
              </p>
            </ChartCard>
          </Reveal>

          <Reveal>
            <ChartCard title="Снижения концентрации" tag="Alerts">
              {loading ? (
                <div className="h-[210px] rounded-elas-lg bg-surface-subtle animate-pulse" />
              ) : dropsSeries ? (
                <SparkArea values={dropsSeries} height={210} />
              ) : (
                <EmptyChart />
              )}
              <p className="mt-3 text-sm text-muted">
                Пики — возможные “провалы”. Помогают паузы/смена активности.
              </p>
            </ChartCard>
          </Reveal>

          <Reveal>
            <ChartCard title="Неделя к предыдущей" tag="Compare">
              {loading ? (
                <div className="h-[210px] rounded-elas-lg bg-surface-subtle animate-pulse" />
              ) : hasData ? (
                <>
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
                    Если Δ отрицательная — попробуйте больше интерактива и меньше монотонного темпа.
                  </div>
                </>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>
          </Reveal>
        </div>

        {/* explanation */}
        <Reveal>
          <Card>
            <CardContent className="p-6 md:p-7">
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
                <Insight title="Снижения концентрации" text="Перерывы каждые 25 минут и смена активности помогают удерживать внимание." />
                <Insight title="Пики стресса" text="Во время экзамена стресс выше — полезны паузы и дыхательные практики." />
                <Insight title="Приватность" text="Согласие можно отозвать. Метрики — агрегированные, без хранения raw-видео." />
              </div>
            </CardContent>
          </Card>
        </Reveal>
      </Section>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-[210px] rounded-elas-lg bg-surface-subtle flex items-center justify-center text-sm text-muted">
      Недостаточно данных
    </div>
  );
}

function Kpi({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <Card>
      <CardContent className="p-6 md:p-7">
        <div className="text-sm text-muted">{title}</div>
        <div className="mt-2 text-3xl font-semibold text-fg">{value}</div>
        <div className="mt-2 text-sm text-muted">{hint}</div>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, tag, children }: { title: string; tag: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-6 md:p-7">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium text-fg">{title}</div>
          <Badge className="bg-primary/10">{tag}</Badge>
        </div>
        <div className="mt-5">{children}</div>
      </CardContent>
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
    <div className="rounded-elas-lg bg-surface-subtle p-4">
      <div className="font-semibold text-fg">{title}</div>
      <div className="mt-2 text-sm text-muted leading-relaxed">{text}</div>
    </div>
  );
}