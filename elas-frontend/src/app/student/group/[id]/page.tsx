"use client";

import { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Section from "@/components/common/Section";
import Reveal from "@/components/common/Reveal";
import GlassCard from "@/components/ui/GlassCard";
import Badge from "@/components/ui/Badge";
import {Card} from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { getApiBaseUrl, hasAuth } from "@/lib/api/client";
import { getStudentGroupDetail, type StudentGroupDetail } from "@/lib/api/student";
import { getGroupById } from "@/lib/mock/groups";
import { getSessionsByGroup, type GroupSession } from "@/lib/mock/groupSessions";
import { readConsent } from "@/lib/mock/sessionLifecycle";

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

export default function StudentGroupDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const apiAvailable = getApiBaseUrl() && hasAuth();
  const [apiDetail, setApiDetail] = useState<StudentGroupDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(!!apiAvailable);

  useEffect(() => {
    if (!apiAvailable || !id) {
      setApiDetail(null);
      setDetailLoading(false);
      return;
    }
    setDetailLoading(true);
    getStudentGroupDetail(id).then((data) => {
      setApiDetail(data);
      setDetailLoading(false);
    });
  }, [apiAvailable, id]);

  const mockGroup = useMemo(() => getGroupById(id), [id]);
  const mockSessions = useMemo(() => getSessionsByGroup(id), [id]);

  const group = mockGroup ?? (apiDetail ? { id: apiDetail.id, name: apiDetail.name, program: apiDetail.name, status: "active" as const, teacher: { id: "", name: apiDetail.teacherName, email: apiDetail.teacher }, students: (apiDetail.members ?? []).map((m) => ({ id: m.id, name: m.name ?? m.email ?? "", email: m.email })), createdAt: apiDetail.createdAt } : null);
  const sessions: GroupSession[] = apiDetail
    ? (apiDetail.sessions ?? []).map((s) => ({
        id: s.id,
        title: s.title,
        type: s.type as "lecture" | "exam",
        status: s.status === "active" ? "live" : s.status === "finished" ? "ended" : "upcoming",
        groupId: id,
        startsAt: s.startsAt ?? s.startedAt ?? undefined,
      }))
    : mockSessions;

  const members = apiDetail?.members ?? group?.students.map((s) => ({ id: s.id, name: s.name, email: s.email ?? null })) ?? [];

  type TabId = "sessions" | "members";
  const [activeTab, setActiveTab] = useState<TabId>("sessions");

  const [consent, setConsent] = useState(false);
  useEffect(() => {
    setConsent(readConsent());
    const onStorage = () => setConsent(readConsent());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  if (detailLoading && !group) {
    return (
      <div className="space-y-10 pb-16">
        <PageHero title="Загрузка…" subtitle="Группа загружается." />
        <Section>
          <Card className="p-7">
            <div className="h-24 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />
          </Card>
        </Section>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="space-y-10 pb-16">
        <Breadcrumbs items={[{ label: "Студент", href: "/student/dashboard" }, { label: "Группы", href: "/student/groups" }, { label: "Не найдена" }]} />
        <div className="flex items-center gap-2 mb-2">
          <Link href="/student/groups" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition">← К списку групп</Link>
        </div>
        <PageHero title="Группа не найдена" subtitle="У вас нет доступа к этой группе или она не существует." />
        <Section>
          <Card className="p-7">
            <Link href="/student/groups" className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm ring-1 ring-white/10 bg-white/10 hover:bg-white/15 text-zinc-100 transition">К списку групп</Link>
          </Card>
        </Section>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-16">
      <Breadcrumbs items={[{ label: "Студент", href: "/student/dashboard" }, { label: "Группы", href: "/student/groups" }, { label: group.name }]} />
      <div className="flex items-center gap-2 mb-2">
        <Link href="/student/groups" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition">← К списку групп</Link>
      </div>
      <PageHero
        title={`${group.name}`}
        subtitle={`Преподаватель: ${group.teacher.name}`}
      />

      <Section>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)] items-start">
          <Card className="p-6 md:p-7 space-y-3">
            <div className="flex flex-col gap-2">
              <div className="text-sm text-slate-500 dark:text-white/60">Группа</div>
              <div className="text-lg font-semibold text-slate-900 dark:text-white">
                {group.name}
              </div>
              <div className="text-sm text-slate-500 dark:text-white/60">
                Преподаватель:{" "}
                <span className="text-slate-900 dark:text-zinc-100">
                  {group.teacher.name}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ToneBadge tone={group.status === "active" ? "success" : "neutral"}>
                {group.status}
              </ToneBadge>
              <ToneBadge tone="purple">{members.length} участников</ToneBadge>
            </div>
            <div className="flex items-center justify-between gap-3 pt-1">
              <Link
                href="/student/groups"
                className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition"
              >
                ← К списку групп
              </Link>
              <div className="flex items-center gap-2">
                {consent ? (
                  <ToneBadge tone="success">Согласие: да</ToneBadge>
                ) : (
                  <Link
                    href="/consent"
                    className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-xs ring-1 ring-amber-400/25 bg-amber-500/15 hover:bg-amber-500/20 text-amber-100 transition"
                  >
                    Дать согласие для входа
                  </Link>
                )}
              </div>
            </div>
          </Card>

          <div className="flex flex-col">
            <div className="flex flex-wrap gap-2 border-b border-slate-200/70 pb-3 mb-4 dark:border-white/10">
          {(["sessions", "members"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "rounded-2xl px-4 py-2 text-sm font-medium transition",
                activeTab === tab
                  ? "bg-purple-500/15 ring-1 ring-purple-400/20 text-purple-700 dark:text-purple-100"
                  : "ring-1 ring-slate-200/80 bg-slate-50 hover:bg-slate-100 text-slate-600 dark:ring-white/10 dark:bg-white/5 dark:hover:bg-white/10 dark:text-zinc-300"
              )}
            >
              {tab === "sessions" ? "Сессии" : "Участники"}
            </button>
          ))}
        </div>

        <Reveal>
              <GlassCard className="p-7">
            {activeTab === "sessions" && (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-[color:var(--text)]">Сессии</h2>
                    <p className="text-sm text-[color:var(--muted)]">
                      Подключение возможно только к сессии со статусом{" "}
                      <span className="text-slate-900 dark:text-zinc-200">В эфире</span> и при данном согласии.
                    </p>
                  </div>
                  <ToneBadge tone="info">{sessions.length} сессий</ToneBadge>
                </div>

                <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/70 dark:border-white/10">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-zinc-400">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Название</th>
                      <th className="px-4 py-3 text-left font-medium">Тип</th>
                      <th className="px-4 py-3 text-left font-medium">Статус</th>
                      <th className="px-4 py-3 text-left font-medium">Начало</th>
                      <th className="px-4 py-3 text-left font-medium">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 dark:divide-white/5">
                    {sessions.map((s) => {
                      const canJoin = s.status === "live" && consent;

                      return (
                        <tr key={s.id} className="bg-white hover:bg-slate-50 transition dark:bg-black/10 dark:hover:bg-white/5">
                          <td className="px-4 py-3">
                            <div className="space-y-0.5">
                              <p className="font-medium text-slate-900 dark:text-zinc-200">{s.title}</p>
                              <p className="text-xs text-slate-400 dark:text-zinc-500">{s.id}</p>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <ToneBadge tone={typeTone(s.type)}>{s.type === "exam" ? "Экзамен" : "Лекция"}</ToneBadge>
                          </td>

                          <td className="px-4 py-3">
                            <ToneBadge tone={statusTone(s.status)}>{s.status === "live" ? "В эфире" : s.status === "ended" ? "Завершена" : "Ожидает"}</ToneBadge>
                          </td>

                          <td className="px-4 py-3 text-slate-500 dark:text-zinc-300">{fmtDateTime(s.startsAt)}</td>

                          <td className="px-4 py-3">
                            {canJoin ? (
                              <Link href={`/student/session/${s.id}`} className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm ring-1 ring-purple-400/20 bg-purple-500/15 hover:bg-purple-500/20 text-purple-100 transition">Подключиться</Link>
                            ) : s.status !== "live" ? (
                                <span className="text-xs text-slate-400 dark:text-zinc-500">Не в эфире</span>
                            ) : (
                              <Link href="/consent" className="text-xs text-amber-200 hover:underline">Нужно согласие</Link>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {sessions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center">
                          <p className="text-sm text-slate-500 dark:text-zinc-200">В этой группе пока нет сессий.</p>
                          <p className="mt-1 text-xs text-slate-400 dark:text-zinc-500">Обратитесь к преподавателю.</p>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
              </>
            )}

            {activeTab === "members" && (
              <>
                <h2 className="text-xl font-semibold text-[color:var(--text)]">Участники</h2>
                <p className="mt-1 text-sm text-[color:var(--muted)]">Список участников группы (только просмотр).</p>
                <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/70 dark:border-white/10">
                  <table className="w-full min-w-[400px] text-sm">
                    <thead className="bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-zinc-400">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Имя</th>
                        <th className="px-4 py-3 text-left font-medium">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/70 dark:divide-white/5">
                      {members.map((m) => (
                        <tr key={m.id} className="bg-white dark:bg-black/10">
                          <td className="px-4 py-3 text-slate-800 dark:text-zinc-200">{m.name ?? m.email ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-500 dark:text-zinc-400">{m.email ?? "—"}</td>
                        </tr>
                      ))}
                      {members.length === 0 && (
                        <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-400 dark:text-zinc-500">Нет данных</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
              </GlassCard>
        </Reveal>
          </div>
        </div>
      </Section>
    </div>
  );
}