"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import Section from "@/components/common/Section";
import Reveal from "@/components/common/Reveal";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { Card, CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { cn } from "@/lib/cn";
import { getApiBaseUrl, getToken, hasAuth } from "@/lib/api/client";
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
  type FullGroup,
  type GroupSession,
} from "@/lib/api/teacher";
import Glow from "@/components/common/Glow";
import { GroupAnalyticsSection } from "@/components/analytics/GroupAnalyticsSection";
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

const ACTION_LABELS: Record<string, string> = {
  Start: "Старт",
  End: "Завершить",
  Reopen: "Открыть снова",
};

function nextTeacherAction(
  status: GroupSession["status"]
): { nextBackendStatus: "active" | "finished" | "draft"; label: keyof typeof ACTION_LABELS } {
  if (status === "upcoming") return { nextBackendStatus: "active", label: "Start" };
  if (status === "live") return { nextBackendStatus: "finished", label: "End" };
  return { nextBackendStatus: "draft", label: "Reopen" };
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
          <div className="absolute right-0 top-full z-20 mt-1 min-w-[200px] rounded-2xl py-1 shadow-elevated border border-[color:var(--border)] ring-1 ring-black/[0.06] dark:ring-white/[0.08] bg-white/[0.97] dark:bg-[rgba(16,18,26,0.98)] backdrop-blur-xl">
            <button
              type="button"
              className="mx-1 flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-left text-sm text-fg transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
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
              className="mx-1 flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-left text-sm text-warning transition-colors hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
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
  const apiAvailable = Boolean(getApiBaseUrl() && hasAuth());

  const [apiData, setApiData] = useState<{ group: FullGroup; sessions: GroupSession[] } | null>(null);
  const [groupLoading, setGroupLoading] = useState(apiAvailable);
  const [tick, setTick] = useState(0);

  const [activeTab, setActiveTab] = useState<TabId>("sessions");

  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [localName, setLocalName] = useState("");
  const [localDescription, setLocalDescription] = useState("");
  const [groupImageMessage, setGroupImageMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [uploadingGroupImage, setUploadingGroupImage] = useState(false);

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

  const [confirmRemoveMember, setConfirmRemoveMember] = useState<{
    memberId: string;
    memberName: string;
  } | null>(null);

  const [confirmBlockMember, setConfirmBlockMember] = useState<{
    memberId: string;
    memberName: string;
  } | null>(null);
  const groupImageInputRef = useRef<HTMLInputElement | null>(null);

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

  const group: FullGroup | null = apiData?.group ?? null;
  const sessions: GroupSession[] = apiData?.sessions ?? [];

  const groupDescriptionValue = useMemo(
    () => ((group as { description?: string } | null)?.description ?? ""),
    [group]
  );

  const groupImageUrl = (group as { imageUrl?: string } | null)?.imageUrl;
  const membersCount = apiAvailable ? groupMembers.length : group?.students.length ?? 0;
  const pendingCount = groupInvitations.filter((i) => i.status === "pending").length;

  const refetchGroup = () => setTick((x) => x + 1);

  const handleGroupImageUpload = async (file?: File | null) => {
    if (!file) return;

    if (!apiAvailable) {
      setGroupImageMessage({
        type: "error",
        text: "Backend недоступен. Загрузка фото группы станет активной после подключения API.",
      });
      return;
    }

    setUploadingGroupImage(true);
    setGroupImageMessage(null);

    try {
      const base = getApiBaseUrl();
      const token = getToken();
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${base}/groups/${id}/image`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      if (!response.ok) {
        const message = response.status === 404 || response.status === 405
          ? "Backend ещё не поддерживает upload фото группы. Нужен endpoint POST /groups/:id/image."
          : "Не удалось загрузить фото группы.";
        throw new Error(message);
      }

      setGroupImageMessage({
        type: "success",
        text: "Фото группы обновлено. Если backend вернул новый imageUrl, карточка обновится сразу.",
      });
      refetchGroup();
    } catch (error) {
      setGroupImageMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Не удалось загрузить фото группы.",
      });
    } finally {
      setUploadingGroupImage(false);
      if (groupImageInputRef.current) {
        groupImageInputRef.current.value = "";
      }
    }
  };

  const handleGroupImageDelete = async () => {
    if (!apiAvailable || !id) return;

    setUploadingGroupImage(true);
    setGroupImageMessage(null);

    try {
      const base = getApiBaseUrl();
      const token = getToken();
      const response = await fetch(`${base}/groups/${id}/image`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Не удалось удалить фото группы.");
      }

      setGroupImageMessage({ type: "success", text: "Фото группы удалено." });
      refetchGroup();
    } catch (error) {
      setGroupImageMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Не удалось удалить фото группы.",
      });
    } finally {
      setUploadingGroupImage(false);
    }
  };

  const openInviteModal = () => {
    setInviteOpen(true);
    setInviteError(null);
    setInviteSuccess(null);
  };

  const closeInviteModal = () => {
    setInviteOpen(false);
    setInviteError(null);
    setInviteSuccess(null);
  };

  useEffect(() => {
    if (!group) return;
    setLocalName(group.name);
    setLocalDescription(groupDescriptionValue);
  }, [group?.id, group?.name, groupDescriptionValue]);

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
        closeInviteModal();
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
        <Card
  variant="elevated"
  className="overflow-hidden rounded-[32px] border border-white/10 bg-white dark:bg-zinc-900 shadow-[0_20px_80px_rgba(0,0,0,.08)]"
>
  {/* HERO */}
  <div
    className="relative h-[190px] md:h-[220px]"
    style={
      groupImageUrl
        ? {
            backgroundImage: `url(${groupImageUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }
        : {
            background:
              "linear-gradient(135deg,#7C3AED 0%,#8B5CF6 45%,#6366F1 100%)",
          }
    }
  >
    <div
      className="absolute inset-0 opacity-20"
      style={{
        backgroundImage:
          "radial-gradient(circle, rgba(255,255,255,.7) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    />

    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/10 to-transparent" />
  </div>

  <CardContent className="relative -mt-24 px-8 pb-8">
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end">
      <div className="flex items-end gap-5">
        <input
          ref={groupImageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) =>
            void handleGroupImageUpload(e.target.files?.[0] ?? null)
          }
        />

        {/* AVATAR */}
        <div className="relative group">
          {groupImageUrl ? (
            <div
              className="h-32 w-32 rounded-[28px] bg-cover bg-center shadow-2xl ring-4 ring-white dark:ring-zinc-900"
              style={{ backgroundImage: `url(${groupImageUrl})` }}
            />
          ) : (
            <div className="flex h-32 w-32 items-center justify-center rounded-[28px] bg-white text-4xl font-bold text-violet-700 shadow-2xl ring-4 ring-white dark:ring-zinc-900">
              {group.name.slice(0, 2).toUpperCase()}
            </div>
          )}

          <button
            onClick={() => groupImageInputRef.current?.click()}
            className="absolute inset-0 rounded-[28px] bg-black/50 opacity-0 transition group-hover:opacity-100"
          />
        </div>

        {/* TITLE */}
        <div className="pb-3">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold md:text-4xl">
              {localName || group.name}
            </h1>

            <button
              onClick={() => setEditingName(true)}
              className="rounded-lg p-2 hover:bg-black/5 dark:hover:bg-white/5"
            >
              <Edit3 size={16} />
            </button>
          </div>

          <p className="mt-2 text-sm text-muted">
            {group.program} • {membersCount} студентов
          </p>
        </div>
      </div>

      <div className="lg:ml-auto flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => groupImageInputRef.current?.click()}
        >
          Фото группы
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={openInviteModal}
        >
          Пригласить
        </Button>

        <ToneBadge tone="success">
          Активна
        </ToneBadge>
      </div>
    </div>

    {/* KPI */}
    <div className="mt-8 overflow-hidden rounded-[24px] border border-black/5 dark:border-white/5 bg-white dark:bg-zinc-950">
      <div className="grid md:grid-cols-4">
        <div className="p-6">
          <div className="text-xs uppercase text-muted">
            Преподаватель
          </div>
          <div className="mt-2 font-semibold">
            {group.teacher.fullName}
          </div>
        </div>

        <div className="border-l border-black/5 dark:border-white/5 p-6">
          <div className="text-xs uppercase text-muted">
            Студентов
          </div>
          <div className="mt-2 text-3xl font-bold">
            {membersCount}
          </div>
        </div>

        <div className="border-l border-black/5 dark:border-white/5 p-6">
          <div className="text-xs uppercase text-muted">
            Сессий
          </div>
          <div className="mt-2 text-3xl font-bold">
            {sessions.length}
          </div>
        </div>

        <div className="border-l border-black/5 dark:border-white/5 p-6">
          <div className="text-xs uppercase text-muted">
            Программа
          </div>
          <div className="mt-2 font-semibold">
            {group.program}
          </div>
        </div>
      </div>
    </div>
  </CardContent>
</Card>
      </Section>

      <Card variant="elevated" className="rounded-[28px]">
  <CardContent className="p-8">
    <h2 className="mb-6 text-xl font-semibold">
      Аналитика группы
    </h2>

    <GroupAnalyticsSection groupId={id} />
  </CardContent>
</Card>
      <Section>
        <div className="mb-5 flex flex-wrap gap-2 border-b border-[color:var(--border)]/30 pb-3">
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
                                      action.nextBackendStatus === "active"
                                        ? "ring-1 ring-amber-400/25 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 text-amber-100"
                                        : action.nextBackendStatus === "finished"
                                          ? "ring-1 ring-[color:var(--border)]/30 bg-surface-subtle hover:bg-surface-subtle/80 text-fg"
                                          : "ring-1 ring-fuchsia-400/25 bg-fuchsia-500/15 hover:bg-fuchsia-500/20 text-fuchsia-100"
                                    )}
                                    onClick={() => {
                                      if (apiAvailable) {
                                        updateSessionStatus(s.id, action.nextBackendStatus).then(refetchGroup);
                                      }
                                    }}
                                  >
                                    {ACTION_LABELS[action.label] ?? action.label}
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
                          group?.students?.map((s: { id: string; fullName: string; email?: string | null }) => (
                            <div
                              key={s.id}
                              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)]/20 bg-surface-subtle/30 p-4"
                            >
                              <div>
                                <div className="font-medium text-fg">{s.fullName}</div>
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
                                <div className="font-medium text-fg">{m.fullName ?? m.email}</div>
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
                                      setConfirmRemoveMember({
                                        memberId: m.id,
                                        memberName: m.fullName ?? m.email ?? "Участник",
                                      })
                                    }
                                    onBlock={() =>
                                      setConfirmBlockMember({
                                        memberId: m.id,
                                        memberName: m.fullName ?? m.email ?? "Участник",
                                      })
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
                          onClick={openInviteModal}
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
                      <span className="font-medium text-fg">{group.teacher.fullName}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Студентов</span>
                      <span className="font-medium text-fg">{membersCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Программа</span>
                      <span className="font-medium text-fg">{group.program}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Статус</span>
                      <ToneBadge tone={group.status === "active" ? "success" : "neutral"}>
                        {group.status === "active" ? "Активна" : "В архиве"}
                      </ToneBadge>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl bg-surface-subtle/40 ring-1 ring-[color:var(--border)]/20 p-4 text-xs leading-relaxed text-muted">
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
                        onClick={openInviteModal}
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
        open={!!confirmRemoveMember}
        onClose={() => setConfirmRemoveMember(null)}
        title="Исключить из группы?"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmRemoveMember(null)}>
              Отмена
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-600"
              onClick={() => {
                if (confirmRemoveMember && id) {
                  removeMemberFromGroup(id, confirmRemoveMember.memberId)
                    .then(refetchGroup)
                    .then(() => setTick((x) => x + 1))
                    .finally(() => setConfirmRemoveMember(null));
                }
              }}
            >
              Исключить
            </Button>
          </div>
        }
      >
        {confirmRemoveMember && (
          <p className="text-sm text-muted">
            Участник «{confirmRemoveMember.memberName}» будет исключён из группы. Он потеряет доступ к сессиям группы. Вы сможете пригласить его снова позже.
          </p>
        )}
      </Modal>

      <Modal
        open={!!confirmBlockMember}
        onClose={() => setConfirmBlockMember(null)}
        title="Заблокировать участника?"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmBlockMember(null)}>
              Отмена
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600"
              onClick={() => {
                if (confirmBlockMember && id) {
                  blockMemberInGroup(id, confirmBlockMember.memberId)
                    .then(refetchGroup)
                    .then(() => setTick((x) => x + 1))
                    .finally(() => setConfirmBlockMember(null));
                }
              }}
            >
              Заблокировать
            </Button>
          </div>
        }
      >
        {confirmBlockMember && (
          <p className="text-sm text-muted">
            Участник «{confirmBlockMember.memberName}» будет заблокирован в группе. Он не сможет подключаться к сессиям до снятия блокировки.
          </p>
        )}
      </Modal>

      <Modal
        open={inviteOpen}
        onClose={closeInviteModal}
        title="Пригласить студентов в группу"
        description="Укажите email через запятую или с новой строки. Если пользователь зарегистрирован, он увидит приглашение в личном кабинете."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeInviteModal}>
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
