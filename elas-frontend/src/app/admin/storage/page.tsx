"use client";

import { useMemo, useState } from "react";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Reveal from "@/components/common/Reveal";
import Section from "@/components/common/Section";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Glow from "@/components/common/Glow";
import { cn } from "@/lib/cn";

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

function Stat({
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

export default function AdminStoragePage() {
  // MOCK state
  const [retentionDays, setRetentionDays] = useState(30);
  const [autoCleanup, setAutoCleanup] = useState(true);
  const [redactFaces, setRedactFaces] = useState(false);
  const [archiveCold, setArchiveCold] = useState(true);

  const [manualTarget, setManualTarget] = useState("Analytics cache");
  const [log, setLog] = useState<
    { at: string; action: string; result: string; tone: Tone }[]
  >([
    { at: "Today 09:12", action: "Nightly retention sweep", result: "OK · freed 1.2GB", tone: "success" },
    { at: "Yesterday 23:41", action: "Archive cold sessions", result: "OK · moved 48 items", tone: "info" },
    { at: "Yesterday 18:10", action: "Manual cleanup (videos)", result: "OK · freed 3.4GB", tone: "success" },
    { at: "Yesterday 11:05", action: "Audit export snapshot", result: "OK · generated", tone: "purple" },
  ]);

  const storage = useMemo(() => {
    // mock numbers derived from retention
    const baseTotalGb = 120;
    const usedGb = Math.min(baseTotalGb, Math.round((62 + (retentionDays - 30) * 0.6) * 10) / 10);
    const pct = Math.max(0, Math.min(100, Math.round((usedGb / baseTotalGb) * 100)));
    const tone: Tone = pct <= 65 ? "success" : pct <= 80 ? "warning" : "warning";
    return { baseTotalGb, usedGb, pct, tone };
  }, [retentionDays]);

  function pushLog(action: string, result: string, tone: Tone) {
    const at = new Date().toLocaleString(undefined, {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    setLog((prev) => [{ at, action, result, tone }, ...prev].slice(0, 8));
  }

  function runManualCleanup() {
    // mock freeing
    const freed = (Math.random() * 2.8 + 0.4).toFixed(1);
    pushLog(`Manual cleanup · ${manualTarget}`, `OK · freed ${freed}GB`, "success");
  }

  function runRetentionSweep() {
    const freed = (Math.random() * 1.6 + 0.2).toFixed(1);
    pushLog("Retention sweep", `OK · freed ${freed}GB`, "info");
  }

  const riskTone: Tone =
    retentionDays >= 60 ? "warning" : retentionDays >= 45 ? "purple" : "success";

  return (
    <div className="relative space-y-12 pb-20">
      <Glow />
      <Breadcrumbs items={[{ label: "Админ", href: "/admin/dashboard" }, { label: "Хранилище" }]} />

      <PageHero
        title="Хранилище и хранение данных"
        subtitle="Сроки хранения, архивирование и очистка. Настройки в разработке."
      />

      {/* TOP STATS */}
      <Section>
        <div className="grid gap-6 md:grid-cols-3">
          <Reveal>
            <Stat
              label="Storage Used"
              value={`${storage.usedGb}GB`}
              hint={`of ${storage.baseTotalGb}GB total`}
              tone={storage.tone}
            />
          </Reveal>
          <Reveal>
            <Stat
              label="Retention Window"
              value={`${retentionDays} days`}
              hint="Video + analytics retention"
              tone={riskTone}
            />
          </Reveal>
          <Reveal>
            <Stat
              label="Cleanup Mode"
              value={autoCleanup ? "Auto" : "Manual"}
              hint={autoCleanup ? "Scheduled sweeps enabled" : "Only manual actions"}
              tone={autoCleanup ? "success" : "warning"}
            />
          </Reveal>
        </div>
      </Section>

      {/* MAIN GRID */}
      <Section>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Retention */}
          <Reveal>
            <GlassCard className="p-7 lg:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold">Retention Policy</h2>
                  <p className="text-sm text-zinc-400">
                    Balance privacy, storage costs, and analytics needs.
                  </p>
                </div>

                <ToneBadge tone="info">Mock · not persisted</ToneBadge>
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                {/* Retention slider */}
                <div className="space-y-3 md:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-zinc-400">Retention (days)</p>
                    <ToneBadge tone={riskTone}>{retentionDays}d</ToneBadge>
                  </div>

                  <input
                    type="range"
                    min={7}
                    max={90}
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(Number(e.target.value))}
                    className="w-full accent-purple-400"
                  />

                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>7d</span>
                    <span>30d</span>
                    <span>90d</span>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-medium">Policy Preview</p>
                        <p className="text-xs text-zinc-500">
                          Sessions older than <span className="text-zinc-200">{retentionDays} days</span> will be
                          eligible for cleanup (video first, then derived caches).
                        </p>
                      </div>
                      <ToneBadge tone={riskTone}>
                        {retentionDays >= 60 ? "Cost ↑" : retentionDays >= 45 ? "Balanced" : "Lean"}
                      </ToneBadge>
                    </div>
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-3">
                  <p className="text-sm text-zinc-400">Automation</p>

                  <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Auto Cleanup</p>
                      <p className="text-xs text-zinc-500">Nightly retention sweeps</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoCleanup}
                      onChange={(e) => setAutoCleanup(e.target.checked)}
                      className="h-5 w-5 accent-purple-400"
                    />
                  </label>

                  <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Archive Cold Sessions</p>
                      <p className="text-xs text-zinc-500">Move older items to cold tier</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={archiveCold}
                      onChange={(e) => setArchiveCold(e.target.checked)}
                      className="h-5 w-5 accent-purple-400"
                    />
                  </label>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-zinc-400">Privacy Enhancements</p>

                  <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Face Redaction</p>
                      <p className="text-xs text-zinc-500">Store redacted frames only</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={redactFaces}
                      onChange={(e) => setRedactFaces(e.target.checked)}
                      className="h-5 w-5 accent-purple-400"
                    />
                  </label>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-zinc-500">
                    Redaction is UI-only for now. Later it will be enforced in backend storage pipeline.
                  </div>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ToneBadge tone="purple">Premium UI</ToneBadge>
                  <span className="text-xs text-zinc-500">
                    Config is local state (mock). Real persistence later.
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    className="bg-white/10 hover:bg-white/15 text-zinc-100 ring-1 ring-white/10"
                    onClick={runRetentionSweep}
                  >
                    Run Sweep
                  </Button>
                  <Button
                    type="button"
                    className="bg-purple-500/20 hover:bg-purple-500/25 text-purple-100 ring-1 ring-purple-400/25"
                    onClick={() => pushLog("Save retention settings", "OK · stored (mock)", "purple")}
                  >
                    Save (Mock)
                  </Button>
                </div>
              </div>
            </GlassCard>
          </Reveal>

          {/* Manual Cleanup */}
          <Reveal>
            <GlassCard className="p-7">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">Manual Cleanup</h2>
                <p className="text-sm text-zinc-400">
                  Trigger targeted cleanup actions (mock).
                </p>
              </div>

              <div className="mt-6 space-y-3">
                <p className="text-sm text-zinc-400">Target</p>
                <Input value={manualTarget} onChange={(e) => setManualTarget(e.target.value)} />

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-zinc-500">
                  Tip: Use “Videos”, “Analytics cache”, “Exports”, or “Temp files”.
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="bg-purple-500/20 hover:bg-purple-500/25 text-purple-100 ring-1 ring-purple-400/25"
                  onClick={runManualCleanup}
                >
                  Cleanup Now
                </Button>
                <Button
                  type="button"
                  className="bg-white/10 hover:bg-white/15 text-zinc-100 ring-1 ring-white/10"
                  onClick={() => {
                    setManualTarget("Videos");
                    pushLog("Preset selected", "OK · Videos", "info");
                  }}
                >
                  Use Preset
                </Button>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-400">Risk level</p>
                  <ToneBadge tone={retentionDays >= 60 ? "warning" : "success"}>
                    {retentionDays >= 60 ? "Higher storage cost" : "Normal"}
                  </ToneBadge>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  Manual cleanup affects only mock UI state. No real files are deleted.
                </p>
              </div>
            </GlassCard>
          </Reveal>
        </div>
      </Section>

      {/* Activity Log */}
      <Section>
        <Reveal>
          <GlassCard className="p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">Cleanup & Retention Log</h2>
                <p className="text-sm text-zinc-400">Recent actions and outcomes (mock feed).</p>
              </div>

              <Button
                type="button"
                className="bg-white/10 hover:bg-white/15 text-zinc-100 ring-1 ring-white/10"
                onClick={() =>
                  setLog((prev) => [
                    { at: "Now", action: "Log cleared", result: "OK", tone: "info" },
                    ...prev.slice(0, 0),
                  ])
                }
              >
                Clear
              </Button>
            </div>

            <div className="mt-6 space-y-3">
              {log.map((row, idx) => (
                <div
                  key={`${row.at}-${idx}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="min-w-[220px] space-y-1">
                    <p className="text-sm font-medium text-zinc-200">{row.action}</p>
                    <p className="text-xs text-zinc-500">{row.at}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <p className="text-sm text-zinc-300">{row.result}</p>
                    <ToneBadge tone={row.tone}>{row.tone.toUpperCase()}</ToneBadge>
                  </div>
                </div>
              ))}

              {log.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
                  <p className="text-sm text-zinc-300">No log entries.</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Run a sweep or manual cleanup to generate activity.
                  </p>
                </div>
              ) : null}
            </div>
          </GlassCard>
        </Reveal>
      </Section>
    </div>
  );
}