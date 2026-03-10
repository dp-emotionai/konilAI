"use client";

import { useEffect, useMemo, useState } from "react";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Reveal from "@/components/common/Reveal";
import Section from "@/components/common/Section";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Glow from "@/components/common/Glow";
import { cn } from "@/lib/cn";
import { getApiBaseUrl, hasAuth } from "@/lib/api/client";
import { getAuditLog } from "@/lib/api/admin";

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
      : tone === "warning"
      ? "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/20"
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

type AuditRow = {
  id: string;
  at: string;
  actor: string;
  role: "admin" | "teacher" | "student" | "system";
  action: string;
  resource: string;
  status: "ok" | "warn" | "fail";
  meta: Record<string, string>;
};

function statusTone(s: AuditRow["status"]): Tone {
  if (s === "ok") return "success";
  if (s === "warn") return "warning";
  return "warning";
}

function roleTone(r: AuditRow["role"]): Tone {
  if (r === "admin") return "purple";
  if (r === "teacher") return "info";
  if (r === "system") return "neutral";
  return "neutral";
}

const MOCK_ROWS: AuditRow[] = [];

export default function AdminAuditPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | AuditRow["status"]>("all");
  const [selected, setSelected] = useState<AuditRow | null>(null);
  const [apiRows, setApiRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const apiAvailable = getApiBaseUrl() && hasAuth();

  useEffect(() => {
    if (!apiAvailable) {
      setApiRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getAuditLog().then((data) => {
      setApiRows(data);
      setLoading(false);
    });
  }, [apiAvailable]);

  const rows: AuditRow[] = useMemo(() => (apiRows.length > 0 ? apiRows : MOCK_ROWS), [apiRows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesStatus = status === "all" ? true : r.status === status;
      const matchesQuery =
        !q ||
        r.id.toLowerCase().includes(q) ||
        r.actor.toLowerCase().includes(q) ||
        r.action.toLowerCase().includes(q) ||
        r.resource.toLowerCase().includes(q);

      return matchesStatus && matchesQuery;
    });
  }, [rows, query, status]);

  return (
    <div className="relative space-y-12 pb-20">
      <Glow />
      <Breadcrumbs items={[{ label: "Админ", href: "/admin/dashboard" }, { label: "Аудит" }]} />

      <PageHero
        title="Журнал аудита"
        subtitle={apiRows.length > 0 ? "События из backend. Обновить — перезагрузите страницу." : "События (пример при отсутствии API)."}
      />

      <Section>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* TABLE */}
          <Reveal>
            <GlassCard className="p-7 lg:col-span-2">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold text-zinc-100">События</h2>
                  <p className="text-sm text-zinc-400">
                    Фильтр по ключевому слову или статусу. Клик по строке — детали.
                  </p>
                </div>

                <ToneBadge tone="info">{filtered.length} записей</ToneBadge>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <div className="min-w-[240px] flex-1">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Поиск по id, участнику, действию, ресурсу…"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    className={cn(
                      "ring-1 ring-white/10 bg-white/10 hover:bg-white/15 text-zinc-100",
                      status === "all" && "bg-purple-500/20 ring-purple-400/25"
                    )}
                    onClick={() => setStatus("all")}
                  >
                    All
                  </Button>
                  <Button
                    type="button"
                    className={cn(
                      "ring-1 ring-white/10 bg-white/10 hover:bg-white/15 text-zinc-100",
                      status === "ok" && "bg-emerald-500/20 ring-emerald-400/25"
                    )}
                    onClick={() => setStatus("ok")}
                  >
                    OK
                  </Button>
                  <Button
                    type="button"
                    className={cn(
                      "ring-1 ring-white/10 bg-white/10 hover:bg-white/15 text-zinc-100",
                      status === "warn" && "bg-amber-500/20 ring-amber-400/25"
                    )}
                    onClick={() => setStatus("warn")}
                  >
                    WARN
                  </Button>
                  <Button
                    type="button"
                    className={cn(
                      "ring-1 ring-white/10 bg-white/10 hover:bg-white/15 text-zinc-100",
                      status === "fail" && "bg-rose-500/20 ring-rose-400/25"
                    )}
                    onClick={() => setStatus("fail")}
                  >
                    FAIL
                  </Button>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="bg-white/5 text-zinc-400">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Time</th>
                        <th className="px-4 py-3 text-left font-medium">Actor</th>
                        <th className="px-4 py-3 text-left font-medium">Action</th>
                        <th className="px-4 py-3 text-left font-medium">Resource</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filtered.map((r) => (
                        <tr
                          key={r.id}
                          className="cursor-pointer bg-black/10 hover:bg-white/5 transition"
                          onClick={() => setSelected(r)}
                        >
                          <td className="px-4 py-3 text-zinc-300">
                            <div className="space-y-0.5">
                              <p className="text-zinc-200">{r.at}</p>
                              <p className="text-xs text-zinc-500">{r.id}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-zinc-200">{r.actor}</span>
                              <ToneBadge tone={roleTone(r.role)}>{r.role}</ToneBadge>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-zinc-200">{r.action}</td>
                          <td className="px-4 py-3 text-zinc-300">{r.resource}</td>
                          <td className="px-4 py-3">
                            <ToneBadge tone={statusTone(r.status)}>{r.status}</ToneBadge>
                          </td>
                        </tr>
                      ))}

                      {filtered.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-10 text-center">
                            <p className="text-sm text-zinc-300">No events found.</p>
                            <p className="mt-1 text-xs text-zinc-500">
                              Try a different keyword or reset filters.
                            </p>
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ToneBadge tone="purple">Security</ToneBadge>
                  {loading && <span className="text-xs text-zinc-500">Загрузка…</span>}
                  {!loading && apiRows.length > 0 && <span className="text-xs text-zinc-500">Backend audit log</span>}
                  {!loading && apiRows.length === 0 && <span className="text-xs text-zinc-500">Пример (mock)</span>}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    className="ring-1 ring-white/10 bg-white/10 hover:bg-white/15 text-zinc-100"
                    onClick={() => {
                      setQuery("");
                      setStatus("all");
                    }}
                  >
                    Reset
                  </Button>
                  <Button
                    type="button"
                    className="ring-1 ring-purple-400/25 bg-purple-500/20 hover:bg-purple-500/25 text-purple-100"
                    onClick={() => {
                      // mock export
                      const text = JSON.stringify(filtered, null, 2);
                      navigator.clipboard?.writeText(text);
                    }}
                  >
                    Copy JSON
                  </Button>
                </div>
              </div>
            </GlassCard>
          </Reveal>

          {/* DETAILS */}
          <Reveal>
            <GlassCard className="p-7">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold">Details</h2>
                  <p className="text-sm text-zinc-400">Inspect the selected event.</p>
                </div>
                <ToneBadge tone="info">Panel</ToneBadge>
              </div>

              {!selected ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
                  <p className="text-sm text-zinc-300">No event selected.</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Click a row on the left to view details here.
                  </p>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium text-zinc-200">{selected.action}</p>
                        <p className="text-xs text-zinc-500">
                          {selected.at} · {selected.id}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <ToneBadge tone={statusTone(selected.status)}>{selected.status}</ToneBadge>
                        <ToneBadge tone={roleTone(selected.role)}>{selected.role}</ToneBadge>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-zinc-400">Actor</p>
                    <p className="mt-1 text-sm text-zinc-200">{selected.actor}</p>

                    <p className="mt-4 text-sm text-zinc-400">Resource</p>
                    <p className="mt-1 text-sm text-zinc-200">{selected.resource}</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-zinc-400">Metadata</p>
                    <div className="mt-3 space-y-2 text-sm">
                      {Object.entries(selected.meta).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between gap-4">
                          <span className="text-zinc-400">{k}</span>
                          <span className="text-zinc-200">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      className="ring-1 ring-white/10 bg-white/10 hover:bg-white/15 text-zinc-100"
                      onClick={() => setSelected(null)}
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      className="ring-1 ring-purple-400/25 bg-purple-500/20 hover:bg-purple-500/25 text-purple-100"
                      onClick={() => {
                        navigator.clipboard?.writeText(JSON.stringify(selected, null, 2));
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                </div>
              )}
            </GlassCard>
          </Reveal>
        </div>
      </Section>
    </div>
  );
}