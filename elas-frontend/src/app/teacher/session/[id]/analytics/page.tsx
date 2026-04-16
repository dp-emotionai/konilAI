"use client";

import { useState } from "react";
import useSWR from "swr";
import { useParams } from "next/navigation";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import PageHero from "@/components/common/PageHero";
import Reveal from "@/components/common/Reveal";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { TeacherSessionTabs } from "@/components/session/TeacherSessionTabs";
import { AnalyticsStates } from "@/components/analytics/AnalyticsStates";
import {
  fetchSessionAnalytics,
  exportSessionReport,
  type SessionAnalytics,
} from "@/lib/api/analytics";
import { FileJson, FileSpreadsheet, FileText } from "lucide-react";

const sessionAnalyticsKey = (id: string) => `analytics-session-${id}`;

function Kpi({
  title,
  value,
  hint,
  loading,
}: {
  title: string;
  value: string;
  hint: string;
  loading?: boolean;
}) {
  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardContent className="p-6 md:p-8">
        <div className="text-sm font-medium uppercase tracking-wider text-muted">
          {title}
        </div>
        <div className="mt-2 text-3xl font-bold tracking-tight text-fg md:text-4xl">
          {loading ? "…" : value}
        </div>
        <div className="mt-2 text-sm text-muted">{hint}</div>
      </CardContent>
    </Card>
  );
}

const ENGAGEMENT_COLOR = "rgb(var(--primary))";
const STRESS_COLOR = "rgb(239, 68, 68)";

function TimelineChart({ data }: { data: SessionAnalytics["timeline"] }) {
  if (!data?.length) {
    return (
      <Card variant="elevated" className="overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <div className="text-sm font-medium uppercase tracking-wider text-muted">
            Engagement over time
          </div>
          <div className="mt-4 flex h-52 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-surface-subtle/30 text-sm text-muted dark:border-white/10 dark:bg-white/5">
            Нет точек таймлайна для этой сессии.
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((p) => ({
    time: p.timeSec,
    engagement: p.engagement,
    stress: p.stress ?? 0,
    risk: p.risk ?? 0,
    name: `${Math.floor(p.timeSec / 60)} мин`,
  }));

  const hasStress = chartData.some((d) => Number(d.stress) > 0);

  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardContent className="p-6 md:p-8">
        <div className="mb-4 text-sm font-medium uppercase tracking-wider text-muted">
          Вовлечённость и стресс по времени
        </div>
        <div className="mt-4 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
              />
              <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 10 }} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  background: "rgba(20,20,35,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                }}
                labelStyle={{ color: "rgba(255,255,255,0.85)" }}
                formatter={(value: unknown, name) => {
                  const key = typeof name === "string" ? name : "";
                  return [
                    `${typeof value === "number" ? value : 0}%`,
                    key === "engagement"
                      ? "Вовлечённость"
                      : key === "stress"
                        ? "Стресс"
                        : "Риск",
                  ];
                }}
              />
              <Area
                type="monotone"
                dataKey="engagement"
                stroke={ENGAGEMENT_COLOR}
                fill={ENGAGEMENT_COLOR}
                fillOpacity={0.3}
                strokeWidth={2}
                name="engagement"
              />
              {hasStress && (
                <Area
                  type="monotone"
                  dataKey="stress"
                  stroke={STRESS_COLOR}
                  fill={STRESS_COLOR}
                  fillOpacity={0.2}
                  strokeWidth={2}
                  name="stress"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function AiSummaryCard({ text }: { text: string }) {
  return (
    <Card className="overflow-hidden border-[rgb(var(--primary))]/20 bg-primary-muted/10">
      <CardContent className="p-6">
        <div className="text-sm font-medium text-[rgb(var(--primary))]">AI Summary</div>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-fg">
          {text}
        </p>
      </CardContent>
    </Card>
  );
}

function ParticipantCard({
  name,
  emotion,
  engagement,
  stress,
  fatigue,
  risk,
  confidence,
}: {
  name: string;
  emotion?: string;
  engagement?: number;
  stress?: number;
  fatigue?: number;
  risk?: number;
  confidence?: number;
}) {
  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardContent className="space-y-3 p-5">
        <div className="text-base font-semibold text-fg">{name}</div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{emotion ?? "—"}</Badge>
          {typeof confidence === "number" && (
            <Badge variant="secondary">Confidence {confidence}%</Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-surface-subtle px-3 py-2">
            Engagement: {typeof engagement === "number" ? `${engagement}%` : "—"}
          </div>
          <div className="rounded-xl bg-surface-subtle px-3 py-2">
            Stress: {typeof stress === "number" ? `${stress}%` : "—"}
          </div>
          <div className="rounded-xl bg-surface-subtle px-3 py-2">
            Fatigue: {typeof fatigue === "number" ? `${fatigue}%` : "—"}
          </div>
          <div className="rounded-xl bg-surface-subtle px-3 py-2">
            Risk: {typeof risk === "number" ? `${risk}%` : "—"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TeacherLectureAnalyticsPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id ?? "";
  const [tab, setTab] = useState<"overview" | "timeline" | "insights" | "participants">(
    "overview"
  );
  const [exporting, setExporting] = useState<"json" | "csv" | "pdf" | null>(null);

  const {
    data: analytics,
    error,
    isLoading,
    mutate,
  } = useSWR(
    sessionId ? sessionAnalyticsKey(sessionId) : null,
    () => fetchSessionAnalytics(sessionId),
    { revalidateOnFocus: false }
  );

  const handleExport = async (format: "json" | "csv" | "pdf") => {
    if (!sessionId || exporting) return;
    setExporting(format);
    try {
      await exportSessionReport(sessionId, format);
    } finally {
      setExporting(null);
    }
  };

  const loading = isLoading;
  const hasError = Boolean(error);
  const empty = !loading && !hasError && !analytics;

  return (
    <div className="space-y-6">
      <PageHero
        overline="Teacher • Lecture analytics"
        title="Аналитика сессии"
        subtitle={
          analytics
            ? "Сводка по вовлечённости и вниманию на основе собранных метрик."
            : "Пока по этой сессии нет агрегированных данных."
        }
        right={
          <div className="flex flex-wrap items-center gap-2">
            {analytics ? (
              <Badge variant="success" className="gap-1">
                Данные загружены
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                Нет данных
              </Badge>
            )}

            {sessionId && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!!exporting}
                  onClick={() => handleExport("json")}
                  className="gap-1.5"
                  aria-label="Скачать JSON"
                >
                  <FileJson size={14} />
                  {exporting === "json" ? "…" : "JSON"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!!exporting}
                  onClick={() => handleExport("csv")}
                  className="gap-1.5"
                  aria-label="Скачать CSV"
                >
                  <FileSpreadsheet size={14} />
                  {exporting === "csv" ? "…" : "CSV"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!!exporting}
                  onClick={() => handleExport("pdf")}
                  className="gap-1.5"
                  aria-label="Скачать PDF"
                >
                  <FileText size={14} />
                  {exporting === "pdf" ? "…" : "PDF"}
                </Button>
              </div>
            )}
          </div>
        }
      />

      <TeacherSessionTabs sessionId={sessionId} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-2xl bg-surface-subtle p-1 dark:bg-white/10">
          {[
            { id: "overview", label: "Обзор" },
            { id: "timeline", label: "Таймлайн" },
            { id: "participants", label: "Участники" },
            { id: "insights", label: "Инсайты" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as typeof tab)}
              className={cn(
                "rounded-2xl px-3 py-1.5 text-xs font-medium transition",
                tab === t.id
                  ? "bg-surface text-fg shadow-soft dark:bg-white/20 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.25)]"
                  : "text-muted hover:text-fg"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted">КПИ, графики и рекомендации.</span>
      </div>

      <AnalyticsStates
        loading={loading}
        error={hasError}
        empty={empty}
        onRetry={() => mutate()}
        emptyTitle="Нет данных по сессии"
        emptyDescription="Запустите сессию и соберите метрики — аналитика появится здесь."
      >
        {analytics && (
          <>
            {tab === "overview" && (
              <div className="grid gap-4 lg:grid-cols-3">
                <Reveal>
                  <Kpi
                    title="Средняя вовлечённость"
                    value={`${analytics.averageEngagement}%`}
                    hint="Среднее по сессии"
                    loading={loading}
                  />
                </Reveal>
                <Reveal>
                  <Kpi
                    title="События стресса"
                    value={String(analytics.stressEvents)}
                    hint="Зафиксированные пики"
                    loading={loading}
                  />
                </Reveal>
                <Reveal>
                  <Kpi
                    title="Провалы внимания"
                    value={String(analytics.attentionDrops)}
                    hint="Снижения фокуса"
                    loading={loading}
                  />
                </Reveal>
              </div>
            )}

            {tab === "timeline" && (
              <div className="grid gap-4 lg:grid-cols-2">
                <Reveal>
                  <TimelineChart data={analytics.timeline} />
                </Reveal>
              </div>
            )}

            {tab === "participants" && (
              <div className="grid gap-4 md:grid-cols-2">
                {analytics.participants && analytics.participants.length > 0 ? (
                  analytics.participants.map((p) => (
                    <Reveal key={p.userId}>
                      <ParticipantCard
                        name={p.name}
                        emotion={p.dominantEmotion ?? p.emotion}
                        engagement={p.engagement}
                        stress={p.stress}
                        fatigue={p.fatigue}
                        risk={p.risk}
                        confidence={p.confidence}
                      />
                    </Reveal>
                  ))
                ) : (
                  <Card variant="elevated">
                    <CardContent className="p-6 text-center text-muted md:p-8">
                      Поучастниковая аналитика пока недоступна для этой сессии.
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {tab === "insights" && (
              <Reveal>
                <Card variant="elevated">
                  <CardContent className="p-6 md:p-8">
                    <div className="text-sm font-medium uppercase tracking-wider text-muted">
                      Рекомендации
                    </div>
                    <div className="mt-2 text-lg font-semibold text-fg">
                      На основе агрегированных метрик вовлечённости и риска.
                    </div>
                    <div className="mt-2 text-sm text-muted">
                      Используйте таймлайн и KPI выше для точечной настройки формата занятий.
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => mutate()}
                    >
                      Обновить данные
                    </Button>
                  </CardContent>
                </Card>
              </Reveal>
            )}

            {analytics.aiSummary != null && analytics.aiSummary !== "" && (
              <Reveal className="mt-6">
                <AiSummaryCard text={analytics.aiSummary} />
              </Reveal>
            )}
          </>
        )}
      </AnalyticsStates>
    </div>
  );
}