"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  FileText,
  HeartPulse,
  Info,
  Sparkles,
  Upload,
  Zap,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { getTeacherSessionsAsReports, type ReportRow } from "@/lib/api/reports";
import { getSessionSummary, type SessionSummary } from "@/lib/api/teacher";

type CompareTab = "metrics" | "summary";
type MetricKind = "engagement" | "stress" | "drops";

export default function TeacherComparePage() {
  const toast = useToast();

  const [sessions, setSessions] = useState<ReportRow[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [tab, setTab] = useState<CompareTab>("metrics");
  const [summaryStateA, setSummaryStateA] = useState<{ id: string; data: SessionSummary | null } | null>(null);
  const [summaryStateB, setSummaryStateB] = useState<{ id: string; data: SessionSummary | null } | null>(null);

  useEffect(() => {
    let mounted = true;
    getTeacherSessionsAsReports()
      .then((rows) => {
        if (!mounted) return;
        setSessions(rows);
        setA((current) => current ?? rows[0]?.id ?? null);
        setB((current) => current ?? rows[1]?.id ?? rows[0]?.id ?? null);
      })
      .catch((reason: unknown) => {
        if (!mounted) return;
        setError(getErrorMessage(reason));
      })
      .finally(() => {
        if (mounted) setLoadingSessions(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!a) return;
    let mounted = true;

    getSessionSummary(a).then((summary) => {
      if (mounted) setSummaryStateA({ id: a, data: summary });
    });

    return () => {
      mounted = false;
    };
  }, [a]);

  useEffect(() => {
    if (!b) return;
    let mounted = true;

    getSessionSummary(b).then((summary) => {
      if (mounted) setSummaryStateB({ id: b, data: summary });
    });

    return () => {
      mounted = false;
    };
  }, [b]);

  const summaryA = summaryStateA?.id === a ? summaryStateA.data : null;
  const summaryB = summaryStateB?.id === b ? summaryStateB.data : null;
  const loadingA = Boolean(a && summaryStateA?.id !== a);
  const loadingB = Boolean(b && summaryStateB?.id !== b);

  const sessionA = useMemo(
    () => (a ? sessions.find((session) => session.id === a) ?? null : null),
    [a, sessions]
  );
  const sessionB = useMemo(
    () => (b ? sessions.find((session) => session.id === b) ?? null : null),
    [b, sessions]
  );

  const typeLabel = useMemo(() => {
    if (!sessionA && !sessionB) return "СЕССИЯ";
    if (sessionA?.type === sessionB?.type) return formatSessionType(sessionA?.type);
    return `${formatSessionType(sessionA?.type)} · ${formatSessionType(sessionB?.type)}`;
  }, [sessionA, sessionB]);

  const handleExport = () => {
    if (!sessionA || !sessionB) {
      toast.push({
        type: "error",
        title: "Экспорт недоступен",
        text: "Сначала выберите две сессии для сравнения.",
      });
      return;
    }

    const rows = [
      ["Показатель", "Сессия A", "Сессия B"],
      ["Название", sessionA.title, sessionB.title],
      ["Группа", sessionA.groupName, sessionB.groupName],
      ["Средняя вовлечённость", formatCsvMetric(summaryA?.avgEngagement, "%"), formatCsvMetric(summaryB?.avgEngagement, "%")],
      ["Средний стресс", formatCsvMetric(summaryA?.avgStress, "%"), formatCsvMetric(summaryB?.avgStress, "%")],
      ["Провалы внимания", formatCsvMetric(summaryA?.attentionDrops), formatCsvMetric(summaryB?.attentionDrops)],
    ];

    const csv = `\uFEFF${rows.map((row) => row.map(escapeCsvCell).join(";")).join("\r\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `сравнение-сессий-${safeFilePart(sessionA.title)}-${safeFilePart(sessionB.title)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    toast.push({
      type: "success",
      title: "Файл готов",
      text: "Сравнение сессий скачано в формате CSV.",
    });
  };

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-violet-100/70 bg-[radial-gradient(circle_at_72%_5%,rgba(139,92,246,0.18),transparent_24%),linear-gradient(180deg,#fbfaff_0%,#ffffff_42%,#f8f7ff_100%)] px-4 py-7 shadow-[0_20px_70px_rgba(88,57,180,0.08)] sm:px-6 md:px-8 md:py-9 lg:px-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute right-8 top-12 h-40 w-80 rounded-full border border-violet-200/50 opacity-70" />
        <div className="absolute right-3 top-20 h-40 w-80 rounded-full border border-violet-200/35 opacity-60" />
        <div className="absolute -left-24 top-52 h-52 w-52 rounded-full bg-violet-100/70 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1080px]">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Преподаватель</div>
            <h1 className="mt-2 text-4xl font-bold tracking-[-0.04em] text-slate-950 sm:text-5xl">
              Сравнение сессий
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Сравнение вовлечённости, стресса и провалов внимания между двумя реальными сессиями.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="inline-flex h-12 items-center justify-center gap-2 self-start rounded-xl bg-[linear-gradient(135deg,#8b2cf6,#6d28d9)] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(109,40,217,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(109,40,217,0.32)] sm:self-auto"
          >
            <Upload size={18} aria-hidden="true" />
            Скачать CSV
          </button>
        </header>

        <section className="mt-7 rounded-[24px] border border-slate-200 bg-white/95 p-5 shadow-[0_16px_45px_rgba(30,41,59,0.08)] backdrop-blur sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-slate-500">Выберите сессии</div>
              <h2 className="mt-1 text-xl font-bold text-slate-950">Сессия A и сессия B</h2>
            </div>
            <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold text-violet-600">
              {typeLabel}
            </span>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <SessionSelect
              id="session-a"
              label="Сессия A"
              value={a}
              sessions={sessions}
              loading={loadingSessions}
              onChange={setA}
            />
            <SessionSelect
              id="session-b"
              label="Сессия B"
              value={b}
              sessions={sessions}
              loading={loadingSessions}
              onChange={setB}
            />
          </div>

          <div className="mt-5 grid grid-cols-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
            <TabButton
              active={tab === "metrics"}
              onClick={() => setTab("metrics")}
              icon={<BarChart3 size={18} />}
            >
              Метрики
            </TabButton>
            <TabButton
              active={tab === "summary"}
              onClick={() => setTab("summary")}
              icon={<FileText size={18} />}
            >
              Сводка
            </TabButton>
          </div>
        </section>

        {tab === "metrics" ? (
          <div className="mt-4 space-y-4">
            <MetricComparisonCard
              kind="engagement"
              title="Средняя вовлечённость"
              icon={<Sparkles size={21} />}
              a={summaryA?.avgEngagement ?? null}
              b={summaryB?.avgEngagement ?? null}
              loadingA={loadingA}
              loadingB={loadingB}
              hint="Выше — лучше (вовлечённость группы)."
            />
            <MetricComparisonCard
              kind="stress"
              title="Средний стресс"
              icon={<HeartPulse size={21} />}
              a={summaryA?.avgStress ?? null}
              b={summaryB?.avgStress ?? null}
              loadingA={loadingA}
              loadingB={loadingB}
              hint="Ниже — лучше (меньше напряжения)."
            />
            <MetricComparisonCard
              kind="drops"
              title="Провалы внимания"
              icon={<Zap size={21} />}
              a={summaryA?.attentionDrops ?? null}
              b={summaryB?.attentionDrops ?? null}
              loadingA={loadingA}
              loadingB={loadingB}
              hint="Ниже — лучше (меньше провалов внимания)."
            />
          </div>
        ) : (
          <SummaryPanel summaryA={summaryA} summaryB={summaryB} />
        )}
      </div>
    </div>
  );
}

function SessionSelect({
  id,
  label,
  value,
  sessions,
  loading,
  onChange,
}: {
  id: string;
  label: string;
  value: string | null;
  sessions: ReportRow[];
  loading: boolean;
  onChange: (value: string | null) => void;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-600">{label}</span>
      <select
        id={id}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        className="h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-[15px] font-medium text-slate-900 outline-none transition hover:border-violet-300 focus:border-violet-500 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        disabled={loading || !sessions.length}
      >
        {!sessions.length && <option value="">Нет сессий</option>}
        {sessions.map((session) => (
          <option key={session.id} value={session.id}>
            {session.title} ({session.groupName})
          </option>
        ))}
      </select>
    </label>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition",
        active
          ? "bg-[linear-gradient(90deg,#f0e8ff,#ffffff)] text-violet-600 shadow-sm"
          : "text-slate-500 hover:bg-white hover:text-slate-800"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function MetricComparisonCard({
  kind,
  title,
  icon,
  a,
  b,
  loadingA,
  loadingB,
  hint,
}: {
  kind: MetricKind;
  title: string;
  icon: ReactNode;
  a: number | null;
  b: number | null;
  loadingA: boolean;
  loadingB: boolean;
  hint: string;
}) {
  const lowerIsBetter = kind !== "engagement";
  const difference = getDifference(a, b, lowerIsBetter);
  const maxValue = kind === "drops" ? Math.max(a ?? 0, b ?? 0, 10) : 100;

  return (
    <section className="rounded-[24px] border border-slate-200 bg-white/95 p-5 shadow-[0_16px_45px_rgba(30,41,59,0.07)] sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            {icon}
          </span>
          <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        </div>
        <Info size={19} className="text-slate-400" aria-hidden="true" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MetricValue
          label="Сессия A"
          value={a}
          loading={loadingA}
          kind={kind}
          accent
        />
        <MetricValue
          label="Сессия B"
          value={b}
          loading={loadingB}
          kind={kind}
        />
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Progress value={a} max={maxValue} accent />
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-[11px] font-bold text-slate-600 shadow-sm">
          и
        </span>
        <Progress value={b} max={maxValue} />
      </div>

      <div className="mt-3 flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-slate-500">{hint}</span>
        <DifferenceBadge difference={difference} kind={kind} />
      </div>
    </section>
  );
}

function MetricValue({
  label,
  value,
  loading,
  kind,
  accent = false,
}: {
  label: string;
  value: number | null;
  loading: boolean;
  kind: MetricKind;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        accent
          ? "border-violet-100 bg-[linear-gradient(145deg,#fbf8ff,#ffffff)]"
          : "border-slate-200 bg-slate-50/70"
      )}
    >
      <div className={cn("text-center text-xs font-semibold", accent ? "text-violet-600" : "text-slate-500")}>
        {label}
      </div>
      <div className={cn("mt-1 text-center text-4xl font-bold", accent ? "text-violet-600" : "text-slate-950")}>
        {loading ? "…" : formatMetric(value, kind)}
      </div>
      <div className="mt-3 h-10">
        {kind === "drops" ? <MiniBars accent={accent} /> : <Sparkline accent={accent} />}
      </div>
    </div>
  );
}

function Progress({ value, max, accent = false }: { value: number | null; max: number; accent?: boolean }) {
  const width = value == null ? 0 : Math.max(3, Math.min(100, (value / max) * 100));

  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500",
          accent ? "bg-[linear-gradient(90deg,#8b2cf6,#6d28d9)]" : "bg-slate-400"
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function DifferenceBadge({ difference, kind }: { difference: Difference | null; kind: MetricKind }) {
  if (!difference) {
    return <span className="font-semibold text-slate-400">Недостаточно данных</span>;
  }

  const suffix = kind === "drops" ? "" : " п.п.";
  const Icon = difference.direction === "up" ? ArrowUp : ArrowDown;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-bold",
        difference.positive ? "text-emerald-600" : "text-rose-500"
      )}
    >
      <Icon size={16} aria-hidden="true" />
      {difference.value}
      {suffix}
    </span>
  );
}

function SummaryPanel({
  summaryA,
  summaryB,
}: {
  summaryA: SessionSummary | null;
  summaryB: SessionSummary | null;
}) {
  return (
    <section className="mt-4 rounded-[24px] border border-slate-200 bg-white/95 p-5 shadow-[0_16px_45px_rgba(30,41,59,0.07)] sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
          <FileText size={20} />
        </span>
        <div>
          <div className="text-sm font-medium text-slate-500">Автоматическая сводка</div>
          <h2 className="text-xl font-bold text-slate-950">Ключевые отличия</h2>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <InsightCard
          title="Вовлечённость"
          text={compareHigher(summaryA?.avgEngagement, summaryB?.avgEngagement, "вовлечённость")}
        />
        <InsightCard
          title="Стресс"
          text={compareLower(summaryA?.avgStress, summaryB?.avgStress, "уровень стресса")}
        />
        <InsightCard
          title="Внимание"
          text={compareLower(summaryA?.attentionDrops, summaryB?.attentionDrops, "количество провалов внимания")}
        />
      </div>

      <p className="mt-4 text-sm text-slate-500">
        Сводка формируется только из агрегированных метрик и не использует исходное видео.
      </p>
    </section>
  );
}

function InsightCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="font-bold text-slate-950">{title}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function Sparkline({ accent }: { accent: boolean }) {
  const stroke = accent ? "#8b5cf6" : "#64748b";
  return (
    <svg viewBox="0 0 260 44" className="h-full w-full" role="img" aria-label="График динамики">
      <path
        d="M2 22 L22 27 L42 21 L62 31 L82 24 L102 34 L122 21 L142 27 L162 23 L182 31 L202 34 L222 18 L242 20 L258 16"
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MiniBars({ accent }: { accent: boolean }) {
  const fill = accent ? "#7c3aed" : "#64748b";
  const heights = [8, 20, 32, 14, 7, 11, 28, 38, 10, 6, 19, 12];
  return (
    <svg viewBox="0 0 260 44" className="h-full w-full" role="img" aria-label="График провалов внимания">
      {heights.map((height, index) => (
        <rect
          key={`${height}-${index}`}
          x={8 + index * 20}
          y={42 - height}
          width="10"
          height={height}
          rx="2"
          fill={fill}
          opacity={accent ? 0.95 : 0.85}
        />
      ))}
    </svg>
  );
}

type Difference = {
  value: number;
  positive: boolean;
  direction: "up" | "down";
};

function getDifference(a: number | null, b: number | null, lowerIsBetter: boolean): Difference | null {
  if (a == null || b == null) return null;
  const raw = Math.round(Math.abs(a - b) * 10) / 10;
  const aIsBetter = lowerIsBetter ? a < b : a > b;
  const same = a === b;

  return {
    value: raw,
    positive: same || aIsBetter,
    direction: lowerIsBetter ? "down" : "up",
  };
}

function formatMetric(value: number | null, kind: MetricKind): string {
  if (value == null) return "—";
  if (kind === "drops") return String(Math.round(value));
  return `${Math.round(value)}%`;
}

function compareHigher(a: number | null | undefined, b: number | null | undefined, label: string): string {
  if (a == null || b == null) return `Недостаточно данных, чтобы сравнить ${label}.`;
  if (a === b) return `Обе сессии показывают одинаковую ${label}.`;
  return a > b ? `Сессия A показывает более высокую ${label}.` : `Сессия B показывает более высокую ${label}.`;
}

function compareLower(a: number | null | undefined, b: number | null | undefined, label: string): string {
  if (a == null || b == null) return `Недостаточно данных, чтобы сравнить ${label}.`;
  if (a === b) return `Обе сессии показывают одинаковое значение: ${label}.`;
  return a < b ? `У сессии A ниже ${label}.` : `У сессии B ниже ${label}.`;
}

function getErrorMessage(reason: unknown): string {
  if (reason instanceof Error && reason.message) return reason.message;
  return "Не удалось загрузить сессии.";
}

function formatSessionType(value: string | null | undefined): string {
  const normalized = value?.trim().toLowerCase();
  const labels: Record<string, string> = {
    lecture: "ЛЕКЦИЯ",
    seminar: "СЕМИНАР",
    practice: "ПРАКТИКА",
    webinar: "ВЕБИНАР",
    exam: "ЭКЗАМЕН",
    lesson: "ЗАНЯТИЕ",
  };
  return normalized ? labels[normalized] ?? "СЕССИЯ" : "СЕССИЯ";
}

function formatCsvMetric(value: number | null | undefined, suffix = ""): string {
  return value == null ? "Нет данных" : `${value}${suffix}`;
}

function escapeCsvCell(value: string): string {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function safeFilePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "сессия";
}

