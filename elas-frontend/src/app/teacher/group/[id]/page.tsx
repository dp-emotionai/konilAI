"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Section from "@/components/common/Section";
import Reveal from "@/components/common/Reveal";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { Card, CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
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
import {
  nextTeacherAction,
  setSessionStatusOverride,
} from "@/lib/mock/sessionLifecycle";
import Glow from "@/components/common/Glow";
import {
  Edit3,
  Mail,
  ImagePlus,
  Users,
  Megaphone,
  CalendarDays,
  UserPlus,
  Clock3,
  BookOpen,
  GraduationCap,
  Trash2,
  ShieldAlert,
  Send,
} from "lucide-react";

type Tone = "neutral" | "success" | "info" | "warning" | "purple";

type TabId = "sessions" | "announcements" | "members" | "invitations";

function ToneBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  const toneClass =
    tone === "success"
      ? "bg-success/15 text-success ring-1 ring-success/30"
      : tone === "info"
        ? "bg-[rgb(var(--primary))]/15 text-[rgb(var(--primary))] ring-1 ring-[rgb(var(--primary))]/25"
        : tone === "warning"
          ? "bg-warning/15 text-warning ring-1 ring-warning/30"
          : tone === "purple"
            ? "bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-400/25"
            : "bg-surface-subtle text-muted ring-1 ring-[color:var(--border)]/30";

  return (
    <Badge className={cn("rounded-full px-2.5 py-1 text-xs font-medium", toneClass)}>
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

function TabButton({
  active,
  label,
  count,
  onClick,
  icon,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition",
        active
          ? "bg-primary-muted ring-1 ring-[rgb(var(--primary))]/25 text-[rgb(var(--primary))]"
          : "ring-1 ring-[color:var(--border)]/30 bg-surface-subtle/60 hover:bg-surface-subtle text-muted hover:text-fg"
      )}
    >
      {icon}
      <span>{label}</span>
      {typeof count === "number" && (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs",
            active
              ? "bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))]"
              : "bg-surface text-muted"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[color:var(--border)]/30 bg-surface-subtle/30 px-5 py-8 text-center">
      <div className="text-sm font-medium text-fg">{title}</div>
      <div className="mt-1 text-sm text-muted">{description}</div>
    </div>
  );
}

function StatTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)]/20 bg-surface-subtle/50 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
        {icon}
      </div>
      <div className="mt-2 text-lg font-semibold text-fg">{value}</div>
    </div>
  );
}

function MemberActionsDropdown({
  onRemove,
  onBlock,
}: {
  onRemove: () => void;
  onBlock: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
        className="text-muted"
      >
        Действия ▾
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 top-full z-20 mt-1 min-w-[200px] rounded-2xl bg-surface shadow-card ring-1 ring-[color:var(--border)]/25 py-1">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-fg hover:bg-surface-subtle"
              onClick={() => {
                setOpen(false);
                onRemove();
              }}
            >
              <Trash2 size={14} />
              Удалить из группы
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-warning hover:bg-surface-subtle"
              onClick={() => {
                setOpen(false);
                onBlock();
              }}
            >
              <ShieldAlert size={14} />
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

  const [activeTab, setActiveTab] = useState<TabId>("sessions");

  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [localName, setLocalName] = useState("");
  const [localDescription, setLocalDescription] = useState("");

  const [groupInvitations, setGroupInvitations] = useState<GroupInvitationRow[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMemberRow[]>([]);
  const [announcements, setAnnouncements] = useState<GroupMessage[]>([]);

  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [annLoading, setAnnLoading] = useState(false);

  const [newAnnouncement, setNewAnnouncement] = useState("");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

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

  useEffect(() => {
    if (group) {
      setLocalName(group.name);
      setLocalDescription((group as { description?: string }).description ?? "");
    }
  }, [group?.id, group?.name, (group as { description?: string })?.description]);

  useEffect(() => {
    if (!apiAvailable || !id || activeTab !== "invitations") return;

    setInvitationsLoading(true);
    getGroupInvitations(id).then((data) => {
      setGroupInvitations(data);
      setInvitationsLoading(false);
    });
  }, [apiAvailable, id, activeTab, tick]);

  useEffect(() => {
    if (!apiAvailable || !id || activeTab !== "members") return;

    setMembersLoading(true);
    getGroupMembers(id, true).then((data) => {
      setGroupMembers(data.students ?? []);
      setMembersLoading(false);
    });
  }, [apiAvailable, id, activeTab, tick]);

  useEffect(() => {
    if (!apiAvailable || !id || activeTab !== "announcements") return;

    setAnnLoading(true);
    getGroupMessages(id, "announcements")
      .then((data) => {
        setAnnouncements(data);
        setAnnLoading(false);
      })
      .catch(() => setAnnLoading(false));
  }, [apiAvailable, id, activeTab, tick]);

  const pendingCount = groupInvitations.filter((i) => i.status === "pending").length;
  const membersCount = apiAvailable ? groupMembers.length : group?.students.length ?? 0;

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
      setTimeout(() => {
        setInviteOpen(false);
        setInviteSuccess(null);
        setTick((x) => x + 1);
      }, 1200);
    } catch (e: unknown) {
      setInviteError(e instanceof Error ? e.message : "Ошибка при создании приглашений.");
    } finally {
      setInviteLoading(false);
    }
  };

  if (groupLoading && !group) {
    return (
      <div className="relative space-y-12 pb-20">
        <Glow />
        <PageHero title="Загрузка…" subtitle="Группа и связанные данные загружаются." />
        <Section>
          <Card variant="elevated">
            <CardContent className="p-7">
              <div className="h-24 rounded-2xl bg-surface-subtle animate-pulse" />
            </CardContent>
          </Card>
        </Section>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="relative space-y-12 pb-20">
        <Glow />
        <PageHero title="Группа не найдена" subtitle="Такой группы нет в системе." />
        <Section>
          <Card variant="elevated">
            <CardContent className="p-7">
              <Link
                href="/teacher/groups"
                className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm ring-1 ring-[color:var(--border)]/30 bg-surface-subtle hover:bg-surface-subtle/80 text-fg transition"
              >
                ← К списку групп
              </Link>
            </CardContent>
          </Card>
        </Section>
      </div>
    );
  }

  const groupImageUrl = (group as { imageUrl?: string }).imageUrl;
  const groupDescription = (group as { description?: string }).description ?? "";

  return (
    <div className="relative space-y-10 pb-20">
      <Glow />

      <Breadcrumbs
        items={[
          { label: "Преподаватель", href: "/teacher/dashboard" },
          { label: "Группы", href: "/teacher/groups" },
          { label: group.name },
        ]}
      />

      <Section spacing="none">
        <Link
          href="/teacher/groups"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg transition-colors"
        >
          ← К списку групп
        </Link>
      </Section>

      <Section spacing="none">
        <Card variant="elevated" className="overflow-hidden">
          <div
            className="relative h-36 md:h-44 w-full bg-gradient-to-br from-primary-muted/40 to-primary-muted/10"
            style={
              groupImageUrl
                ? {
                    backgroundImage: `url(${groupImageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>

          <CardContent className="relative -mt-16 md:-mt-20 px-6 pb-6 md:px-8 md:pb-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
              <div className="flex items-end gap-4 min-w-0">
                {groupImageUrl ? (
                  <div className="relative group/avatar">
                    <div
                      className="h-24 w-24 md:h-28 md:w-28 rounded-3xl ring-4 ring-[var(--surface)] bg-surface-subtle bg-cover bg-center shrink-0 shadow-card"
                      style={{ backgroundImage: `url(${groupImageUrl})` }}
                    />
                    <button
                      type="button"
                      className="absolute inset-0 flex items-center justify-center rounded-3xl bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity text-white text-xs gap-1"
                      title="Сменить фото (скоро)"
                    >
                      <ImagePlus size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="relative group/avatar">
                    <div className="h-24 w-24 md:h-28 md:w-28 rounded-3xl ring-4 ring-[var(--surface)] bg-gradient-to-br from-primary-muted to-primary-muted/60 flex items-center justify-center text-3xl md:text-4xl font-bold text-[rgb(var(--primary))] shrink-0 shadow-card">
                      {group.name.slice(0, 2).toUpperCase()}
                    </div>
                    <button
                      type="button"
                      className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-3xl bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity text-white text-xs"
                      title="Добавить фото группы (скоро)"
                    >
                      <ImagePlus size={18} />
                      <span>Фото</span>
                    </button>
                  </div>
                )}

                <div className="pb-1 min-w-0">
                  {editingName ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        value={localName}
                        onChange={(e) => setLocalName(e.target.value)}
                        className="max-w-xs rounded-xl font-semibold text-lg"
                        autoFocus
                      />
                      <Button size="sm" onClick={() => setEditingName(false)}>
                        Сохранить
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setLocalName(group.name);
                          setEditingName(false);
                        }}
                      >
                        Отмена
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0">
                      <h1 className="truncate text-2xl md:text-3xl font-bold text-fg">
                        {localName || group.name}
                      </h1>
                      <button
                        type="button"
                        onClick={() => setEditingName(true)}
                        className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-surface-subtle transition-colors shrink-0"
                        aria-label="Редактировать название"
                      >
                        <Edit3 size={16} />
                      </button>
                    </div>
                  )}

                  <p className="mt-1 text-sm text-muted">
                    {group.program} · {membersCount} студентов
                    {apiAvailable && pendingCount > 0 && ` · ${pendingCount} приглашений`}
                  </p>
                </div>
              </div>

              <div className="sm:ml-auto flex flex-wrap items-center gap-2">
                {apiAvailable && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 rounded-xl"
                    onClick={() => {
                      setInviteOpen(true);
                      setInviteError(null);
                      setInviteSuccess(null);
                    }}
                  >
                    <UserPlus size={16} />
                    Пригласить
                  </Button>
                )}
                <ToneBadge tone={group.status === "active" ? "success" : "neutral"}>
                  {group.status === "active" ? "Активна" : "В архиве"}
                </ToneBadge>
                <Badge className="bg-surface-subtle text-muted">{group.id}</Badge>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <StatTile
                label="Преподаватель"
                value={group.teacher.name}
                icon={<Users size={15} className="text-muted" />}
              />
              <StatTile
                label="Студентов"
                value={`${membersCount}`}
                icon={<GraduationCap size={15} className="text-muted" />}
              />
              <StatTile
                label="Сессий"
                value={`${sessions.length}`}
                icon={<CalendarDays size={15} className="text-muted" />}
              />
              <StatTile
                label="Программа"
                value={group.program}
                icon={<BookOpen size={15} className="text-muted" />}
              />
            </div>

            <div className="mt-5 rounded-2xl border border-[color:var(--border)]/20 bg-surface-subtle/30 p-4">
              {editingDesc ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted">Описание группы</label>
                  <Input
                    value={localDescription}
                    onChange={(e) => setLocalDescription(e.target.value)}
                    placeholder="Краткое описание курса или группы…"
                    className="rounded-xl"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setEditingDesc(false)}>
                      Сохранить
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setLocalDescription(groupDescription);
                        setEditingDesc(false);
                      }}
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <div className="text-xs uppercase tracking-wide text-muted">Описание</div>
                    <p className="mt-2 text-sm leading-relaxed text-muted">
                      {localDescription || groupDescription || "Добавьте короткое описание группы, чтобы преподавателю и студентам было проще ориентироваться."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingDesc(true)}
                    className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-surface-subtle transition-colors shrink-0"
                    aria-label="Редактировать описание"
                  >
                    <Edit3 size={14} />
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Section>

      <Section>
        <div className="flex flex-wrap gap-2 border-b border-[color:var(--border)]/30 pb-3 mb-5">
          <TabButton
            active={activeTab === "sessions"}
            label="Сессии"
            count={sessions.length}
            onClick={() => setActiveTab("sessions")}
            icon={<CalendarDays size={15} />}
          />
          <TabButton
            active={activeTab === "announcements"}
            label="Объявления"
            count={announcements.length || undefined}
            onClick={() => setActiveTab("announcements")}
            icon={<Megaphone size={15} />}
          />
          <TabButton
            active={activeTab === "members"}
            label="Участники"
            count={membersCount}
            onClick={() => setActiveTab("members")}
            icon={<Users size={15} />}
          />
          <TabButton
            active={activeTab === "invitations"}
            label="Приглашения"
            count={pendingCount || undefined}
            onClick={() => setActiveTab("invitations")}
            icon={<Mail size={15} />}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <Card variant="elevated">
              <CardContent className="p-6 md:p-8">
                {activeTab === "sessions" && (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-semibold text-fg">Сессии группы</h2>
                        <p className="mt-1 text-sm text-muted">
                          Управляйте жизненным циклом занятий и экзаменов.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      {sessions.length === 0 ? (
                        <EmptyState
                          title="Сессий пока нет"
                          description="Создайте первую сессию в разделе «Сессии» и привяжите её к этой группе."
                        />
                      ) : (
                        sessions.map((s) => {
                          const action = nextTeacherAction(s.status);

                          return (
                            <div
                              key={s.id}
                              className="rounded-2xl border border-[color:var(--border)]/20 bg-surface-subtle/30 p-5"
                            >
                              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-base font-semibold text-fg">{s.title}</h3>
                                    <ToneBadge tone={typeTone(s.type)}>
                                      {s.type === "exam" ? "Экзамен" : "Лекция"}
                                    </ToneBadge>
                                    <ToneBadge tone={statusTone(s.status)}>
                                      {s.status === "live"
                                        ? "В эфире"
                                        : s.status === "ended"
                                          ? "Завершена"
                                          : "Ожидает"}
                                    </ToneBadge>
                                  </div>

                                  <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted">
                                    <span className="inline-flex items-center gap-1.5">
                                      <Clock3 size={14} />
                                      {fmtDateTime(s.startsAt)}
                                    </span>
                                    <span className="text-xs text-muted">{s.id}</span>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  <Button
                                    type="button"
                                    className={cn(
                                      action.next === "live"
                                        ? "ring-1 ring-amber-400/25 bg-amber-500/15 hover:bg-amber-500/20 text-amber-100"
                                        : action.next === "ended"
                                          ? "ring-1 ring-[color:var(--border)]/30 bg-surface-subtle hover:bg-surface-subtle/80 text-fg"
                                          : "ring-1 ring-fuchsia-400/25 bg-fuchsia-500/15 hover:bg-fuchsia-500/20 text-fuchsia-100"
                                    )}
                                    onClick={() => {
                                      if (apiAvailable) {
                                        const backendStatus =
                                          action.next === "live"
                                            ? "active"
                                            : action.next === "ended"
                                              ? "finished"
                                              : "draft";
                                        updateSessionStatus(s.id, backendStatus).then(refetchGroup);
                                      } else {
                                        setSessionStatusOverride(s.id, action.next);
                                        setTick((x) => x + 1);
                                      }
                                    }}
                                  >
                                    {({ Start: "Старт", End: "Завершить", Reopen: "Открыть снова" }[
                                      action.label
                                    ]) || action.label}
                                  </Button>

                                  <Link
                                    href={`/teacher/session/${s.id}`}
                                    className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm ring-1 ring-[color:var(--border)]/30 bg-surface-subtle hover:bg-surface-subtle/80 text-fg transition"
                                  >
                                    Монитор
                                  </Link>

                                  <Link
                                    href={`/teacher/session/${s.id}/analytics`}
                                    className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm ring-1 ring-[rgb(var(--primary))]/25 bg-primary-muted hover:bg-primary-muted/80 text-[rgb(var(--primary))] transition"
                                  >
                                    Аналитика
                                  </Link>

                                  {s.type === "exam" && (
                                    <Link
                                      href={`/teacher/session/${s.id}/exam-analytics`}
                                      className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm ring-1 ring-fuchsia-400/25 bg-fuchsia-500/15 hover:bg-fuchsia-500/20 text-fuchsia-200 transition"
                                    >
                                      Экзамен
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}

                {activeTab === "announcements" && (
                  <>
                    <h2 className="text-xl font-semibold text-fg">Объявления группы</h2>
                    <p className="mt-1 text-sm text-muted">
                      Публикуйте важные сообщения для всех студентов группы.
                    </p>

                    {apiAvailable ? (
                      <>
                        <div className="mt-5 rounded-2xl border border-[color:var(--border)]/20 bg-surface-subtle/30 p-4">
                          <textarea
                            className="w-full rounded-2xl border border-[color:var(--border)]/20 bg-surface px-4 py-3 text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))]/30"
                            rows={4}
                            placeholder="Напишите объявление для группы…"
                            value={newAnnouncement}
                            onChange={(e) => setNewAnnouncement(e.target.value)}
                          />
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <p className="text-xs text-muted">
                              Объявление увидят все студенты этой группы.
                            </p>
                            <Button
                              size="sm"
                              disabled={!newAnnouncement.trim()}
                              className="gap-2"
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
                              <Send size={14} />
                              Отправить
                            </Button>
                          </div>
                        </div>

                        <div className="mt-6 space-y-4">
                          {annLoading && (
                            <div className="h-24 rounded-2xl bg-surface-subtle animate-pulse" />
                          )}

                          {!annLoading && announcements.length === 0 && (
                            <EmptyState
                              title="Пока нет объявлений"
                              description="Создайте первое объявление, чтобы студенты видели важные новости по курсу."
                            />
                          )}

                          {!annLoading &&
                            announcements.map((m) => (
                              <div
                                key={m.id}
                                className="rounded-2xl border border-[color:var(--border)]/20 bg-surface-subtle/30 p-4"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <ToneBadge tone="purple">Объявление</ToneBadge>
                                  <span className="text-xs text-muted">
                                    {fmtDateTime(
                                      typeof m.createdAt === "string"
                                        ? m.createdAt
                                        : String(m.createdAt)
                                    )}
                                  </span>
                                </div>
                                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-fg">
                                  {m.text}
                                </p>
                              </div>
                            ))}
                        </div>
                      </>
                    ) : (
                      <div className="mt-5">
                        <EmptyState
                          title="Бэкенд не подключён"
                          description="Объявления группы будут доступны при подключённом API."
                        />
                      </div>
                    )}
                  </>
                )}

                {activeTab === "members" && (
                  <>
                    <h2 className="text-xl font-semibold text-fg">Участники группы</h2>
                    <p className="mt-1 text-sm text-muted">
                      Просматривайте студентов и управляйте доступом.
                    </p>

                    {membersLoading && apiAvailable ? (
                      <div className="mt-6 h-32 rounded-2xl bg-surface-subtle animate-pulse" />
                    ) : (
                      <div className="mt-6 space-y-3">
                        {!apiAvailable &&
                          group.students.map((s) => (
                            <div
                              key={s.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)]/20 bg-surface-subtle/30 p-4"
                            >
                              <div>
                                <div className="font-medium text-fg">{s.name}</div>
                                {s.email && <div className="text-sm text-muted">{s.email}</div>}
                              </div>
                              <ToneBadge tone="success">В группе</ToneBadge>
                            </div>
                          ))}

                        {apiAvailable && groupMembers.length === 0 && (
                          <EmptyState
                            title="Список участников пуст"
                            description="Когда студенты вступят в группу, они появятся здесь."
                          />
                        )}

                        {apiAvailable &&
                          groupMembers.map((m) => (
                            <div
                              key={m.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)]/20 bg-surface-subtle/30 p-4"
                            >
                              <div>
                                <div className="font-medium text-fg">{m.name ?? m.email}</div>
                                <div className="text-sm text-muted">{m.email}</div>
                              </div>

                              <div className="flex items-center gap-2">
                                <ToneBadge
                                  tone={
                                    (m.status ?? "active") === "active"
                                      ? "success"
                                      : (m.status ?? "active") === "blocked"
                                        ? "warning"
                                        : "neutral"
                                  }
                                >
                                  {(m.status ?? "active") === "active"
                                    ? "В группе"
                                    : (m.status ?? "active") === "blocked"
                                      ? "Заблокирован"
                                      : "Удалён"}
                                </ToneBadge>

                                {(m.status ?? "active") === "active" && (
                                  <MemberActionsDropdown
                                    onRemove={() =>
                                      removeMemberFromGroup(id, m.id)
                                        .then(refetchGroup)
                                        .then(() => setTick((x) => x + 1))
                                    }
                                    onBlock={() =>
                                      blockMemberInGroup(id, m.id)
                                        .then(refetchGroup)
                                        .then(() => setTick((x) => x + 1))
                                    }
                                  />
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </>
                )}

                {activeTab === "invitations" && (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-semibold text-fg">Приглашения</h2>
                        <p className="mt-1 text-sm text-muted">
                          Отправленные инвайты и текущие статусы.
                        </p>
                      </div>

                      {apiAvailable && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => {
                            setInviteOpen(true);
                            setInviteError(null);
                            setInviteSuccess(null);
                          }}
                        >
                          <UserPlus size={14} />
                          Пригласить
                        </Button>
                      )}
                    </div>

                    {invitationsLoading ? (
                      <div className="mt-6 h-32 rounded-2xl bg-surface-subtle animate-pulse" />
                    ) : (
                      <div className="mt-6 space-y-3">
                        {groupInvitations.length === 0 ? (
                          <EmptyState
                            title="Приглашений пока нет"
                            description="Отправьте первое приглашение студентам по email."
                          />
                        ) : (
                          groupInvitations.map((inv) => (
                            <div
                              key={inv.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)]/20 bg-surface-subtle/30 p-4"
                            >
                              <div>
                                <div className="font-medium text-fg">{inv.inviteeEmail}</div>
                                <div className="text-sm text-muted">
                                  Отправлено: {fmtDateTime(inv.createdAt)}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <ToneBadge
                                  tone={
                                    inv.status === "pending"
                                      ? "warning"
                                      : inv.status === "accepted"
                                        ? "success"
                                        : "neutral"
                                  }
                                >
                                  {inv.status === "pending"
                                    ? "Ожидает"
                                    : inv.status === "accepted"
                                      ? "Принято"
                                      : inv.status === "revoked"
                                        ? "Отменено"
                                        : inv.status}
                                </ToneBadge>

                                {inv.status === "pending" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-warning hover:text-warning"
                                    onClick={() =>
                                      revokeInvitation(inv.id).then(() => {
                                        setTick((x) => x + 1);
                                        setGroupInvitations((prev) =>
                                          prev.map((i) =>
                                            i.id === inv.id ? { ...i, status: "revoked" } : i
                                          )
                                        );
                                      })
                                    }
                                  >
                                    Отменить
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </Reveal>

          <Reveal>
            <div className="space-y-6">
              <Card variant="elevated">
                <CardContent className="p-6 md:p-8">
                  <h2 className="text-xl font-semibold text-fg">Информация о группе</h2>
                  <p className="mt-1 text-sm text-muted">Краткий контекст для работы.</p>

                  <div className="mt-6 space-y-3 rounded-2xl bg-surface-subtle/60 ring-1 ring-[color:var(--border)]/20 p-5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Преподаватель</span>
                      <span className="text-fg font-medium">{group.teacher.name}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Студентов</span>
                      <span className="text-fg font-medium">{membersCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Программа</span>
                      <span className="text-fg font-medium">{group.program}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Статус</span>
                      <ToneBadge tone={group.status === "active" ? "success" : "neutral"}>
                        {group.status === "active" ? "Активна" : "В архиве"}
                      </ToneBadge>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-surface-subtle/40 ring-1 ring-[color:var(--border)]/20 p-4 text-xs text-muted leading-relaxed">
                    Подключение к live-сессии доступно студентам после согласия на обработку
                    агрегированных аналитических сигналов.
                  </div>
                </CardContent>
              </Card>

              <Card variant="elevated">
                <CardContent className="p-6 md:p-8">
                  <h3 className="text-lg font-semibold text-fg">Быстрые действия</h3>
                  <div className="mt-4 flex flex-col gap-2">
                    <Link
                      href="/teacher/sessions/new"
                      className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm ring-1 ring-[rgb(var(--primary))]/25 bg-primary-muted hover:bg-primary-muted/80 text-[rgb(var(--primary))] transition"
                    >
                      Создать новую сессию
                    </Link>

                    {apiAvailable && (
                      <Button
                        variant="outline"
                        className="justify-center"
                        onClick={() => {
                          setInviteOpen(true);
                          setInviteError(null);
                          setInviteSuccess(null);
                        }}
                      >
                        Пригласить студентов
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </Reveal>
        </div>
      </Section>

      <Modal
        open={inviteOpen}
        onClose={() => {
          setInviteOpen(false);
          setInviteError(null);
          setInviteSuccess(null);
        }}
        title="Пригласить студентов в группу"
        description="Укажите email через запятую или с новой строки. Если пользователь зарегистрирован, он увидит приглашение в личном кабинете."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>
              Отмена
            </Button>
            <Button disabled={inviteLoading} onClick={handleInviteSubmit}>
              {inviteLoading ? "Отправка…" : "Отправить приглашения"}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <textarea
            className="w-full min-h-32 rounded-2xl border border-[color:var(--border)]/20 bg-surface px-4 py-3 text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))]/30"
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