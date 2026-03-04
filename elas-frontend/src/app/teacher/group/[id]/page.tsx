"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Section from "@/components/common/Section";
import Reveal from "@/components/common/Reveal";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { getApiBaseUrl, hasAuth } from "@/lib/api/client";
import {
  createInvitations,
  getGroupById as getGroupByIdApi,
  updateSessionStatus,
  getGroupInvitations,
  revokeInvitation,
  getGroupMembers,
  removeMemberFromGroup,
  blockMemberInGroup,
  getGroupMessages,
  postGroupMessage,
  type GroupInvitationRow,
  type GroupMemberRow,
  type GroupMessage,
} from "@/lib/api/teacher";
import { getGroupById } from "@/lib/mock/groups";
import { getSessionsByGroup, type GroupSession } from "@/lib/mock/groupSessions";
import type { Group } from "@/lib/mock/groups";
import { nextTeacherAction, setSessionStatusOverride } from "@/lib/mock/sessionLifecycle";
import Glow from "@/components/common/Glow"

type Tone = "neutral" | "success" | "info" | "warning" | "purple";
function ToneBadge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/20"
      : tone === "info"
      ? "bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/20"
      : tone === "warning"
      ? "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/20"
      : tone === "purple"
      ? "bg-purple-500/15 text-purple-200 ring-1 ring-purple-400/25"
      : "bg-white/10 text-zinc-200 ring-1 ring-white/10";
  return (
    <Badge className={cn("rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur", toneClass)}>
      {children}
    </Badge>
  );
}

function fmtDateTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function statusTone(s: GroupSession["status"]): Tone {
  if (s === "live") return "warning";
  if (s === "ended") return "neutral";
  return "info";
}
function typeTone(t: GroupSession["type"]): Tone {
  return t === "exam" ? "purple" : "info";
}

function MemberActionsDropdown({
  groupId,
  userId,
  onRemove,
  onBlock,
}: {
  groupId: string;
  userId: string;
  onRemove: () => void;
  onBlock: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)} className="text-zinc-400">
        Действия ▾
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full z-20 mt-1 min-w-45 rounded-2xl border border-white/10 bg-[#0b0b12] py-1 shadow-xl">
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-zinc-200 hover:bg-white/10"
              onClick={() => { setOpen(false); onRemove(); }}
            >
              Удалить из группы
            </button>
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm text-amber-400 hover:bg-white/10"
              onClick={() => { setOpen(false); onBlock(); }}
            >
              Заблокировать
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function TeacherGroupDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const apiAvailable = getApiBaseUrl() && hasAuth();

  const [apiData, setApiData] = useState<{ group: Group; sessions: GroupSession[] } | null>(null);
  const [groupLoading, setGroupLoading] = useState(!!apiAvailable);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!apiAvailable || !id) {
      setApiData(null);
      setGroupLoading(false);
      return;
    }
    setGroupLoading(true);
    getGroupByIdApi(id).then((data) => {
      setApiData(data);
      setGroupLoading(false);
    });
  }, [id, apiAvailable, tick]);

  const mockGroup = useMemo(() => getGroupById(id), [id]);
  const mockSessions = useMemo(() => getSessionsByGroup(id), [id, tick]);

  const group: Group | null = apiData?.group ?? mockGroup ?? null;
  const sessions: GroupSession[] = apiData ? apiData.sessions : mockSessions;
  const refetchGroup = () => setTick((x) => x + 1);

  type TabId = "sessions" | "announcements" | "members" | "invitations";
  const [activeTab, setActiveTab] = useState<TabId>("sessions");

  const [groupInvitations, setGroupInvitations] = useState<GroupInvitationRow[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMemberRow[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [announcements, setAnnouncements] = useState<GroupMessage[]>([]);
  const [annLoading, setAnnLoading] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState("");

  useEffect(() => {
    if (!apiAvailable || !id) return;
    if (activeTab === "invitations") {
      setInvitationsLoading(true);
      getGroupInvitations(id).then((data) => {
        setGroupInvitations(data);
        setInvitationsLoading(false);
      });
    }
  }, [apiAvailable, id, activeTab, tick]);

  useEffect(() => {
    if (!apiAvailable || !id) return;
    if (activeTab === "members") {
      setMembersLoading(true);
      getGroupMembers(id, true).then((data) => {
        setGroupMembers(data.students ?? []);
        setMembersLoading(false);
      });
    }
  }, [apiAvailable, id, activeTab, tick]);

  useEffect(() => {
    if (!apiAvailable || !id) return;
    if (activeTab === "announcements") {
      setAnnLoading(true);
      getGroupMessages(id, "announcements")
        .then((data) => {
          setAnnouncements(data);
          setAnnLoading(false);
        })
        .catch(() => setAnnLoading(false));
    }
  }, [apiAvailable, id, activeTab, tick]);

  const pendingCount = groupInvitations.filter((i) => i.status === "pending").length;

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const handleInviteSubmit = async () => {
    const emails = inviteEmails
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (emails.length === 0) {
      setInviteError("Введите хотя бы один email.");
      return;
    }
    setInviteError(null);
    setInviteSuccess(null);
    setInviteLoading(true);
    try {
      const res = await createInvitations(id, emails);
      const n = res?.created?.length ?? 0;
      setInviteSuccess(n > 0 ? `Отправлено приглашений: ${n}` : "Приглашения созданы.");
      setInviteEmails("");
      setTimeout(() => { setInviteOpen(false); setInviteSuccess(null); }, 1500);
    } catch (e: unknown) {
      setInviteError(e instanceof Error ? e.message : "Ошибка при создании приглашений.");
    } finally {
      setInviteLoading(false);
    }
  };

  if (groupLoading && !group) {
    return (
      <div className="relative space-y-14 pb-20">
        <Glow />
        <PageHero title="Загрузка…" subtitle="Группа и сессии загружаются." />
        <Section>
          <GlassCard className="p-7">
            <div className="h-24 rounded-2xl bg-white/5 animate-pulse" />
          </GlassCard>
        </Section>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="relative space-y-14 pb-20">
        <Glow />
        <PageHero title="Группа не найдена" subtitle="Такой группы нет в системе." />
        <Section>
          <GlassCard className="p-7">
            <Link
              href="/teacher/groups"
              className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm ring-1 ring-white/10 bg-white/10 hover:bg-white/15 text-zinc-100 transition"
            >
              ← К списку групп
            </Link>
          </GlassCard>
        </Section>
      </div>
    );
  }

  return (
    <div className="relative space-y-14 pb-20">
      <Glow />
      <Breadcrumbs
        items={[
          { label: "Преподаватель", href: "/teacher/dashboard" },
          { label: "Группы", href: "/teacher/groups" },
          { label: group.name },
        ]}
      />
      <div className="flex items-center gap-2 mb-2">
        <Link
          href="/teacher/groups"
          className="text-sm text-(--muted) hover:text-(--text)] transition"
        >
          ← К списку групп
        </Link>
      </div>
      <PageHero
        title={`${group.name} · Рабочее пространство`}
        subtitle={
          apiAvailable && pendingCount > 0
            ? `${group.program} · ${group.students.length} студентов · ${pendingCount} приглашений в ожидании`
            : `${group.program} · ${group.students.length} студентов`
        }
      />

      <Section>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/teacher/groups"
            className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm ring-1 ring-white/10 bg-white/10 hover:bg-white/15 text-zinc-100 transition"
          >
            Назад
          </Link>
          {apiAvailable && (
            <Button variant="outline" size="sm" onClick={() => { setInviteOpen(true); setInviteError(null); setInviteSuccess(null); }}>
              Пригласить студентов
            </Button>
          )}
          {apiAvailable && pendingCount > 0 && (
            <ToneBadge tone="warning">Приглашений: {pendingCount}</ToneBadge>
          )}
          <ToneBadge tone={group.status === "active" ? "success" : "neutral"}>
            {group.status === "active" ? "Активна" : "В архиве"}
          </ToneBadge>
          <ToneBadge tone="info">{group.id}</ToneBadge>
        </div>
      </Section>

      <Section>
        <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3 mb-4">
          {(["sessions", "announcements", "members", "invitations"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "rounded-2xl px-4 py-2 text-sm font-medium transition",
                activeTab === tab
                  ? "bg-purple-500/20 ring-1 ring-purple-400/25 text-purple-100"
                  : "ring-1 ring-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
              )}
            >
              {tab === "sessions"
                ? "Сессии"
                : tab === "announcements"
                ? "Объявления"
                : tab === "members"
                ? "Участники"
                : "Приглашения"}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <GlassCard className="p-7">
              {activeTab === "sessions" && (
                <>
                  <h2 className="text-xl font-semibold">Сессии</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Запуск и завершение сессий: Старт → В эфире, Завершить → Завершена.
                  </p>

                  <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-245 text-sm">
                    <thead className="bg-white/5 text-zinc-400">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Название</th>
                        <th className="px-4 py-3 text-left font-medium">Тип</th>
                        <th className="px-4 py-3 text-left font-medium">Статус</th>
                        <th className="px-4 py-3 text-left font-medium">Начало</th>
                        <th className="px-4 py-3 text-left font-medium">Действие</th>
                        <th className="px-4 py-3 text-left font-medium">Открыть</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {sessions.map((s) => {
                        const action = nextTeacherAction(s.status);

                        return (
                          <tr key={s.id} className="bg-black/10 hover:bg-white/5 transition">
                            <td className="px-4 py-3">
                              <div className="space-y-0.5">
                                <p className="font-medium text-zinc-200">{s.title}</p>
                                <p className="text-xs text-zinc-500">{s.id}</p>
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <ToneBadge tone={typeTone(s.type)}>{s.type === "exam" ? "Экзамен" : "Лекция"}</ToneBadge>
                            </td>

                            <td className="px-4 py-3">
                              <ToneBadge tone={statusTone(s.status)}>
                              {s.status === "live" ? "В эфире" : s.status === "ended" ? "Завершена" : "Ожидает"}
                            </ToneBadge>
                            </td>

                            <td className="px-4 py-3 text-zinc-300">{fmtDateTime(s.startsAt)}</td>

                            <td className="px-4 py-3">
                              <Button
                                type="button"
                                className={
                                  action.next === "live"
                                    ? "ring-1 ring-amber-400/25 bg-amber-500/15 hover:bg-amber-500/20 text-amber-100"
                                    : action.next === "ended"
                                    ? "ring-1 ring-white/10 bg-white/10 hover:bg-white/15 text-zinc-100"
                                    : "ring-1 ring-purple-400/25 bg-purple-500/15 hover:bg-purple-500/20 text-purple-100"
                                }
                                onClick={() => {
                                  if (apiAvailable) {
                                    const backendStatus = action.next === "live" ? "active" : action.next === "ended" ? "finished" : "draft";
                                    updateSessionStatus(s.id, backendStatus).then(refetchGroup);
                                  } else {
                                    setSessionStatusOverride(s.id, action.next);
                                    setTick((x) => x + 1);
                                  }
                                }}
                              >
                                {({ Start: "Старт", End: "Завершить", Reopen: "Открыть снова" }[action.label]) || action.label}
                              </Button>
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <Link
                                  href={`/teacher/session/${s.id}`}
                                  className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm ring-1 ring-white/10 bg-white/10 hover:bg-white/15 text-zinc-100 transition"
                                >
                                  Монитор
                                </Link>

                                <Link
                                  href={`/teacher/session/${s.id}/analytics`}
                                  className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm ring-1 ring-purple-400/20 bg-purple-500/15 hover:bg-purple-500/20 text-purple-100 transition"
                                >
                                  Аналитика
                                </Link>

                                {s.type === "exam" ? (
                                  <Link
                                    href={`/teacher/session/${s.id}/exam-analytics`}
                                    className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm ring-1 ring-purple-400/20 bg-purple-500/15 hover:bg-purple-500/20 text-purple-100 transition"
                                  >
                                    Экзамен
                                  </Link>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {sessions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center">
                            <p className="text-sm text-zinc-200">В этой группе пока нет сессий.</p>
                            <p className="mt-1 text-xs text-zinc-500">
                              Создайте сессию в разделе «Сессии» и привяжите её к этой группе.
                            </p>
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
                </>
              )}

              {activeTab === "announcements" && (
                <>
                  <h2 className="text-xl font-semibold">Объявления</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Сообщения для всей группы: расписание, материалы, важные напоминания.
                  </p>
                  {apiAvailable ? (
                    <>
                      <div className="mt-4 space-y-3">
                        <textarea
                          className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                          rows={3}
                          placeholder="Напишите объявление для группы…"
                          value={newAnnouncement}
                          onChange={(e) => setNewAnnouncement(e.target.value)}
                        />
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs text-zinc-500">
                            Только преподаватель может публиковать объявления. Студенты увидят их в своей группе.
                          </p>
                          <Button
                            size="sm"
                            disabled={!newAnnouncement.trim()}
                            onClick={async () => {
                              try {
                                const msg = await postGroupMessage(id, {
                                  type: "announcement",
                                  text: newAnnouncement.trim(),
                                });
                                setAnnouncements((prev) => [...prev, msg]);
                                setNewAnnouncement("");
                              } catch (e) {
                                console.error("postGroupMessage", e);
                              }
                            }}
                          >
                            Отправить
                          </Button>
                        </div>
                      </div>

                      <div className="mt-6 space-y-3">
                        {annLoading && <div className="h-24 rounded-2xl bg-white/5 animate-pulse" />}
                        {!annLoading && announcements.length === 0 && (
                          <div className="rounded-2xl border border-dashed border-white/10 bg-black/30 px-4 py-6 text-sm text-zinc-500">
                            Пока нет объявлений. Создайте первое, чтобы студенты видели важные новости по курсу.
                          </div>
                        )}
                        {!annLoading &&
                          announcements.map((m) => (
                            <div
                              key={m.id}
                              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-100"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs uppercase tracking-wide text-purple-300">Объявление</span>
                                <span className="text-xs text-zinc-400">
                                  {fmtDateTime(typeof m.createdAt === "string" ? m.createdAt : String(m.createdAt))}
                                </span>
                              </div>
                              <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-100">{m.text}</p>
                            </div>
                          ))}
                      </div>
                    </>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-black/30 px-4 py-6 text-sm text-zinc-500">
                      Объявления группы будут доступны при подключённом бэкенде.
                    </div>
                  )}
                </>
              )}

              {activeTab === "members" && (
                <>
                  <h2 className="text-xl font-semibold">Участники</h2>
                  <p className="mt-1 text-sm text-zinc-400">Студенты группы. Управление через меню действий.</p>
                  {membersLoading && apiAvailable ? (
                    <div className="mt-6 h-32 rounded-2xl bg-white/5 animate-pulse" />
                  ) : (
                    <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
                      <table className="w-full min-w-130 text-sm">
                        <thead className="bg-white/5 text-zinc-400">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium">Студент</th>
                            <th className="px-4 py-3 text-left font-medium">Статус</th>
                            <th className="px-4 py-3 text-left font-medium">Действия</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {!apiAvailable && group.students.map((s) => (
                            <tr key={s.id} className="bg-black/10">
                              <td className="px-4 py-3">
                                <span className="font-medium text-zinc-200">{s.name}</span>
                                {s.email && <span className="ml-2 text-xs text-zinc-500">{s.email}</span>}
                              </td>
                              <td className="px-4 py-3"><ToneBadge tone="success">В группе</ToneBadge></td>
                              <td className="px-4 py-3 text-zinc-500">—</td>
                            </tr>
                          ))}
                          {apiAvailable && groupMembers.map((m) => (
                            <tr key={m.id} className="bg-black/10 hover:bg-white/5">
                              <td className="px-4 py-3">
                                <span className="font-medium text-zinc-200">{m.name ?? m.email}</span>
                                <span className="ml-2 text-xs text-zinc-500">{m.email}</span>
                              </td>
                              <td className="px-4 py-3">
                                <ToneBadge tone={(m.status ?? "active") === "active" ? "success" : (m.status ?? "active") === "blocked" ? "warning" : "neutral"}>
                                  {(m.status ?? "active") === "active" ? "В группе" : (m.status ?? "active") === "blocked" ? "Заблокирован" : "Удалён"}
                                </ToneBadge>
                              </td>
                              <td className="px-4 py-3">
                                {(m.status ?? "active") === "active" && (
                                  <MemberActionsDropdown
                                    groupId={id}
                                    userId={m.id}
                                    onRemove={() => removeMemberFromGroup(id, m.id).then(refetchGroup).then(() => setTick((x) => x + 1))}
                                    onBlock={() => blockMemberInGroup(id, m.id).then(refetchGroup).then(() => setTick((x) => x + 1))}
                                  />
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {activeTab === "invitations" && (
                <>
                  <h2 className="text-xl font-semibold">Приглашения</h2>
                  <p className="mt-1 text-sm text-zinc-400">Отправленные приглашения и их статусы.</p>
                  {invitationsLoading ? (
                    <div className="mt-6 h-32 rounded-2xl bg-white/5 animate-pulse" />
                  ) : (
                    <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
                      <table className="w-full min-w-120 text-sm">
                        <thead className="bg-white/5 text-zinc-400">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium">Email</th>
                            <th className="px-4 py-3 text-left font-medium">Отправлено</th>
                            <th className="px-4 py-3 text-left font-medium">Статус</th>
                            <th className="px-4 py-3 text-left font-medium">Действия</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {groupInvitations.length === 0 && !invitationsLoading && (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">Нет приглашений</td>
                            </tr>
                          )}
                          {groupInvitations.map((inv) => (
                            <tr key={inv.id} className="bg-black/10 hover:bg-white/5">
                              <td className="px-4 py-3 text-zinc-200">{inv.inviteeEmail}</td>
                              <td className="px-4 py-3 text-zinc-400">{fmtDateTime(inv.createdAt)}</td>
                              <td className="px-4 py-3">
                                <ToneBadge tone={inv.status === "pending" ? "warning" : inv.status === "accepted" ? "success" : "neutral"}>
                                  {inv.status === "pending" ? "Ожидает" : inv.status === "accepted" ? "Принято" : inv.status === "revoked" ? "Отменено" : inv.status}
                                </ToneBadge>
                              </td>
                              <td className="px-4 py-3">
                                {inv.status === "pending" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-amber-400 hover:text-amber-300"
                                    onClick={() => revokeInvitation(inv.id).then(() => { setTick((x) => x + 1); setGroupInvitations((prev) => prev.map((i) => (i.id === inv.id ? { ...i, status: "revoked" } : i))); })}
                                  >
                                    Отменить
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </GlassCard>
          </Reveal>

          <Reveal>
            <GlassCard className="p-7">
              <h2 className="text-xl font-semibold">Информация о группе</h2>
              <p className="mt-1 text-sm text-zinc-400">Краткий контекст для работы.</p>

              <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Преподаватель</span>
                  <span className="text-zinc-200">{group.teacher.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Студентов</span>
                  <span className="text-zinc-200">{group.students.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">Программа</span>
                  <span className="text-zinc-200">{group.program}</span>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-zinc-500">
                Подключение к сессии доступно студентам после дачи согласия на анализ эмоций.
              </div>
            </GlassCard>
          </Reveal>
        </div>
      </Section>

      <Modal
        open={inviteOpen}
        onClose={() => { setInviteOpen(false); setInviteError(null); setInviteSuccess(null); }}
        title="Пригласить студентов в группу"
        description="Укажите email через запятую или с новой строки. Если пользователь зарегистрирован, он увидит приглашение в личном кабинете."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>Отмена</Button>
            <Button disabled={inviteLoading} onClick={handleInviteSubmit}>
              {inviteLoading ? "Отправка…" : "Отправить приглашения"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <textarea
            className="w-full min-h-30 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            placeholder="student@example.com, another@university.edu"
            value={inviteEmails}
            onChange={(e) => setInviteEmails(e.target.value)}
          />
          {inviteError && <p className="text-sm text-red-400">{inviteError}</p>}
          {inviteSuccess && <p className="text-sm text-emerald-400">{inviteSuccess}</p>}
        </div>
      </Modal>
    </div>
  );
}