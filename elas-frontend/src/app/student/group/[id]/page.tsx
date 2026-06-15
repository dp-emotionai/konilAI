"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  GraduationCap,
  ShieldCheck,
  Users,
} from "lucide-react";

import Breadcrumbs from "@/components/layout/Breadcrumbs";
import Section from "@/components/common/Section";
import Reveal from "@/components/common/Reveal";
import Badge from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { getApiBaseUrl, hasAuth } from "@/lib/api/client";
import { getStudentGroupDetail, type StudentGroupDetail } from "@/lib/api/student";
import { readConsent } from "@/lib/consent";

type Tone = "neutral" | "success" | "info" | "warning" | "purple";
type SessionStatus = "live" | "ended" | "upcoming";
type SessionType = "lecture" | "exam";
type TabId = "sessions" | "members";

type GroupSessionRow = {
  id: string;
  title: string;
  type: SessionType;
  status: SessionStatus;
  groupId: string;
  startsAt?: string;
};

function ToneBadge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : tone === "info"
        ? "bg-sky-50 text-sky-700 ring-sky-200"
        : tone === "warning"
          ? "bg-amber-50 text-amber-700 ring-amber-200"
          : tone === "purple"
            ? "bg-violet-50 text-violet-700 ring-violet-200"
            : "bg-slate-100 text-slate-600 ring-slate-200";

  return (
    <Badge className={cn("rounded-full px-3 py-1 text-xs font-bold ring-1", toneClass)}>
      {children}
    </Badge>
  );
}

function fmtDateTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("ru-RU", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function statusTone(status: SessionStatus): Tone {
  if (status === "live") return "warning";
  if (status === "ended") return "neutral";
  return "info";
}

function typeTone(type: SessionType): Tone {
  return type === "exam" ? "purple" : "info";
}

function statusLabel(status: SessionStatus) {
  if (status === "live") return "В эфире";
  if (status === "ended") return "Завершена";
  return "Ожидает";
}

function typeLabel(type: SessionType) {
  return type === "exam" ? "Экзамен" : "Лекция";
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-5 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-[#7448FF]">
          {icon}
        </div>
      </div>
      <div className="mt-3 truncate text-2xl font-black tracking-tight text-slate-950">{value}</div>
    </div>
  );
}

export default function StudentGroupDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const apiAvailable = getApiBaseUrl() && hasAuth();
  const [apiDetail, setApiDetail] = useState<StudentGroupDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(!!apiAvailable);
  const [activeTab, setActiveTab] = useState<TabId>("sessions");
  const [consent, setConsent] = useState(() => readConsent());

  useEffect(() => {
    if (!apiAvailable || !id) return;

    getStudentGroupDetail(id)
      .then((data) => setApiDetail(data))
      .catch(() => setApiDetail(null))
      .finally(() => setDetailLoading(false));
  }, [apiAvailable, id]);

  useEffect(() => {
    const onStorage = () => setConsent(readConsent());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const group = apiDetail
    ? {
        id: apiDetail.id,
        name: apiDetail.name,
        program: apiDetail.name,
        status: "active" as const,
        teacher: {
          id: "",
          fullName: apiDetail.teacherFullName,
          email: apiDetail.teacher,
        },
      }
    : null;

  const sessions: GroupSessionRow[] = useMemo(
    () =>
      apiDetail?.sessions?.map((session) => ({
        id: session.id,
        title: session.title,
        type: session.type === "exam" ? "exam" : "lecture",
        status:
          session.status === "active"
            ? "live"
            : session.status === "finished"
              ? "ended"
              : "upcoming",
        groupId: id,
        startsAt: session.startedAt ?? undefined,
      })) ?? [],
    [apiDetail?.sessions, id]
  );

  const members = useMemo(
    () =>
      apiDetail?.members?.map((member) => ({
        id: member.id,
        fullName: member.fullName ?? member.email ?? "",
        email: member.email ?? null,
      })) ?? [],
    [apiDetail?.members]
  );

  const liveSessionsCount = sessions.filter((session) => session.status === "live").length;

  if (detailLoading && !group) {
    return (
      <div className="min-h-[70vh] space-y-8 pb-16">
        <Section>
          <div className="rounded-[32px] border border-slate-200/70 bg-white/70 p-8 shadow-sm">
            <div className="h-7 w-48 animate-pulse rounded-full bg-slate-100" />
            <div className="mt-6 h-40 animate-pulse rounded-3xl bg-slate-100" />
          </div>
        </Section>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="space-y-8 pb-16">
        <Breadcrumbs
          items={[
            { label: "Студент", href: "/student/dashboard" },
            { label: "Группы", href: "/student/groups" },
            { label: "Не найдена" },
          ]}
        />
        <Section>
          <Card className="overflow-hidden border border-slate-200/70 bg-white shadow-sm">
            <CardContent className="p-8">
              <h1 className="text-2xl font-black text-slate-950">Группа не найдена</h1>
              <p className="mt-2 text-sm text-slate-500">
                У вас нет доступа к этой группе или она не существует.
              </p>
              <Link
                href="/student/groups"
                className="mt-6 inline-flex items-center justify-center rounded-2xl bg-[#7448FF] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#7448FF]/20"
              >
                К списку групп
              </Link>
            </CardContent>
          </Card>
        </Section>
      </div>
    );
  }

  return (
    <div className="relative space-y-8 pb-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(circle_at_top_left,rgba(116,72,255,0.15),transparent_34%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.12),transparent_32%)]" />

      <Breadcrumbs
        items={[
          { label: "Студент", href: "/student/dashboard" },
          { label: "Группы", href: "/student/groups" },
          { label: group.name },
        ]}
      />

      <Section spacing="none">
        <Link href="/student/groups" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-[#7448FF]">
          ← К списку групп
        </Link>
      </Section>

      <Section spacing="none">
        <div className="overflow-hidden rounded-[34px] border border-white/70 bg-white/85 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur-2xl">
          <div className="relative min-h-[230px] bg-gradient-to-br from-[#7448FF] via-[#8B5CF6] to-[#B38CFF] p-7 text-white md:p-9">
            <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-10 h-48 w-48 rounded-full bg-indigo-950/20 blur-3xl" />

            <div className="relative z-10 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-bold ring-1 ring-white/25 backdrop-blur">
                  <GraduationCap size={15} />
                  Учебная группа
                </div>
                <h1 className="text-4xl font-black tracking-tight md:text-5xl">{group.name}</h1>
                <p className="mt-4 max-w-xl text-sm font-medium leading-6 text-white/80">
                  Преподаватель: <span className="font-black text-white">{group.teacher.fullName || "—"}</span>. Здесь собраны live-сессии группы и список участников.
                </p>
              </div>

              <div className="grid min-w-[280px] grid-cols-2 gap-3">
                <div className="rounded-3xl bg-white/14 p-4 ring-1 ring-white/20 backdrop-blur">
                  <div className="text-3xl font-black">{sessions.length}</div>
                  <div className="mt-1 text-xs font-semibold text-white/75">всего сессий</div>
                </div>
                <div className="rounded-3xl bg-white/14 p-4 ring-1 ring-white/20 backdrop-blur">
                  <div className="text-3xl font-black">{liveSessionsCount}</div>
                  <div className="mt-1 text-xs font-semibold text-white/75">сейчас в эфире</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-4 md:p-7">
            <StatCard label="Статус" value={group.status === "active" ? "Активна" : "Архив"} icon={<CheckCircle2 size={18} />} />
            <StatCard label="Участники" value={`${members.length}`} icon={<Users size={18} />} />
            <StatCard label="Программа" value={group.program || "—"} icon={<BookOpen size={18} />} />
            <StatCard label="Согласие" value={consent ? "Дано" : "Нужно"} icon={<ShieldCheck size={18} />} />
          </div>
        </div>
      </Section>

      {!consent && (
        <Section spacing="none">
          <div className="flex flex-col gap-4 rounded-3xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <div className="font-black text-amber-900">Для входа в live-сессию нужно согласие</div>
              <p className="mt-1 text-sm font-medium text-amber-700">
                KonilAI не подключает аналитику без вашего подтверждения.
              </p>
            </div>
            <Link href="/consent" className="inline-flex items-center justify-center rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-amber-500/20">
              Дать согласие
            </Link>
          </div>
        </Section>
      )}

      <Section>
        <div className="mb-5 flex flex-wrap gap-2 rounded-3xl border border-slate-200/70 bg-white/70 p-2 shadow-sm backdrop-blur">
          {(["sessions", "members"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition",
                activeTab === tab
                  ? "bg-[#7448FF] text-white shadow-lg shadow-[#7448FF]/20"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              {tab === "sessions" ? <CalendarDays size={16} /> : <Users size={16} />}
              {tab === "sessions" ? "Сессии" : "Участники"}
            </button>
          ))}
        </div>

        <Reveal>
          <Card className="overflow-hidden border border-slate-200/70 bg-white/90 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur">
            <CardContent className="p-0">
              {activeTab === "sessions" && (
                <div className="p-5 md:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-slate-950">Сессии группы</h2>
                      <p className="mt-2 text-sm font-medium text-slate-500">
                        Подключение доступно только к сессии в эфире и при действующем согласии.
                      </p>
                    </div>
                    <ToneBadge tone="info">{sessions.length} сессий</ToneBadge>
                  </div>

                  <div className="mt-6 space-y-3">
                    {sessions.map((session) => {
                      const canJoin = session.status === "live" && consent;

                      return (
                        <div key={session.id} className="group rounded-3xl border border-slate-200/70 bg-slate-50/70 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-lg">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="truncate text-base font-black text-slate-950">{session.title}</h3>
                                <ToneBadge tone={typeTone(session.type)}>{typeLabel(session.type)}</ToneBadge>
                                <ToneBadge tone={statusTone(session.status)}>{statusLabel(session.status)}</ToneBadge>
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm font-medium text-slate-500">
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock3 size={15} />
                                  {fmtDateTime(session.startsAt)}
                                </span>
                                <span className="text-xs text-slate-400">{session.id}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {canJoin ? (
                                <Link href={`/student/session/${session.id}`} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#7448FF] px-5 py-3 text-sm font-black text-white shadow-lg shadow-[#7448FF]/20 transition hover:bg-[#6337ef]">
                                  Подключиться
                                  <ChevronRight size={16} />
                                </Link>
                              ) : session.status !== "live" ? (
                                <span className="rounded-2xl bg-slate-100 px-4 py-3 text-xs font-bold text-slate-400">Не в эфире</span>
                              ) : (
                                <Link href="/consent" className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-black text-amber-700 ring-1 ring-amber-200 hover:bg-amber-100">
                                  Нужно согласие
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {sessions.length === 0 && (
                      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
                        <p className="text-sm font-black text-slate-700">В этой группе пока нет сессий.</p>
                        <p className="mt-1 text-xs font-medium text-slate-400">Обратитесь к преподавателю.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "members" && (
                <div className="p-5 md:p-7">
                  <h2 className="text-2xl font-black tracking-tight text-slate-950">Участники</h2>
                  <p className="mt-2 text-sm font-medium text-slate-500">Список участников группы доступен только для просмотра.</p>

                  <div className="mt-6 grid gap-3 md:grid-cols-2">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center gap-3 rounded-3xl border border-slate-200/70 bg-slate-50/70 p-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-sm font-black text-[#7448FF]">
                          {(member.fullName || member.email || "?").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-slate-950">{member.fullName || member.email || "—"}</div>
                          <div className="truncate text-xs font-medium text-slate-500">{member.email ?? "—"}</div>
                        </div>
                      </div>
                    ))}

                    {members.length === 0 && (
                      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center md:col-span-2">
                        <p className="text-sm font-black text-slate-700">Нет данных</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </Reveal>
      </Section>
    </div>
  );
}
