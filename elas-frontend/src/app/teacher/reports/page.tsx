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
import { exportSessionReport } from "@/lib/api/analytics";

import {
  Search,
  RefreshCw,
  FileJson,
  FileSpreadsheet,
  FileText,
  Activity,
  Users,
  BarChart3,
  Radio,
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
        "px-3 py-2 text-sm rounded-full transition",
        active
          ? "bg-surface shadow-soft text-fg"
          : "text-muted hover:text-fg hover:bg-surface-subtle"
      )}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "active"
      ? "bg-emerald-500/10 text-emerald-700 text-emerald-700 ring-1 ring-emerald-400/20"
      : status === "finished"
        ? "bg-surface-subtle text-muted ring-1 ring-[color:var(--border)]/25"
        : "bg-amber-500/10 text-amber-700 text-amber-700 ring-1 ring-amber-400/20";

  const label =
    status === "active" ? "live" : status === "finished" ? "finished" : "draft";

  return <Badge className={cn("shadow-soft", cls)}>{label}</Badge>;
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
      <div className="text-lg font-semibold text-fg">Нет сессий</div>
      <p className="mt-2 text-sm text-muted">
        Создайте сессию и проведите занятие — здесь появятся отчёты по реальным данным.
      </p>
    </GlassCard>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-[220px] rounded-elas-lg bg-surface-subtle animate-pulse" />
      ))}
    </div>
  );
}

export default function TeacherReportsPage() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "live" | "finished">("all");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [liveCache, setLiveCache] = useState<Record<string, LiveMetrics>>({});
  const [exporting, setExporting] = useState<Record<string, "json" | "csv" | "pdf" | null>>({});

  const acRef = useRef<AbortController | null>(null);

  const loadReports = useCallback(() => {
    acRef.current?.abort();
    const ac = new AbortController();
    acRef.current = ac;

    setLoading(true);
    setError(null);

    getTeacherSessionsAsReports({ signal: ac.signal })
      .then(setRows)
      .catch((e) => {
        if (ac.signal.aborted) return;
        setError(e?.message ?? "Не удалось загрузить сессии.");
        setRows([]);
      })
      .finally(() => {
        if (ac.signal.aborted) return;
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadReports();
    return () => acRef.current?.abort();
  }, [loadReports]);

  useEffect(() => {
    const activeRows = rows.filter((r) => r.status === "active");
    if (activeRows.length === 0) return;

    let cancelled = false;

    const loadAllLive = async () => {
      const missing = activeRows.filter((r) => !liveCache[r.id]);
      if (missing.length === 0) return;

      const entries = await Promise.all(
        missing.map(async (r) => {
          try {
            const metrics = await getLiveMetrics(r.id);
            return [r.id, metrics] as const;
          } catch {
            return null;
          }
        })
      );

      if (cancelled) return;

      const next: Record<string, LiveMetrics> = {};
      for (const entry of entries) {
        if (entry) next[entry[0]] = entry[1];
      }

      if (Object.keys(next).length > 0) {
        setLiveCache((prev) => ({ ...prev, ...next }));
      }
    };

    void loadAllLive();

    return () => {
      cancelled = true;
    };
  }, [rows, liveCache]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();

    const base =
      tab === "live"
        ? rows.filter((r) => r.status === "active")
        : tab === "finished"
          ? rows.filter((r) => r.status === "finished")
          : rows;

    if (!s) return base;

    return base.filter((r) => {
      const hay = [
        r.id,
        r.title,
        r.groupName,
        r.code,
        r.status,
        r.type,
        r.teacher,
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(s);
    });
  }, [rows, q, tab]);

  const counts = useMemo(() => {
    return {
      all: rows.length,
      live: rows.filter((r) => r.status === "active").length,
      finished: rows.filter((r) => r.status === "finished").length,
    };
  }, [rows]);

  async function handleExport(sessionId: string, format: "json" | "csv" | "pdf") {
    setExporting((prev) => ({ ...prev, [sessionId]: format }));
    try {
      await exportSessionReport(sessionId, format);
    } catch (e) {
      console.error("exportSessionReport", e);
    } finally {
      setExporting((prev) => ({ ...prev, [sessionId]: null }));
    }
  }

  return (
    <div className="relative pb-16">
      <Glow />

      <PageHero
        title="Отчёты"
        subtitle="Сессии, live-агрегаты и экспорт итоговых данных по занятиям."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary/10 text-[rgb(var(--primary))]">
              {filtered.length} записей
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
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Поиск по названию, группе, коду…"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1 rounded-full bg-surface-subtle p-1 shadow-soft">
                  <TabButton active={tab === "all"} onClick={() => setTab("all")}>
                    All {counts.all ? `(${counts.all})` : ""}
                  </TabButton>
                  <TabButton active={tab === "live"} onClick={() => setTab("live")}>
                    Live {counts.live ? `(${counts.live})` : ""}
                  </TabButton>
                  <TabButton active={tab === "finished"} onClick={() => setTab("finished")}>
                    Finished {counts.finished ? `(${counts.finished})` : ""}
                  </TabButton>
                </div>
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
          </GlassCard>
        </Reveal>

        <Reveal>
          {loading ? (
            <LoadingGrid />
          ) : filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((r) => {
                const live = liveCache[r.id];
                const isLive = r.status === "active";
                const isFinished = r.status === "finished";
                const exportState = exporting[r.id] ?? null;

                return (
                  <GlassCard key={r.id} className="p-6 md:p-7">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold text-fg">{r.title}</div>
                        <div className="mt-1 text-xs text-muted">
                          {r.groupName} · {new Date(r.createdAt).toLocaleString()} · {r.code}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 justify-end">
                        <StatusBadge status={r.status} />
                        <Badge className="bg-surface-subtle">{r.type}</Badge>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <MetricPill
                        label="avgRisk"
                        value={isLive && live ? live.avgRisk.toFixed(2) : isFinished ? "готово" : "—"}
                        accent={isLive}
                      />
                      <MetricPill
                        label="avgConfidence"
                        value={isLive && live ? live.avgConfidence.toFixed(2) : isFinished ? "готово" : "—"}
                      />
                      <MetricPill
                        label="participants"
                        value={isLive && live ? String(live.participants.length) : isFinished ? "report" : "—"}
                      />
                    </div>

                    {isLive && live && (
                      <div className="mt-4 rounded-2xl bg-surface-subtle p-4 ring-1 ring-[color:var(--border)]/20">
                        <div className="mb-2 flex items-center gap-2 text-xs text-muted">
                          <Radio size={14} />
                          Participants (live)
                        </div>

                        <div className="grid gap-2">
                          {live.participants.slice(0, 3).map((p) => (
                            <div
                              key={p.userId}
                              className="flex items-center justify-between rounded-xl bg-surface px-3 py-2 text-sm"
                            >
                              <span className="truncate text-fg">{p.name}</span>
                              <span className="ml-3 shrink-0 text-muted">
                                {p.dominant_emotion} · risk {p.risk.toFixed(2)}
                              </span>
                            </div>
                          ))}

                          {live.participants.length > 3 && (
                            <div className="text-xs text-muted">
                              +{live.participants.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {isFinished && (
                      <div className="mt-4 rounded-2xl bg-surface-subtle p-4 ring-1 ring-[color:var(--border)]/20">
                        <div className="mb-2 flex items-center gap-2 text-xs text-muted">
                          <BarChart3 size={14} />
                          Итоговый отчёт
                        </div>
                        <p className="text-sm leading-relaxed text-muted">
                          Для завершённой сессии доступны аналитика и экспорт данных в JSON, CSV и PDF.
                        </p>
                      </div>
                    )}

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Link href={`/teacher/session/${r.id}/analytics`}>
                        <Button className="gap-2">
                          <Activity size={14} />
                          Open analytics
                        </Button>
                      </Link>

                      <Link href={`/teacher/session/${r.id}`}>
                        <Button variant="outline">Open monitor</Button>
                      </Link>
                    </div>

                    <div className="mt-4 border-t border-[color:var(--border)]/20 pt-4">
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                        Export
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={!!exportState}
                          onClick={() => handleExport(r.id, "json")}
                        >
                          <FileJson size={14} />
                          {exportState === "json" ? "..." : "JSON"}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={!!exportState}
                          onClick={() => handleExport(r.id, "csv")}
                        >
                          <FileSpreadsheet size={14} />
                          {exportState === "csv" ? "..." : "CSV"}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={!!exportState}
                          onClick={() => handleExport(r.id, "pdf")}
                        >
                          <FileText size={14} />
                          {exportState === "pdf" ? "..." : "PDF"}
                        </Button>
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