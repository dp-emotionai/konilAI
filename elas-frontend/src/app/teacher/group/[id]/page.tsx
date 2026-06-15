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
  getInvitableStudents,
  postGroupMessage,
  type GroupInvitationRow,
  type InvitableStudentRow,
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
  Search,
  CheckCircle2,
  MoreHorizontal,
  Camera,
  Info,
  Zap,
  CalendarPlus,
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
    <Badge
      className={cn("rounded-full px-2.5 py-1 text-xs font-medium", toneClass)}
    >
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

function nextTeacherAction(status: GroupSession["status"]): {
  nextBackendStatus: "active" | "finished" | "draft";
  label: keyof typeof ACTION_LABELS;
} {
  if (status === "upcoming")
    return { nextBackendStatus: "active", label: "Start" };
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
        "relative inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition",
        active
          ? "bg-white text-[rgb(var(--primary))] shadow-[0_10px_28px_rgba(116,72,255,0.10)] ring-1 ring-[rgb(var(--primary))]/20 after:absolute after:bottom-[-13px] after:left-4 after:right-4 after:h-0.5 after:rounded-full after:bg-[rgb(var(--primary))]"
          : "bg-white/60 text-muted ring-1 ring-[color:var(--border)]/20 hover:bg-white hover:text-fg",
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
              : "bg-surface text-muted",
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
    <div className="rounded-[22px] border border-[color:var(--border)]/20 bg-white/75 px-5 py-4 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 text-[rgb(var(--primary))]">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted">
            {label}
          </div>
          <div className="mt-1 truncate text-base font-bold text-fg">
            {value}
          </div>
        </div>
      </div>
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
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
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

  const [apiData, setApiData] = useState<{
    group: FullGroup;
    sessions: GroupSession[];
  } | null>(null);
  const [groupLoading, setGroupLoading] = useState(apiAvailable);
  const [tick, setTick] = useState(0);

  const [activeTab, setActiveTab] = useState<TabId>("sessions");

  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [localName, setLocalName] = useState("");
  const [localDescription, setLocalDescription] = useState("");
  const [groupImageMessage, setGroupImageMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [uploadingGroupImage, setUploadingGroupImage] = useState(false);

  const [groupInvitations, setGroupInvitations] = useState<
    GroupInvitationRow[]
  >([]);
  const [groupMembers, setGroupMembers] = useState<GroupMemberRow[]>([]);
  const [announcements, setAnnouncements] = useState<GroupMessage[]>([]);

  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [annLoading, setAnnLoading] = useState(false);

  const [newAnnouncement, setNewAnnouncement] = useState("");

  const [inviteOpen, setInviteOpen] = useState(false);
  const [invitableStudents, setInvitableStudents] = useState<
    InvitableStudentRow[]
  >([]);
  const [selectedInviteIds, setSelectedInviteIds] = useState<string[]>([]);
  const [inviteSearch, setInviteSearch] = useState("");
  const [inviteListLoading, setInviteListLoading] = useState(false);
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
    () => (group as { description?: string } | null)?.description ?? "",
    [group],
  );

  const groupImageUrl = (group as { imageUrl?: string } | null)?.imageUrl;
  const membersCount = apiAvailable
    ? groupMembers.length
    : (group?.students.length ?? 0);
  const pendingCount = groupInvitations.filter(
    (i) => i.status === "pending",
  ).length;

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
        const message =
          response.status === 404 || response.status === 405
            ? "Backend ещё не поддерживает upload фото группы. Нужен endpoint POST /groups/:id/image."
            : "Не удалось загрузить фото группы.";
        throw new Error(message);
      }

      setGroupImageMessage(null);
      refetchGroup();
    } catch (error) {
      setGroupImageMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Не удалось загрузить фото группы.",
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
        text:
          error instanceof Error
            ? error.message
            : "Не удалось удалить фото группы.",
      });
    } finally {
      setUploadingGroupImage(false);
    }
  };

  const openInviteModal = () => {
    setInviteOpen(true);
    setInviteError(null);
    setInviteSuccess(null);
    setInviteSearch("");
  };

  const closeInviteModal = () => {
    setInviteOpen(false);
    setInviteError(null);
    setInviteSuccess(null);
    setSelectedInviteIds([]);
    setInviteSearch("");
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
    if (!apiAvailable || !id || !inviteOpen) return;

    let cancelled = false;
    setInviteListLoading(true);
    getInvitableStudents(id)
      .then((data) => {
        if (cancelled) return;
        setInvitableStudents(data);
        setSelectedInviteIds((prev) =>
          prev.filter((studentId) =>
            data.some(
              (student) => student.id === studentId && !student.alreadyInvited,
            ),
          ),
        );
      })
      .catch(() => {
        if (!cancelled) setInvitableStudents([]);
      })
      .finally(() => {
        if (!cancelled) setInviteListLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiAvailable, id, inviteOpen, tick]);

  const filteredInvitableStudents = useMemo(() => {
    const query = inviteSearch.trim().toLowerCase();

    if (!query) return invitableStudents;

    return invitableStudents.filter((student) => {
      const fullName = student.fullName?.toLowerCase() ?? "";
      const email = student.email.toLowerCase();
      return fullName.includes(query) || email.includes(query);
    });
  }, [invitableStudents, inviteSearch]);

  const selectedInviteStudents = useMemo(
    () =>
      invitableStudents.filter(
        (student) =>
          selectedInviteIds.includes(student.id) && !student.alreadyInvited,
      ),
    [invitableStudents, selectedInviteIds],
  );

  const toggleInviteStudent = (student: InvitableStudentRow) => {
    if (student.alreadyInvited) return;

    setInviteError(null);
    setInviteSuccess(null);
    setSelectedInviteIds((prev) =>
      prev.includes(student.id)
        ? prev.filter((studentId) => studentId !== student.id)
        : [...prev, student.id],
    );
  };

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
    const emails = selectedInviteStudents
      .map((student) => student.email.trim().toLowerCase())
      .filter(Boolean);

    if (emails.length === 0) {
      setInviteError("Выберите хотя бы одного студента из списка.");
      return;
    }

    setInviteError(null);
    setInviteSuccess(null);
    setInviteLoading(true);

    try {
      const res = await createInvitations(id, emails);
      const n = res?.created?.length ?? 0;
      setInviteSuccess(
        n > 0
          ? `Отправлено приглашений: ${n}`
          : "Выбранные студенты уже приглашены.",
      );
      setSelectedInviteIds([]);

      setTimeout(() => {
        closeInviteModal();
        setTick((x) => x + 1);
      }, 1200);
    } catch (e: unknown) {
      setInviteError(
        e instanceof Error ? e.message : "Ошибка при создании приглашений.",
      );
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
    <div className="relative space-y-6 bg-gradient-to-b from-white via-violet-50/20 to-slate-50/60 pb-20">
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
          className="overflow-hidden rounded-[28px] border border-violet-100/70 bg-white/90 shadow-[0_24px_70px_rgba(88,65,180,0.12)]"
        >
          <div
            className="relative min-h-[190px] overflow-hidden rounded-t-[28px] bg-gradient-to-br from-violet-50 via-white to-indigo-50 px-7 py-7 md:px-9"
            style={
              groupImageUrl
                ? {
                    backgroundImage: `linear-gradient(90deg, rgba(255,255,255,.82), rgba(255,255,255,.66)), url(${groupImageUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_20%_20%,rgba(116,72,255,.18),transparent_26%),radial-gradient(circle_at_80%_8%,rgba(168,85,247,.15),transparent_22%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-full opacity-45 [background-image:repeating-linear-gradient(115deg,rgba(116,72,255,.10)_0,rgba(116,72,255,.10)_1px,transparent_1px,transparent_18px)]" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-6">
                <input
                  ref={groupImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) =>
                    void handleGroupImageUpload(event.target.files?.[0] ?? null)
                  }
                  disabled={uploadingGroupImage}
                />

                {groupImageUrl ? (
                  <div className="relative group/avatar">
                    <div
                      className="h-24 w-24 shrink-0 rounded-[26px] bg-white bg-cover bg-center shadow-[0_18px_45px_rgba(15,23,42,0.16)] ring-1 ring-white md:h-28 md:w-28"
                      style={{ backgroundImage: `url(${groupImageUrl})` }}
                    />
                    <button
                      type="button"
                      onClick={() => groupImageInputRef.current?.click()}
                      className="absolute inset-0 flex items-center justify-center gap-1 rounded-[26px] bg-slate-900/55 text-xs text-white opacity-0 backdrop-blur-sm transition-opacity group-hover/avatar:opacity-100"
                      title="Сменить фото"
                    >
                      <Camera size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="relative group/avatar">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[26px] bg-white text-4xl font-extrabold text-[rgb(var(--primary))] shadow-[0_18px_45px_rgba(15,23,42,0.14)] ring-1 ring-violet-100 md:h-28 md:w-28">
                      {group.name.slice(0, 2).toUpperCase()}
                    </div>
                    <button
                      type="button"
                      onClick={() => groupImageInputRef.current?.click()}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-[26px] bg-slate-900/55 text-xs text-white opacity-0 backdrop-blur-sm transition-opacity group-hover/avatar:opacity-100"
                      title="Добавить фото группы"
                    >
                      <Camera size={18} />
                      <span>Фото</span>
                    </button>
                  </div>
                )}

                <div className="min-w-0">
                  {editingName ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        value={localName}
                        onChange={(e) => setLocalName(e.target.value)}
                        className="max-w-xs rounded-xl bg-white text-lg font-semibold"
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
                    <div className="flex min-w-0 items-center gap-2">
                      <h1 className="truncate text-3xl font-extrabold tracking-tight text-fg md:text-4xl">
                        {localName || group.name}
                      </h1>
                      <button
                        type="button"
                        onClick={() => setEditingName(true)}
                        className="shrink-0 rounded-xl p-2 text-muted transition-colors hover:bg-white/80 hover:text-[rgb(var(--primary))]"
                        aria-label="Редактировать название"
                      >
                        <Edit3 size={18} />
                      </button>
                    </div>
                  )}

                  <p className="mt-2 text-sm font-medium text-muted">
                    {group.program} · {membersCount} студентов
                    {apiAvailable &&
                      pendingCount > 0 &&
                      ` · ${pendingCount} приглашений`}
                  </p>
                  {groupImageMessage && (
                    <p
                      className={cn(
                        "mt-2 text-xs font-semibold",
                        groupImageMessage.type === "error"
                          ? "text-rose-500"
                          : "text-emerald-600",
                      )}
                    >
                      {groupImageMessage.text}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2 rounded-2xl border-white/80 bg-white/90 shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
                  onClick={() => groupImageInputRef.current?.click()}
                  disabled={uploadingGroupImage}
                >
                  <Camera size={16} />
                  {uploadingGroupImage ? "Загрузка..." : "Фото группы"}
                </Button>
                {apiAvailable && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 rounded-2xl border-white/80 bg-white/90 shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
                    onClick={openInviteModal}
                  >
                    <UserPlus size={16} />
                    Пригласить
                  </Button>
                )}
                <ToneBadge
                  tone={group.status === "active" ? "success" : "neutral"}
                >
                  {group.status === "active" ? "Активна" : "В архиве"}
                </ToneBadge>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-2xl border-white/80 bg-white/90 px-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]"
                >
                  <MoreHorizontal size={18} />
                </Button>
              </div>
            </div>
          </div>

          <CardContent className="px-7 pb-7 pt-5 md:px-9">
            <div className="grid gap-3 md:grid-cols-4">
              <StatTile
                label="Преподаватель"
                value={group.teacher.fullName}
                icon={<Users size={20} />}
              />
              <StatTile
                label="Студентов"
                value={`${membersCount}`}
                icon={<Users size={20} />}
              />
              <StatTile
                label="Сессий"
                value={`${sessions.length}`}
                icon={<GraduationCap size={20} />}
              />
              <StatTile
                label="Программа"
                value={group.program}
                icon={<BookOpen size={20} />}
              />
            </div>

            <div className="mt-3 rounded-[22px] border border-[color:var(--border)]/20 bg-white/65 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.03)]">
              {editingDesc ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wide text-muted">
                    Описание
                  </label>
                  <Input
                    value={localDescription}
                    onChange={(e) => setLocalDescription(e.target.value)}
                    placeholder="Краткое описание курса или группы…"
                    className="rounded-xl bg-white"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setEditingDesc(false)}>
                      Сохранить
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setLocalDescription(groupDescriptionValue);
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
                    <div className="text-xs font-bold uppercase tracking-wide text-muted">
                      Описание
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {localDescription ||
                        groupDescriptionValue ||
                        "Добавьте короткое описание группы, чтобы преподавателю и студентам было проще ориентироваться."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingDesc(true)}
                    className="shrink-0 rounded-xl p-2 text-muted transition-colors hover:bg-violet-50 hover:text-[rgb(var(--primary))]"
                    aria-label="Редактировать описание"
                  >
                    <Edit3 size={15} />
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </Section>

      <Section>
        <div className="grid gap-6 lg:grid-cols-3">
          {id && (
            <Reveal className="lg:col-span-2">
              <GroupAnalyticsSection groupId={id} />
            </Reveal>
          )}

          <Reveal>
            <div className="space-y-4">
              <Card
                variant="elevated"
                className="rounded-[26px] border-violet-100/70 bg-white/90 shadow-[0_18px_55px_rgba(88,65,180,0.10)]"
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-100 text-[rgb(var(--primary))]">
                      <Info size={18} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-fg">
                        Информация о группе
                      </h2>
                      <p className="mt-0.5 text-xs text-muted">
                        Краткий контекст для работы.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Преподаватель</span>
                      <span className="font-bold text-fg">
                        {group.teacher.fullName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Студентов</span>
                      <span className="font-bold text-fg">{membersCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Программа</span>
                      <span className="font-bold text-fg">{group.program}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Статус</span>
                      <ToneBadge
                        tone={group.status === "active" ? "success" : "neutral"}
                      >
                        {group.status === "active" ? "Активна" : "В архиве"}
                      </ToneBadge>
                    </div>
                  </div>

                  <div className="mt-6 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-4 text-sm text-muted">
                    Подключение к live-сессии доступно студентам после согласия
                    на обработку агрегированных аналитических сигналов.
                  </div>
                </CardContent>
              </Card>

              <Card
                variant="elevated"
                className="rounded-[26px] border-violet-100/70 bg-white/90 shadow-[0_18px_55px_rgba(88,65,180,0.10)]"
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-violet-100 text-[rgb(var(--primary))]">
                      <Zap size={18} />
                    </div>
                    <h3 className="text-lg font-bold text-fg">
                      Быстрые действия
                    </h3>
                  </div>
                  <div className="mt-5 flex flex-col gap-3">
                    <Link
                      href="/teacher/sessions/new"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6D36F5] to-[#7C4DFF] px-4 py-3 text-sm font-bold text-white shadow-[0_16px_35px_rgba(116,72,255,0.28)] transition hover:translate-y-[-1px]"
                    >
                      <CalendarPlus size={17} />
                      Создать новую сессию
                    </Link>

                    {apiAvailable && (
                      <Button
                        variant="outline"
                        className="h-11 justify-center rounded-2xl gap-2"
                        onClick={openInviteModal}
                      >
                        <UserPlus size={17} />
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

      <Section>
        <div className="mb-0 flex flex-wrap gap-2 rounded-t-[26px] border border-b-0 border-[color:var(--border)]/20 bg-white/80 px-5 pt-4 pb-3 shadow-[0_12px_35px_rgba(15,23,42,0.04)]">
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

        <div>
          <Reveal>
            <Card
              variant="elevated"
              className="rounded-t-none rounded-b-[26px] border-t-0 bg-white/90 shadow-[0_18px_55px_rgba(88,65,180,0.08)]"
            >
              <CardContent className="p-6 md:p-8">
                {activeTab === "sessions" && (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-semibold text-fg">
                          Сессии группы
                        </h2>
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
                                    <h3 className="text-base font-semibold text-fg">
                                      {s.title}
                                    </h3>
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
                                    <span className="text-xs text-muted">
                                      {s.id}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  <Button
                                    type="button"
                                    className={cn(
                                      action.nextBackendStatus === "active"
                                        ? "ring-1 ring-amber-400/25 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 text-amber-100"
                                        : action.nextBackendStatus ===
                                            "finished"
                                          ? "ring-1 ring-[color:var(--border)]/30 bg-surface-subtle hover:bg-surface-subtle/80 text-fg"
                                          : "ring-1 ring-fuchsia-400/25 bg-fuchsia-500/15 hover:bg-fuchsia-500/20 text-fuchsia-100",
                                    )}
                                    onClick={() => {
                                      if (apiAvailable) {
                                        updateSessionStatus(
                                          s.id,
                                          action.nextBackendStatus,
                                        ).then(refetchGroup);
                                      }
                                    }}
                                  >
                                    {ACTION_LABELS[action.label] ??
                                      action.label}
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
                    <h2 className="text-xl font-semibold text-fg">
                      Объявления группы
                    </h2>
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
                                  <ToneBadge tone="purple">
                                    Объявление
                                  </ToneBadge>
                                  <span className="text-xs text-muted">
                                    {fmtDateTime(
                                      typeof m.createdAt === "string"
                                        ? m.createdAt
                                        : String(m.createdAt),
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
                    <h2 className="text-xl font-semibold text-fg">
                      Участники группы
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      Просматривайте студентов и управляйте доступом.
                    </p>

                    {membersLoading && apiAvailable ? (
                      <div className="mt-6 h-32 rounded-2xl bg-surface-subtle animate-pulse" />
                    ) : (
                      <div className="mt-6 space-y-3">
                        {!apiAvailable &&
                          group?.students?.map(
                            (s: {
                              id: string;
                              fullName: string;
                              email?: string | null;
                            }) => (
                              <div
                                key={s.id}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)]/20 bg-surface-subtle/30 p-4"
                              >
                                <div>
                                  <div className="font-medium text-fg">
                                    {s.fullName}
                                  </div>
                                  {s.email && (
                                    <div className="text-sm text-muted">
                                      {s.email}
                                    </div>
                                  )}
                                </div>
                                <ToneBadge tone="success">В группе</ToneBadge>
                              </div>
                            ),
                          )}

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
                                <div className="font-medium text-fg">
                                  {m.fullName ?? m.email}
                                </div>
                                <div className="text-sm text-muted">
                                  {m.email}
                                </div>
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
                                        memberName:
                                          m.fullName ?? m.email ?? "Участник",
                                      })
                                    }
                                    onBlock={() =>
                                      setConfirmBlockMember({
                                        memberId: m.id,
                                        memberName:
                                          m.fullName ?? m.email ?? "Участник",
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
                        <h2 className="text-xl font-semibold text-fg">
                          Приглашения
                        </h2>
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
                                <div className="font-medium text-fg">
                                  {inv.inviteeEmail}
                                </div>
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
                                            i.id === inv.id
                                              ? { ...i, status: "revoked" }
                                              : i,
                                          ),
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
        </div>
      </Section>

      <Modal
        open={!!confirmRemoveMember}
        onClose={() => setConfirmRemoveMember(null)}
        title="Исключить из группы?"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setConfirmRemoveMember(null)}
            >
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
            Участник «{confirmRemoveMember.memberName}» будет исключён из
            группы. Он потеряет доступ к сессиям группы. Вы сможете пригласить
            его снова позже.
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
            Участник «{confirmBlockMember.memberName}» будет заблокирован в
            группе. Он не сможет подключаться к сессиям до снятия блокировки.
          </p>
        )}
      </Modal>

      <Modal
        open={inviteOpen}
        onClose={closeInviteModal}
        title="Пригласить студентов в группу"
        description="Выберите студентов из списка зарегистрированных пользователей. Email вручную вводить не нужно."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={closeInviteModal}>
              Отмена
            </Button>
            <Button
              disabled={inviteLoading || selectedInviteStudents.length === 0}
              onClick={handleInviteSubmit}
            >
              {inviteLoading
                ? "Отправка…"
                : `Отправить (${selectedInviteStudents.length})`}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              value={inviteSearch}
              onChange={(event) => setInviteSearch(event.target.value)}
              placeholder="Поиск по имени или email..."
              className="w-full rounded-2xl border border-[color:var(--border)]/20 bg-surface px-10 py-3 text-sm text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))]/30"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              Доступно студентов:{" "}
              {
                invitableStudents.filter((student) => !student.alreadyInvited)
                  .length
              }
            </span>
            <span>Выбрано: {selectedInviteStudents.length}</span>
          </div>

          <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {inviteListLoading ? (
              <div className="rounded-2xl border border-[color:var(--border)]/20 bg-surface-subtle/40 px-4 py-8 text-center text-sm text-muted">
                Загружаем студентов...
              </div>
            ) : filteredInvitableStudents.length > 0 ? (
              filteredInvitableStudents.map((student) => {
                const selected = selectedInviteIds.includes(student.id);
                const disabled = student.alreadyInvited;

                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => toggleInviteStudent(student)}
                    disabled={disabled}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition",
                      selected
                        ? "border-[rgb(var(--primary))]/50 bg-primary-muted/70"
                        : "border-[color:var(--border)]/20 bg-surface hover:bg-surface-subtle",
                      disabled &&
                        "cursor-not-allowed opacity-55 hover:bg-surface",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-5 w-5 shrink-0 place-items-center rounded-md border",
                        selected
                          ? "border-[rgb(var(--primary))] bg-[rgb(var(--primary))] text-white"
                          : "border-[color:var(--border)]/40 bg-surface",
                      )}
                    >
                      {selected && <CheckCircle2 size={14} />}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-fg">
                        {student.fullName || student.email}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-muted">
                        {student.email}
                      </div>
                    </div>

                    {student.alreadyInvited && (
                      <span className="rounded-full bg-warning/15 px-2.5 py-1 text-[11px] font-semibold text-warning">
                        Уже приглашён
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-[color:var(--border)]/30 bg-surface-subtle/40 px-4 py-8 text-center text-sm text-muted">
                Подходящие студенты не найдены.
              </div>
            )}
          </div>

          {inviteError && <p className="text-sm text-red-400">{inviteError}</p>}
          {inviteSuccess && (
            <p className="text-sm text-emerald-400">{inviteSuccess}</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
