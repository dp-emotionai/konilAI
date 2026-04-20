"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Reveal from "@/components/common/Reveal";
import Section from "@/components/common/Section";
import { Card, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Glow from "@/components/common/Glow";
import { cn } from "@/lib/cn";
import { NAV_BY_ROLE } from "@/lib/routes";
import { getAdminUsers } from "@/lib/api/admin";
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
      ? "bg-emerald-500/10 text-emerald-700 text-emerald-700 ring-1 ring-emerald-400/20"
      : tone === "info"
      ? "bg-sky-500/10 text-sky-700 text-sky-700 ring-1 ring-sky-400/20"
      : tone === "warning"
      ? "bg-amber-500/10 text-amber-700 text-amber-700 ring-1 ring-amber-400/20"
      : tone === "purple"
      ? "bg-purple-500/15 text-purple-200 ring-1 ring-purple-400/25"
      : "bg-surface-subtle text-zinc-200 ring-1 ring-white/10";

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
        // оставляем null — в этом случае покажем демо-значение
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
          <Card variant="elevated" className="overflow-hidden">
            <CardContent className="p-6 md:p-8">
            <h2 className="text-lg font-semibold text-fg mb-4">Разделы</h2>
            <div className="flex flex-wrap gap-3">
              {adminNav.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button variant="outline" className="rounded-2xl">
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>

            {!backendOk && (
              <p className="mt-4 text-xs text-muted">
                Сейчас показаны демо-данные. Настройте <code className="text-[11px]">NEXT_PUBLIC_API_URL</code> и авторизацию,
                чтобы видеть реальные метрики из backend.
              </p>
            )}
            </CardContent>
          </Card>
        </Reveal>
      </Section>

      {/* KPI SECTION */}
      <Section>
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted mb-4">Обзор</h2>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Reveal>
            <Stagger ms={0}>
              <Card variant="elevated" interactive className="overflow-hidden">
                <CardContent className="space-y-4 p-6 md:p-8">
                <p className="text-sm text-muted">Всего пользователей</p>
                <div className="flex items-center justify-between">
                  <h3 className="text-3xl md:text-4xl font-bold text-fg tracking-tight">
                    {userCount != null ? userCount : "—"}
                  </h3>
                  <StatBadge tone={userCount != null ? "success" : "neutral"}>
                    {userCount != null ? "из backend" : "demo"}
                  </StatBadge>
                </div>
                <p className="text-xs text-muted">
                  Количество записей в базе пользователей.
                </p>
                </CardContent>
              </Card>
            </Stagger>
          </Reveal>

          <Reveal>
            <Stagger ms={80}>
              <Card variant="elevated" interactive className="overflow-hidden">
                <CardContent className="space-y-4 p-6 md:p-8">
                <p className="text-sm text-muted">Заявки преподавателей</p>
                <div className="flex items-center justify-between">
                  <h3 className="text-3xl md:text-4xl font-bold text-fg tracking-tight">
                    {pendingTeachers != null ? pendingTeachers : "—"}
                  </h3>
                  <StatBadge tone={pendingTeachers && pendingTeachers > 0 ? "warning" : "info"}>
                    {pendingTeachers && pendingTeachers > 0 ? "Ожидают одобрения" : "Нет заявок"}
                  </StatBadge>
                </div>
                <p className="text-xs text-muted">
                  Количество аккаунтов с ролью преподавателя в статусе PENDING.
                </p>
                </CardContent>
              </Card>
            </Stagger>
          </Reveal>

          <Reveal>
            <Stagger ms={160}>
              <Card variant="elevated" interactive className="overflow-hidden">
                <CardContent className="space-y-4 p-6 md:p-8">
                  <p className="text-sm text-muted">Точность модели</p>
                  <div className="flex items-center justify-between">
                    <h3 className="text-3xl md:text-4xl font-bold text-fg tracking-tight">92,4%</h3>
                    <StatBadge tone="purple">Стабильно</StatBadge>
                  </div>
                  <p className="text-xs text-muted">Уверенность детекции эмоций</p>
                </CardContent>
              </Card>
            </Stagger>
          </Reveal>

          <Reveal>
            <Stagger ms={240}>
              <Card variant="elevated" interactive className="overflow-hidden">
                <CardContent className="space-y-4 p-6 md:p-8">
                <p className="text-sm text-muted">Занято хранилища</p>
                <div className="flex items-center justify-between">
                  <h3 className="text-3xl md:text-4xl font-bold text-fg tracking-tight">68%</h3>
                  <StatBadge tone="warning">Умеренно</StatBadge>
                </div>
                <p className="text-xs text-muted">Видео и аналитика</p>
                </CardContent>
              </Card>
            </Stagger>
          </Reveal>
        </div>
      </Section>

      {/* SYSTEM HEALTH */}
      <Section>
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted mb-4">Система</h2>
        <Reveal>
          <Card variant="elevated" className="overflow-hidden">
            <CardContent className="space-y-6 p-6 md:p-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-fg">Состояние системы</h2>
              <StatBadge tone="success">Все системы в норме</StatBadge>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm text-muted">Задержка API</p>
                <p className="text-lg font-medium text-fg">132 мс</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted">База данных</p>
                <p className="text-lg font-medium text-emerald-600 dark:text-emerald-400">Работает</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted">Движок эмоций</p>
                <p className="text-lg font-medium text-[rgb(var(--primary))]">v2.1.4</p>
              </div>
            </div>

            <div className="pt-4 border-t border-[color:var(--border)] dark:border-[color:var(--border)] flex flex-wrap gap-2">
              <Link href="/admin/model">
                <Button variant="outline" className="rounded-2xl">Модель</Button>
              </Link>
              <Link href="/admin/storage">
                <Button variant="outline" className="rounded-2xl">Хранилище</Button>
              </Link>
              <Link href="/admin/audit">
                <Button variant="outline" className="rounded-2xl">Аудит</Button>
              </Link>
            </div>
            </CardContent>
          </Card>
        </Reveal>
      </Section>

      {/* GROUP HEATMAP */}
      <Section>
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted mb-4">Аналитика</h2>
        <Reveal>
          <Card variant="elevated" className="overflow-hidden">
            <CardContent className="space-y-6 p-6 md:p-8">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-fg">
                Карта вовлечённости по группам
              </h2>
              <StatBadge tone="info">
                {backendOk ? "подключён к API" : "API недоступен"}
              </StatBadge>
            </div>

            {groupHeat.length === 0 ? (
              <p className="text-sm text-muted">
                Данных по сессиям пока нет. Запустите несколько занятий, чтобы
                увидеть распределение вовлечённости по группам.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[320px] grid gap-2">
                  {groupHeat.map(({ group, avg }) => {
                    const intensity = Math.max(0, Math.min(100, avg));
                    const color = `hsla(260, 90%, ${80 - intensity * 0.3}%, 1)`;
                    return (
                      <div
                        key={group}
                        className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ring-1 ring-[color:var(--border)] dark:ring-white/10 bg-gradient-to-r from-transparent"
                        style={{
                          backgroundImage: `linear-gradient(to right, ${color}, transparent 60%)`,
                        }}
                      >
                        <div className="text-sm font-medium text-fg truncate">
                          {group}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-fg">
                            {avg}%
                          </span>
                          <div className="h-2 w-20 rounded-full bg-surface-subtle dark:bg-surface-subtle overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[rgb(var(--primary))] to-emerald-500"
                              style={{ width: `${intensity}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            </CardContent>
          </Card>
        </Reveal>
      </Section>

      {/* ACTIVITY FEED */}
      <Section>
        <Reveal>
          <Card variant="elevated" className="overflow-hidden">
            <CardContent className="space-y-6 p-6 md:p-8">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-fg">Недавняя активность</h2>
                <Badge className="rounded-full bg-surface-subtle px-2.5 py-1 text-xs text-muted ring-1 ring-[color:var(--border)]/40">
                  Пример
                </Badge>
              </div>

            <div className="space-y-4 text-sm text-fg">
              <div className="flex items-center justify-between border-b border-[color:var(--border)] dark:border-[color:var(--border)] pb-2">
                <span>Зарегистрирован новый преподаватель</span>
                <span className="text-muted">2 мин назад</span>
              </div>

              <div className="flex items-center justify-between border-b border-[color:var(--border)] dark:border-[color:var(--border)] pb-2">
                <span>Создана сессия «Экзамен по ИИ»</span>
                <span className="text-muted">15 мин назад</span>
              </div>

              <div className="flex items-center justify-between border-b border-[color:var(--border)] dark:border-[color:var(--border)] pb-2">
                <span>Выполнена очистка хранилища</span>
                <span className="text-muted">1 ч назад</span>
              </div>

              <div className="flex items-center justify-between">
                <span>Обновлён порог модели</span>
                <span className="text-muted">3 ч назад</span>
              </div>
            </div>
          </CardContent>
          </Card>
        </Reveal>
      </Section>
    </div>
  );
}
