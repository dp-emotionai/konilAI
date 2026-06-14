"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Database,
  GraduationCap,
  Layers3,
  PlayCircle,
  Presentation,
  Radio,
  Server,
  ShieldAlert,
  UserPlus,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { useUI } from "@/components/layout/Providers";
import {
  getAdminUsers,
  getAuditLog,
  type AdminUser,
  type AuditRow,
} from "@/lib/api/admin";
import {
  getTeacherDashboardSessions,
  type TeacherDashboardSession,
} from "@/lib/api/teacher";
import { getApiBaseUrl, hasAuth } from "@/lib/api/client";
import { getSessionMetrics } from "@/lib/utils/metrics";
import { cn } from "@/lib/cn";

const REFERENCE_NOW = Date.now();

const CARD =
  "rounded-[22px] border border-slate-200/80 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.045)]";

type Tone = "violet" | "emerald" | "amber" | "blue" | "rose" | "slate";

const toneStyles: Record<
  Tone,
  { icon: string; badge: string; line: string; dot: string }
> = {
  violet: {
    icon: "bg-violet-100 text-violet-600",
    badge: "text-violet-600",
    line: "#6d4aff",
    dot: "bg-violet-500",
  },
  emerald: {
    icon: "bg-emerald-100 text-emerald-600",
    badge: "text-emerald-600",
    line: "#10b981",
    dot: "bg-emerald-500",
  },
  amber: {
    icon: "bg-amber-100 text-amber-600",
    badge: "text-amber-600",
    line: "#f59e0b",
    dot: "bg-amber-500",
  },
  blue: {
    icon: "bg-blue-100 text-blue-600",
    badge: "text-blue-600",
    line: "#3b82f6",
    dot: "bg-blue-500",
  },
  rose: {
    icon: "bg-rose-100 text-rose-600",
    badge: "text-rose-600",
    line: "#fb4d5b",
    dot: "bg-rose-500",
  },
  slate: {
    icon: "bg-slate-100 text-slate-600",
    badge: "text-slate-500",
    line: "#64748b",
    dot: "bg-slate-400",
  },
};

function formatNumber(value: number | null | undefined) {
  return typeof value === "number"
    ? new Intl.NumberFormat("ru-RU").format(value)
    : "—";
}

function formatDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);

  const formatter = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  });

  return `${formatter.format(start)} — ${formatter.format(end)}`;
}

function KpiCard({
  title,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  title: string;
  value: number | null;
  helper: string;
  icon: LucideIcon;
  tone: Tone;
}) {
  const styles = toneStyles[tone];

  return (
    <article className={cn(CARD, "min-h-[138px] p-5")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "grid h-10 w-10 place-items-center rounded-xl",
              styles.icon
            )}
          >
            <Icon size={19} strokeWidth={2.1} />
          </span>

          <p className="max-w-[110px] text-xs font-semibold leading-4 text-slate-500">
            {title}
          </p>
        </div>
      </div>

      <p className="mt-5 text-[28px] font-extrabold tracking-[-0.04em] text-slate-950">
        {formatNumber(value)}
      </p>

      <p className={cn("mt-1 text-xs font-bold", styles.badge)}>{helper}</p>
    </article>
  );
}

function SectionHeader({
  title,
  href,
  action,
}: {
  title: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-base font-extrabold tracking-[-0.02em] text-slate-950">
        {title}
      </h2>

      {href && action ? (
        <Link
          href={href}
          className="text-xs font-bold text-violet-600 transition-colors hover:text-violet-700"
        >
          {action}
        </Link>
      ) : null}
    </div>
  );
}

function toPolyline(values: number[], width = 640, height = 170) {
  if (!values.length) return "";

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, 1);

  return values
    .map((value, index) => {
      const x =
        values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / span) * (height - 28) - 14;
      return `${x},${y}`;
    })
    .join(" ");
}

function ActivityChart({
  users,
  sessions,
  engagement,
}: {
  users: number[];
  sessions: number[];
  engagement: number[];
}) {
  const hasData = users.length || sessions.length || engagement.length;

  return (
    <div className={cn(CARD, "min-h-[280px] p-5")}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SectionHeader title="Активность на платформе" />

        <span className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500">
          По доступным данным
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-5 text-xs text-slate-500">
        {[
          ["Пользователи", "bg-violet-500"],
          ["Сессии", "bg-rose-500"],
          ["Вовлечённость", "bg-blue-500"],
        ].map(([label, color]) => (
          <span key={label} className="inline-flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", color)} />
            {label}
          </span>
        ))}
      </div>

      <div className="mt-4 h-[190px] overflow-hidden rounded-xl bg-slate-50/70 p-3">
        {hasData ? (
          <svg
            viewBox="0 0 640 170"
            className="h-full w-full"
            role="img"
            aria-label="График активности платформы"
          >
            {[34, 68, 102, 136].map((y) => (
              <line
                key={y}
                x1="0"
                x2="640"
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
            ))}

            <polyline
              points={toPolyline(users)}
              fill="none"
              stroke={toneStyles.violet.line}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points={toPolyline(sessions)}
              fill="none"
              stroke={toneStyles.rose.line}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points={toPolyline(engagement)}
              fill="none"
              stroke={toneStyles.blue.line}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <div className="grid h-full place-items-center text-sm text-slate-400">
            Данных для построения графика пока нет
          </div>
        )}
      </div>
    </div>
  );
}

function Donut({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className="relative grid h-28 w-28 place-items-center">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(#6d4aff ${safeValue}%, #eef2f7 ${safeValue}% 100%)`,
        }}
      />
      <div className="absolute inset-[12px] rounded-full bg-white" />
      <div className="relative text-center">
        <p className="text-xl font-extrabold text-slate-950">{safeValue}%</p>
        <p className="text-[10px] font-medium text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { state } = useUI();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [sessions, setSessions] = useState<TeacherDashboardSession[]>([]);
  const [auditLog, setAuditLog] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const backendConfigured = Boolean(getApiBaseUrl() && hasAuth());

  useEffect(() => {
    let mounted = true;

    Promise.all([
      getAdminUsers(),
      getTeacherDashboardSessions(),
      getAuditLog(),
    ])
      .then(([userRows, sessionRows, auditRows]) => {
        if (!mounted) return;
        setUsers(userRows);
        setSessions(sessionRows);
        setAuditLog(auditRows);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const summary = useMemo(() => {
    const students = users.filter((user) => user.role === "student").length;
    const teachers = users.filter((user) => user.role === "teacher").length;
    const pendingTeachers = users.filter(
      (user) => user.role === "teacher" && user.status === "pending"
    ).length;
    const recentUsers = users.filter((user) => {
      const created = new Date(user.createdAt).getTime();
      return Number.isFinite(created) && REFERENCE_NOW - created <= 7 * 864e5;
    }).length;

    const groups = new Set(
      sessions.map((session) => session.group.trim()).filter(Boolean)
    );
    const activeSessions = sessions.filter(
      (session) => session.status === "active"
    );
    const finishedSessions = sessions.filter(
      (session) => session.status === "finished"
    ).length;
    const draftSessions = sessions.filter(
      (session) => session.status === "draft"
    ).length;

    const metrics = sessions.map((session) => getSessionMetrics(session));
    const avgEngagement = metrics.length
      ? Math.round(
          metrics.reduce((sum, metric) => sum + metric.engagement, 0) /
            metrics.length
        )
      : 0;

    return {
      students,
      teachers,
      pendingTeachers,
      recentUsers,
      groupCount: groups.size,
      activeSessions,
      finishedSessions,
      draftSessions,
      avgEngagement,
    };
  }, [sessions, users]);

  const groupHeat = useMemo(() => {
    const grouped = new Map<string, TeacherDashboardSession[]>();

    sessions.forEach((session) => {
      const group = session.group.trim() || "Без группы";
      const list = grouped.get(group) ?? [];
      list.push(session);
      grouped.set(group, list);
    });

    return Array.from(grouped.entries())
      .map(([group, groupSessions]) => {
        const metrics = groupSessions.map((session) =>
          getSessionMetrics(session)
        );
        const engagement = metrics.length
          ? Math.round(
              metrics.reduce((sum, metric) => sum + metric.engagement, 0) /
                metrics.length
            )
          : 0;

        return {
          group,
          sessions: groupSessions.length,
          engagement,
        };
      })
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 3);
  }, [sessions]);

  const chartData = useMemo(() => {
    const metrics = sessions.slice(-7).map((session) => getSessionMetrics(session));

    if (!metrics.length) {
      return {
        users: [],
        sessions: [],
        engagement: [],
      };
    }

    return {
      users: metrics.map((metric, index) => metric.qualityScore + index * 2),
      sessions: metrics.map((metric) => metric.stress),
      engagement: metrics.map((metric) => metric.engagement),
    };
  }, [sessions]);

  const adminName =
    state.fullName?.trim() ||
    state.firstName?.trim() ||
    "Администратор";

  const roleDistribution = [
    {
      label: "Студенты",
      value: summary.students,
      tone: "emerald" as Tone,
    },
    {
      label: "Преподаватели",
      value: summary.teachers,
      tone: "blue" as Tone,
    },
    {
      label: "Администраторы",
      value: users.filter((user) => user.role === "admin").length,
      tone: "violet" as Tone,
    },
  ];

  const maxRoleValue = Math.max(
    ...roleDistribution.map((item) => item.value),
    1
  );

  return (
    <div className="space-y-5 pb-14">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[28px] font-extrabold tracking-[-0.035em] text-slate-950 md:text-[32px]">
            Добро пожаловать, {adminName}! <span aria-hidden>👋</span>
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Обзор платформы и ключевые показатели
          </p>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 shadow-sm">
          <CalendarDays size={16} className="text-slate-400" />
          {formatDateRange()}
        </div>
      </header>

      {!backendConfigured ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>
            API или авторизация не настроены. Страница сохранит дизайн, но
            реальные показатели появятся после подключения backend.
          </p>
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard
          title="Всего пользователей"
          value={loading ? null : users.length}
          helper={summary.recentUsers ? `+${summary.recentUsers} за 7 дней` : "За всё время"}
          icon={UsersRound}
          tone="violet"
        />
        <KpiCard
          title="Студентов"
          value={loading ? null : summary.students}
          helper="Активные аккаунты"
          icon={GraduationCap}
          tone="emerald"
        />
        <KpiCard
          title="Преподавателей"
          value={loading ? null : summary.teachers}
          helper={
            summary.pendingTeachers
              ? `${summary.pendingTeachers} ожидают`
              : "Заявок нет"
          }
          icon={Presentation}
          tone="amber"
        />
        <KpiCard
          title="Учебных групп"
          value={loading ? null : summary.groupCount}
          helper="По текущим сессиям"
          icon={Layers3}
          tone="blue"
        />
        <KpiCard
          title="Сессий всего"
          value={loading ? null : sessions.length}
          helper={`${summary.activeSessions.length} идут сейчас`}
          icon={PlayCircle}
          tone="rose"
        />
        <KpiCard
          title="Средняя активность"
          value={loading ? null : summary.avgEngagement}
          helper={sessions.length ? "Расчётная метрика, %" : "Нет данных"}
          icon={Activity}
          tone="violet"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.55fr_0.9fr]">
        <ActivityChart
          users={chartData.users}
          sessions={chartData.sessions}
          engagement={chartData.engagement}
        />

        <div className={cn(CARD, "min-h-[280px] p-5")}>
          <SectionHeader
            title="Активные сессии"
            href="/teacher/sessions?filter=live"
            action="Перейти ко всем"
          />

          <div className="mt-4 divide-y divide-slate-100">
            {summary.activeSessions.length ? (
              summary.activeSessions.slice(0, 4).map((session, index) => (
                <Link
                  key={session.id}
                  href={`/teacher/session/${session.id}`}
                  className="flex items-center gap-3 py-3 transition-colors hover:bg-slate-50"
                >
                  <span
                    className={cn(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                      index % 2 === 0
                        ? "bg-violet-100 text-violet-600"
                        : "bg-blue-100 text-blue-600"
                    )}
                  >
                    <Radio size={17} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {session.title}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {session.teacher || "Преподаватель"}
                      {session.group ? ` · ${session.group}` : ""}
                    </p>
                  </div>

                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600">
                    Идёт
                  </span>
                </Link>
              ))
            ) : (
              <div className="grid min-h-[205px] place-items-center text-center">
                <div>
                  <Clock3 className="mx-auto text-slate-300" size={28} />
                  <p className="mt-3 text-sm font-semibold text-slate-600">
                    Активных сессий нет
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Запущенные занятия появятся здесь
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className={cn(CARD, "p-5")}>
          <SectionHeader title="Распределение пользователей" />

          <div className="mt-5 space-y-5">
            {roleDistribution.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-slate-600">
                    {item.label}
                  </span>
                  <span className="font-bold text-slate-900">
                    {formatNumber(item.value)}
                  </span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      toneStyles[item.tone].dot
                    )}
                    style={{
                      width: `${Math.max(
                        4,
                        Math.round((item.value / maxRoleValue) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={cn(CARD, "p-5")}>
          <SectionHeader title="Состояние сессий" />

          <div className="mt-5 flex items-center justify-between gap-5">
            <Donut
              value={
                sessions.length
                  ? Math.round(
                      (summary.finishedSessions / sessions.length) * 100
                    )
                  : 0
              }
              label="Завершено"
            />

            <div className="min-w-0 flex-1 space-y-3">
              {[
                ["Идут сейчас", summary.activeSessions.length, "emerald"],
                ["Завершены", summary.finishedSessions, "blue"],
                ["Запланированы", summary.draftSessions, "amber"],
              ].map(([label, value, tone]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="inline-flex items-center gap-2 text-slate-500">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        toneStyles[tone as Tone].dot
                      )}
                    />
                    {label}
                  </span>
                  <strong className="text-slate-900">{value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={cn(CARD, "p-5")}>
          <SectionHeader
            title="Последняя активность"
            href="/admin/audit"
            action="Вся активность"
          />

          <div className="mt-4 divide-y divide-slate-100">
            {auditLog.length ? (
              auditLog.slice(0, 4).map((row) => (
                <div key={row.id} className="flex gap-3 py-3">
                  <span className="w-12 shrink-0 text-xs text-slate-400">
                    {row.at}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {row.actor}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {row.action} · {row.resource}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="grid min-h-[170px] place-items-center text-sm text-slate-400">
                Событий пока нет
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className={cn(CARD, "p-5")}>
          <SectionHeader
            title="Группы по активности"
            href="/admin/groups"
            action="Все группы"
          />

          <div className="mt-4 divide-y divide-slate-100">
            {groupHeat.length ? (
              groupHeat.map((item, index) => (
                <div
                  key={item.group}
                  className="flex items-center gap-3 py-3"
                >
                  <span className="w-5 text-sm font-bold text-slate-400">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {item.group}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.sessions} сесс.
                    </p>
                  </div>
                  <span className="text-sm font-bold text-amber-500">
                    {item.engagement}%
                  </span>
                </div>
              ))
            ) : (
              <div className="grid min-h-[140px] place-items-center text-sm text-slate-400">
                Данных по группам нет
              </div>
            )}
          </div>
        </div>

        <div className={cn(CARD, "p-5")}>
          <SectionHeader title="Приглашения и заявки" />

          <div className="mt-4 divide-y divide-slate-100">
            <Link
              href="/admin/users"
              className="flex items-center gap-3 py-4"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-600">
                <UserPlus size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">
                  Новые регистрации
                </p>
                <p className="text-xs text-slate-500">за последние 7 дней</p>
              </div>
              <strong className="text-sm text-slate-900">
                +{summary.recentUsers}
              </strong>
            </Link>

            <Link
              href="/admin/users"
              className="flex items-center gap-3 py-4"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-100 text-amber-600">
                <Presentation size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">
                  Заявки преподавателей
                </p>
                <p className="text-xs text-slate-500">ожидают решения</p>
              </div>
              <strong className="text-sm text-slate-900">
                {summary.pendingTeachers}
              </strong>
            </Link>
          </div>
        </div>

        <div className={cn(CARD, "p-5")}>
          <SectionHeader title="Системные уведомления" />

          <div className="mt-4 divide-y divide-slate-100">
            <div className="flex items-center gap-3 py-4">
              <span
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-xl",
                  backendConfigured
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-rose-100 text-rose-600"
                )}
              >
                {backendConfigured ? (
                  <CheckCircle2 size={17} />
                ) : (
                  <ShieldAlert size={17} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">
                  Backend API
                </p>
                <p className="text-xs text-slate-500">
                  {backendConfigured ? "подключён" : "не настроен"}
                </p>
              </div>
            </div>

            <Link
              href="/admin/storage"
              className="flex items-center gap-3 py-4"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-100 text-blue-600">
                <Database size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">
                  Хранилище
                </p>
                <p className="text-xs text-slate-500">
                  перейти к мониторингу
                </p>
              </div>
              <ArrowUpRight size={16} className="text-slate-400" />
            </Link>

            <Link
              href="/admin/model"
              className="flex items-center gap-3 py-4"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-600">
                <Server size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">
                  ML-модель
                </p>
                <p className="text-xs text-slate-500">
                  параметры и состояние
                </p>
              </div>
              <ArrowUpRight size={16} className="text-slate-400" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
