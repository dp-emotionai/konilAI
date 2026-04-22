"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import PageHero from "@/components/common/PageHero";
import Reveal from "@/components/common/Reveal";
import Section from "@/components/common/Section";
import GlassCard from "@/components/ui/GlassCard";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Glow from "@/components/common/Glow";
import { cn } from "@/lib/cn";
import {
  getTeacherSessionsAsReports,
  getLiveMetrics,
  type ReportRow,
  type LiveMetrics,
} from "@/lib/api/reports";
import {
  exportSessionReport,
  fetchSessionAnalytics,
  type SessionAnalytics,
} from "@/lib/api/analytics";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Clock3,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Radio,
  Search,
  Sparkles,
  Users,
} from "lucide-react";

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-2 text-sm transition",
        active
          ? "bg-surface text-fg shadow-soft"
          : "text-muted hover:bg-surface-subtle hover:text-fg"
      )}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <Badge className="bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-400/20">
        Live
      </Badge>
    );
  }

  if (status === "finished") {
    return (
      <Badge className="bg-surface-subtle text-muted ring-1 ring-[color:var(--border)]/25">
        Завершена
      </Badge>
    );
  }

  return (
    <Badge className="bg-amber-500/10 text-amber-700 ring-1 ring-amber-400/20">
      Черновик
    </Badge>
  );
}

function MetricPill({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl p-3 ring-1",
        accent
          ? "bg-primary/10 ring-[rgb(var(--primary))]/20"
          : "bg-surface-subtle ring-[color:var(--border)]/20"
      )}
    >
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold text-fg">{value}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <GlassCard className="p-10 text-center">
      <div className="text-lg font-semibold text-fg">Отчётов пока нет</div>
      <p className="mt-2 text-sm text-muted">
        Проведите сессию или дождитесь первых live-данных, и здесь появятся
        реальные аналитические карточки.
      </p>
    </GlassCard>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-[320px] animate-pulse rounded-elas-lg bg-surface-subtle"
        />
      ))}
    </div>
  );
}

function formatDateTime(value?: string | null) {
  if (!value) return "Время не указано";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Время не указано";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMinutes(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) return "—";
  return `${Math.round(value)} мин`;
}

function formatEmotionLabel(value?: string | null) {
  if (!value) return "не определено";

  const normalized = value.toLowerCase();
  const map: Record<string, string> = {
    happy: "спокойная вовлечённость",
    neutral: "нейтральное состояние",
    sad: "снижение тонуса",
    angry: "напряжение",
    fear: "тревожность",
    surprise: "пиковая реакция",
    disgust: "дискомфорт",
  };

  return map[normalized] ?? value;
}

function formatClockFromSec(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function formatTimelineWindow(
  point: SessionAnalytics["timeline"][number],
  nextPoint?: SessionAnalytics["timeline"][number]
) {
  const from = formatClockFromSec(point.timeSec);
  const to = nextPoint ? formatClockFromSec(nextPoint.timeSec) : null;
  return to ? `${from}–${to}` : `с ${from}`;
}

function buildTimelineHighlights(analytics: SessionAnalytics) {
  return analytics.timeline.slice(0, 4).map((point, index, array) => {
    const bits = [`вовлечённость ${point.engagement}%`];
    if (typeof point.stress === "number") bits.push(`стресс ${point.stress}%`);
    if (typeof point.risk === "number") bits.push(`риск ${point.risk}%`);

    return {
      id: `${point.timeSec}-${index}`,
      window: formatTimelineWindow(point, array[index + 1]),
      description: bits.join(" • "),
    };
  });
}

function buildSessionStory(
  row: ReportRow,
  analytics: SessionAnalytics | null,
  live: LiveMetrics | undefined
) {
  if (row.status === "active" && live) {
    const leader = live.participants[0];
    if (!leader) {
      return "Сессия идёт, но участники ещё не дали достаточно свежих ML-данных для краткого summary.";
    }

    return `${leader.fullName} сейчас показывает ${formatEmotionLabel(
      leader.dominant_emotion || leader.emotion
    )}, средний риск по группе держится около ${Math.round(live.avgRisk)}%.`;
  }

  if (!analytics) {
    return "Подробная аналитика ещё не сформирована backend'ом. Карточка показывает только доступные метаданные сессии.";
  }

  if (analytics.aiSummary) return analytics.aiSummary;

  const strongest = analytics.participants?.[0];
  if (strongest) {
    return `${strongest.fullName} чаще всего был в состоянии «${formatEmotionLabel(
      strongest.dominantEmotion || strongest.emotion
    )}». Средняя вовлечённость по сессии составила ${
      analytics.averageEngagement
    }%, а заметных спадов внимания было ${analytics.attentionDrops}.`;
  }

  return `Средняя вовлечённость по сессии составила ${analytics.averageEngagement}%, стрессовых событий зафиксировано ${analytics.stressEvents}, спадов внимания — ${analytics.attentionDrops}.`;
}

export default function TeacherReportsPage() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "live" | "finished">("all");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [liveCache, setLiveCache] = useState<Record<string, LiveMetrics>>({});
  const [analyticsCache, setAnalyticsCache] = useState<Record<string, SessionAnalytics | null>>({});
  const [exporting, setExporting] = useState<Record<string, "json" | "csv" | "pdf" | null>>({});
  const [exportError, setExportError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const loadReports = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    getTeacherSessionsAsReports({ signal: controller.signal })
      .then(setRows)
      .catch((err) => {
        if (controller.signal.aborted) return;
        setRows([]);
        setError(err?.message ?? "Не удалось загрузить список сессий.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadReports();
    return () => abortRef.current?.abort();
  }, [loadReports]);

  useEffect(() => {
    const activeRows = rows.filter((row) => row.status === "active");
    if (activeRows.length === 0) return;

    let cancelled = false;

    void Promise.all(
      activeRows
        .filter((row) => !liveCache[row.id])
        .map(async (row) => {
          try {
            const metrics = await getLiveMetrics(row.id);
            return [row.id, metrics] as const;
          } catch {
            return null;
          }
        })
    ).then((entries) => {
      if (cancelled) return;
      const next: Record<string, LiveMetrics> = {};
      for (const entry of entries) {
        if (entry) next[entry[0]] = entry[1];
      }
      if (Object.keys(next).length > 0) {
        setLiveCache((prev) => ({ ...prev, ...next }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [rows, liveCache]);

  useEffect(() => {
    const finishedRows = rows.filter((row) => row.status === "finished");
    if (finishedRows.length === 0) return;

    let cancelled = false;

    void Promise.all(
      finishedRows
        .filter((row) => !(row.id in analyticsCache))
        .map(async (row) => {
          const analytics = await fetchSessionAnalytics(row.id);
          return [row.id, analytics] as const;
        })
    ).then((entries) => {
      if (cancelled) return;
      const next: Record<string, SessionAnalytics | null> = {};
      for (const [sessionId, analytics] of entries) {
        next[sessionId] = analytics;
      }
      if (Object.keys(next).length > 0) {
        setAnalyticsCache((prev) => ({ ...prev, ...next }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [rows, analyticsCache]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    const base =
      tab === "live"
        ? rows.filter((row) => row.status === "active")
        : tab === "finished"
          ? rows.filter((row) => row.status === "finished")
          : rows;

    if (!search) return base;

    return base.filter((row) =>
      [
        row.id,
        row.title,
        row.groupName,
        row.code,
        row.status,
        row.type,
        row.teacher,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search)
    );
  }, [query, rows, tab]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      live: rows.filter((row) => row.status === "active").length,
      finished: rows.filter((row) => row.status === "finished").length,
    }),
    [rows]
  );

  async function handleExport(sessionId: string, format: "json" | "csv" | "pdf") {
    setExportError(null);
    setExporting((prev) => ({ ...prev, [sessionId]: format }));

    try {
      await exportSessionReport(sessionId, format);
    } catch (error) {
      setExportError(
        error instanceof Error
          ? error.message
          : "Не удалось скачать отчёт. Проверьте backend export route."
      );
    } finally {
      setExporting((prev) => ({ ...prev, [sessionId]: null }));
    }
  }

  return (
    <div className="relative pb-16">
      <Glow />

      <PageHero
        title="Отчёты"
        subtitle="Сводка по live-сессиям и завершённым занятиям с реальными участниками, таймлайном и экспортом."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary/10 text-[rgb(var(--primary))]">
              {filtered.length} сессий
            </Badge>
            <Button variant="outline" className="gap-2" onClick={loadReports}>
              <RefreshCw size={14} />
              Обновить
            </Button>
          </div>
        }
      />

      <Section spacing="normal" className="mt-10 space-y-6">
        <Reveal>
          <GlassCard className="p-6 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-[260px] flex-1">
                <div className="relative">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                  />
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Поиск по названию, группе, коду…"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="inline-flex items-center gap-1 rounded-full bg-surface-subtle p-1 shadow-soft">
                <TabButton active={tab === "all"} onClick={() => setTab("all")}>
                  Все {counts.all ? `(${counts.all})` : ""}
                </TabButton>
                <TabButton active={tab === "live"} onClick={() => setTab("live")}>
                  Live {counts.live ? `(${counts.live})` : ""}
                </TabButton>
                <TabButton active={tab === "finished"} onClick={() => setTab("finished")}>
                  Завершённые {counts.finished ? `(${counts.finished})` : ""}
                </TabButton>
              </div>
            </div>

            {error && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-elas-lg bg-[rgba(255,77,109,0.10)] px-4 py-3 text-sm text-fg shadow-soft">
                <span>{error}</span>
                <Button variant="outline" size="sm" onClick={loadReports}>
                  Повторить
                </Button>
              </div>
            )}

            {exportError && (
              <div className="mt-4 flex items-center gap-2 rounded-elas-lg bg-amber-500/10 px-4 py-3 text-sm text-fg ring-1 ring-amber-400/20">
                <AlertCircle size={16} className="text-amber-600" />
                {exportError}
              </div>
            )}
          </GlassCard>
        </Reveal>

        <Reveal>
          {loading ? (
            <LoadingGrid />
          ) : filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filtered.map((row) => {
                const live = liveCache[row.id];
                const analytics = analyticsCache[row.id] ?? null;
                const timelineHighlights = analytics ? buildTimelineHighlights(analytics) : [];
                const exportState = exporting[row.id] ?? null;
                const canExport = row.status === "finished";

                return (
                  <GlassCard key={row.id} className="overflow-hidden p-0">
                    <div className="border-b border-[color:var(--border)]/15 bg-[linear-gradient(180deg,rgba(116,72,255,0.08),rgba(255,255,255,0))] px-6 py-6 md:px-7">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="truncate text-lg font-semibold text-fg">
                            {row.title}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                            <span>{row.groupName}</span>
                            <span>•</span>
                            <span>{formatDateTime(row.startedAt || row.createdAt)}</span>
                            <span>•</span>
                            <span>{row.code}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 justify-end">
                          <StatusBadge status={row.status} />
                          <Badge className="bg-surface-subtle">{row.type}</Badge>
                        </div>
                      </div>

                      <div className="mt-4 text-sm leading-6 text-muted">
                        {buildSessionStory(row, analytics, live)}
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        {row.status === "active" ? (
                          <>
                            <MetricPill
                              label="Участники в эфире"
                              value={live ? String(live.participants.length) : "—"}
                              accent
                            />
                            <MetricPill
                              label="Средний риск"
                              value={live ? `${Math.round(live.avgRisk)}%` : "—"}
                            />
                            <MetricPill
                              label="Уверенность модели"
                              value={live ? `${Math.round(live.avgConfidence)}%` : "—"}
                            />
                          </>
                        ) : (
                          <>
                            <MetricPill
                              label="Средняя вовлечённость"
                              value={analytics ? `${analytics.averageEngagement}%` : "—"}
                              accent
                            />
                            <MetricPill
                              label="Стресс-события"
                              value={analytics ? String(analytics.stressEvents) : "—"}
                            />
                            <MetricPill
                              label="Длительность"
                              value={formatMinutes(analytics?.durationMinutes)}
                            />
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-5 px-6 py-6 md:px-7">
                      <div className="grid gap-5 lg:grid-cols-[1.2fr,0.8fr]">
                        <div className="rounded-2xl bg-surface-subtle p-4 ring-1 ring-[color:var(--border)]/20">
                          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                            {row.status === "active" ? <Radio size={14} /> : <Clock3 size={14} />}
                            {row.status === "active" ? "Состояние сейчас" : "Ход сессии"}
                          </div>

                          {row.status === "active" ? (
                            live && live.participants.length > 0 ? (
                              <div className="space-y-2">
                                {live.participants.slice(0, 4).map((participant) => (
                                  <div
                                    key={participant.userId}
                                    className="rounded-xl bg-surface px-3 py-3 text-sm ring-1 ring-[color:var(--border)]/15"
                                  >
                                    <div className="font-medium text-fg">
                                      {participant.fullName}
                                    </div>
                                    <div className="mt-1 text-muted">
                                      {formatEmotionLabel(
                                        participant.dominant_emotion || participant.emotion
                                      )}{" "}
                                      • риск {Math.round(participant.risk)}% • уверенность{" "}
                                      {Math.round(participant.confidence)}%
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-muted">
                                Участники подключены, но live-модель ещё не вернула свежие персональные метрики.
                              </div>
                            )
                          ) : timelineHighlights.length > 0 ? (
                            <div className="space-y-3">
                              {timelineHighlights.map((item) => (
                                <div
                                  key={item.id}
                                  className="rounded-xl bg-surface px-3 py-3 ring-1 ring-[color:var(--border)]/15"
                                >
                                  <div className="text-sm font-medium text-fg">
                                    {item.window}
                                  </div>
                                  <div className="mt-1 text-sm text-muted">
                                    {item.description}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted">
                              Backend пока не вернул достаточно timeline-точек, чтобы построить красивую покадровую историю этой сессии.
                            </div>
                          )}
                        </div>

                        <div className="rounded-2xl bg-surface-subtle p-4 ring-1 ring-[color:var(--border)]/20">
                          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
                            <Users size={14} />
                            Участники и эмоции
                          </div>

                          {row.status === "finished" && analytics?.participants?.length ? (
                            <div className="space-y-2">
                              {analytics.participants.slice(0, 4).map((participant) => (
                                <div
                                  key={participant.userId}
                                  className="rounded-xl bg-surface px-3 py-3 ring-1 ring-[color:var(--border)]/15"
                                >
                                  <div className="text-sm font-medium text-fg">
                                    {participant.fullName}
                                  </div>
                                  <div className="mt-1 text-sm text-muted">
                                    {formatEmotionLabel(
                                      participant.dominantEmotion || participant.emotion
                                    )}
                                  </div>
                                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
                                    {typeof participant.engagement === "number" && (
                                      <span>вовлечённость {participant.engagement}%</span>
                                    )}
                                    {typeof participant.stress === "number" && (
                                      <span>стресс {participant.stress}%</span>
                                    )}
                                    {typeof participant.risk === "number" && (
                                      <span>риск {participant.risk}%</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : row.status === "active" && live?.participants?.length ? (
                            <div className="space-y-2">
                              {live.participants.slice(0, 4).map((participant) => (
                                <div
                                  key={participant.userId}
                                  className="rounded-xl bg-surface px-3 py-3 ring-1 ring-[color:var(--border)]/15"
                                >
                                  <div className="text-sm font-medium text-fg">
                                    {participant.fullName}
                                  </div>
                                  <div className="mt-1 text-sm text-muted">
                                    {formatEmotionLabel(
                                      participant.dominant_emotion || participant.emotion
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm text-muted">
                              Персональные данные по участникам пока недоступны для этой сессии.
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/teacher/session/${row.id}/analytics`}>
                          <Button className="gap-2">
                            <Activity size={14} />
                            Открыть аналитику
                          </Button>
                        </Link>

                        <Link href={`/teacher/session/${row.id}`}>
                          <Button variant="outline">Открыть монитор</Button>
                        </Link>

                        {analytics?.quality && (
                          <Badge className="bg-primary/10 text-[rgb(var(--primary))]">
                            <Sparkles size={12} className="mr-1" />
                            quality: {analytics.quality}
                          </Badge>
                        )}
                      </div>

                      <div className="border-t border-[color:var(--border)]/20 pt-4">
                        <div className="mb-3 flex items-center gap-2">
                          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                            Экспорт
                          </div>
                          {!canExport && (
                            <Badge className="bg-surface-subtle text-muted ring-1 ring-[color:var(--border)]/20">
                              Доступен после завершения
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => handleExport(row.id, "json")}
                            disabled={!canExport || exportState !== null}
                          >
                            {exportState === "json" ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <FileJson size={14} />
                            )}
                            JSON
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => handleExport(row.id, "csv")}
                            disabled={!canExport || exportState !== null}
                          >
                            {exportState === "csv" ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <FileSpreadsheet size={14} />
                            )}
                            CSV
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            onClick={() => handleExport(row.id, "pdf")}
                            disabled={!canExport || exportState !== null}
                          >
                            {exportState === "pdf" ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <FileText size={14} />
                            )}
                            PDF
                          </Button>

                          {canExport && (
                            <Badge className="bg-primary/10 text-[rgb(var(--primary))]">
                              <Download size={12} className="mr-1" />
                              backend export route включён
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </Reveal>
      </Section>
    </div>
  );
}
