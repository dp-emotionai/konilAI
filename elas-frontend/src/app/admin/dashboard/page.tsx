"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Reveal from "@/components/common/Reveal";
import Section from "@/components/common/Section";
import {Card} from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Glow from "@/components/common/Glow";
import { cn } from "@/lib/cn";
import { NAV_BY_ROLE } from "@/lib/routes";
import { getAdminUsers, getAuditLog, type AuditRow } from "@/lib/api/admin";
import { getApiBaseUrl, hasAuth } from "@/lib/api/client";
import { getTeacherDashboardSessions, type TeacherDashboardSession } from "@/lib/api/teacher";
import { getSessionMetrics } from "@/lib/utils/metrics";

function StatBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "info" | "warning" | "purple";
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-400/20"
      : tone === "info"
      ? "bg-sky-500/10 text-sky-700 ring-1 ring-sky-400/20"
      : tone === "warning"
      ? "bg-amber-500/10 text-amber-700 ring-1 ring-amber-400/20"
      : tone === "purple"
      ? "bg-purple-500/15 text-purple-700 ring-1 ring-purple-400/25"
      : "bg-surface-subtle text-slate-500 ring-1 ring-slate-200";

  return (
    <Badge
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur",
        toneClass
      )}
    >
      {children}
    </Badge>
  );
}

function Stagger({ children, ms }: { children: React.ReactNode; ms: number }) {
  return (
    <div style={{ transitionDelay: `${ms}ms`, animationDelay: `${ms}ms` }}>
      {children}
    </div>
  );
}

const adminNav = NAV_BY_ROLE.admin;

export default function AdminDashboardPage() {
  const [userCount, setUserCount] = useState<number | null>(null);
  const [pendingTeachers, setPendingTeachers] = useState<number | null>(null);
  const [backendOk, setBackendOk] = useState<boolean>(false);
  const [sessions, setSessions] = useState<TeacherDashboardSession[]>([]);
  const [auditLog, setAuditLog] = useState<AuditRow[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);

  useEffect(() => {
    let mounted = true;
    const base = getApiBaseUrl();
    const ok = Boolean(base && hasAuth());
    setBackendOk(ok);
    if (!ok) return;
    (async () => {
      try {
        const users = await getAdminUsers();
        if (!mounted) return;
        setUserCount(users.length);
        const pending = users.filter(
          (u) => u.role === "teacher" && u.status === "pending"
        ).length;
        setPendingTeachers(pending);
      } catch {
        // null defaults
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    getTeacherDashboardSessions()
      .then((list) => {
        if (!mounted) return;
        setSessions(list);
      })
      .catch(() => {
        setSessions([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!backendOk) {
      setLoadingAudit(false);
      return;
    }
    getAuditLog()
      .then((log) => {
        if (!mounted) return;
        setAuditLog(log);
      })
      .finally(() => {
        if (mounted) setLoadingAudit(false);
      });
    return () => {
      mounted = false;
    };
  }, [backendOk]);

  const groupHeat = useMemo(() => {
    if (!sessions.length) return [];
    const byGroup = new Map<string, TeacherDashboardSession[]>();
    for (const s of sessions) {
      const key = s.group || "—";
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key)!.push(s);
    }
    return Array.from(byGroup.entries()).map(([group, list]) => {
      const metrics = list.map((s) => getSessionMetrics(s));
      const avg =
        metrics.length === 0
          ? 0
          : Math.round(
              metrics.reduce((a, m) => a + m.engagement, 0) / metrics.length
            );
      return { group, avg };
    });
  }, [sessions]);

  return (
    <div className="relative space-y-12 pb-20">
      <Glow />

      <Breadcrumbs items={[{ label: "Администрирование", href: "/admin/dashboard" }]} />

      <PageHero
        title="Панель администратора"
        subtitle="Обзор системы, настройка модели и мониторинг платформы."
        right={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/users">
              <Button variant="outline">Пользователи</Button>
            </Link>
            <Link href="/admin/model">
              <Button variant="outline">Модель</Button>
            </Link>
          </div>
        }
      />

      {/* Quick links */}
      <Section>
        <Reveal>
          <div className="bg-white border text-sm border-slate-100 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="p-6 md:p-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Разделы</h2>
            <div className="flex flex-wrap gap-3">
              {adminNav.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button variant="outline" className="rounded-xl bg-slate-50 hover:bg-slate-100 border-transparent shadow-none text-slate-700">
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>

            {!backendOk && (
              <p className="mt-4 text-xs text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-100">
                Бэкенд не подключен. Настройте <code className="text-amber-800 font-semibold px-1">NEXT_PUBLIC_API_URL</code> и авторизацию,
                чтобы видеть реальные данные пользователей.
              </p>
            )}
            </div>
          </div>
        </Reveal>
      </Section>

      {/* KPI SECTION */}
      <Section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Обзор</h2>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Reveal>
            <Stagger ms={0}>
              <div className="bg-white border text-sm border-slate-100 rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="space-y-4 p-6 md:p-8">
                <p className="text-sm text-slate-500 font-medium">Всего пользователей</p>
                <div className="flex items-center justify-between">
                  <h3 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
                    {userCount != null ? userCount : "—"}
                  </h3>
                  <StatBadge tone={userCount != null ? "success" : "neutral"}>
                    {userCount != null ? "Real" : "No connection"}
                  </StatBadge>
                </div>
                </div>
              </div>
            </Stagger>
          </Reveal>

          <Reveal>
            <Stagger ms={80}>
              <div className="bg-white border text-sm border-slate-100 rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="space-y-4 p-6 md:p-8">
                <p className="text-sm text-slate-500 font-medium">Заявки преподавателей</p>
                <div className="flex items-center justify-between">
                  <h3 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
                    {pendingTeachers != null ? pendingTeachers : "—"}
                  </h3>
                  <StatBadge tone={pendingTeachers && pendingTeachers > 0 ? "warning" : "info"}>
                    {pendingTeachers && pendingTeachers > 0 ? "Ожидают" : "Ок"}
                  </StatBadge>
                </div>
                </div>
              </div>
            </Stagger>
          </Reveal>

          <Reveal>
            <Stagger ms={160}>
              <div className="bg-white border text-sm border-slate-100 rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden opacity-60">
                <div className="space-y-4 p-6 md:p-8">
                  <p className="text-sm text-slate-500 font-medium">Точность модели (v2)</p>
                  <div className="flex items-center justify-between">
                    <h3 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">--</h3>
                    <StatBadge tone="neutral">Ожидание</StatBadge>
                  </div>
                </div>
              </div>
            </Stagger>
          </Reveal>

          <Reveal>
            <Stagger ms={240}>
              <div className="bg-white border text-sm border-slate-100 rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden opacity-60">
                <div className="space-y-4 p-6 md:p-8">
                <p className="text-sm text-slate-500 font-medium">Занято хранилища</p>
                <div className="flex items-center justify-between">
                  <h3 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">--</h3>
                  <StatBadge tone="neutral">Ожидание</StatBadge>
                </div>
                </div>
              </div>
            </Stagger>
          </Reveal>
        </div>
      </Section>

      {/* SYSTEM HEALTH */}
      <Section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Система</h2>
        <Reveal>
          <div className="bg-white border text-sm border-slate-100 rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="space-y-6 p-6 md:p-8">
            <div className="flex items-center justify-between gap-4 border-b border-slate-50 pb-6">
              <h2 className="text-xl font-bold text-slate-900">Состояние микросервисов</h2>
              <StatBadge tone={backendOk ? "success" : "neutral"}>{backendOk ? 'Узел API доступен' : 'Ожидание метрик'}</StatBadge>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm text-slate-500 font-medium">Задержка API</p>
                <p className="text-lg font-medium text-slate-300">Ожидание...</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-slate-500 font-medium">WebRTC Кластер</p>
                <p className="text-lg font-medium text-slate-300">Ожидание...</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-slate-500 font-medium">Движок эмоций (ML Core)</p>
                <p className="text-lg font-medium text-slate-300">Не подключен</p>
              </div>
            </div>

            </div>
          </div>
        </Reveal>
      </Section>

      {/* ACTIVITY FEED */}
      <Section>
        <Reveal>
          <div className="bg-white border text-sm border-slate-100 rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="space-y-6 p-6 md:p-8">
              <div className="flex items-center justify-between gap-4 mb-4">
                <h2 className="text-xl font-bold text-slate-900">Недавняя активность</h2>
              </div>

            <div className="space-y-4 text-sm text-slate-700 font-medium">
              {loadingAudit ? (
                <div className="py-4 text-slate-400">Загрузка журнала...</div>
              ) : auditLog.length > 0 ? (
                auditLog.map((log) => (
                  <div key={log.id} className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span>{log.action} <span className="opacity-50 mx-2">·</span> {log.resource} <span className="opacity-50 mx-2">·</span> {log.actor}</span>
                    <span className="text-slate-400 text-xs">{log.at}</span>
                  </div>
                ))
              ) : (
                <div className="py-12 bg-slate-50 text-slate-400 border border-slate-100 rounded-2xl flex items-center justify-center">
                  Журнал активности пуст или API аудита не подключен
                </div>
              )}
            </div>
          </div>
          </div>
        </Reveal>
      </Section>
    </div>
  );
}
