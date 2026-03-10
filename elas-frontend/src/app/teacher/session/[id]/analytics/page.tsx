"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PageHero from "@/components/common/PageHero";
import Reveal from "@/components/common/Reveal";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { TeacherSessionTabs } from "@/components/session/TeacherSessionTabs";
import { getSessionSummary, type SessionSummary } from "@/lib/api/teacher";
import { isApiAvailable, hasAuth } from "@/lib/api/client";

function ChartMock({ title }: { title: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-white/60">{title}</div>
        <Badge>MOCK</Badge>
      </div>
      <div className="mt-4 h-44 rounded-2xl border border-white/10 bg-gradient-to-b from-purple-500/15 to-transparent" />
      <div className="mt-3 text-xs text-white/45">Charts will be connected to real metrics later.</div>
    </div>
  );
}

export default function TeacherLectureAnalyticsPage() {
  const params = useParams<{ id: string }>();
  const [tab, setTab] = useState<"overview" | "timeline" | "insights">(
    "overview"
  );
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = params.id;
    if (!id || !isApiAvailable() || !hasAuth()) {
      setSummary(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getSessionSummary(id)
      .then((data) => {
        if (cancelled) return;
        setSummary(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  const avgEngagement = summary?.avgEngagement ?? 0;
  const attentionDrops = summary?.attentionDrops ?? 0;
  const quality = (summary?.quality as string | undefined) ?? "medium";

  return (
    <div className="space-y-6">
      <PageHero
        overline="Teacher • Lecture analytics"
        title="Аналитика сессии"
        subtitle="После подключения backend‑сводок здесь будут метрики вовлечённости и внимания."
        right={
          <div className="flex items-center gap-2 flex-wrap">
            {summary ? (
              <Badge variant="success" className="gap-1">
                LIVE
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                Нет данных
              </Badge>
            )}
          </div>
        }
      />

      <TeacherSessionTabs sessionId={params.id} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-2xl bg-white/5 p-1">
          {[
            { id: "overview", label: "Overview" },
            { id: "timeline", label: "Timeline" },
            { id: "insights", label: "Insights" },
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
          Switch between KPIs, charts and narrative insights.
        </span>
      </div>

      {tab === "overview" && (
        <div className="grid lg:grid-cols-3 gap-4">
          <Reveal>
            <Kpi
              title="Avg engagement"
                value={summary ? `${avgEngagement}%` : "—"}
                hint={summary ? "Backend summary" : "Пока нет данных от backend"}
              loading={loading}
            />
          </Reveal>
          <Reveal>
            <Kpi
              title="Attention drops"
                value={summary ? `${attentionDrops}` : "—"}
                hint={summary ? "From summary" : "Пока нет данных от backend"}
              loading={loading}
            />
          </Reveal>
          <Reveal>
            <Kpi
              title="Data quality"
              value={quality}
                hint={summary ? "From summary" : "Оценка по умолчанию"}
              loading={loading}
            />
          </Reveal>
        </div>
      )}

      {tab === "timeline" && summary && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Reveal><ChartMock title="Engagement over time" /></Reveal>
          <Reveal><ChartMock title="Focus strip (heat bar)" /></Reveal>
          <Reveal><ChartMock title="Emotion distribution" /></Reveal>
          <Reveal><ChartMock title="Stress (optional)" /></Reveal>
        </div>
      )}

      {tab === "insights" && (
        <Reveal>
          <Card className="p-6 md:p-7">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="text-sm text-white/60">Insights</div>
                  <div className="mt-2 text-lg font-semibold">
                    Auto recommendations {summary ? "from summary" : "(появятся позже)"}
                  </div>
                <div className="mt-2 text-sm text-white/60">
                  {summary
                    ? "Based on aggregated engagement and risk metrics."
                    : "Позже здесь появятся рекомендации на основе Python ML‑пайплайна и логов событий."}
                </div>
              </div>
              <Button variant="outline">Refresh</Button>
            </div>

            <div className="mt-5 grid md:grid-cols-3 gap-3">
              <Insight title="23–30 min: engagement drop" text="Switch to interactive task or Q&A." />
              <Insight title="Camera quality low" text="Ask students to improve lighting and positioning." />
              <Insight title="High heterogeneity" text="Group has mixed engagement; split into smaller tasks." />
            </div>
          </Card>
        </Reveal>
      )}
    </div>
  );
}

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
      <div className="mt-2 text-3xl font-semibold">
        {loading ? "…" : value}
      </div>
      <div className="mt-2 text-sm text-white/50">{hint}</div>
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
