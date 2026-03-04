"use client";

import { useMemo, useState } from "react";
import PageHero from "@/components/common/PageHero";
import Reveal from "@/components/common/Reveal";
import {Card} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { mockSessions } from "@/lib/mock/sessions";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

export default function TeacherComparePage() {
  const toast = useToast();

  const [a, setA] = useState(mockSessions[0]?.id ?? "1");
  const [b, setB] = useState(mockSessions[1]?.id ?? "2");
  const [tab, setTab] = useState<"metrics" | "summary">("metrics");

  const A = useMemo(() => mockSessions.find((x) => x.id === a) ?? mockSessions[0], [a]);
  const B = useMemo(() => mockSessions.find((x) => x.id === b) ?? mockSessions[1], [b]);

  return (
    <div className="space-y-6">
      <PageHero
        overline="Teacher"
        title="Compare sessions"
        subtitle="Compare engagement, stress and attention drops between 2 sessions (mock now)."
        right={
          <Button
            onClick={() => toast.push({ type: "info", title: "Export queued", text: "Mock comparison export created." })}
          >
            Export comparison
          </Button>
        }
      />

      <Reveal>
        <Card className="p-6 md:p-7 space-y-5">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm text-white/60">Select sessions</div>
              <div className="mt-2 text-lg font-semibold">A vs B</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{A.type.toUpperCase()}</Badge>
              <Badge>{B.type.toUpperCase()}</Badge>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <select
              value={a}
              onChange={(e) => setA(e.target.value)}
              className="h-11 rounded-2xl bg-black/30 border border-white/10 px-4 text-white/80 outline-none"
            >
              {mockSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.group})
                </option>
              ))}
            </select>

            <select
              value={b}
              onChange={(e) => setB(e.target.value)}
              className="h-11 rounded-2xl bg-black/30 border border-white/10 px-4 text-white/80 outline-none"
            >
              {mockSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.group})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 rounded-2xl bg-white/5 p-1">
              {[
                { id: "metrics", label: "Metrics" },
                { id: "summary", label: "Summary" },
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
              Switch between numeric comparison and narrative summary.
            </span>
          </div>
        </Card>
      </Reveal>

      {tab === "metrics" && (
        <div className="grid lg:grid-cols-3 gap-4">
          <Reveal>
            <MetricCard title="Avg engagement" a="68%" b="61%" hint="Higher is better" />
          </Reveal>
          <Reveal>
            <MetricCard title="Avg stress" a="41%" b="53%" hint="Lower is better" />
          </Reveal>
          <Reveal>
            <MetricCard title="Attention drops" a="9" b="14" hint="Lower is better" />
          </Reveal>
        </div>
      )}

      {tab === "summary" && (
        <Reveal>
          <Card className="p-6 md:p-7">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="text-sm text-white/60">Auto summary</div>
                <div className="mt-2 text-lg font-semibold">Key differences (mock)</div>
                <div className="mt-2 text-sm text-white/60">
                  Later: real computation from event logs + ML pipeline.
                </div>
              </div>
              <Button variant="outline">Regenerate</Button>
            </div>

            <div className="mt-5 grid md:grid-cols-3 gap-3">
              <Insight title="Engagement" text="Session A is more stable after minute 20." />
              <Insight title="Stress" text="Session B has 2 major peaks (anxiety spikes)." />
              <Insight title="Recommendation" text="Use interactive break around minute 25 for B." />
            </div>
          </Card>
        </Reveal>
      )}
    </div>
  );
}

function MetricCard({ title, a, b, hint }: { title: string; a: string; b: string; hint: string }) {
  return (
    <Card className="p-6 md:p-7">
      <div className="text-sm text-white/60">{title}</div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="text-xs text-white/60">Session A</div>
          <div className="mt-1 text-2xl font-semibold">{a}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="text-xs text-white/60">Session B</div>
          <div className="mt-1 text-2xl font-semibold">{b}</div>
        </div>
      </div>
      <div className="mt-3 text-sm text-white/50">{hint}</div>
    </Card>
  );
}

function Insight({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4 hover:bg-white/5 transition">
      <div className="font-semibold">{title}</div>
      <div className="mt-2 text-sm text-white/60">{text}</div>
    </div>
  );
}
