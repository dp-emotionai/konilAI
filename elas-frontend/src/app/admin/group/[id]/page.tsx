"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import PageHero from "@/components/common/PageHero";
import Section from "@/components/common/Section";
import Reveal from "@/components/common/Reveal";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Glow from "@/components/common/Glow";
import { cn } from "@/lib/cn";
import { getGroupById } from "@/lib/mock/groups";
import { getSessionsByGroup, type GroupSession } from "@/lib/mock/groupSessions";

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
    year: "numeric",
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

export default function AdminGroupDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const group = useMemo(() => getGroupById(id), [id]);

  const [teacherName, setTeacherName] = useState(group?.teacher.name ?? "");
  const [studentQuery, setStudentQuery] = useState("");

  const sessions = useMemo(() => getSessionsByGroup(id), [id]);

  if (!group) {
    return (
      <div className="relative space-y-14 pb-20">
        <Glow />
        <PageHero title="Group not found" subtitle="This group does not exist in mock data." />
        <Section>
          <GlassCard className="p-7">
            <Link
              href="/admin/groups"
              className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm ring-1 ring-white/10 bg-white/10 hover:bg-white/15 text-zinc-100 transition"
            >
              Back to groups
            </Link>
          </GlassCard>
        </Section>
      </div>
    );
  }

  const filteredStudents = group.students.filter((s) =>
    studentQuery.trim()
      ? s.name.toLowerCase().includes(studentQuery.trim().toLowerCase())
      : true
  );

  return (
    <div className="relative space-y-14 pb-20">
      <Glow />

      <PageHero
        title={`${group.name} · Group`}
        subtitle={`Program: ${group.program} · Created: ${group.createdAt}`}
      />

      <Section>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/groups"
            className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm ring-1 ring-white/10 bg-white/10 hover:bg-white/15 text-zinc-100 transition"
          >
            Back
          </Link>
          <ToneBadge tone={group.status === "active" ? "success" : "neutral"}>{group.status}</ToneBadge>
          <ToneBadge tone="info">{group.id}</ToneBadge>
        </div>
      </Section>

      <Section>
        <div className="grid gap-6 lg:grid-cols-3">
          <Reveal>
            <GlassCard className="p-7 lg:col-span-2">
              <h2 className="text-xl font-semibold">Members</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Admin manages membership. Teacher and students inherit access via this group.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-zinc-400">Teacher</p>
                  <p className="mt-1 text-lg font-medium text-zinc-200">{group.teacher.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">{group.teacher.email ?? "—"}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-zinc-400">Students</p>
                  <p className="mt-1 text-lg font-medium text-zinc-200">{group.students.length}</p>
                  <p className="mt-1 text-xs text-zinc-500">Active members in this group</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <div className="min-w-[240px] flex-1">
                  <Input
                    value={studentQuery}
                    onChange={(e) => setStudentQuery(e.target.value)}
                    placeholder="Search students…"
                  />
                </div>
                <Button
                  type="button"
                  className="ring-1 ring-purple-400/25 bg-purple-500/20 hover:bg-purple-500/25 text-purple-100"
                  onClick={() => navigator.clipboard?.writeText("ADMIN_ADD_STUDENT_MOCK")}
                >
                  Add Student (Mock)
                </Button>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-white/5 text-zinc-400">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Student</th>
                      <th className="px-4 py-3 text-left font-medium">ID</th>
                      <th className="px-4 py-3 text-left font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredStudents.map((s) => (
                      <tr key={s.id} className="bg-black/10 hover:bg-white/5 transition">
                        <td className="px-4 py-3 text-zinc-200">{s.name}</td>
                        <td className="px-4 py-3 text-zinc-400">{s.id}</td>
                        <td className="px-4 py-3">
                          <Button
                            type="button"
                            className="ring-1 ring-white/10 bg-white/10 hover:bg-white/15 text-zinc-100"
                            onClick={() => navigator.clipboard?.writeText(`REMOVE_${s.id}_MOCK`)}
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}

                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-10 text-center">
                          <p className="text-sm text-zinc-200">No students found.</p>
                          <p className="mt-1 text-xs text-zinc-500">Try another keyword.</p>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </Reveal>

          <Reveal>
            <GlassCard className="p-7">
              <h2 className="text-xl font-semibold">Admin Actions</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Update teacher assignment & manage lifecycle (mock).
              </p>

              <div className="mt-6 space-y-3">
                <p className="text-sm text-zinc-400">Assign Teacher</p>
                <Input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} />
                <Button
                  type="button"
                  className="w-full ring-1 ring-purple-400/25 bg-purple-500/20 hover:bg-purple-500/25 text-purple-100"
                  onClick={() => navigator.clipboard?.writeText(`ASSIGN_TEACHER_${teacherName}_MOCK`)}
                >
                  Save teacher (Mock)
                </Button>

                <Button
                  type="button"
                  className="w-full ring-1 ring-white/10 bg-white/10 hover:bg-white/15 text-zinc-100"
                  onClick={() => navigator.clipboard?.writeText(`ARCHIVE_${group.id}_MOCK`)}
                >
                  Archive group (Mock)
                </Button>
              </div>
            </GlassCard>
          </Reveal>
        </div>
      </Section>

      <Section>
        <Reveal>
          <GlassCard className="p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold">Sessions</h2>
                <p className="text-sm text-zinc-400">
                  Sessions are now linked to this group via adapter (mock). Next we’ll enforce lifecycle rules.
                </p>
              </div>
              <ToneBadge tone="info">{sessions.length} sessions</ToneBadge>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-sm">
                  <thead className="bg-white/5 text-zinc-400">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Title</th>
                      <th className="px-4 py-3 text-left font-medium">Type</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Starts</th>
                      <th className="px-4 py-3 text-left font-medium">Open</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {sessions.map((s) => (
                      <tr key={s.id} className="bg-black/10 hover:bg-white/5 transition">
                        <td className="px-4 py-3">
                          <div className="space-y-0.5">
                            <p className="font-medium text-zinc-200">{s.title}</p>
                            <p className="text-xs text-zinc-500">{s.id}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <ToneBadge tone={typeTone(s.type)}>{s.type}</ToneBadge>
                        </td>
                        <td className="px-4 py-3">
                          <ToneBadge tone={statusTone(s.status)}>{s.status}</ToneBadge>
                        </td>
                        <td className="px-4 py-3 text-zinc-300">{fmtDateTime(s.startsAt)}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/teacher/session/${s.id}`}
                            className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm ring-1 ring-white/10 bg-white/10 hover:bg-white/15 text-zinc-100 transition"
                          >
                            Teacher view
                          </Link>
                        </td>
                      </tr>
                    ))}

                    {sessions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center">
                          <p className="text-sm text-zinc-200">No sessions in this group yet.</p>
                          <p className="mt-1 text-xs text-zinc-500">Next step: Create session inside group.</p>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </GlassCard>
        </Reveal>
      </Section>
    </div>
  );
}