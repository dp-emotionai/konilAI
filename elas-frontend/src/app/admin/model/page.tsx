"use client";

import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Reveal from "@/components/common/Reveal";
import Section from "@/components/common/Section";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Glow from "@/components/common/Glow";
import { cn } from "@/lib/cn";
import { useMemo, useState } from "react";

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

function Metric({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm text-zinc-400">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
          {hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
        </div>
        <ToneBadge tone={tone}>{tone.toUpperCase()}</ToneBadge>
      </div>
    </div>
  );
}

export default function AdminModelPage() {
  const [openExport, setOpenExport] = useState(false);

  // MOCK controls
  const [engine, setEngine] = useState<"balanced" | "sensitive" | "strict">(
    "balanced"
  );
  const [stressThreshold, setStressThreshold] = useState("0.72");
  const [engagementFloor, setEngagementFloor] = useState("0.55");
  const [faceConfidenceMin, setFaceConfidenceMin] = useState("0.60");
  const [samplingHz, setSamplingHz] = useState("2");

  const [dryRunTarget, setDryRunTarget] = useState(
    "Midterm · Group A (Mock)"
  );
  const [dryRunState, setDryRunState] = useState<
    "idle" | "running" | "done"
  >("idle");

  const computed = useMemo(() => {
    // Totally mock scoring derived from selected mode
    const modeBias =
      engine === "sensitive" ? 1.06 : engine === "strict" ? 0.96 : 1.0;

    const acc = Math.max(
      0,
      Math.min(1, 0.924 * modeBias - (Number(faceConfidenceMin) - 0.6) * 0.06)
    );

    const fp = Math.max(
      0,
      Math.min(1, 0.081 * (engine === "sensitive" ? 1.25 : 1.0))
    );

    const latency = Math.max(
      60,
      Math.round(118 * (engine === "strict" ? 0.92 : 1.0) + Number(samplingHz) * 9)
    );

    return {
      acc,
      fp,
      latency,
      version: "v2.1.4 (mock)",
    };
  }, [engine, faceConfidenceMin, samplingHz]);

  const toneForAcc: Tone =
    computed.acc >= 0.92 ? "success" : computed.acc >= 0.88 ? "purple" : "warning";
  const toneForFp: Tone =
    computed.fp <= 0.09 ? "success" : computed.fp <= 0.12 ? "warning" : "warning";
  const toneForLat: Tone =
    computed.latency <= 140 ? "success" : computed.latency <= 170 ? "warning" : "warning";

  function runDryTest() {
    if (dryRunState === "running") return;
    setDryRunState("running");
    window.setTimeout(() => setDryRunState("done"), 900);
  }

  return (
    <div className="relative space-y-12 pb-20">
      <Glow />
      <Breadcrumbs items={[{ label: "Админ", href: "/admin/dashboard" }, { label: "Модель" }]} />

      <PageHero
        title="Панель модели"
        subtitle="Пороги, частота съёмки и режимы детекции. Настройки в разработке (интерфейс)."
      />

      {/* TOP METRICS */}
      <Section>
        <div className="grid gap-6 md:grid-cols-3">
          <Reveal>
            <Metric
              label="Accuracy"
              value={`${(computed.acc * 100).toFixed(1)}%`}
              hint="Estimated confidence (mock)"
              tone={toneForAcc}
            />
          </Reveal>
          <Reveal>
            <Metric
              label="False Positive Rate"
              value={`${(computed.fp * 100).toFixed(1)}%`}
              hint="Lower is better (mock)"
              tone={toneForFp}
            />
          </Reveal>
          <Reveal>
            <Metric
              label="Avg Latency"
              value={`${computed.latency}ms`}
              hint="Processing + render time (mock)"
              tone={toneForLat}
            />
          </Reveal>
        </div>
      </Section>

      {/* MAIN GRID */}
      <Section>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* SETTINGS */}
          <Reveal>
            <GlassCard className="p-7 lg:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold">Detection Settings</h2>
                  <p className="text-sm text-zinc-400">
                    Adjust thresholds for stress/engagement signals and face confidence.
                  </p>
                </div>

                <ToneBadge tone="purple">{computed.version}</ToneBadge>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {/* mode */}
                <div className="space-y-2">
                  <p className="text-sm text-zinc-400">Engine Mode</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={engine === "balanced" ? "primary" : "ghost"}
                      onClick={() => setEngine("balanced")}
                    >
                      Balanced
                    </Button>
                    <Button
                      type="button"
                      variant={engine === "sensitive" ? "primary" : "ghost"}
                      onClick={() => setEngine("sensitive")}
                    >
                      Sensitive
                    </Button>
                    <Button
                      type="button"
                      variant={engine === "strict" ? "primary" : "ghost"}
                      onClick={() => setEngine("strict")}
                    >
                      Strict
                    </Button>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Sensitive: catches more signals. Strict: fewer false positives.
                  </p>
                </div>

                {/* sampling */}
                <div className="space-y-2">
                  <p className="text-sm text-zinc-400">Sampling Rate (Hz)</p>
                  <Input
                    value={samplingHz}
                    onChange={(e) => setSamplingHz(e.target.value)}
                    placeholder="e.g. 2"
                  />
                  <p className="text-xs text-zinc-500">
                    Higher values increase responsiveness, but cost performance.
                  </p>
                </div>

                {/* stress threshold */}
                <div className="space-y-2">
                  <p className="text-sm text-zinc-400">Stress Threshold</p>
                  <Input
                    value={stressThreshold}
                    onChange={(e) => setStressThreshold(e.target.value)}
                    placeholder="0.00 - 1.00"
                  />
                  <p className="text-xs text-zinc-500">
                    When stress score ≥ threshold, we flag “high stress”.
                  </p>
                </div>

                {/* engagement floor */}
                <div className="space-y-2">
                  <p className="text-sm text-zinc-400">Engagement Floor</p>
                  <Input
                    value={engagementFloor}
                    onChange={(e) => setEngagementFloor(e.target.value)}
                    placeholder="0.00 - 1.00"
                  />
                  <p className="text-xs text-zinc-500">
                    Below this, we mark “low engagement”.
                  </p>
                </div>

                {/* face conf */}
                <div className="space-y-2 md:col-span-2">
                  <p className="text-sm text-zinc-400">Min Face Confidence</p>
                  <Input
                    value={faceConfidenceMin}
                    onChange={(e) => setFaceConfidenceMin(e.target.value)}
                    placeholder="0.00 - 1.00"
                  />
                  <p className="text-xs text-zinc-500">
                    Frames below this confidence are ignored to reduce noise.
                  </p>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ToneBadge tone="info">Frontend-only</ToneBadge>
                  <span className="text-xs text-zinc-500">
                    Values are stored in component state (mock). Backend later.
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setOpenExport(true)}>
                    Export Config
                  </Button>
                  <Button type="button" variant="primary">
                    Save (Mock)
                  </Button>
                </div>
              </div>
            </GlassCard>
          </Reveal>

          {/* DRY RUN */}
          <Reveal>
            <GlassCard className="p-7">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">Quick Dry Run</h2>
                <p className="text-sm text-zinc-400">
                  Simulate a short model run on a mock session.
                </p>
              </div>

              <div className="mt-6 space-y-3">
                <p className="text-sm text-zinc-400">Target</p>
                <Input
                  value={dryRunTarget}
                  onChange={(e) => setDryRunTarget(e.target.value)}
                />
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="primary"
                  onClick={runDryTest}
                  disabled={dryRunState === "running"}
                >
                  {dryRunState === "running" ? "Running…" : "Run Test"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDryRunState("idle")}
                >
                  Reset
                </Button>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-400">Status</p>
                  <ToneBadge
                    tone={
                      dryRunState === "done"
                        ? "success"
                        : dryRunState === "running"
                        ? "info"
                        : "neutral"
                    }
                  >
                    {dryRunState.toUpperCase()}
                  </ToneBadge>
                </div>

                <div className="mt-4 space-y-2 text-sm text-zinc-300">
                  <div className="flex justify-between">
                    <span>Frames processed</span>
                    <span className="text-zinc-500">
                      {dryRunState === "idle"
                        ? "—"
                        : dryRunState === "running"
                        ? "…"
                        : "1,120"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stress flags</span>
                    <span className="text-zinc-500">
                      {dryRunState === "done" ? "14" : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Engagement dips</span>
                    <span className="text-zinc-500">
                      {dryRunState === "done" ? "9" : "—"}
                    </span>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-xs text-zinc-500">
                This is UI-only. Real inference will be connected later.
              </p>
            </GlassCard>
          </Reveal>
        </div>
      </Section>

      {/* EXPORT MODAL */}
      <Modal open={openExport} onClose={() => setOpenExport(false)} title="Export Model Config">
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            Copy this configuration (mock). Later we’ll persist it via backend.
          </p>

          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-zinc-200 overflow-auto">
            <pre className="whitespace-pre-wrap">
{JSON.stringify(
  {
    engine,
    thresholds: {
      stress: stressThreshold,
      engagementFloor,
      minFaceConfidence: faceConfidenceMin,
    },
    samplingHz,
  },
  null,
  2
)}
            </pre>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpenExport(false)}>
              Close
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                navigator.clipboard?.writeText(
                  JSON.stringify(
                    {
                      engine,
                      thresholds: {
                        stress: stressThreshold,
                        engagementFloor,
                        minFaceConfidence: faceConfidenceMin,
                      },
                      samplingHz,
                    },
                    null,
                    2
                  )
                );
              }}
            >
              Copy JSON
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}