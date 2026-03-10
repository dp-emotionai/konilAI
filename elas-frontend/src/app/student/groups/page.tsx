"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Section from "@/components/common/Section";
import Reveal from "@/components/common/Reveal";
import GlassCard from "@/components/ui/GlassCard";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { getApiBaseUrl, hasAuth } from "@/lib/api/client";
import { getStudentGroups, type StudentGroupRow } from "@/lib/api/student";

type Tone = "neutral" | "success" | "info" | "warning" | "purple";
function ToneBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/20"
      : tone === "info"
      ? "bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/20"
      : tone === "purple"
      ? "bg-purple-500/15 text-purple-200 ring-1 ring-purple-400/25"
      : "bg-white/10 text-zinc-200 ring-1 ring-white/10";
  return (
    <Badge
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur",
        toneClass,
        className
      )}
    >
      {children}
    </Badge>
  );
}

export default function StudentGroupsPage() {
  const [q, setQ] = useState("");
  const apiAvailable = getApiBaseUrl() && hasAuth();
  const [apiGroups, setApiGroups] = useState<StudentGroupRow[]>([]);
  const [loading, setLoading] = useState(!!apiAvailable);

  useEffect(() => {
    if (!apiAvailable) {
      setApiGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getStudentGroups().then((data) => {
      setApiGroups(data);
      setLoading(false);
    });
  }, [apiAvailable]);

  const apiFiltered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return apiGroups.filter((g) => !s || g.name.toLowerCase().includes(s) || (g.teacherName ?? g.teacher).toLowerCase().includes(s));
  }, [apiGroups, q]);

  const list = apiFiltered;

  return (
    <div className="space-y-10 pb-16">
      <Breadcrumbs items={[{ label: "Студент", href: "/student/dashboard" }, { label: "Мои группы" }]} />

      <PageHero
        title="Мои группы"
        subtitle="Группы, в которых вы состоите. Откройте группу, чтобы видеть сессии и подключаться к ним в эфире."
      />

      <Section>
        <Reveal>
          <GlassCard className="p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-[color:var(--text)]">Группы</h2>
                <p className="text-sm text-[color:var(--muted)]">
                  Здесь только группы, куда вас пригласили и вы приняли приглашение.
                </p>
              </div>
              <ToneBadge tone="info">{list.length} групп</ToneBadge>
            </div>

            <div className="mt-6">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Поиск по названию или преподавателю…"
              />
            </div>

            {loading ? (
              <div className="mt-6 h-40 rounded-2xl bg-white/5 animate-pulse" />
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {isApiList && apiFiltered.map((g) => (
                  <Link
                    key={g.id}
                    href={`/student/group/${g.id}`}
                    className="rounded-3xl border border-black/5 bg-[color:var(--surface)] p-6 shadow-[0_14px_30px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-elas-soft-light dark:border-white/10 dark:bg-white/5 dark:shadow-[0_18px_45px_rgba(0,0,0,0.65)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-lg font-semibold text-[color:var(--text)]">{g.name}</p>
                        <p className="mt-2 text-xs text-[color:var(--muted)]">
                          Преподаватель:{" "}
                          <span className="text-slate-900 dark:text-zinc-200">
                            {g.teacherName ?? g.teacher}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <ToneBadge tone="info">{g.sessionCount ?? 0} сессий</ToneBadge>
                    </div>
                    <div className="mt-3">
                      <span className="text-sm text-elas-primary dark:text-purple-300">Открыть →</span>
                    </div>
                  </Link>
                ))}
                {!isApiList && mockFiltered.map(({ group: g, sessionsCount, hasLive }) => (
                  <Link
                    key={g.id}
                    href={`/student/group/${g.id}`}
                    className="rounded-3xl border border-black/5 bg-[color:var(--surface)] p-6 shadow-[0_14px_30px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-elas-soft-light dark:border-white/10 dark:bg-white/5 dark:shadow-[0_18px_45px_rgba(0,0,0,0.65)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-lg font-semibold text-[color:var(--text)]">{g.name}</p>
                        <p className="text-sm text-[color:var(--muted)]">{g.program}</p>
                        <p className="mt-2 text-xs text-[color:var(--muted)]">
                          Teacher:{" "}
                          <span className="text-slate-900 dark:text-zinc-200">
                            {g.teacher.name}
                          </span>
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <ToneBadge tone={g.status === "active" ? "success" : "neutral"}>{g.status}</ToneBadge>
                        {hasLive && (
                          <ToneBadge tone="warning" className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse" />
                            Live now
                          </ToneBadge>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <ToneBadge tone="purple">{g.students.length} students</ToneBadge>
                      {sessionsCount > 0 && <ToneBadge tone="info">{sessionsCount} sessions</ToneBadge>}
                    </div>
                  </Link>
                ))}

                {list.length === 0 && !loading ? (
                  <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
                    <p className="text-sm text-zinc-200">Групп не найдено.</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {apiAvailable ? "Примите приглашение в группу на дашборде." : "Try a different keyword."}
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </GlassCard>
        </Reveal>
      </Section>
    </div>
  );
}