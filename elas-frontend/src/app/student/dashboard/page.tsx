"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Section from "@/components/common/Section";
import Reveal from "@/components/common/Reveal";
import {Card} from "@/components/ui/Card";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useUI } from "@/components/layout/Providers";
import {
  getStudentSessionsList,
  getInvitations,
  acceptInvitation,
  declineInvitation,
  type StudentSessionRow,
  type InvitationRow,
} from "@/lib/api/student";
import { getApiBaseUrl, getStoredAuth, hasAuth } from "@/lib/api/client";
import { readConsent } from "@/lib/mock/sessionLifecycle";

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/5 dark:shadow-[0_16px_60px_rgba(0,0,0,0.45)]">
      <div className="text-sm text-slate-500 dark:text-white/60">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{value}</div>
      <div className="mt-2 text-sm text-slate-500 dark:text-white/50">{hint}</div>
    </div>
  );
}

export default function StudentDashboardPage() {
  const { state } = useUI();
  const [sessions, setSessions] = useState<StudentSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const apiAvailable = getApiBaseUrl() && hasAuth();
  const [displayName, setDisplayName] = useState<string | null>(null);

  const fetchSessions = useCallback(() => {
    setLoading(true);
    getStudentSessionsList().then((data) => {
      setSessions(data);
      setLoading(false);
    });
  }, []);

  const fetchInvitations = useCallback(() => {
    if (!apiAvailable) return;
    setInvitationsLoading(true);
    getInvitations().then((data) => {
      setInvitations(data);
      setInvitationsLoading(false);
    });
  }, [apiAvailable]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth?.name) setDisplayName(auth.name);
    else if (auth?.email) setDisplayName(auth.email.split("@")[0] || auth.email);
  }, []);

  const consent = state.consent || readConsent();
  const upcoming = sessions.filter((s) => s.status === "upcoming").slice(0, 5);
  const live = sessions.filter((s) => s.status === "live");
  const firstLive = live[0];

  return (
    <div className="pb-10 space-y-6">
      <Breadcrumbs items={[{ label: "Студент", href: "/student/dashboard" }, { label: "Дашборд" }]} />
      <PageHero
        overline="Student"
        title={displayName ? `Welcome back, ${displayName}` : "Welcome back to ELAS"}
        subtitle="Your sessions, invitations and consent overview."
        right={
          <div className="flex items-center gap-2">
            <Badge>{consent ? "Согласие: да" : "Согласие: нет"}</Badge>
            <Link href="/student/sessions">
              <Button variant="outline">Мои сессии</Button>
            </Link>
            <Link href="/consent">
              <Button variant="ghost">Согласие</Button>
            </Link>
          </div>
        }
      />

      <Section className="mt-4 space-y-6">
        {firstLive && (
          <Reveal>
            <Card className="p-6 md:p-7 border-elas-border-strong-light/60 bg-(--surface) dark:border-elas-border-strong-dark/60">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-elas-danger/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-elas-danger">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-elas-danger animate-pulse" />
                    LIVE session
                  </div>
                  <div className="text-xl font-semibold text-(--text)">
                    {firstLive.title}
                  </div>
                  <div className="text-sm text-[color:var(--muted)]">
                    {firstLive.teacher} • {firstLive.date} • {firstLive.type === "lecture" ? "Лекция" : "Экзамен"}
                  </div>
                  {!consent && (
                    <div className="mt-1 text-xs text-amber-500">
                      Для подключения нужно дать согласие на аналитику.
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-stretch gap-2 md:items-end">
                  {consent ? (
                    <Link href={`/student/session/${firstLive.id}`}>
                      <Button className="min-w-[160px] shadow-elas-primary-glow">
                        Присоединиться
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/consent">
                      <Button className="min-w-[160px]" variant="outline">
                        Дать согласие
                      </Button>
                    </Link>
                  )}
                  <div className="text-xs text-[color:var(--muted)]">
                    Важно: камера используется только для аналитики вовлечённости, без записи видео.
                  </div>
                </div>
              </div>
            </Card>
          </Reveal>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          <Reveal>
            <Stat label="Ближайшие сессии" value={String(upcoming.length)} hint="Ожидают старта" />
          </Reveal>
          <Reveal>
            <Stat label="Согласие" value={consent ? "Дано" : "Не дано"} hint="Нужно для аналитики" />
          </Reveal>
          <Reveal>
            <div className="space-y-3">
              <Stat label="Камера" value="Готово" hint="Права и устройство" />
              <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-2 dark:border-white/10 dark:bg-black/25">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex h-2 w-2 rounded-full ${
                      firstLive && consent ? "bg-emerald-400 animate-pulse" : "bg-zinc-500"
                    }`}
                  />
                  <span className="text-xs text-slate-600 dark:text-white/60">
                    {firstLive
                      ? consent
                        ? "Есть сессия в эфире"
                        : "Для входа нужно согласие"
                      : "Сейчас нет сессий в эфире"}
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <Reveal className="lg:col-span-2">
            <Card className="p-6 md:p-7">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <div className="text-sm text-slate-500 dark:text-white/60">Ближайшие</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">Следующие сессии</div>
                  <div className="mt-2 text-sm text-slate-500 dark:text-white/60">
                    Подключиться можно только к сессии со статусом{" "}
                    <span className="text-slate-900 dark:text-white/80">«В эфире»</span> и при данном согласии.
                  </div>
                </div>
                <Link href="/student/sessions">
                  <Button variant="outline">Весь список</Button>
                </Link>
              </div>

              <div className="mt-5 space-y-3">
                {loading ? (
                  <div className="h-20 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />
                ) : upcoming.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-500 dark:text-white/60">
                    Нет предстоящих сессий. Список обновляется автоматически.
                  </div>
                ) : (
                  upcoming.slice(0, 5).map((s) => (
                    <div
                      key={s.id}
                      className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 hover:bg-slate-100 transition flex items-center justify-between gap-3 dark:border-white/10 dark:bg-black/25 dark:hover:bg-white/5"
                    >
                      <div>
                        <div className="font-medium text-slate-900 dark:text-white">{s.title}</div>
                        <div className="text-sm text-slate-500 dark:text-white/55 mt-1">
                          {s.teacher} • {s.date}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge>{s.type === "lecture" ? "Лекция" : "Экзамен"}</Badge>
                        <Link href={`/student/session/${s.id}`}>
                          <Button size="sm">Открыть</Button>
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </Reveal>

          <Reveal>
            <Card className="p-6 md:p-7 space-y-3">
              <div>
                <div className="text-sm text-slate-500 dark:text-white/60">Действия</div>
                <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                  Конфиденциальность и согласие
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/25">
                <div className="font-medium text-slate-900 dark:text-white">Центр согласия</div>
                <div className="text-sm text-slate-600 dark:text-white/60 mt-1">
                  Согласие нужно дать до начала аналитики по видео.
                </div>
                <div className="mt-3">
                  <Link href="/consent">
                    <Button className="w-full">Управление согласием</Button>
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/25">
                <div className="font-medium text-slate-900 dark:text-white">Проверка камеры</div>
                <div className="text-sm text-slate-600 dark:text-white/60 mt-1">
                  Права доступа, освещение и лицо в кадре.
                </div>
                <div className="mt-3">
                  <Link href="/student/sessions">
                    <Button variant="outline" className="w-full">
                      К сессиям → проверка в сессии
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-white/10 dark:bg-black/25">
                <div className="font-medium text-slate-900 dark:text-white">Моя сводка</div>
                <div className="text-sm text-slate-600 dark:text-white/60 mt-1">
                  Личная статистика по вовлечённости (по желанию).
                </div>
                <div className="mt-3">
                  <Link href="/student/summary">
                    <Button variant="ghost" className="w-full">
                      Открыть сводку
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </Reveal>
        </div>
      </Section>

      {apiAvailable && (invitations.length > 0 || invitationsLoading) && (
        <Section className="mt-2">
          <Reveal>
            <GlassCard className="p-6 md:p-7 border-l-4 border-elas-primary/80">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-elas-text-muted-light dark:text-elas-text-muted-dark">
                    Приглашения
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                    Приглашения в группы ({invitations.length})
                  </div>
                  <div className="mt-2 text-sm text-slate-500 dark:text-white/60">
                    Примите приглашение, чтобы видеть сессии группы и подключаться к ним.
                  </div>
                </div>
              </div>
              {invitationsLoading ? (
                <div className="mt-5 h-16 rounded-2xl bg-white/40 dark:bg-white/5 animate-pulse" />
              ) : invitations.length > 0 ? (
                <div className="mt-5 space-y-3">
                  {invitations.map((inv) => (
                    <InvitationCard
                      key={inv.id}
                      inv={inv}
                      onAccept={() =>
                        acceptInvitation(inv.id).then(() => {
                          fetchInvitations();
                          fetchSessions();
                        })
                      }
                      onDecline={() => declineInvitation(inv.id).then(fetchInvitations)}
                    />
                  ))}
                </div>
              ) : null}
            </GlassCard>
          </Reveal>
        </Section>
      )}
    </div>
  );
}

function InvitationCard({ inv, onAccept, onDecline }: { inv: InvitationRow; onAccept: () => Promise<void>; onDecline: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const handleAccept = () => { setBusy(true); onAccept().finally(() => setBusy(false)); };
  const handleDecline = () => { setBusy(true); onDecline().finally(() => setBusy(false)); };
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
      <span className="font-medium text-slate-900 dark:text-white">{inv.groupName ?? "Группа"}</span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={busy} onClick={handleDecline}>Отклонить</Button>
        <Button size="sm" disabled={busy} onClick={handleAccept}>Принять</Button>
      </div>
    </div>
  );
}
