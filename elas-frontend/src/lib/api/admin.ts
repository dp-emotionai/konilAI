import { api, getApiBaseUrl, hasAuth } from "./client";

export type AuditLogEntry = {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  meta: string | null;
  createdAt: string;
};

export type AuditRow = {
  id: string;
  at: string;
  actor: string;
  role: "admin" | "teacher" | "student" | "system";
  action: string;
  resource: string;
  status: "ok" | "warn" | "fail";
  meta: Record<string, string>;
};

function formatAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const isYesterday = new Date(now.getTime() - 864e5).toDateString() === d.toDateString();
  if (isToday) return "Today " + new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(d);
  if (isYesterday) return "Yesterday " + new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(d);
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);
}

function metaToRecord(meta: string | null): Record<string, string> {
  if (meta == null) return {};
  try {
    const o = typeof meta === "string" ? JSON.parse(meta) : meta;
    if (o && typeof o === "object") {
      const r: Record<string, string> = {};
      for (const [k, v] of Object.entries(o)) r[k] = typeof v === "string" ? v : JSON.stringify(v);
      return r;
    }
  } catch {
    return { raw: meta };
  }
  return {};
}

export async function getAuditLog(): Promise<AuditRow[]> {
  if (!getApiBaseUrl() || !hasAuth()) return [];
  try {
    const list = await api.get<AuditLogEntry[]>("audit");
    const arr = Array.isArray(list) ? list : [];
    return arr.map((l) => ({
      id: l.id,
      at: formatAt(l.createdAt),
      actor: l.actorId ?? "system",
      role: "system" as const,
      action: l.action,
      resource: `${l.entityType} ${l.entityId}`.trim(),
      status: "ok" as const,
      meta: metaToRecord(l.meta),
    }));
  } catch {
    return [];
  }
}
