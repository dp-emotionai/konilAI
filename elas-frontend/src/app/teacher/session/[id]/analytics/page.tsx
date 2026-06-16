"use client";

import { useMemo, useState, type ReactNode } from "react";
import useSWR from "swr";
import { useParams } from "next/navigation";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import {
    CheckCircle2,
    Eye,
    FileJson,
    FileSpreadsheet,
    FileText,
    Info,
    TrendingUp,
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
const PURPLE = "#7C3AED";

type LocalTab = "overview" | "timeline" | "participants" | "insights";

function formatTimelineTime(value?: number | string) {
    const raw = typeof value === "string" ? Number(value) : value;
    const totalSeconds = Math.max(0, Math.floor(Number.isFinite(raw) ? Number(raw) : 0));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function MetricCard({
                        icon,
                        title,
                        value,
                        subtitle,
                        tone = "purple",
                    }: {
    icon: ReactNode;
    title: string;
    value: string;
    subtitle: string;
    tone?: "purple" | "blue" | "orange";
}) {
    const toneClass = {
        purple: "bg-purple-100 text-[#7448FF]",
        blue: "bg-indigo-100 text-indigo-500",
        orange: "bg-orange-100 text-orange-500",
    }[tone];

    return (
        <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.05)]">
            <div className="flex items-center justify-between gap-4">
                <div
                    className={cn(
                        "flex h-16 w-16 items-center justify-center rounded-full",
                        toneClass,
                    )}
                >
                    {icon}
                </div>
            </div>

            <div className="mt-4 pl-[84px] md:pl-[84px]">
                <div className="text-sm font-medium text-slate-500">{title}</div>
                <div className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
                    {value}
                </div>
                <div className="mt-2 text-sm text-slate-500">{subtitle}</div>
            </div>
        </div>
    );
}

function ChartCard({ analytics }: { analytics: SessionAnalytics }) {

    const chartData = useMemo(() => {
        if (analytics.timeline?.length) {
            return analytics.timeline.map((point) => ({
                timeSec: point.fromSec ?? point.timeSec,
                fromSec: point.fromSec ?? point.timeSec,
                toSec: point.toSec ?? point.timeSec,
                engagement: point.engagement ?? 0,
                stress: point.stress ?? 0,
            }));
        }

        return [];
    }, [analytics.timeline]);

    return (
        <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.05)] lg:col-span-2">
            <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900">
                        Вовлечённость в течение сессии
                    </h3>
                    <Info size={15} className="text-slate-400" />
                </div>
                <button className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                    Вся сессия
                </button>
            </div>

            <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                        data={chartData}
                        margin={{ top: 10, right: 14, left: -8, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient
                                id="engagementGradient"
                                x1="0"
                                x2="0"
                                y1="0"
                                y2="1"
                            >
                                <stop offset="0%" stopColor={PURPLE} stopOpacity={0.25} />
                                <stop offset="100%" stopColor={PURPLE} stopOpacity={0.03} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            strokeDasharray="4 4"
                            stroke="#E9E5F5"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="timeSec"
                            type="number"
                            domain={["dataMin", "dataMax"]}
                            tickFormatter={(value) => formatTimelineTime(value)}
                            tick={{ fill: "#64748B", fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            domain={[0, 100]}
                            tickFormatter={(value) => `${value}%`}
                            tick={{ fill: "#64748B", fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            contentStyle={{
                                borderRadius: 16,
                                border: "1px solid #E2E8F0",
                                boxShadow: "0 18px 45px rgba(15,23,42,.08)",
                            }}
                            labelFormatter={(label) => `Время: ${formatTimelineTime(label)}`}
                            formatter={(value: unknown, name) => [
                                `${Number(value).toFixed(0)}%`,
                                name === "engagement" ? "Вовлечённость" : "Стресс",
                            ]}
                        />
                        <Area
                            type="monotone"
                            dataKey="engagement"
                            stroke={PURPLE}
                            fill="url(#engagementGradient)"
                            strokeWidth={2.5}
                            dot={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="mt-2 flex gap-6 text-xs font-medium text-slate-500">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#7448FF]" />
          Вовлечённость
        </span>
                <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-purple-100" />
          Провалы внимания
        </span>
            </div>
        </div>
    );
}

function AttentionSummary({ total }: { total: number | null | undefined }) {
    return (
        <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.05)]">
            <div className="mb-4 flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900">
                    Провалы внимания
                </h3>
                <Info size={15} className="text-slate-400" />
            </div>
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl bg-slate-50/70 text-center">
                <div className="flex h-28 w-28 items-center justify-center rounded-full border-[10px] border-purple-100 bg-white shadow-inner">
          <span className="text-3xl font-semibold text-slate-900">
            {total ?? "—"}
          </span>
                </div>
                <p className="mt-4 max-w-xs text-sm leading-6 text-slate-500">
                    Общее количество зафиксированных снижений внимания за выбранную
                    сессию.
                </p>
            </div>
        </div>
    );
}

function InsightPanel({ analytics }: { analytics: SessionAnalytics }) {
    return (
        <div className="rounded-[24px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.05)]">
            <div className="mb-5 flex items-center gap-2">
                <h3 className="text-base font-semibold text-slate-900">
                    Ключевые инсайты
                </h3>
                <Info size={15} className="text-slate-400" />
            </div>
            {analytics.aiSummary ? (
                <div className="rounded-2xl bg-purple-50/70 p-4 text-sm leading-relaxed text-slate-600">
                    {analytics.aiSummary}
                </div>
            ) : (
                <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center text-sm leading-6 text-slate-500">
                    Инсайты появятся после обработки реальных метрик этой лекционной
                    сессии.
                </div>
            )}
        </div>
    );
}

function ParticipantStrip({ analytics }: { analytics: SessionAnalytics }) {
    const participants = (analytics.participants ?? [])
        .slice(0, 3)
        .map((participant) => {
            const engagement = participant.engagement ?? null;
            const stress = participant.stress ?? null;
            const drops = participant.risk ?? null;
            const label =
                engagement == null
                    ? "Нет данных"
                    : engagement >= 80
                        ? "Высокая вовлечённость"
                        : engagement >= 60
                            ? "Средняя вовлечённость"
                            : "Низкая вовлечённость";

            return {
                name: participant.fullName,
                engagement,
                stress,
                drops,
                label,
                avatar: participant.fullName.slice(0, 2).toUpperCase(),
            };
        });

    if (!participants.length) {
        return (
            <section className="rounded-[24px] border border-dashed border-slate-200 bg-white/70 p-8 text-center text-sm text-slate-500">
                Данные по участникам этой лекционной сессии пока не поступили.
            </section>
        );
    }

    return (
        <section>
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-slate-900">
                        Инсайты по участникам
                    </h2>
                    <Info size={16} className="text-slate-400" />
                </div>
                <button className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
                    <Users size={16} className="text-[#7448FF]" /> Все участники
                </button>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
                {participants.map((participant) => (
                    <div
                        key={participant.name}
                        className="rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_16px_45px_rgba(15,23,42,0.05)]"
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 text-sm font-semibold text-[#7448FF]">
                                    {participant.avatar}
                                </div>
                                <div>
                                    <div className="font-semibold text-slate-900">
                                        {participant.name}
                                    </div>
                                </div>
                            </div>
                            <span
                                className={cn(
                                    "rounded-full px-3 py-1 text-xs font-medium",
                                    participant.engagement == null
                                        ? "bg-slate-100 text-slate-500"
                                        : participant.engagement >= 80
                                            ? "bg-emerald-50 text-emerald-600"
                                            : participant.engagement >= 60
                                                ? "bg-orange-50 text-orange-500"
                                                : "bg-red-50 text-red-500",
                                )}
                            >
                {participant.label}
              </span>
                        </div>
                        <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                            <MiniStat
                                label="Вовлечённость"
                                value={
                                    participant.engagement == null
                                        ? "—"
                                        : `${participant.engagement}%`
                                }
                                tone="purple"
                            />
                            <MiniStat
                                label="Стресс"
                                value={
                                    participant.stress == null
                                        ? "—"
                                        : participant.stress > 70
                                            ? "Высокий"
                                            : participant.stress > 40
                                                ? "Средний"
                                                : "Низкий"
                                }
                                tone={
                                    participant.stress == null
                                        ? "blue"
                                        : participant.stress > 70
                                            ? "red"
                                            : participant.stress > 40
                                                ? "orange"
                                                : "green"
                                }
                            />
                            <MiniStat
                                label="Провалы"
                                value={
                                    participant.drops == null ? "—" : String(participant.drops)
                                }
                                tone="blue"
                            />
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

function MiniStat({
                      label,
                      value,
                      tone,
                  }: {
    label: string;
    value: string;
    tone: "purple" | "green" | "orange" | "red" | "blue";
}) {
    const toneClass = {
        purple: "text-[#7448FF]",
        green: "text-emerald-600",
        orange: "text-orange-500",
        red: "text-red-500",
        blue: "text-indigo-500",
    }[tone];
    return (
        <div>
            <div className="text-xs text-slate-500">{label}</div>
            <div className={cn("mt-1 text-lg font-semibold", toneClass)}>{value}</div>
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
        { id: "overview", label: "Обзор" },
        { id: "timeline", label: "Таймлайн" },
        { id: "participants", label: "Участники" },
        { id: "insights", label: "Инсайты" },
    ];

    return (
        <div className="flex flex-wrap items-center justify-between gap-4">
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
                                : "text-slate-600 hover:text-slate-900",
                        )}
                    >
                        {item.label}
                        {tab === item.id && (
                            <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#7448FF]" />
                        )}
                    </button>
                ))}
            </div>
            <span className="text-sm text-slate-400">
        КПИ, графики и рекомендации.
      </span>
        </div>
    );
}

export default function TeacherLectureAnalyticsPage() {
    const params = useParams<{ id: string }>();
    const sessionId = params.id ?? "";
    const [tab, setTab] = useState<LocalTab>("overview");
    const [exporting, setExporting] = useState<"json" | "csv" | "pdf" | null>(
        null,
    );

    const {
        data: analytics,
        error,
        isLoading,
        mutate,
    } = useSWR(
        sessionId ? sessionAnalyticsKey(sessionId) : null,
        () => fetchSessionAnalytics(sessionId),
        { revalidateOnFocus: false },
    );

    const handleExport = async (format: "json" | "csv" | "pdf") => {
        if (!sessionId || exporting) return;
        setExporting(format);
        try {
            await exportSessionReport(sessionId, format);
        } finally {
            setExporting(null);
        }
    };

    const safeAnalytics = analytics;

    const loading = isLoading;
    const hasError = Boolean(error);
    const empty = !loading && !hasError && !analytics;

    return (
        <div className="relative -m-4 min-h-[calc(100vh-72px)] overflow-hidden bg-gradient-to-br from-white via-slate-50 to-purple-50/40 p-4 md:-m-6 md:p-6 lg:-m-8 lg:p-8">
            <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-[780px] -translate-x-1/2 rounded-full bg-purple-100/60 blur-3xl" />

            <div className="relative mx-auto max-w-[1800px] space-y-6">
                <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-[#7448FF]">
                            Преподаватель • Аналитика лекции
                        </div>
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                            Аналитика сессии
                        </h1>
                        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-500">
                            Сводка по вовлечённости и вниманию на основе собранных метрик.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Badge
                            variant={analytics ? "success" : "secondary"}
                            className="gap-2 rounded-2xl px-4 py-2 text-sm font-medium"
                        >
                            <CheckCircle2 size={16} />{" "}
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
                    loading={loading}
                    error={hasError}
                    empty={empty}
                    onRetry={() => mutate()}
                    emptyTitle="Нет данных по сессии"
                    emptyDescription="Запустите сессию и соберите метрики — аналитика появится здесь."
                >
                    {safeAnalytics && (
                        <div className="space-y-6">
                            {tab === "overview" && (
                                <>
                                    <div className="grid gap-5 lg:grid-cols-3">
                                        <Reveal>
                                            <MetricCard
                                                icon={<TrendingUp size={30} />}
                                                title="Средняя вовлечённость"
                                                value={
                                                    safeAnalytics.averageEngagement == null
                                                        ? "—"
                                                        : `${safeAnalytics.averageEngagement}%`
                                                }
                                                subtitle="Среднее по сессии"
                                            />
                                        </Reveal>
                                        <Reveal>
                                            <MetricCard
                                                icon={<Zap size={30} />}
                                                title="События стресса"
                                                value={
                                                    safeAnalytics.stressEvents == null
                                                        ? "—"
                                                        : String(safeAnalytics.stressEvents)
                                                }
                                                subtitle="Зафиксированные пики"
                                                tone="orange"
                                            />
                                        </Reveal>
                                        <Reveal>
                                            <MetricCard
                                                icon={<Eye size={30} />}
                                                title="Провалы внимания"
                                                value={
                                                    safeAnalytics.attentionDrops == null
                                                        ? "—"
                                                        : String(safeAnalytics.attentionDrops)
                                                }
                                                subtitle="Снижения фокуса"
                                                tone="blue"
                                            />
                                        </Reveal>
                                    </div>

                                    <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr_0.9fr]">
                                        <Reveal className="xl:col-span-1">
                                            <ChartCard analytics={safeAnalytics} />
                                        </Reveal>
                                        <Reveal>
                                            <AttentionSummary total={safeAnalytics.attentionDrops} />
                                        </Reveal>
                                        <Reveal>
                                            <InsightPanel analytics={safeAnalytics} />
                                        </Reveal>
                                    </div>

                                    <Reveal>
                                        <ParticipantStrip analytics={safeAnalytics} />
                                    </Reveal>
                                </>
                            )}

                            {tab === "timeline" && (
                                <Reveal>
                                    <ChartCard analytics={safeAnalytics} />
                                </Reveal>
                            )}

                            {tab === "participants" && (
                                <Reveal>
                                    <ParticipantStrip analytics={safeAnalytics} />
                                </Reveal>
                            )}

                            {tab === "insights" && (
                                <Reveal>
                                    <InsightPanel analytics={safeAnalytics} />
                                </Reveal>
                            )}
                        </div>
                    )}
                </AnalyticsStates>
            </div>
        </div>
    );
}
