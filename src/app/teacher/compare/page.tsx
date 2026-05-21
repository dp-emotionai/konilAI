"use client";

import { useEffect, useMemo, useState } from "react";
import PageHero from "@/components/common/PageHero";
import Reveal from "@/components/common/Reveal";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { getTeacherSessionsAsReports, type ReportRow } from "@/lib/api/reports";
import { getSessionSummary, type SessionSummary } from "@/lib/api/teacher";

export default function TeacherComparePage() {
  const toast = useToast();

  const [sessions, setSessions] = useState<ReportRow[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [tab, setTab] = useState<"metrics" | "summary">("metrics");

  const [summaryA, setSummaryA] = useState<SessionSummary | null>(null);
  const [summaryB, setSummaryB] = useState<SessionSummary | null>(null);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoadingSessions(true);
    setError(null);

    getTeacherSessionsAsReports()
      .then((rows) => {
        if (!mounted) return;
        setSessions(rows);
        if (!a && rows[0]) setA(rows[0].id);
        if (!b && rows[1]) setB(rows[1].id);
      })
      .catch((e: any) => {
        if (!mounted) return;
        setError(e?.message || "Не удалось загрузить сессии.");
      })
      .finally(() => {
        if (mounted) setLoadingSessions(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!a) {
      setSummaryA(null);
      return;
    }
    setLoadingA(true);
    getSessionSummary(a)
      .then((s) => setSummaryA(s))
      .finally(() => setLoadingA(false));
  }, [a]);

  useEffect(() => {
    if (!b) {
      setSummaryB(null);
      return;
    }
    setLoadingB(true);
    getSessionSummary(b)
      .then((s) => setSummaryB(s))
      .finally(() => setLoadingB(false));
  }, [b]);

  const A = useMemo(
    () => (a ? sessions.find((x) => x.id === a) ?? null : null),
    [a, sessions]
  );
  const B = useMemo(
    () => (b ? sessions.find((x) => x.id === b) ?? null : null),
    [b, sessions]
  );

  return (
    <div className="space-y-6">
      <PageHero
        overline="Teacher"
        title="Compare sessions"
        subtitle="Сравнение вовлечённости, стресса и attention drops между двумя реальными сессиями."
        right={
          <Button
            onClick={() =>
              toast.push({
                type: "info",
                title: "Экспорт",
                text: "Реальный экспорт добавим отдельным endpoint'ом на бэкенде.",
              })
            }
          >
            Export comparison
          </Button>
        }
      />

      <Reveal>
        <Card className="p-6 md:p-7 space-y-5">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm text-muted">Select sessions</div>
              <div className="mt-2 text-lg font-semibold">A vs B</div>
            </div>
            <div className="flex items-center gap-2">
              {A && <Badge>{A.type.toUpperCase()}</Badge>}
              {B && <Badge>{B.type.toUpperCase()}</Badge>}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <select
              value={a ?? ""}
              onChange={(e) => setA(e.target.value || null)}
              className="h-11 rounded-2xl bg-surface-subtle/80 border border-[color:var(--border)] px-4 text-muted outline-none"
              disabled={loadingSessions || !sessions.length}
            >
              {!sessions.length && <option>Нет сессий</option>}
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.groupName})
                </option>
              ))}
            </select>

            <select
              value={b ?? ""}
              onChange={(e) => setB(e.target.value || null)}
              className="h-11 rounded-2xl bg-surface-subtle/80 border border-[color:var(--border)] px-4 text-muted outline-none"
              disabled={loadingSessions || !sessions.length}
            >
              {!sessions.length && <option>Нет сессий</option>}
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.groupName})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 rounded-2xl bg-surface-subtle/50 p-1">
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
                      : "text-muted hover:text-white"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted">
              Switch between numeric comparison and narrative summary.
            </span>
          </div>
        </Card>
      </Reveal>

      {tab === "metrics" && (
        <div className="grid lg:grid-cols-3 gap-4">
          <Reveal>
            <MetricCard
              title="Avg engagement"
              a={
                summaryA?.avgEngagement != null
                  ? `${summaryA.avgEngagement}%`
                  : "—"
              }
              b={
                summaryB?.avgEngagement != null
                  ? `${summaryB.avgEngagement}%`
                  : "—"
              }
              hint="Выше — лучше (вовлечённость группы)."
              loadingA={loadingA}
              loadingB={loadingB}
            />
          </Reveal>
          <Reveal>
            <MetricCard
              title="Avg stress"
              a={
                summaryA?.avgStress != null
                  ? `${summaryA.avgStress}%`
                  : "—"
              }
              b={
                summaryB?.avgStress != null
                  ? `${summaryB.avgStress}%`
                  : "—"
              }
              hint="Ниже — лучше (меньше напряжения)."
              loadingA={loadingA}
              loadingB={loadingB}
            />
          </Reveal>
          <Reveal>
            <MetricCard
              title="Attention drops"
              a={
                summaryA?.attentionDrops != null
                  ? String(summaryA.attentionDrops)
                  : "—"
              }
              b={
                summaryB?.attentionDrops != null
                  ? String(summaryB.attentionDrops)
                  : "—"
              }
              hint="Ниже — лучше (меньше провалов внимания)."
              loadingA={loadingA}
              loadingB={loadingB}
            />
          </Reveal>
        </div>
      )}

      {tab === "summary" && (
        <Reveal>
          <Card className="p-6 md:p-7">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="text-sm text-muted">Auto summary</div>
                <div className="mt-2 text-lg font-semibold">
                  Ключевые отличия (по summary)
                </div>
                <div className="mt-2 text-sm text-muted">
                  Текст формируется из агрегатов по сессиям (без raw-видео).
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  toast.push({
                    type: "success",
                    title: "Summary обновлён",
                    text: "Данные подтягиваются из /sessions/:id/summary.",
                  })
                }
              >
                Regenerate
              </Button>
            </div>

            <div className="mt-5 grid md:grid-cols-3 gap-3">
              <Insight
                title="Engagement"
                text={
                  summaryA?.avgEngagement != null &&
                  summaryB?.avgEngagement != null
                    ? summaryA.avgEngagement > summaryB.avgEngagement
                      ? "Сессия A показывает более стабильную и высокую вовлечённость."
                      : "Сессия B показывает более стабильную и высокую вовлечённость."
                    : "Когда summary по обеим сессиям будут готовы, здесь появится сравнение вовлечённости."
                }
              />
              <Insight
                title="Stress"
                text={
                  summaryA?.avgStress != null &&
                  summaryB?.avgStress != null
                    ? summaryA.avgStress < summaryB.avgStress
                      ? "В сессии A средний стресс ниже — атмосфера более спокойная."
                      : "В сессии B средний стресс ниже — атмосфера более спокойная."
                    : "Как только backend начнёт отдавать avgStress, здесь появится сравнение."
                }
              />
              <Insight
                title="Recommendation"
                text={
                  summaryA?.attentionDrops != null &&
                  summaryB?.attentionDrops != null
                    ? summaryA.attentionDrops > summaryB.attentionDrops
                      ? "Попробуйте добавить больше интерактива в сессию A в моменты падения внимания."
                      : "Попробуйте добавить больше интерактива в сессию B в моменты падения внимания."
                    : "Рекомендации появятся после того, как будут известны attention drops по обеим сессиям."
                }
              />
            </div>
          </Card>
        </Reveal>
      )}
    </div>
  );
}

function MetricCard({
  title,
  a,
  b,
  hint,
  loadingA,
  loadingB,
}: {
  title: string;
  a: string;
  b: string;
  hint: string;
  loadingA?: boolean;
  loadingB?: boolean;
}) {
  return (
    <Card className="p-6 md:p-7">
      <div className="text-sm text-muted">{title}</div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-[color:var(--border)] bg-black/25 p-4">
          <div className="text-xs text-muted">Session A</div>
          <div className="mt-1 text-2xl font-semibold">
            {loadingA ? "…" : a}
          </div>
        </div>
        <div className="rounded-2xl border border-[color:var(--border)] bg-black/25 p-4">
          <div className="text-xs text-muted">Session B</div>
          <div className="mt-1 text-2xl font-semibold">
            {loadingB ? "…" : b}
          </div>
        </div>
      </div>
      <div className="mt-3 text-sm text-muted">{hint}</div>
    </Card>
  );
}

function Insight({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-black/25 p-4 hover:bg-surface-subtle/50 transition">
      <div className="font-semibold">{title}</div>
      <div className="mt-2 text-sm text-muted">{text}</div>
    </div>
  );
}
