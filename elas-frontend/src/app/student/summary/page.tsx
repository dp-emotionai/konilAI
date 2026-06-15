"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import Breadcrumbs from "@/components/layout/Breadcrumbs";
import Reveal from "@/components/common/Reveal";
import SparkArea from "@/components/common/SparkArea";
import DonutMini from "@/components/common/DonutMini";
import Button from "@/components/ui/Button";

import { getStudentEmotionsSummary, type StudentEmotionsSummary } from "@/lib/api/student";
import { getApiBaseUrl, hasAuth } from "@/lib/api/client";
import { readConsent } from "@/lib/consent";
import { useUI } from "@/components/layout/Providers";

import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  Clock3,
  Download,
  Eye,
  HeartPulse,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  TrendingUp,
} from "lucide-react";

type Accent = "violet" | "emerald" | "rose" | "amber" | "blue";

const EMOTION_LABELS: Record<string, string> = {
  Neutral: "Нейтрально",
  Happy: "Радость",
  Angry: "Злость",
  Surprise: "Удивление",
  Sad: "Грусть",
  Fear: "Страх",
  Disgust: "Отвращение",
};

export default function StudentSummaryPage() {
  const { state } = useUI();
  const consent = state.consent || readConsent();

  const [summary, setSummary] = useState<StudentEmotionsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const apiAvailable = Boolean(getApiBaseUrl() && hasAuth());

  const load = useCallback(async () => {
    setError(null);

    if (!apiAvailable) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const data = await getStudentEmotionsSummary();
      setSummary(data ?? null);
      setUpdatedAt(new Date());
    } catch (reason: unknown) {
      setSummary(null);
      setError(reason instanceof Error ? reason.message : "Не удалось загрузить сводку.");
    } finally {
      setLoading(false);
    }
  }, [apiAvailable]);

  useEffect(() => {
    void load();
  }, [load]);

  const analyzedCount = summary?.analyzedSessions ?? 0;
  const avgEngagement = toPercent(summary?.avgEngagement);
  const stressPeaks = summary?.stressPeaks ?? 0;
  const bestTime = summary?.bestTimeWindow || "—";
  const engagementSeries = summary?.engagementSeries?.length ? summary.engagementSeries : null;
  const dropsSeries = summary?.dropsSeries?.length ? summary.dropsSeries : null;

  const weekCompare = useMemo(() => {
    const raw = summary?.weekCompare ?? { thisWeek: 0, prevWeek: 0, delta: 0 };

    return {
      thisWeek: toPercent(raw.thisWeek),
      prevWeek: toPercent(raw.prevWeek),
      delta: toPercentDelta(raw.delta),
    };
  }, [summary]);

  const emotionLabels = useMemo(
    () => (summary ? Object.keys(summary.emotionsDistribution ?? {}) : []),
    [summary]
  );

  const emotionValues = useMemo(
    () =>
      summary
        ? emotionLabels.map((key) => toPercent(summary.emotionsDistribution[key] ?? 0))
        : [],
    [emotionLabels, summary]
  );

  const localizedEmotionLabels = useMemo(
    () => emotionLabels.map((label) => EMOTION_LABELS[label] ?? label),
    [emotionLabels]
  );

  const hasData = analyzedCount > 0 && !loading && !error;

  const exportCsv = useCallback(() => {
    if (!summary) return;

    const rows: Array<[string, string | number]> = [
      ["Показатель", "Значение"],
      ["Сессий в расчёте", analyzedCount],
      ["Средняя вовлечённость", `${avgEngagement}%`],
      ["Пики стресса", stressPeaks],
      ["Лучшее время", bestTime],
      ["Эта неделя", `${weekCompare.thisWeek}%`],
      ["Прошлая неделя", `${weekCompare.prevWeek}%`],
      ["Изменение", `${weekCompare.delta >= 0 ? "+" : ""}${weekCompare.delta}%`],
      ...emotionLabels.map(
        (label, index) =>
          [`Эмоция: ${EMOTION_LABELS[label] ?? label}`, `${emotionValues[index] ?? 0}%`] as [
            string,
            string
          ]
      ),
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `konilai-summary-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }, [
    analyzedCount,
    avgEngagement,
    bestTime,
    emotionLabels,
    emotionValues,
    stressPeaks,
    summary,
    weekCompare,
  ]);

  return (
    <div className="relative overflow-hidden pb-14">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-4 h-80 w-80 rounded-full bg-violet-200/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-[540px] h-80 w-80 rounded-full bg-blue-100/60 blur-3xl"
      />

      <div className="relative z-10">
        <Breadcrumbs
          items={[
            { label: "Студент", href: "/student/dashboard" },
            { label: "Моя сводка" },
          ]}
        />

        <section className="mt-5 overflow-hidden rounded-[30px] border border-violet-100/80 bg-[radial-gradient(circle_at_82%_18%,rgba(139,92,246,0.18),transparent_25%),linear-gradient(135deg,#ffffff_0%,#fbfaff_55%,#f4f0ff_100%)] px-5 py-7 shadow-[0_22px_70px_rgba(88,57,180,0.10)] sm:px-7 md:px-9 md:py-9">
          <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-violet-600 shadow-sm">
                <Sparkles size={14} />
                Личная аналитика
              </div>

              <h1 className="mt-4 text-4xl font-bold tracking-[-0.045em] text-slate-950 sm:text-5xl">
                Моя сводка
              </h1>

              <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-600 sm:text-base">
                Агрегированная картина вовлечённости, концентрации и эмоциональных сигналов.
                Данные предназначены только для саморефлексии.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-2 text-slate-600 shadow-sm">
                  <Clock3 size={15} className="text-violet-500" />
                  {updatedAt
                    ? `Обновлено в ${updatedAt.toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : "Данные ещё не обновлялись"}
                </span>

                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-emerald-700">
                  <ShieldCheck size={15} />
                  Без хранения raw-видео
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Button
                variant="outline"
                onClick={exportCsv}
                disabled={!summary || loading}
                className="gap-2 bg-white/90"
              >
                <Download size={16} />
                Скачать CSV
              </Button>

              <Button
                variant="outline"
                onClick={() => void load()}
                disabled={loading}
                className="gap-2 bg-white/90"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                Обновить
              </Button>

              <Link href="/student/dashboard">
                <Button className="gap-2">
                  На дашборд
                  <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-6 space-y-5">
          {error && (
            <Reveal>
              <StatusBanner
                accent="amber"
                icon={<AlertCircle size={22} />}
                title="Не удалось загрузить сводку"
                text={error}
                action={
                  <Button variant="outline" onClick={() => void load()} className="bg-white">
                    Повторить
                  </Button>
                }
              />
            </Reveal>
          )}

          {!apiAvailable && !loading && !error && (
            <Reveal>
              <StatusBanner
                accent="blue"
                icon={<AlertCircle size={22} />}
                title="Сервис пока недоступен"
                text="Войдите в аккаунт и убедитесь, что адрес API настроен корректно."
                action={
                  <Link href="/auth/login">
                    <Button variant="outline" className="bg-white">
                      Войти
                    </Button>
                  </Link>
                }
              />
            </Reveal>
          )}

          {!consent && apiAvailable && !error && (
            <Reveal>
              <StatusBanner
                accent="violet"
                icon={<ShieldCheck size={22} />}
                title="Согласие на аналитику не дано"
                text="Вы можете включить аналитику в центре согласия. Сводка останется агрегированной и без raw-видео."
                action={
                  <Link href="/consent">
                    <Button className="gap-2">
                      <ShieldCheck size={17} />
                      Управление согласием
                    </Button>
                  </Link>
                }
              />
            </Reveal>
          )}

          {apiAvailable && !loading && !error && !hasData && (
            <Reveal>
              <StatusBanner
                accent="blue"
                icon={<BrainCircuit size={22} />}
                title="Данных пока недостаточно"
                text="Подключитесь к сессиям с включённым согласием — сводка заполнится после анализа."
                action={
                  <Link href="/student/sessions">
                    <Button variant="outline" className="bg-white">
                      К сессиям
                    </Button>
                  </Link>
                }
              />
            </Reveal>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Reveal>
              <KpiCard
                icon={<BarChart3 size={22} />}
                title="Сессий в расчёте"
                value={loading ? "…" : String(analyzedCount)}
                hint="Проанализированные занятия"
                accent="violet"
              />
            </Reveal>

            <Reveal>
              <KpiCard
                icon={<TrendingUp size={22} />}
                title="Средняя вовлечённость"
                value={hasData ? `${avgEngagement}%` : "—"}
                hint="Среднее значение по сессиям"
                accent="emerald"
              />
            </Reveal>

            <Reveal>
              <KpiCard
                icon={<HeartPulse size={22} />}
                title="Пики стресса"
                value={hasData ? String(stressPeaks) : "—"}
                hint="Сессии со стрессом от 60%"
                accent="rose"
              />
            </Reveal>

            <Reveal>
              <KpiCard
                icon={<Clock3 size={22} />}
                title="Лучшее время"
                value={hasData ? bestTime : "—"}
                hint="Окно наибольшей концентрации"
                accent="amber"
              />
            </Reveal>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <Reveal>
              <AnalyticsCard
                title="Динамика вовлечённости"
                description="Как менялось внимание во время последних занятий"
                icon={<Activity size={20} />}
                tag="Тренд"
              >
                {loading ? (
                  <ChartSkeleton />
                ) : engagementSeries ? (
                  <div className="rounded-2xl bg-[linear-gradient(180deg,#fbf9ff,#ffffff)] p-3">
                    <SparkArea values={engagementSeries} height={235} />
                  </div>
                ) : (
                  <EmptyChart />
                )}

                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm leading-6 text-violet-800">
                  <Eye size={18} className="mt-0.5 shrink-0" />
                  Сглаженная линия помогает увидеть устойчивые периоды внимания и моменты снижения.
                </div>
              </AnalyticsCard>
            </Reveal>

            <Reveal>
              <AnalyticsCard
                title="Распределение эмоций"
                description="Агрегированная структура эмоциональных сигналов"
                icon={<BrainCircuit size={20} />}
                tag="Эмоции"
              >
                {loading ? (
                  <ChartSkeleton />
                ) : hasData && emotionLabels.length > 0 ? (
                  <div className="rounded-2xl bg-[linear-gradient(180deg,#fbf9ff,#ffffff)] p-4">
                    <DonutMini labels={localizedEmotionLabels} values={emotionValues} />
                  </div>
                ) : (
                  <EmptyChart />
                )}

                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-sm leading-6 text-emerald-800">
                  <ShieldCheck size={18} className="mt-0.5 shrink-0" />
                  Значения обезличены и используются только для понимания собственного состояния.
                </div>
              </AnalyticsCard>
            </Reveal>

            <Reveal>
              <AnalyticsCard
                title="Снижения концентрации"
                description="Потенциальные моменты потери внимания"
                icon={<TimerReset size={20} />}
                tag="Сигналы"
              >
                {loading ? (
                  <ChartSkeleton />
                ) : dropsSeries ? (
                  <div className="rounded-2xl bg-[linear-gradient(180deg,#fffaf8,#ffffff)] p-3">
                    <SparkArea values={dropsSeries} height={235} />
                  </div>
                ) : (
                  <EmptyChart />
                )}

                <div className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-sm leading-6 text-amber-800">
                  <Target size={18} className="mt-0.5 shrink-0" />
                  Короткая пауза или смена активности помогают вернуть концентрацию.
                </div>
              </AnalyticsCard>
            </Reveal>

            <Reveal>
              <AnalyticsCard
                title="Неделя к предыдущей"
                description="Сравнение средней вовлечённости"
                icon={<TrendingUp size={20} />}
                tag="Сравнение"
              >
                {loading ? (
                  <ChartSkeleton />
                ) : hasData ? (
                  <WeekComparison
                    thisWeek={weekCompare.thisWeek}
                    prevWeek={weekCompare.prevWeek}
                    delta={weekCompare.delta}
                  />
                ) : (
                  <EmptyChart />
                )}
              </AnalyticsCard>
            </Reveal>
          </div>

          <Reveal>
            <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.07)]">
              <div className="grid gap-6 border-b border-slate-100 bg-[linear-gradient(135deg,#fbfaff,#ffffff)] px-5 py-6 md:grid-cols-[minmax(0,1fr)_auto] md:px-7">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">
                    Как читать показатели
                  </div>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                    Что это значит
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    Аналитика помогает замечать собственные паттерны, но не является медицинской,
                    психологической или академической оценкой.
                  </p>
                </div>

                <div className="flex flex-wrap items-start gap-2">
                  <Link href="/consent">
                    <Button variant="outline" className="bg-white">
                      Управление согласием
                    </Button>
                  </Link>
                  <Link href="/privacy">
                    <Button variant="ghost">Конфиденциальность</Button>
                  </Link>
                </div>
              </div>

              <div className="grid gap-4 p-5 md:grid-cols-3 md:p-7">
                <InsightCard
                  icon={<Target size={20} />}
                  title="Концентрация"
                  text="Перерывы каждые 25–30 минут и смена активности помогают дольше удерживать внимание."
                  accent="violet"
                />
                <InsightCard
                  icon={<HeartPulse size={20} />}
                  title="Стресс"
                  text="Во время сложных заданий напряжение может расти. Полезны короткие паузы и дыхательные практики."
                  accent="rose"
                />
                <InsightCard
                  icon={<ShieldCheck size={20} />}
                  title="Приватность"
                  text="Согласие можно отозвать в любой момент. Метрики агрегируются без хранения raw-видео."
                  accent="emerald"
                />
              </div>
            </section>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

function StatusBanner({
  icon,
  title,
  text,
  action,
  accent,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  action?: ReactNode;
  accent: Accent;
}) {
  const tones: Record<Accent, string> = {
    violet: "border-violet-200 bg-[linear-gradient(135deg,#f5f0ff,#ffffff)] text-violet-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    rose: "border-rose-200 bg-rose-50 text-rose-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
  };

  return (
    <section
      className={`flex flex-col gap-4 rounded-[24px] border p-5 shadow-[0_12px_35px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between ${tones[accent]}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm">
          {icon}
        </div>
        <div>
          <h2 className="font-bold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </section>
  );
}

function KpiCard({
  icon,
  title,
  value,
  hint,
  accent,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  hint: string;
  accent: Accent;
}) {
  const tones: Record<Accent, { icon: string; glow: string }> = {
    violet: {
      icon: "bg-violet-50 text-violet-600 border-violet-100",
      glow: "from-violet-500/15",
    },
    emerald: {
      icon: "bg-emerald-50 text-emerald-600 border-emerald-100",
      glow: "from-emerald-500/15",
    },
    rose: {
      icon: "bg-rose-50 text-rose-600 border-rose-100",
      glow: "from-rose-500/15",
    },
    amber: {
      icon: "bg-amber-50 text-amber-600 border-amber-100",
      glow: "from-amber-500/15",
    },
    blue: {
      icon: "bg-blue-50 text-blue-600 border-blue-100",
      glow: "from-blue-500/15",
    },
  };

  return (
    <article className="group relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(15,23,42,0.10)]">
      <div
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-20 bg-gradient-to-b ${tones[accent].glow} to-transparent opacity-70`}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${tones[accent].icon}`}
          >
            {icon}
          </div>
          <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-400">
            За всё время
          </span>
        </div>

        <div className="mt-5 text-sm font-semibold text-slate-500">{title}</div>
        <div className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{value}</div>
        <div className="mt-2 text-xs leading-5 text-slate-500">{hint}</div>
      </div>
    </article>
  );
}

function AnalyticsCard({
  title,
  description,
  icon,
  tag,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  tag: string;
  children: ReactNode;
}) {
  return (
    <section className="h-full overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.07)]">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-[linear-gradient(135deg,#fbfaff,#ffffff)] px-5 py-5 md:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50 text-violet-600">
            {icon}
          </div>
          <div>
            <h2 className="font-bold text-slate-950">{title}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
          </div>
        </div>
        <span className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-violet-600">
          {tag}
        </span>
      </div>

      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}

function WeekComparison({
  thisWeek,
  prevWeek,
  delta,
}: {
  thisWeek: number;
  prevWeek: number;
  delta: number;
}) {
  const positive = delta >= 0;
  const DeltaIcon = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniCompare label="Эта неделя" value={`${thisWeek}%`} accent="violet" />
        <MiniCompare label="Прошлая неделя" value={`${prevWeek}%`} accent="blue" />
        <div
          className={`rounded-2xl border p-4 ${
            positive
              ? "border-emerald-100 bg-emerald-50"
              : "border-rose-100 bg-rose-50"
          }`}
        >
          <div className="text-xs font-semibold text-slate-500">Изменение</div>
          <div
            className={`mt-2 flex items-center gap-1 text-2xl font-bold ${
              positive ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            <DeltaIcon size={20} />
            {positive ? "+" : ""}
            {delta}%
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
        <ComparisonBar label="Эта неделя" value={thisWeek} accent />
        <ComparisonBar label="Прошлая неделя" value={prevWeek} />
      </div>

      <p className="text-sm leading-6 text-slate-600">
        {positive
          ? "Вовлечённость выросла. Сохраните формат занятий, который дал положительную динамику."
          : "Вовлечённость снизилась. Попробуйте добавить больше интерактива и коротких смен активности."}
      </p>
    </div>
  );
}

function MiniCompare({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "violet" | "blue";
}) {
  const styles =
    accent === "violet"
      ? "border-violet-100 bg-violet-50 text-violet-700"
      : "border-blue-100 bg-blue-50 text-blue-700";

  return (
    <div className={`rounded-2xl border p-4 ${styles}`}>
      <div className="text-xs font-semibold opacity-70">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

function ComparisonBar({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${
            accent
              ? "bg-[linear-gradient(90deg,#8b5cf6,#6d28d9)]"
              : "bg-[linear-gradient(90deg,#93c5fd,#60a5fa)]"
          }`}
          style={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

function InsightCard({
  icon,
  title,
  text,
  accent,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  accent: "violet" | "rose" | "emerald";
}) {
  const tones = {
    violet: "border-violet-100 bg-violet-50/60 text-violet-600",
    rose: "border-rose-100 bg-rose-50/60 text-rose-600",
    emerald: "border-emerald-100 bg-emerald-50/60 text-emerald-600",
  };

  return (
    <article className={`rounded-2xl border p-5 ${tones[accent]}`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
        {icon}
      </div>
      <h3 className="mt-4 font-bold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </article>
  );
}

function ChartSkeleton() {
  return <div className="h-[235px] animate-pulse rounded-2xl bg-slate-100" />;
}

function EmptyChart() {
  return (
    <div className="flex h-[235px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center">
      <BrainCircuit size={30} className="text-slate-300" />
      <div className="mt-3 font-semibold text-slate-600">Недостаточно данных</div>
      <div className="mt-1 text-xs text-slate-400">
        Данные появятся после нескольких проанализированных сессий
      </div>
    </div>
  );
}

function toPercent(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  const normalized = Math.abs(value) <= 1 ? value * 100 : value;
  return Math.round(normalized * 10) / 10;
}

function toPercentDelta(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  const normalized = Math.abs(value) <= 1 ? value * 100 : value;
  return Math.round(normalized * 10) / 10;
}
