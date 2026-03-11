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
    <Card className="p-6 md:p-7">
      <div className="text-sm text-white/60">{title}</div>
      <div className="mt-2 text-3xl font-semibold">{loading ? "…" : value}</div>
      <div className="mt-2 text-sm text-white/50">{hint}</div>
    </Card>
  );
}

function TimelineChart({ data }: { data: SessionAnalytics["timeline"] }) {
  if (!data?.length) {
    return (
      <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
        <div className="text-sm text-white/60">Engagement over time</div>
        <div className="mt-4 h-44 rounded-2xl border border-white/10 bg-surface-subtle/30 flex items-center justify-center text-white/50 text-sm">
          Нет точек таймлайна для этой сессии.
        </div>
      </div>
    );
  }
  const chartData = data.map((p) => ({
    time: p.timeSec,
    engagement: p.engagement,
    stress: p.stress ?? 0,
    name: `${Math.floor(p.timeSec / 60)} мин`,
  }));
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
      <div className="text-sm text-white/60">Вовлечённость по времени</div>
      <div className="mt-4 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} />
            <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }} domain={[0, 100]} />
            <Tooltip
              contentStyle={{ background: "rgba(20,20,30,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }}
              labelStyle={{ color: "rgba(255,255,255,0.7)" }}
              formatter={(value: unknown) => [`${typeof value === "number" ? value : 0}%`, "Вовлечённость"]}
            />
            <Area type="monotone" dataKey="engagement" stroke="rgb(var(--primary))" fill="rgb(var(--primary))" fillOpacity={0.3} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function AiSummaryCard({ text }: { text: string }) {
  return (
    <Card className="overflow-hidden border-[rgb(var(--primary))]/20 bg-primary-muted/10">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-[rgb(var(--primary))]">
          AI Summary
        </div>
        <p className="mt-3 text-sm leading-relaxed text-fg whitespace-pre-wrap">{text}</p>
      </CardContent>
    </Card>
  );
}

export default function TeacherLectureAnalyticsPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id ?? "";
  const [tab, setTab] = useState<"overview" | "timeline" | "insights">("overview");
  const [exporting, setExporting] = useState<"json" | "csv" | "pdf" | null>(null);

  const { data: analytics, error, isLoading, mutate } = useSWR(
    sessionId ? sessionAnalyticsKey(sessionId) : null,
    () => fetchSessionAnalytics(sessionId),
    { revalidateOnFocus: false }
  );

  const handleExport = async (format: "json" | "csv" | "pdf") => {
    if (!sessionId || exporting) return;
    setExporting(format);
    try {
      await exportSessionReport(sessionId, format);
    } catch {
      // Could add toast
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
        <div className="inline-flex items-center gap-1 rounded-2xl bg-white/5 p-1">
          {[
            { id: "overview", label: "Обзор" },
            { id: "timeline", label: "Таймлайн" },
            { id: "insights", label: "Инсайты" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as typeof tab)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-2xl transition",
                tab === t.id
                  ? "bg-white/20 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.25)]"
                  : "text-white/60 hover:text-white"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-white/45">КПИ, графики и рекомендации.</span>
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
              <div className="grid lg:grid-cols-3 gap-4">
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

            {tab === "timeline" && analytics.timeline?.length > 0 && (
              <div className="grid lg:grid-cols-2 gap-4">
                <Reveal>
                  <TimelineChart data={analytics.timeline} />
                </Reveal>
              </div>
            )}

            {tab === "timeline" && (!analytics.timeline || analytics.timeline.length === 0) && (
              <div className="rounded-2xl border border-white/10 bg-black/25 p-6 text-center text-white/60">
                Нет точек таймлайна для отображения.
              </div>
            )}

            {tab === "insights" && (
              <Reveal>
                <Card className="p-6 md:p-7">
                  <div className="text-sm text-white/60">Рекомендации</div>
                  <div className="mt-2 text-lg font-semibold">
                    На основе агрегированных метрик вовлечённости и риска.
                  </div>
                  <div className="mt-2 text-sm text-white/60">
                    Используйте таймлайн и КПИ выше для точечной настройки формата занятий.
                  </div>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => mutate()}>
                    Обновить данные
                  </Button>
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
