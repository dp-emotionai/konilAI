"use client";

import { useMemo, useState, type ReactNode } from "react";
import useSWR from "swr";
import { useParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileJson,
  FileSpreadsheet,
  FileText,
  Info,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Reveal from "@/components/common/Reveal";
import { cn } from "@/lib/cn";
import { TeacherSessionTabs } from "@/components/session/TeacherSessionTabs";
import { AnalyticsStates } from "@/components/analytics/AnalyticsStates";
import {
  exportSessionReport,
  fetchSessionAnalytics,
  type SessionAnalytics,
} from "@/lib/api/analytics";

const sessionAnalyticsKey = (id: string) => `analytics-session-${id}`;

type LocalTab = "integrity" | "participants" | "controls";

type ExamParticipant = {
  id?: string;
  fullName?: string;
  engagement?: number | null;
  stress?: number | null;
  risk?: number | null;
  focus?: number | null;
  integrityScore?: number | null;
  status?: string | null;
};

type ExamAnalytics = SessionAnalytics & {
  integrityScore?: number | null;
  focusStability?: number | null;
  stressLevel?: number | null;
  suspiciousEvents?: number | null;
  attentionAnomalies?: number | null;
  stressSpikes?: number | null;
  participants?: ExamParticipant[];
  recommendations?: string[];
};

function formatPercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(value)}%`
    : "Нет данных";
}

function formatNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? String(Math.round(value))
    : "Нет данных";
}

function MetricCard({
  icon,
  title,
  value,
  description,
  warning = false,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  description: string;
  warning?: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 text-[#7448FF]">
            {icon}
          </div>
          <div>
            <div className="text-sm font-medium text-slate-500">{title}</div>
            <div className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
              {value}
            </div>
          </div>
        </div>

        <Badge
          variant={warning ? "warning" : "secondary"}
          className="rounded-full px-3 py-1 text-xs font-medium"
        >
          {warning ? "Требует внимания" : "Данные сессии"}
        </Badge>
      </div>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            "h-full rounded-full",
            warning ? "bg-orange-400" : "bg-[#7448FF]"
          )}
          style={{
            width: value.endsWith("%")
              ? `${Math.max(0, Math.min(100, Number.parseFloat(value)))}%`
              : "0%",
          }}
        />
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function SignalRow({
  icon,
  title,
  description,
  value,
  tone,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  value: string;
  tone: "purple" | "orange" | "red";
}) {
  const toneClass = {
    purple: "bg-purple-100 text-[#7448FF]",
    orange: "bg-orange-100 text-orange-500",
    red: "bg-red-100 text-red-500",
  }[tone];

  return (
    <div className="flex items-center gap-4 border-b border-slate-100 py-4 last:border-b-0">
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full", toneClass)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-slate-900">{title}</div>
        <div className="mt-1 text-sm leading-5 text-slate-500">{description}</div>
      </div>
      <div className="text-right">
        <div className="text-xl font-semibold text-slate-900">{value}</div>
      </div>
    </div>
  );
}

function ParticipantTable({ participants }: { participants: ExamParticipant[] }) {
  if (!participants.length) {
    return (
      <div className="rounded-[24px] border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Данные по участникам экзамена пока не поступили.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.05)]">
      <div className="border-b border-slate-100 px-5 py-4">
        <h3 className="font-semibold text-slate-900">Участники</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">Студент</th>
              <th className="px-5 py-3 font-medium">Фокус</th>
              <th className="px-5 py-3 font-medium">Integrity score</th>
              <th className="px-5 py-3 font-medium">Стресс</th>
              <th className="px-5 py-3 font-medium">Риск</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((participant, index) => {
              const focus = participant.focus ?? participant.engagement;
              const integrity = participant.integrityScore;
              const stress = participant.stress;
              const risk = participant.risk;

              return (
                <tr key={participant.id ?? `${participant.fullName}-${index}`} className="border-t border-slate-100">
                  <td className="px-5 py-4">
                    <div className="font-medium text-slate-900">
                      {participant.fullName || "Без имени"}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">{formatPercent(focus)}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{formatPercent(integrity)}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{formatPercent(stress)}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{formatPercent(risk)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LocalTabs({
  tab,
  setTab,
}: {
  tab: LocalTab;
  setTab: (tab: LocalTab) => void;
}) {
  const tabs: { id: LocalTab; label: string }[] = [
    { id: "integrity", label: "Integrity insights" },
    { id: "participants", label: "Участники" },
    { id: "controls", label: "Контроль" },
  ];

  return (
    <div className="flex flex-wrap gap-7 border-b border-slate-200">
      {tabs.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => setTab(item.id)}
          className={cn(
            "relative -mb-px px-1 pb-3 text-sm font-medium transition",
            tab === item.id
              ? "text-[#7448FF]"
              : "text-slate-600 hover:text-slate-900"
          )}
        >
          {item.label}
          {tab === item.id && (
            <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#7448FF]" />
          )}
        </button>
      ))}
    </div>
  );
}

export default function TeacherExamAnalyticsPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id ?? "";
  const [tab, setTab] = useState<LocalTab>("integrity");
  const [exporting, setExporting] = useState<"json" | "csv" | "pdf" | null>(null);

  const { data, error, isLoading, mutate } = useSWR(
    sessionId ? sessionAnalyticsKey(sessionId) : null,
    () => fetchSessionAnalytics(sessionId),
    { revalidateOnFocus: false }
  );

  const analytics = data as ExamAnalytics | undefined;

  const participants = useMemo(
    () => (Array.isArray(analytics?.participants) ? analytics.participants : []),
    [analytics?.participants]
  );

  const recommendations = useMemo(() => {
    if (Array.isArray(analytics?.recommendations)) {
      return analytics.recommendations.filter(Boolean);
    }

    return analytics?.aiSummary ? [analytics.aiSummary] : [];
  }, [analytics?.recommendations, analytics?.aiSummary]);

  const handleExport = async (format: "json" | "csv" | "pdf") => {
    if (!sessionId || exporting) return;
    setExporting(format);
    try {
      await exportSessionReport(sessionId, format);
    } finally {
      setExporting(null);
    }
  };

  const hasError = Boolean(error);
  const empty = !isLoading && !hasError && !analytics;

  return (
    <div className="relative -m-4 min-h-[calc(100vh-72px)] overflow-hidden bg-gradient-to-br from-white via-slate-50 to-purple-50/40 p-4 md:-m-6 md:p-6 lg:-m-8 lg:p-8">
      <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-[780px] -translate-x-1/2 rounded-full bg-purple-100/60 blur-3xl" />

      <div className="relative mx-auto max-w-[1800px] space-y-6">
        <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#7448FF]">
              Teacher • Exam analytics
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
              Экзаменационная аналитика
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-500">
              Аналитика экзаменационной сессии на основе реально собранных метрик.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant={analytics ? "success" : "secondary"}
              className="gap-2 rounded-2xl px-4 py-2 text-sm font-medium"
            >
              <CheckCircle2 size={16} />
              {analytics ? "Данные загружены" : "Нет данных"}
            </Badge>

            <Button
              size="sm"
              variant="outline"
              disabled={!!exporting}
              onClick={() => handleExport("json")}
              className="h-11 gap-2 rounded-2xl bg-white px-5"
            >
              <FileJson size={16} /> {exporting === "json" ? "…" : "JSON"}
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={!!exporting}
              onClick={() => handleExport("csv")}
              className="h-11 gap-2 rounded-2xl bg-white px-5"
            >
              <FileSpreadsheet size={16} /> {exporting === "csv" ? "…" : "CSV"}
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={!!exporting}
              onClick={() => handleExport("pdf")}
              className="h-11 gap-2 rounded-2xl bg-white px-5"
            >
              <FileText size={16} /> {exporting === "pdf" ? "…" : "PDF"}
            </Button>
          </div>
        </section>

        <TeacherSessionTabs sessionId={sessionId} />
        <LocalTabs tab={tab} setTab={setTab} />

        <AnalyticsStates
          loading={isLoading}
          error={hasError}
          empty={empty}
          onRetry={() => mutate()}
          emptyTitle="Нет экзаменационных данных"
          emptyDescription="После проведения экзамена и поступления метрик аналитика появится здесь."
        >
          {analytics && (
            <div className="space-y-6">
              {tab === "integrity" && (
                <>
                  <div className="grid gap-5 lg:grid-cols-3">
                    <Reveal>
                      <MetricCard
                        icon={<ShieldCheck size={28} />}
                        title="Integrity score"
                        value={formatPercent(analytics.integrityScore)}
                        description="Композитная оценка, полученная от аналитического API."
                        warning={
                          typeof analytics.integrityScore === "number" &&
                          analytics.integrityScore < 70
                        }
                      />
                    </Reveal>

                    <Reveal>
                      <MetricCard
                        icon={<Eye size={28} />}
                        title="Focus stability"
                        value={formatPercent(
                          analytics.focusStability ?? analytics.averageEngagement
                        )}
                        description="Устойчивость внимания по собранным данным сессии."
                      />
                    </Reveal>

                    <Reveal>
                      <MetricCard
                        icon={<Zap size={28} />}
                        title="Stress level"
                        value={formatPercent(analytics.stressLevel)}
                        description="Уровень стресса, рассчитанный серверной аналитикой."
                        warning={
                          typeof analytics.stressLevel === "number" &&
                          analytics.stressLevel >= 70
                        }
                      />
                    </Reveal>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[0.95fr_1.35fr_1fr]">
                    <Reveal>
                      <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.05)]">
                        <div className="mb-2 flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900">Ключевые сигналы</h3>
                          <Info size={15} className="text-slate-400" />
                        </div>

                        <SignalRow
                          icon={<Users size={20} />}
                          title="Подозрительные события"
                          description="События, отмеченные аналитическим API."
                          value={formatNumber(analytics.suspiciousEvents)}
                          tone="orange"
                        />
                        <SignalRow
                          icon={<Eye size={20} />}
                          title="Аномалии внимания"
                          description="Зафиксированные отклонения внимания."
                          value={formatNumber(
                            analytics.attentionAnomalies ?? analytics.attentionDrops
                          )}
                          tone="purple"
                        />
                        <SignalRow
                          icon={<Zap size={20} />}
                          title="Всплески стресса"
                          description="События стресса, полученные из API."
                          value={formatNumber(
                            analytics.stressSpikes ?? analytics.stressEvents
                          )}
                          tone="red"
                        />
                      </div>
                    </Reveal>

                    <Reveal>
                      <ParticipantTable participants={participants} />
                    </Reveal>

                    <Reveal>
                      <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.05)]">
                        <div className="mb-5 flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900">
                            Рекомендации и сводка
                          </h3>
                          <Info size={15} className="text-slate-400" />
                        </div>

                        {recommendations.length ? (
                          <ul className="space-y-3">
                            {recommendations.map((item, index) => (
                              <li key={`${item}-${index}`} className="flex gap-3 text-sm leading-6 text-slate-600">
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7448FF]" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
                            Рекомендации пока не сформированы.
                          </div>
                        )}

                        <div className="mt-6 flex gap-3 rounded-2xl bg-purple-50/70 p-4 text-sm leading-6 text-purple-900">
                          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-[#7448FF]" />
                          Эта аналитика носит рекомендательный характер и не является дисциплинарным доказательством.
                        </div>
                      </div>
                    </Reveal>
                  </div>
                </>
              )}

              {tab === "participants" && (
                <Reveal>
                  <ParticipantTable participants={participants} />
                </Reveal>
              )}

              {tab === "controls" && (
                <Reveal>
                  <div className="rounded-[24px] border border-dashed border-slate-200 bg-white p-8 text-sm leading-6 text-slate-500">
                    Здесь отображаются только реальные настройки и события контроля, когда они приходят из backend API.
                  </div>
                </Reveal>
              )}
            </div>
          )}
        </AnalyticsStates>
      </div>
    </div>
  );
}
