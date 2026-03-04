"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Section from "@/components/common/Section";
import Reveal from "@/components/common/Reveal";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Glow from "@/components/common/Glow";
import { nextTeacherAction, setSessionStatusOverride } from "@/lib/mock/sessionLifecycle";
import { getTeacherAllSessions, updateSessionStatus } from "@/lib/api/teacher";
import { hasAuth, getApiBaseUrl } from "@/lib/api/client";
import type { GroupSession } from "@/lib/mock/groupSessions";

type Tone = "neutral" | "success" | "info" | "warning" | "purple";

function ToneBadge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-500/15 text-emerald-200"
      : tone === "info"
      ? "bg-sky-500/15 text-sky-200"
      : tone === "warning"
      ? "bg-amber-500/15 text-amber-200"
      : tone === "purple"
      ? "bg-purple-500/15 text-purple-200"
      : "bg-white/10 text-zinc-200";

  return (
    <Badge className={`rounded-full px-3 py-1 text-xs backdrop-blur ${toneClass}`}>
      {children}
    </Badge>
  );
}

const statusToBackend = (next: string): "active" | "finished" | "draft" =>
  next === "live" ? "active" : next === "ended" ? "finished" : "draft";

export default function TeacherSessionsPage() {
  const [tick, setTick] = useState(0);
  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const apiAvailable = getApiBaseUrl() && hasAuth();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getTeacherAllSessions().then((data) => {
      if (!mounted) return;
      setSessions(data);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [tick]);

  const handleLifecycle = async (s: GroupSession) => {
    const action = nextTeacherAction(s.status);
    if (apiAvailable) {
      setActioningId(s.id);
      try {
        await updateSessionStatus(s.id, statusToBackend(action.next));
        setSessionStatusOverride(s.id, action.next);
        setTick((x) => x + 1);
      } finally {
        setActioningId(null);
      }
    } else {
      setSessionStatusOverride(s.id, action.next);
      setTick((x) => x + 1);
    }
  };

  return (
    <div className="relative space-y-14 pb-20">
      <Glow />
      <Breadcrumbs items={[{ label: "Преподаватель", href: "/teacher/dashboard" }, { label: "Сессии" }]} />
      <PageHero
        title="Все сессии"
        subtitle="Создайте сессию, нажмите «Старт» — студенты увидят её в эфире и смогут подключиться."
        right={
          <Link href="/teacher/sessions/new">
            <Button>Создать сессию</Button>
          </Link>
        }
      />

      <Section>
        <Reveal>
          <GlassCard className="p-7">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 text-left">Название</th>
                    <th className="px-4 py-3 text-left">Группа</th>
                    <th className="px-4 py-3 text-left">Статус</th>
                    <th className="px-4 py-3 text-left">Действие</th>
                    <th className="px-4 py-3 text-left">Открыть</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {loading ? (
                    <>
                      <tr>
                        <td colSpan={5} className="px-4 py-6">
                          <div className="h-10 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />
                        </td>
                      </tr>
                    </>
                  ) : (
                    sessions.map((s) => {
                      const action = nextTeacherAction(s.status);

                      return (
                        <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition">
                          <td className="px-4 py-3 text-slate-800 dark:text-zinc-200">{s.title}</td>
                          <td className="px-4 py-3 text-slate-500 dark:text-zinc-400">{s.groupId}</td>

                          <td className="px-4 py-3">
                            <ToneBadge tone={s.status === "live" ? "warning" : "info"}>
                              {s.status === "live" ? "В эфире" : s.status === "ended" ? "Завершена" : "Ожидает"}
                            </ToneBadge>
                          </td>

                          <td className="px-4 py-3">
                            <Button
                              onClick={() => handleLifecycle(s)}
                              disabled={actioningId === s.id}
                              className="bg-purple-600 text-white hover:bg-purple-500"
                            >
                              {actioningId === s.id ? "…" : action.label === "Start" ? "Старт" : action.label === "End" ? "Завершить" : "Повторно открыть"}
                            </Button>
                          </td>

                          <td className="px-4 py-3">
                            <Link
                              href={`/teacher/session/${s.id}`}
                              className="text-sm text-purple-700 hover:underline dark:text-zinc-200"
                            >
                              Открыть
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </Reveal>
      </Section>
    </div>
  );
}