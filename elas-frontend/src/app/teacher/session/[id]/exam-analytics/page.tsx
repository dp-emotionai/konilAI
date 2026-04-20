"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import PageHero from "@/components/common/PageHero";
import Reveal from "@/components/common/Reveal";
import Section from "@/components/common/Section";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Glow from "@/components/common/Glow";
import { cn } from "@/lib/cn";
import { TeacherSessionTabs } from "@/components/session/TeacherSessionTabs";
import { AnalyticsStates } from "@/components/analytics/AnalyticsStates";
import {
  fetchSessionAnalytics,
  exportSessionReport,
  type SessionAnalytics,
} from "@/lib/api/analytics";
import { FileJson, FileSpreadsheet, FileText } from "lucide-react";

type Tone = "neutral" | "success" | "info" | "warning" | "purple";

function ToneBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-700 text-emerald-700 ring-1 ring-emerald-400/20"
      : tone === "info"
        ? "bg-sky-500/10 text-sky-700 text-sky-700 ring-1 ring-sky-400/20"
        : tone === "warning"
          ? "bg-amber-500/10 text-amber-700 text-amber-700 ring-1 ring-amber-400/20"
          : tone === "purple"
            ? "bg-purple-500/15 text-purple-200 ring-1 ring-purple-400/25"
            : "bg-surface-subtle text-zinc-200 ring-1 ring-white/10";

  return (
    <Badge
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur",
        toneClass,
        className
      )}
    >
      {children}
    </Badge>
  );
}

function MiniBar({ pct }: { pct: number }) {
  const width = Math.max(0, Math.min(100, pct));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-subtle">
      <div
        className="h-full rounded-full bg-purple-400/60"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function KpiCard({
  title,
  value,
  hint,
  tone = "neutral",
}: {
  title: string;
  value: string;
  hint: string;
  tone?: Tone;
}) {
  return (
    <GlassCard className="space-y-3 p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">{title}</p>
        <ToneBadge tone={tone}>{tone}</ToneBadge>
      </div>
      <p className="text-3xl font-semibold">{value}</p>
      <MiniBar pct={Number.parseFloat(value) || 0} />
      <p className="text-xs text-zinc-500">{hint}</p>
    </GlassCard>
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
    <GlassCard className="space-y-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-white">{name}</div>
          <div className="mt-1 flex flex-wrap gap-2">
            <ToneBadge tone="info">{emotion ?? "—"}</ToneBadge>
            {typeof confidence === "number" && (
              <ToneBadge tone="purple">Confidence {confidence}%</ToneBadge>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl border border-[color:var(--border)] bg-surface-subtle/50 p-3">
          Engagement: {typeof engagement === "number" ? `${engagement}%` : "—"}
        </div>
        <div className="rounded-2xl border border-[color:var(--border)] bg-surface-subtle/50 p-3">
          Stress: {typeof stress === "number" ? `${stress}%` : "—"}
        </div>
        <div className="rounded-2xl border border-[color:var(--border)] bg-surface-subtle/50 p-3">
          Fatigue: {typeof fatigue === "number" ? `${fatigue}%` : "—"}
        </div>
        <div className="rounded-2xl border border-[color:var(--border)] bg-surface-subtle/50 p-3">
          Risk: {typeof risk === "number" ? `${risk}%` : "—"}
        </div>
      </div>
    </GlassCard>
  );
}

function computeIntegrityScore(analytics: SessionAnalytics): number {
  const engagement = analytics.averageEngagement ?? 0;
  const stressPenalty = Math.min((analytics.stressEvents ?? 0) * 3, 25);
  const attentionPenalty = Math.min((analytics.attentionDrops ?? 0) * 4, 25);
  const score = Math.max(0, Math.min(100, engagement - stressPenalty - attentionPenalty + 20));
  return Math.round(score);
}

function computeFocusScore(analytics: SessionAnalytics): number {
  const engagement = analytics.averageEngagement ?? 0;
  const attentionPenalty = Math.min((analytics.attentionDrops ?? 0) * 5, 30);
  return Math.max(0, Math.min(100, Math.round(engagement - attentionPenalty + 10)));
}

function computeStressScore(analytics: SessionAnalytics): number {
  const stressBase = Math.min((analytics.stressEvents ?? 0) * 12, 100);
  return Math.max(0, Math.min(100, Math.round(stressBase)));
}

function getToneByScore(value: number, kind: "positive" | "negative"): Tone {
  if (kind === "positive") {
    if (value >= 85) return "success";
    if (value >= 70) return "purple";
    return "warning";
  }

  if (value <= 30) return "success";
  if (value <= 55) return "warning";
  return "warning";
}

const sessionAnalyticsKey = (id: string) => `exam-analytics-session-${id}`;

export default function ExamAnalyticsPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params?.id ?? "";

  const [group, setGroup] = useState("All students");
  const [minConfidence, setMinConfidence] = useState("60");
  const [tab, setTab] = useState<"overview" | "integrity" | "participants" | "controls">(
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

  const loading = isLoading;
  const hasError = Boolean(error);
  const empty = !loading && !hasError && !analytics;

  const minConfidenceNum = Number.parseFloat(minConfidence);
  const confidenceThreshold = Number.isFinite(minConfidenceNum)
    ? Math.max(0, Math.min(100, minConfidenceNum))
    : 60;

  const integrity = analytics ? computeIntegrityScore(analytics) : 0;
  const focus = analytics ? computeFocusScore(analytics) : 0;
  const stress = analytics ? computeStressScore(analytics) : 0;

  const toneIntegrity = getToneByScore(integrity, "positive");
  const toneFocus = getToneByScore(focus, "positive");
  const toneStress = getToneByScore(stress, "negative");

  const filteredParticipants =
    analytics?.participants?.filter((p) => {
      if (typeof p.confidence !== "number") return true;
      return p.confidence >= confidenceThreshold;
    }) ?? [];

  const flaggedCount =
    analytics?.participants?.filter((p) => {
      const riskBad = typeof p.risk === "number" && p.risk >= 60;
      const stressBad = typeof p.stress === "number" && p.stress >= 60;
      const confidenceLow =
        typeof p.confidence === "number" && p.confidence < confidenceThreshold;
      return riskBad || stressBad || confidenceLow;
    }).length ?? 0;

  const topRiskParticipant =
    analytics?.participants && analytics.participants.length > 0
      ? [...analytics.participants]
          .sort((a, b) => (b.risk ?? -1) - (a.risk ?? -1))[0]
      : null;

  const handleExport = async (format: "json" | "csv" | "pdf") => {
    if (!sessionId || exporting) return;
    setExporting(format);
    try {
      await exportSessionReport(sessionId, format);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="relative space-y-12 pb-20">
      <Glow />

      <PageHero
        overline="Teacher • Exam analytics"
        title="Экзаменационная аналитика"
        subtitle={
          analytics
            ? "Реальная аналитика экзаменационной сессии на основе собранных метрик."
            : "Пока по этой экзаменационной сессии нет агрегированных данных."
        }
        right={
          <div className="flex flex-wrap items-center gap-2">
            {analytics ? (
              <ToneBadge tone="success">Данные загружены</ToneBadge>
            ) : (
              <ToneBadge tone="neutral">Нет данных</ToneBadge>
            )}

            {sessionId && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!!exporting}
                  onClick={() => handleExport("json")}
                  className="gap-1.5"
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
                >
                  <FileText size={14} />
                  {exporting === "pdf" ? "…" : "PDF"}
                </Button>
              </div>
            )}
          </div>
        }
      />

      <Section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <ToneBadge tone="info">
              Session: {analytics?.sessionId ? analytics.sessionId.slice(0, 8) : "—"}
            </ToneBadge>
            <ToneBadge tone="purple">Real analytics</ToneBadge>
            {analytics?.quality ? (
              <ToneBadge tone="success">Quality: {analytics.quality}</ToneBadge>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[220px]">
              <Input value={group} onChange={(e) => setGroup(e.target.value)} />
            </div>
            <div className="min-w-[160px]">
              <Input
                value={minConfidence}
                onChange={(e) => setMinConfidence(e.target.value)}
                placeholder="Min confidence"
              />
            </div>
          </div>
        </div>

        <TeacherSessionTabs sessionId={sessionId} />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 rounded-2xl bg-surface-subtle/50 p-1">
            {[
              { id: "overview", label: "Overview" },
              { id: "integrity", label: "Integrity insights" },
              { id: "participants", label: "Participants" },
              { id: "controls", label: "Controls" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id as typeof tab)}
                className={cn(
                  "rounded-2xl px-3 py-1.5 text-xs font-medium transition",
                  tab === t.id
                    ? "bg-white/20 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.25)]"
                    : "text-muted hover:text-white"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted">
            Реальные KPI, участники и рекомендации по сессии.
          </span>
        </div>
      </Section>

      <Section>
        <AnalyticsStates
          loading={loading}
          error={hasError}
          empty={empty}
          onRetry={() => mutate()}
          emptyTitle="Нет данных по экзамену"
          emptyDescription="Проведите сессию и соберите метрики — аналитика появится здесь."
        >
          {analytics && (
            <>
              {tab === "overview" && (
                <div className="grid gap-6 md:grid-cols-3">
                  <Reveal>
                    <KpiCard
                      title="Integrity Score"
                      value={`${integrity}%`}
                      hint="Композитная оценка на основе вовлечённости, stress events и attention drops."
                      tone={toneIntegrity}
                    />
                  </Reveal>

                  <Reveal>
                    <KpiCard
                      title="Focus Stability"
                      value={`${focus}%`}
                      hint="Условная устойчивость внимания по общей вовлечённости и провалам внимания."
                      tone={toneFocus}
                    />
                  </Reveal>

                  <Reveal>
                    <KpiCard
                      title="Stress Level"
                      value={`${stress}%`}
                      hint="Оценка на основе количества stress events по сессии."
                      tone={toneStress}
                    />
                  </Reveal>
                </div>
              )}

              {tab === "integrity" && (
                <div className="grid gap-6 lg:grid-cols-3">
                  <Reveal>
                    <GlassCard className="p-7 lg:col-span-2">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="space-y-1">
                          <h2 className="text-xl font-semibold">Integrity Insights</h2>
                          <p className="text-sm text-zinc-400">
                            Выводы на основе реальных метрик экзаменационной сессии.
                          </p>
                        </div>
                        <ToneBadge tone="info">
                          {filteredParticipants.length || 0} participants
                        </ToneBadge>
                      </div>

                      <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-[color:var(--border)] bg-surface-subtle/50 p-5">
                          <p className="text-sm font-medium text-zinc-200">Flagged participants</p>
                          <p className="mt-2 text-3xl font-semibold">{flaggedCount}</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            Участники с высоким risk/stress или confidence ниже порога.
                          </p>
                        </div>

                        <div className="rounded-2xl border border-[color:var(--border)] bg-surface-subtle/50 p-5">
                          <p className="text-sm font-medium text-zinc-200">Top risk participant</p>
                          <p className="mt-2 text-xl font-semibold">
                            {topRiskParticipant?.name ?? "—"}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {topRiskParticipant && typeof topRiskParticipant.risk === "number"
                              ? `Risk ${topRiskParticipant.risk}%`
                              : "Недостаточно данных"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-[color:var(--border)] bg-surface-subtle/50 p-5 md:col-span-2">
                          <p className="text-sm font-medium text-zinc-200">Recommended actions</p>
                          <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                            <li className="flex gap-2">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400/70" />
                              Проверьте участников с risk ≥ 60% и confidence ниже выбранного порога.
                            </li>
                            <li className="flex gap-2">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400/70" />
                              Сверьте stress events и attention drops с таймлайном и заметками наблюдателя.
                            </li>
                            <li className="flex gap-2">
                              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400/70" />
                              Экспортируйте отчёт после проверки и приложите к документации экзамена.
                            </li>
                          </ul>
                        </div>
                      </div>
                    </GlassCard>
                  </Reveal>

                  <Reveal>
                    <GlassCard className="space-y-3 p-7">
                      <div className="space-y-1">
                        <h2 className="text-xl font-semibold">Quick snapshot</h2>
                        <p className="text-sm text-zinc-400">
                          Краткая сводка по текущей экзаменационной аналитике.
                        </p>
                      </div>

                      <p className="text-sm leading-relaxed text-zinc-300">
                        Средняя вовлечённость:{" "}
                        <span className="font-semibold text-white">
                          {analytics.averageEngagement}%
                        </span>
                        . Провалы внимания:{" "}
                        <span className="font-semibold text-white">
                          {analytics.attentionDrops}
                        </span>
                        . События стресса:{" "}
                        <span className="font-semibold text-white">
                          {analytics.stressEvents}
                        </span>
                        .
                      </p>

                      {analytics.aiSummary ? (
                        <div className="rounded-2xl border border-[color:var(--border)] bg-surface-subtle/50 p-4 text-sm leading-relaxed text-zinc-300">
                          {analytics.aiSummary}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-[color:var(--border)] bg-surface-subtle/50 p-4 text-sm text-zinc-500">
                          AI summary для этой сессии пока отсутствует.
                        </div>
                      )}
                    </GlassCard>
                  </Reveal>
                </div>
              )}

              {tab === "participants" && (
                <div className="grid gap-6 lg:grid-cols-2">
                  {filteredParticipants.length > 0 ? (
                    filteredParticipants.map((p) => (
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
                    <GlassCard className="p-7 lg:col-span-2">
                      <div className="text-sm text-zinc-400">
                        Поучастниковая аналитика недоступна или не проходит по текущему порогу confidence.
                      </div>
                    </GlassCard>
                  )}
                </div>
              )}

              {tab === "controls" && (
                <div className="grid gap-6 lg:grid-cols-3">
                  <Reveal>
                    <GlassCard className="p-7 lg:col-span-1">
                      <div className="space-y-1">
                        <h2 className="text-xl font-semibold">Controls</h2>
                        <p className="text-sm text-zinc-400">
                          Параметры фильтрации и review workflow.
                        </p>
                      </div>

                      <div className="mt-6 space-y-3">
                        <label className="flex items-center justify-between rounded-2xl border border-[color:var(--border)] bg-surface-subtle/50 p-4">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Highlight anomalies</p>
                            <p className="text-xs text-zinc-500">
                              Используйте flaggedCount и participant risk.
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            defaultChecked
                            className="h-5 w-5 accent-purple-400"
                          />
                        </label>

                        <label className="flex items-center justify-between rounded-2xl border border-[color:var(--border)] bg-surface-subtle/50 p-4">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Strict scoring</p>
                            <p className="text-xs text-zinc-500">
                              Ориентируйтесь на confidence threshold.
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            className="h-5 w-5 accent-purple-400"
                          />
                        </label>

                        <div className="rounded-2xl border border-[color:var(--border)] bg-surface-subtle/50 p-4 text-xs text-zinc-500">
                          Group: <span className="text-zinc-200">{group}</span>
                        </div>

                        <Button
                          type="button"
                          className="w-full bg-purple-500/20 text-purple-100 ring-1 ring-purple-400/25 hover:bg-purple-500/25"
                          onClick={() => handleExport("json")}
                          disabled={!!exporting}
                        >
                          Copy/export flagged data
                        </Button>

                        <Button
                          type="button"
                          className="w-full bg-surface-subtle text-zinc-100 ring-1 ring-white/10 hover:bg-white/15"
                          onClick={() => setMinConfidence("60")}
                        >
                          Reset thresholds
                        </Button>
                      </div>
                    </GlassCard>
                  </Reveal>

                  <Reveal>
                    <GlassCard className="p-7 lg:col-span-2">
                      <div className="space-y-1">
                        <h2 className="text-xl font-semibold">Review checklist</h2>
                        <p className="text-sm text-zinc-400">
                          Чеклист на основе реальных данных сессии.
                        </p>
                      </div>

                      <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                        <li className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400/70" />
                          Проверьте flagged participants: сейчас их {flaggedCount}.
                        </li>
                        <li className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400/70" />
                          Сверьте attention drops ({analytics.attentionDrops}) с хронологией экзамена.
                        </li>
                        <li className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400/70" />
                          Убедитесь, что confidence threshold ({confidenceThreshold}%) подходит для текущего набора данных.
                        </li>
                        <li className="flex gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400/70" />
                          Экспортируйте итоговый отчёт и приложите его к официальной документации экзамена.
                        </li>
                      </ul>
                    </GlassCard>
                  </Reveal>
                </div>
              )}
            </>
          )}
        </AnalyticsStates>
      </Section>
    </div>
  );
}