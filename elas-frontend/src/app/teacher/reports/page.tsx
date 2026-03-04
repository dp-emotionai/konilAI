"use client";

import { useEffect, useMemo, useState } from "react";
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
        active ? "bg-surface shadow-soft text-fg" : "text-muted hover:text-fg hover:bg-surface-subtle"
      )}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "active"
      ? "bg-[rgba(61,220,151,0.18)]"
      : status === "finished"
      ? "bg-surface-subtle"
      : "bg-[rgba(245,165,36,0.16)]";
  return <Badge className={cn("shadow-soft", cls)}>{status}</Badge>;
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-elas-lg bg-surface-subtle p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold text-fg">{value}</div>
    </div>
  );
}

export default function TeacherReportsPage() {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "live" | "finished">("all");

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  // live-metrics cache: sessionId -> LiveMetrics
  const [liveCache, setLiveCache] = useState<Record<string, LiveMetrics>>({});

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);

    getTeacherSessionsAsReports({ signal: ac.signal })
      .then(setRows)
      .catch((e) => {
        if (ac.signal.aborted) return;
        setError(e?.message ?? "Failed to load sessions");
        setRows([]);
      })
      .finally(() => {
        if (ac.signal.aborted) return;
        setLoading(false);
      });

    return () => ac.abort();
  }, []);

  // Filter client-side (можно потом перенести на server-side)
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

  // Lazy-load live metrics when user opens a live card (button)
  async function loadLive(sessionId: string) {
    if (liveCache[sessionId]) return;
    try {
      const m = await getLiveMetrics(sessionId);
      setLiveCache((prev) => ({ ...prev, [sessionId]: m }));
    } catch (e: any) {
      // silently ignore or show toast
      console.error("live-metrics", e);
    }
  }

  return (
    <div className="relative pb-16">
      <Glow />

      <PageHero
        title="Reports"
        subtitle="Отчёты строятся из реальных сессий. Live-сессии показывают текущие агрегаты (avgRisk/avgConfidence)."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary/10">{filtered.length} items</Badge>
            <Button variant="outline" onClick={() => setQ("")}>
              Clear
            </Button>
          </div>
        }
      />

      <Section spacing="normal" className="mt-10 space-y-6">
        <Reveal>
          <GlassCard className="p-6 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-[260px] flex-1">
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by title / group / code…" />
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1 rounded-full bg-surface-subtle p-1 shadow-soft">
                  <TabButton active={tab === "all"} onClick={() => setTab("all")}>All</TabButton>
                  <TabButton active={tab === "live"} onClick={() => setTab("live")}>Live</TabButton>
                  <TabButton active={tab === "finished"} onClick={() => setTab("finished")}>Finished</TabButton>
                </div>

                <Button
                  onClick={() => alert("Реальный экспорт добавим отдельным endpoint'ом: POST /reports/export")}
                >
                  Export
                </Button>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-elas-lg bg-[rgba(255,77,109,0.10)] px-4 py-3 text-sm text-fg shadow-soft">
                {error}
              </div>
            )}
          </GlassCard>
        </Reveal>

        <Reveal>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-[150px] rounded-elas-lg bg-surface-subtle animate-pulse" />
              <div className="h-[150px] rounded-elas-lg bg-surface-subtle animate-pulse" />
              <div className="h-[150px] rounded-elas-lg bg-surface-subtle animate-pulse" />
              <div className="h-[150px] rounded-elas-lg bg-surface-subtle animate-pulse" />
            </div>
          ) : filtered.length === 0 ? (
            <GlassCard className="p-10 text-center">
              <div className="text-lg font-semibold text-fg">Нет сессий</div>
              <p className="mt-2 text-sm text-muted">
                Создайте сессию и проведите занятие — здесь появятся отчёты по реальным данным.
              </p>
            </GlassCard>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((r) => {
                const live = liveCache[r.id];
                return (
                  <GlassCard key={r.id} className="p-6 md:p-7">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-fg truncate">{r.title}</div>
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
                        value={r.status === "active" && live ? live.avgRisk.toFixed(2) : "—"}
                      />
                      <MetricPill
                        label="avgConfidence"
                        value={r.status === "active" && live ? live.avgConfidence.toFixed(2) : "—"}
                      />
                      <MetricPill
                        label="participants"
                        value={r.status === "active" && live ? String(live.participants.length) : "—"}
                      />
                    </div>

                    {r.status === "active" && !live && (
                      <div className="mt-4">
                        <Button variant="outline" size="sm" onClick={() => loadLive(r.id)}>
                          Load live metrics
                        </Button>
                      </div>
                    )}

                    {r.status === "active" && live && live.participants.length > 0 && (
                      <div className="mt-4 rounded-elas-lg bg-surface-subtle p-4">
                        <div className="text-xs text-muted">Participants (live)</div>
                        <div className="mt-2 grid gap-2">
                          {live.participants.slice(0, 3).map((p) => (
                            <div key={p.userId} className="flex items-center justify-between text-sm">
                              <span className="text-fg">{p.name}</span>
                              <span className="text-muted">
                                {p.dominant_emotion} · risk {p.risk.toFixed(2)}
                              </span>
                            </div>
                          ))}
                          {live.participants.length > 3 && (
                            <div className="text-xs text-muted">+{live.participants.length - 3} more</div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button onClick={() => (window.location.href = `/teacher/session/${r.id}/analytics`)}>
                        Open analytics
                      </Button>
                      <Button variant="outline" onClick={() => (window.location.href = `/teacher/session/${r.id}`)}>
                        Open monitor
                      </Button>
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