"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
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
      ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/20"
      : tone === "info"
      ? "bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/20"
      : tone === "warning"
      ? "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/20"
      : tone === "purple"
      ? "bg-purple-500/15 text-purple-200 ring-1 ring-purple-400/25"
      : "bg-white/10 text-zinc-200 ring-1 ring-white/10";

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
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-purple-400/60"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export default function ExamAnalyticsPage() {
  const params = useParams<{ id: string }>();
  const [group, setGroup] = useState("All students");
  const [minConfidence, setMinConfidence] = useState("0.60");
  const [tab, setTab] = useState<"overview" | "integrity" | "controls">("overview");

  const kpi = useMemo(() => {
    // mock numbers
    const conf = Number(minConfidence) || 0.6;
    const base = 0.86 + (0.6 - conf) * 0.15;
    const integrity = Math.max(0.72, Math.min(0.96, base));
    const focus = Math.max(0.65, Math.min(0.94, base - 0.03));
    const stress = Math.max(0.18, Math.min(0.62, 0.44 - (conf - 0.6) * 0.25));
    return {
      integrity,
      focus,
      stress,
      flagged: Math.round(6 + (0.7 - conf) * 10),
      participants: 38,
    };
  }, [minConfidence]);

  const toneIntegrity: Tone =
    kpi.integrity >= 0.9 ? "success" : kpi.integrity >= 0.84 ? "purple" : "warning";
  const toneFocus: Tone =
    kpi.focus >= 0.88 ? "success" : kpi.focus >= 0.8 ? "purple" : "warning";
  const toneStress: Tone =
    kpi.stress <= 0.32 ? "success" : kpi.stress <= 0.45 ? "warning" : "warning";

  return (
    <div className="relative space-y-12 pb-20">
      <Glow />

      <PageHero
        overline="Teacher • Exam analytics"
        title="Экзаменационная аналитика"
        subtitle="Интерфейс готов для будущей интеграции с ML‑отчётами экзамена."
      />

      <Section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <ToneBadge tone="info">Session: Mock Exam</ToneBadge>
            <ToneBadge tone="purple">Live-ready UI</ToneBadge>
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
            <Button
              type="button"
              className="ring-1 ring-purple-400/25 bg-purple-500/20 hover:bg-purple-500/25 text-purple-100"
              onClick={() => navigator.clipboard?.writeText("EXPORT_EXAM_ANALYTICS_MOCK")}
            >
              Export (Mock)
            </Button>
          </div>
        </div>

          <TeacherSessionTabs sessionId={params.id} />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1 rounded-2xl bg-white/5 p-1">
            {[
              { id: "overview", label: "Overview" },
              { id: "integrity", label: "Integrity insights" },
              { id: "controls", label: "Controls" },
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
          <span className="text-xs text-white/45">
            Switch between KPIs, narrative insights and review controls.
          </span>
        </div>
      </Section>

      {tab === "overview" && (
        <Section>
          <div className="grid gap-6 md:grid-cols-3">
            <Reveal>
              <GlassCard className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-400">Integrity Score</p>
                  <ToneBadge tone={toneIntegrity}>{toneIntegrity}</ToneBadge>
                </div>
                <p className="text-3xl font-semibold">{(kpi.integrity * 100).toFixed(1)}%</p>
                <MiniBar pct={kpi.integrity * 100} />
                <p className="text-xs text-zinc-500">
                  Composite of gaze stability, anomalies and confidence (mock).
                </p>
              </GlassCard>
            </Reveal>

            <Reveal>
              <GlassCard className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-400">Focus Stability</p>
                  <ToneBadge tone={toneFocus}>{toneFocus}</ToneBadge>
                </div>
                <p className="text-3xl font-semibold">{(kpi.focus * 100).toFixed(1)}%</p>
                <MiniBar pct={kpi.focus * 100} />
                <p className="text-xs text-zinc-500">
                  Engagement smoothness over time (mock).
                </p>
              </GlassCard>
            </Reveal>

            <Reveal>
              <GlassCard className="p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-400">Stress Level</p>
                  <ToneBadge tone={toneStress}>{toneStress}</ToneBadge>
                </div>
                <p className="text-3xl font-semibold">{(kpi.stress * 100).toFixed(1)}%</p>
                <MiniBar pct={kpi.stress * 100} />
                <p className="text-xs text-zinc-500">
                  Higher can correlate with overload or cheating suspicion (mock).
                </p>
              </GlassCard>
            </Reveal>
          </div>
        </Section>
      )}

      {tab === "integrity" && (
        <Section>
          <div className="grid gap-6 lg:grid-cols-3">
            <Reveal>
              <GlassCard className="p-7 lg:col-span-2">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold">Integrity Insights</h2>
                    <p className="text-sm text-zinc-400">
                      Interpret patterns and take action. Everything here is mock UI.
                    </p>
                  </div>
                  <ToneBadge tone="info">{kpi.participants} participants</ToneBadge>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <p className="text-sm font-medium text-zinc-200">Flagged anomalies</p>
                    <p className="mt-2 text-3xl font-semibold">{kpi.flagged}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Based on sudden gaze breaks + confidence dips (mock).
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <p className="text-sm font-medium text-zinc-200">Top risk window</p>
                    <p className="mt-2 text-3xl font-semibold">12:10–12:18</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Highest combined stress + anomaly density (mock).
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5 md:col-span-2">
                    <p className="text-sm font-medium text-zinc-200">Recommended actions</p>
                    <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                      <li className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400/70" />
                        Review flagged timestamps and compare against proctor notes.
                      </li>
                      <li className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400/70" />
                        If confidence is low, raise min threshold to reduce noise.
                      </li>
                      <li className="flex gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400/70" />
                        Export summary and attach to exam report (mock export).
                      </li>
                    </ul>
                  </div>
                </div>
              </GlassCard>
            </Reveal>

            <Reveal>
              <GlassCard className="p-7 space-y-3">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold">Quick snapshot</h2>
                  <p className="text-sm text-zinc-400">Short story about this exam session.</p>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  Mock: integrity is generally high with a short risk window around the middle of the
                  exam. Use this tab for narrative explanation powered by your ML reports later.
                </p>
              </GlassCard>
            </Reveal>
          </div>
        </Section>
      )}

      {tab === "controls" && (
        <Section>
          <div className="grid gap-6 lg:grid-cols-3">
            <Reveal>
              <GlassCard className="p-7 lg:col-span-1">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold">Controls</h2>
                  <p className="text-sm text-zinc-400">Quick toggles for review workflow.</p>
                </div>

                <div className="mt-6 space-y-3">
                  <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Highlight anomalies</p>
                      <p className="text-xs text-zinc-500">Overlay on timeline (mock)</p>
                    </div>
                    <input type="checkbox" defaultChecked className="h-5 w-5 accent-purple-400" />
                  </label>

                  <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Strict scoring</p>
                      <p className="text-xs text-zinc-500">More sensitive thresholds</p>
                    </div>
                    <input type="checkbox" className="h-5 w-5 accent-purple-400" />
                  </label>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-zinc-500">
                    Group: <span className="text-zinc-200">{group}</span>
                  </div>

                  <Button
                    type="button"
                    className="w-full ring-1 ring-purple-400/25 bg-purple-500/20 hover:bg-purple-500/25 text-purple-100"
                    onClick={() => navigator.clipboard?.writeText("COPY_FLAGGED_TIMESTAMPS_MOCK")}
                  >
                    Copy flagged timestamps
                  </Button>

                  <Button
                    type="button"
                    className="w-full ring-1 ring-white/10 bg-white/10 hover:bg-white/15 text-zinc-100"
                    onClick={() => setMinConfidence("0.60")}
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
                    Use this as a guide when walking through exam recordings and reports.
                  </p>
                </div>
                <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                  <li className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400/70" />
                    Check flagged timestamps against invigilator notes.
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400/70" />
                    Verify that camera quality was acceptable throughout the exam.
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400/70" />
                    If many anomalies cluster in a short window, re‑evaluate instructions or timing.
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400/70" />
                    Export final summary and attach to official exam documentation (mock export).
                  </li>
                </ul>
              </GlassCard>
            </Reveal>
          </div>
        </Section>
      )}
    </div>
  );
}