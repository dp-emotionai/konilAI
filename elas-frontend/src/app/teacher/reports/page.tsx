"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
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
  Clock3,
  FileJson,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Radio,
  Search,
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
          ? "bg-white text-[#7448FF] shadow-[0_8px_24px_rgba(116,72,255,0.12)] ring-1 ring-[#7448FF]/15"
          : "text-slate-500 hover:bg-white hover:text-slate-900"
      )}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return (
      <Badge className="rounded-xl bg-emerald-50 px-3 py-1.5 text-emerald-600 ring-1 ring-emerald-200">
        Live
      </Badge>
    );
  }

  if (status === "finished") {
    return (
      <Badge className="rounded-xl bg-slate-100 px-3 py-1.5 text-slate-600 ring-1 ring-slate-200">
        Завершена
      </Badge>
    );
  }

  return (
    <Badge className="rounded-xl bg-amber-50 px-3 py-1.5 text-amber-600 ring-1 ring-amber-200">
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
        "rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]",
        accent
          ? "border-purple-200"
          : "border-slate-200"
      )}
    >
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{value}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <GlassCard className="rounded-[28px] border border-slate-200 bg-white p-12 text-center shadow-[0_18px_55px_rgba(15,23,42,0.05)]">
      <div className="text-xl font-semibold text-slate-900">Отчётов пока нет</div>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Проведите сессию или дождитесь первых live-данных, и здесь появятся
        реальные аналитические карточки.
      </p>
    </GlassCard>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-[520px] animate-pulse rounded-[28px] bg-slate-100"
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
  const fromSec = point.fromSec ?? point.timeSec;
  const explicitToSec = point.toSec;
  const fallbackToSec = nextPoint?.fromSec ?? nextPoint?.timeSec;
  const toSec =
    typeof explicitToSec === "number" ? explicitToSec : fallbackToSec;

  const from = formatClockFromSec(fromSec);
  if (typeof toSec !== "number" || toSec <= fromSec) return `с ${from}`;
  return `${from}–${formatClockFromSec(toSec)}`;
}

function buildTimelineHighlights(analytics: SessionAnalytics) {
  return analytics.timeline.slice(0, 6).map((point, index, array) => {
    const bits = [`вовлечённость ${point.engagement}%`];
    if (typeof point.stress === "number") bits.push(`стресс ${point.stress}%`);
    if (typeof point.risk === "number") bits.push(`риск ${point.risk}%`);

    return {
      id: `${point.fromSec ?? point.timeSec}-${point.toSec ?? index}`,
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
    return "Подробная аналитика ещё не сформирована backend. Показаны только доступные метаданные сессии.";
  }

  if (analytics.aiSummary) return analytics.aiSummary;

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
          try {
            const analytics = await fetchSessionAnalytics(row.id);
            return [row.id, analytics] as const;
          } catch {
            return [row.id, null] as const;
          }
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
    <main className="min-h-[calc(100vh-72px)] bg-gradient-to-b from-[#F8F6FF] via-white to-slate-50">
      <div className="mx-auto w-full max-w-[1440px] px-6 py-10 lg:px-10">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-[38px] font-semibold tracking-[-0.03em] text-slate-950">
              Отчёты
            </h1>
            <p className="mt-3 max-w-[620px] text-[16px] leading-7 text-slate-500">
              Сводка по live-сессиям и завершённым занятиям с реальными
              участниками, таймлайном и экспортом.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-purple-200 bg-white px-4 py-2.5 text-sm font-medium text-[#7448FF] shadow-sm">
              {filtered.length} сессий
            </div>
            <Button
              variant="outline"
              onClick={loadReports}
              className="h-11 gap-2 rounded-xl border-slate-200 bg-white px-5 shadow-sm"
            >
              <RefreshCw size={16} />
              Обновить
            </Button>
          </div>
        </header>

        <section className="mt-10 rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_12px_40px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-[620px]">
              <Search
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Поиск по названию, группе, коду..."
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#7448FF] focus:ring-4 focus:ring-purple-100"
              />
            </div>

            <div className="inline-flex w-fit items-center rounded-full border border-slate-200 bg-slate-50 p-1">
              <TabButton active={tab === "all"} onClick={() => setTab("all")}>
                Все {counts.all ? `(${counts.all})` : ""}
              </TabButton>
              <TabButton active={tab === "live"} onClick={() => setTab("live")}>
                Live {counts.live ? `(${counts.live})` : ""}
              </TabButton>
              <TabButton
                active={tab === "finished"}
                onClick={() => setTab("finished")}
              >
                Завершённые
              </TabButton>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={loadReports}>
                Повторить
              </Button>
            </div>
          )}

          {exportError && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <AlertCircle size={16} />
              {exportError}
            </div>
          )}
        </section>

        <section className="mt-6">
          {loading ? (
            <LoadingGrid />
          ) : filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-6">
              {filtered.map((row) => {
                const live = liveCache[row.id];
                const analytics = analyticsCache[row.id] ?? null;
                const timelineHighlights = analytics
                  ? buildTimelineHighlights(analytics)
                  : [];
                const exportState = exporting[row.id] ?? null;
                const canExport = row.status === "finished";

                return (
                  <article
                    key={row.id}
                    className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.06)]"
                  >
                    <div className="p-6 md:p-8">
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 items-start gap-5">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] border border-purple-200 bg-purple-50 text-[#7448FF]">
                            <Activity size={30} />
                          </div>

                          <div className="min-w-0">
                            <h2 className="truncate text-[28px] font-semibold tracking-[-0.02em] text-slate-950">
                              {row.title}
                            </h2>
                            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                              <span className="inline-flex items-center gap-1.5">
                                <Users size={15} />
                                {row.groupName}
                              </span>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1.5">
                                <Clock3 size={15} />
                                {formatDateTime(row.startedAt || row.createdAt)}
                              </span>
                              <span>•</span>
                              <span>{row.code}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={row.status} />
                          <Badge className="rounded-xl border border-purple-200 bg-white px-3 py-1.5 text-sm font-medium text-[#7448FF]">
                            {row.type}
                          </Badge>
                        </div>
                      </div>

                      <p className="mt-5 text-[15px] leading-7 text-slate-600">
                        {buildSessionStory(row, analytics, live)}
                      </p>

                      <div className="mt-5 grid gap-4 md:grid-cols-3">
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
                              value={
                                analytics
                                  ? `${analytics.averageEngagement}%`
                                  : "—"
                              }
                              accent
                            />
                            <MetricPill
                              label="Стресс-события"
                              value={
                                analytics
                                  ? String(analytics.stressEvents)
                                  : "—"
                              }
                            />
                            <MetricPill
                              label="Длительность"
                              value={formatMinutes(analytics?.durationMinutes)}
                            />
                          </>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 p-6 md:p-8">
                      <div className="mb-5 rounded-2xl border border-purple-100 bg-purple-50/50 px-4 py-3 text-sm leading-6 text-slate-600">
                        Блоки ниже строятся только из ответов backend: live metrics для активной сессии и timeline buckets для завершённой.
                      </div>
                      <div className="grid gap-5 lg:grid-cols-2">
                        <div className="rounded-[20px] border border-slate-200 bg-white p-5">
                          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-800">
                            {row.status === "active" ? (
                              <Radio size={16} />
                            ) : (
                              <Clock3 size={16} />
                            )}
                            {row.status === "active"
                              ? "Состояние сейчас"
                              : "Ход сессии"}
                          </div>

                          {row.status === "active" ? (
                            live && live.participants.length > 0 ? (
                              <div className="space-y-2">
                                {live.participants
                                  .slice(0, 4)
                                  .map((participant) => (
                                    <div
                                      key={participant.userId}
                                      className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3"
                                    >
                                      <div className="font-medium text-slate-900">
                                        {participant.fullName}
                                      </div>
                                      <div className="mt-1 text-sm text-slate-500">
                                        {formatEmotionLabel(
                                          participant.dominant_emotion ||
                                            participant.emotion
                                        )}{" "}
                                        • риск {Math.round(participant.risk)}% •
                                        уверенность{" "}
                                        {Math.round(participant.confidence)}%
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <div className="text-sm leading-6 text-slate-500">
                                Участники подключены, но live-модель ещё не
                                вернула свежие персональные метрики.
                              </div>
                            )
                          ) : timelineHighlights.length > 0 ? (
                            <div className="space-y-2">
                              {timelineHighlights.map((item) => (
                                <div
                                  key={item.id}
                                  className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3"
                                >
                                  <div className="text-sm font-medium text-slate-900">
                                    {item.window}
                                  </div>
                                  <div className="mt-1 text-sm text-slate-500">
                                    {item.description}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-sm leading-6 text-slate-500">
                              Сервер пока не вернул временные buckets для этой сессии.
                            </div>
                          )}
                        </div>

                        <div className="rounded-[20px] border border-slate-200 bg-white p-5">
                          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-800">
                            <Users size={16} />
                            Участники и эмоции
                          </div>

                          {row.status === "active" && live?.participants?.length ? (
                            <div className="space-y-2">
                              {live.participants
                                .slice(0, 4)
                                .map((participant) => (
                                  <div
                                    key={participant.userId}
                                    className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3"
                                  >
                                    <div className="font-medium text-slate-900">
                                      {participant.fullName}
                                    </div>
                                    <div className="mt-1 text-sm text-slate-500">
                                      {formatEmotionLabel(
                                        participant.dominant_emotion ||
                                          participant.emotion
                                      )}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <div className="text-sm leading-6 text-slate-500">
                              {row.status === "finished"
                                ? "Текущий endpoint завершённой аналитики не возвращает персональные данные участников. Здесь не подставляются демонстрационные значения."
                                : "Live-метрики участников пока не поступили."}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 flex flex-col gap-4 border-t border-slate-100 pt-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex flex-wrap gap-3">
                          <Link href={`/teacher/session/${row.id}/analytics`}>
                            <Button className="h-11 gap-2 rounded-xl bg-gradient-to-r from-[#6D3DF5] to-[#7C4DFF] px-6 shadow-[0_12px_30px_rgba(116,72,255,0.22)]">
                              <Activity size={16} />
                              Открыть аналитику
                            </Button>
                          </Link>

                          <Link href={`/teacher/session/${row.id}`}>
                            <Button
                              variant="outline"
                              className="h-11 rounded-xl border-slate-200 bg-white px-6"
                            >
                              Открыть монитор
                            </Button>
                          </Link>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-sm font-medium text-slate-600">
                            Экспорт
                          </span>

                          {!canExport && (
                            <Badge className="rounded-xl bg-purple-50 px-3 py-1.5 text-xs font-medium text-[#7448FF]">
                              Доступен после завершения
                            </Badge>
                          )}

                          {(["json", "csv", "pdf"] as const).map((format) => {
                            const Icon =
                              format === "json"
                                ? FileJson
                                : format === "csv"
                                  ? FileSpreadsheet
                                  : FileText;

                            return (
                              <Button
                                key={format}
                                size="sm"
                                variant="outline"
                                className="h-10 gap-2 rounded-xl border-slate-200 bg-white px-4"
                                onClick={() => handleExport(row.id, format)}
                                disabled={!canExport || exportState !== null}
                              >
                                {exportState === format ? (
                                  <RefreshCw
                                    size={14}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Icon size={14} />
                                )}
                                {format.toUpperCase()}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );}
