"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import Breadcrumbs from "@/components/layout/Breadcrumbs";
import Section from "@/components/common/Section";
import Reveal from "@/components/common/Reveal";
import { Card, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { getStudentSessionsList, type StudentSessionRow } from "@/lib/api/student";
import { CalendarDays, Clock, RadioTower } from "lucide-react";

function statusLabel(status: StudentSessionRow["status"]) {
  if (status === "live") return "В эфире";
  if (status === "upcoming") return "Запланирована";
  return "Завершена";
}

export default function StudentSessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<StudentSessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const list = await getStudentSessionsList();
        if (mounted) setSessions(list);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const hasSessions = sessions.length > 0;

  return (
    <div className="pb-12 space-y-6">
      <Breadcrumbs
        items={[
          { label: "Студент", href: "/student/dashboard" },
          { label: "Сессии", href: "/student/sessions" },
        ]}
      />

      <Section spacing="none" className="mt-2">
        <Reveal>
          <div className="overflow-hidden rounded-3xl border border-[color:var(--border-muted)] bg-[radial-gradient(circle_at_top_left,#1b233d_0%,transparent_55%),radial-gradient(circle_at_bottom_right,#15192f_0%,transparent_55%),linear-gradient(135deg,#050814_0%,#05060d_100%)] px-5 py-6 md:px-7 md:py-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Student · Sessions
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
                  Ваши учебные сессии
                </h1>
                <p className="max-w-xl text-sm text-white/70">
                  Здесь отображаются все занятия, экзамены и эфиры, к которым вы приглашены.
                  Выберите активную или запланированную сессию, чтобы подключиться.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-white/80 md:w-72">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/50">
                    <RadioTower size={14} /> Live
                  </div>
                  <div className="mt-1 text-lg font-semibold">
                    {sessions.filter((s) => s.status === "live").length || 0}
                  </div>
                  <div className="mt-0.5 text-[11px] text-white/55">Сеансов «в эфире» сейчас</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/50">
                    <CalendarDays size={14} /> Upcoming
                  </div>
                  <div className="mt-1 text-lg font-semibold">
                    {sessions.filter((s) => s.status === "upcoming").length || 0}
                  </div>
                  <div className="mt-0.5 text-[11px] text-white/55">Будущие сессии</div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </Section>

      <Section spacing="none" className="mt-5">
        <Reveal>
          <Card>
            <CardContent className="p-4 md:p-6">
              {loading ? (
                <div className="space-y-3">
                  <div className="h-11 rounded-2xl bg-surface-subtle animate-pulse" />
                  <div className="h-11 rounded-2xl bg-surface-subtle animate-pulse" />
                  <div className="h-11 rounded-2xl bg-surface-subtle animate-pulse" />
                </div>
              ) : !hasSessions ? (
                <div className="py-8 text-center text-sm text-muted">
                  Сессий пока нет. Когда преподаватель создаст и откроет сессию для вашей
                  группы, она появится здесь.
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => router.push(`/student/session/${s.id}`)}
                      className="group w-full rounded-2xl border border-[color:var(--border)] bg-surface hover:bg-surface-subtle hover:border-[color:var(--border-strong)] transition text-left px-4 py-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-semibold text-fg group-hover:text-fg-strong">
                            {s.title}
                          </div>
                          <Badge
                            variant={s.type === "exam" ? "warning" : "secondary"}
                          >
                            {s.type === "exam" ? "Экзамен" : "Лекция"}
                          </Badge>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                          {s.date && (
                            <span className="inline-flex items-center gap-1">
                              <Clock size={12} className="text-muted" />
                              <span>{s.date}</span>
                            </span>
                          )}
                          {s.teacher && (
                            <span className="inline-flex items-center gap-1">
                              · <span>Преподаватель:</span> <span>{s.teacher}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-1 flex items-center gap-3 md:mt-0">
                        <Badge
                          variant={
                            s.status === "live"
                              ? "success"
                              : s.status === "upcoming"
                              ? "primary"
                              : "secondary"
                          }
                        >
                          {statusLabel(s.status)}
                        </Badge>
                        <Button size="sm" variant="outline">
                          Открыть
                        </Button>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Reveal>
      </Section>

      <Section spacing="none" className="mt-4">
        <div className="flex items-start gap-3 rounded-elas-lg bg-surface-subtle p-4 text-xs text-muted">
          <span className="mt-0.5">
            После выбора строки вы перейдёте на экран подключения
            <code className="mx-1 rounded-md bg-black/5 px-1 py-0.5 text-[11px] text-fg">
              /student/session/&lt;id&gt;
            </code>
            , где название сессии и группы берётся из бэкенда.
          </span>
        </div>
      </Section>

      <Section spacing="none">
        <div className="flex items-start gap-3 rounded-elas-lg bg-surface-subtle p-4 text-xs text-muted">
          <span>
            Если сессия отображается как «В эфире», но вы не можете подключиться, попросите
            преподавателя убедиться, что он запустил эфир и вы добавлены в нужную группу.
          </span>
        </div>
      </Section>
    </div>
  );
}
