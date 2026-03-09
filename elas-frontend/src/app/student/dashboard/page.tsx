"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Section from "@/components/common/Section";
import Reveal from "@/components/common/Reveal";

import { Card, CardContent } from "@/components/ui/Card";
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

import { Video, ShieldCheck, Calendar, Sparkles, ArrowRight } from "lucide-react";

function StatMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-elas-lg bg-surface-subtle/80 ring-1 ring-[color:var(--border)]/20 p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold text-fg">{value}</div>
    </div>
  );
}

function SessionRow({
  s,
  right,
}: {
  s: StudentSessionRow;
  right?: React.ReactNode;
}) {
  return (
    <div className="rounded-elas-lg bg-surface-subtle p-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="font-semibold text-fg truncate">{s.title}</div>
        <div className="mt-1 text-sm text-muted">
          {s.teacher} • {s.date}
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        <Badge>{s.type === "lecture" ? "Лекция" : "Экзамен"}</Badge>
        {right}
      </div>
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
    getStudentSessionsList()
      .then((data) => setSessions(data))
      .finally(() => setLoading(false));
  }, []);

  const fetchInvitations = useCallback(() => {
    if (!apiAvailable) return;
    setInvitationsLoading(true);
    getInvitations()
      .then((data) => setInvitations(data))
      .finally(() => setInvitationsLoading(false));
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

  const upcoming = useMemo(
    () => sessions.filter((s) => s.status === "upcoming").slice(0, 5),
    [sessions]
  );
  const live = useMemo(() => sessions.filter((s) => s.status === "live"), [sessions]);
  const firstLive = live[0];
  const ended = useMemo(() => sessions.filter((s) => s.status === "ended").slice(0, 5), [sessions]);

  const totalSessions = sessions.length;
  const upcomingCount = sessions.filter((s) => s.status === "upcoming").length;
  const endedCount = sessions.filter((s) => s.status === "ended").length;

  return (
    <div className="pb-12">
      <Breadcrumbs items={[{ label: "Студент", href: "/student/dashboard" }, { label: "Дашборд" }]} />

      <PageHero
        overline="Student"
        title={displayName ? `С возвращением, ${displayName}` : "С возвращением в ELAS"}
        subtitle="Сессии, приглашения и управление согласием — в одном месте."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={consent ? "success" : "warning"} className="rounded-full px-3 py-1 text-xs">
              {consent ? "Согласие: дано" : "Согласие: нужно"}
            </Badge>

            <Link href="/student/sessions">
              <Button className="gap-2 rounded-full shadow-soft px-5">
                Мои сессии <ArrowRight size={16} />
              </Button>
            </Link>

            <Link href="/consent">
              <Button variant="outline" className="rounded-full px-5">
                Центр согласия
              </Button>
            </Link>

            <Link href="/student/sessions?join=1">
              <Button variant="outline" className="rounded-full px-4 text-sm">
                Join by code
              </Button>
            </Link>
          </div>
        }
      />

      {!consent && (
        <Section spacing="none" className="mt-4">
          <div className="rounded-elas-lg border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <div className="font-medium">Согласие ещё не дано</div>
            <div className="mt-1 text-xs text-amber-100/90">
              Перед подключением к LIVE-сессии пройдите через центр согласия. Камера используется только для аналитики,
              без записи видео.
            </div>
          </div>
        </Section>
      )}

      {/* Overview stats */}
      <Section spacing="none" className="mt-8 space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatMini label="Всего сессий" value={loading ? "…" : String(totalSessions)} />
          <StatMini label="Предстоят" value={loading ? "…" : String(upcomingCount)} />
          <StatMini label="Завершено" value={loading ? "…" : String(endedCount)} />
        </div>

      <div className="space-y-6">
        {/* LIVE SESSION */}
        {firstLive && (
          <Reveal>
            <Card variant="elevated">
              <CardContent className="p-6 md:p-7">
                <div className="flex flex-wrap items-start justify-between gap-6">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[rgba(255,77,109,0.10)] px-3 py-1 text-xs font-semibold text-fg">
                      <span className="inline-flex h-2 w-2 rounded-full bg-[rgb(var(--error))] animate-pulse" />
                      LIVE сейчас
                    </div>

                    <div className="text-2xl font-semibold text-fg">{firstLive.title}</div>

                    <div className="text-sm text-muted">
                      {firstLive.teacher} • {firstLive.date} •{" "}
                      {firstLive.type === "lecture" ? "Лекция" : "Экзамен"}
                    </div>

                    {!consent && (
                      <div className="text-sm text-muted">
                        Чтобы подключиться, нужно дать согласие на аналитику.
                      </div>
                    )}
                  </div>

                  <div className="min-w-[220px] space-y-2">
                    {consent ? (
                      <Link href={`/student/session/${firstLive.id}`} className="block">
                        <Button size="lg" className="w-full gap-2 rounded-full shadow-soft">
                          Присоединиться <Video size={18} />
                        </Button>
                      </Link>
                    ) : (
                      <Link href="/consent" className="block">
                        <Button size="lg" variant="outline" className="w-full gap-2 rounded-full">
                          Дать согласие <ShieldCheck size={18} />
                        </Button>
                      </Link>
                    )}
                    <div className="text-xs text-muted">
                      Камера используется только для аналитики вовлечённости, без записи видео.
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <StatMini label="Ближайшие" value={`${upcoming.length}`} />
                  <StatMini label="Live сейчас" value={`${live.length}`} />
                  <StatMini label="Consent" value={consent ? "Yes" : "No"} />
                </div>
              </CardContent>
            </Card>
          </Reveal>
        )}

        {/* MAIN GRID */}
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Upcoming */}
          <Reveal className="lg:col-span-8">
            <Card variant="elevated">
              <CardContent className="p-6 md:p-7">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-muted">Ближайшие</div>
                    <div className="mt-2 text-lg font-semibold text-fg">Следующие сессии</div>
                    <div className="mt-2 text-sm text-muted leading-relaxed">
                      Подключение доступно только к сессии в эфире и при данном согласии.
                    </div>
                  </div>

                  <Link href="/student/sessions">
                    <Button variant="outline" className="rounded-full px-4">
                      Весь список
                    </Button>
                  </Link>
                </div>

                <div className="mt-6 space-y-3">
                  {loading ? (
                    <div className="h-24 rounded-elas-lg bg-surface-subtle animate-pulse" />
                  ) : upcoming.length === 0 ? (
                    <div className="rounded-elas-lg bg-surface-subtle p-6 text-center">
                      <div className="text-sm font-medium text-fg">Нет предстоящих сессий</div>
                      <div className="mt-2 text-sm text-muted">
                        Список обновляется автоматически после принятия приглашений в группы.
                      </div>
                    </div>
                  ) : (
                    upcoming.map((s) => (
                      <SessionRow
                        key={s.id}
                        s={s}
                        right={
                          <Link href={`/student/session/${s.id}`}>
                            <Button size="sm" variant="outline">
                              Открыть
                            </Button>
                          </Link>
                        }
                      />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </Reveal>

          {/* Actions / Preparation */}
          <Reveal className="lg:col-span-4">
            <Card variant="elevated">
              <CardContent className="p-6 md:p-7 space-y-4">
                <div>
                  <div className="text-sm text-muted">Действия</div>
                  <div className="mt-2 text-lg font-semibold text-fg">Приватность и подготовка</div>
                </div>

                <div className="rounded-elas-lg bg-surface-subtle/80 p-4">
                  <div className="font-semibold text-fg">Центр согласия</div>
                  <div className="mt-1 text-sm text-muted leading-relaxed">
                    Согласие нужно до начала аналитики по видео.
                  </div>
                  <div className="mt-3">
                    <Link href="/consent">
                      <Button className="w-full rounded-full">Управление согласием</Button>
                    </Link>
                  </div>
                </div>

                <div className="rounded-elas-lg bg-surface-subtle/80 p-4">
                  <div className="font-semibold text-fg">Проверка камеры</div>
                  <div className="mt-1 text-sm text-muted leading-relaxed">
                    Проверьте доступ, освещение и положение лица перед входом в LIVE.
                  </div>
                  <div className="mt-3">
                    <Link href="/student/sessions">
                      <Button variant="outline" className="w-full rounded-full">
                        Перейти к сессиям
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="rounded-elas-lg bg-surface-subtle/80 p-4">
                  <div className="font-semibold text-fg">Моя сводка</div>
                  <div className="mt-1 text-sm text-muted leading-relaxed">
                    Личная статистика вовлечённости (опционально).
                  </div>
                  <div className="mt-3">
                    <Link href="/student/summary">
                      <Button variant="ghost" className="w-full rounded-full">
                        Открыть сводку
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </div>


        {/* INVITATIONS + Recent activity */}
        <div className="grid gap-6 lg:grid-cols-12">
          {apiAvailable && (invitations.length > 0 || invitationsLoading) && (
            <Reveal className="lg:col-span-6">
              <Card variant="elevated">
                <CardContent className="p-6 md:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm text-muted">Приглашения</div>
                      <div className="mt-2 text-lg font-semibold text-fg">
                        Приглашения в группы ({invitations.length})
                      </div>
                      <div className="mt-2 text-sm text-muted leading-relaxed">
                        Примите приглашение, чтобы видеть сессии группы и подключаться к ним.
                      </div>
                    </div>

                    <Badge className="bg-primary/10">
                      {invitationsLoading ? "Loading…" : "Action required"}
                    </Badge>
                  </div>

                  {invitationsLoading ? (
                    <div className="mt-6 h-20 rounded-elas-lg bg-surface-subtle animate-pulse" />
                  ) : invitations.length > 0 ? (
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
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
                </CardContent>
              </Card>
            </Reveal>
          )}

          <Reveal className="lg:col-span-6">
            <Card variant="elevated">
              <CardContent className="p-6 md:p-7 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-muted">Недавние сессии</div>
                    <div className="mt-2 text-lg font-semibold text-fg">История активности</div>
                    <div className="mt-2 text-sm text-muted leading-relaxed">
                      Последние несколько сессий, в которых вы участвовали или которые уже завершены.
                    </div>
                  </div>
                  <Badge className="bg-surface-subtle text-xs text-muted">
                    {ended.length} из {Math.max(ended.length, 5)} показаны
                  </Badge>
                </div>

                <div className="space-y-3">
                  {loading && <div className="h-20 rounded-elas-lg bg-surface-subtle animate-pulse" />}
                  {!loading && ended.length === 0 && (
                    <div className="rounded-elas-lg bg-surface-subtle/80 p-6 text-sm text-muted text-center">
                      История появится после участия хотя бы в одной сессии.
                    </div>
                  )}
                  {!loading &&
                    ended.map((s) => (
                      <SessionRow
                        key={s.id}
                        s={s}
                        right={
                          <Badge className="bg-surface-subtle text-xs">
                            Завершена
                          </Badge>
                        }
                      />
                    ))}
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </div>

        {/* Small info */}
        <Reveal>
          <div className="text-xs text-muted flex items-center gap-2">
            <Sparkles size={14} className="text-[rgb(var(--primary))]" />
            Советы и инсайты формируются из live-событий и агрегированных метрик (без хранения raw-видео).
          </div>
        </Reveal>
      </div>
      </Section>
    </div>
  );
}

function InvitationCard({
  inv,
  onAccept,
  onDecline,
}: {
  inv: InvitationRow;
  onAccept: () => Promise<void>;
  onDecline: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  const handleAccept = () => {
    setBusy(true);
    onAccept().finally(() => setBusy(false));
  };
  const handleDecline = () => {
    setBusy(true);
    onDecline().finally(() => setBusy(false));
  };

  return (
    <div className="rounded-elas-lg bg-surface-subtle/80 ring-1 ring-[color:var(--border)]/20 p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-semibold text-fg truncate">{inv.groupName ?? "Группа"}</div>
        <div className="mt-1 text-sm text-muted">Приглашение в группу</div>
      </div>

      <div className="flex gap-2 shrink-0">
        <Button size="sm" variant="outline" disabled={busy} onClick={handleDecline} className="rounded-full">
          Отклонить
        </Button>
        <Button size="sm" disabled={busy} onClick={handleAccept} className="rounded-full">
          Принять
        </Button>
      </div>
    </div>
  );
};
