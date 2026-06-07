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

// ===== Admin: users from backend-main (напарницы) =====

export type RawAdminUser = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  role: string;   // "STUDENT" | "TEACHER" | "ADMIN" ...
  status: string; // "PENDING" | "APPROVED" | "LIMITED" | "BLOCKED"
  createdAt: string;
  updatedAt: string;
};

export type AdminUser = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  role: "student" | "teacher" | "admin";
  status: "pending" | "approved" | "limited" | "blocked";
  createdAt: string;
};

function mapRawRole(role: string): AdminUser["role"] {
  const r = role?.toUpperCase?.() ?? "";
  if (r === "TEACHER") return "teacher";
  if (r === "ADMIN") return "admin";
  return "student";
}

function mapRawStatus(status: string | null): AdminUser["status"] {
  const s = status?.toUpperCase?.() ?? "";
  if (s === "BLOCKED") return "blocked";
  if (s === "PENDING") return "pending";
  if (s === "LIMITED") return "limited";
  return "approved";
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  if (!getApiBaseUrl() || !hasAuth()) return [];
  try {
    const list = await api.get<RawAdminUser[]>("admin/users");
    const arr = Array.isArray(list) ? list : [];
    return arr.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName || null,
      lastName: u.lastName || null,
      fullName: u.fullName || null,
      role: mapRawRole(u.role),
      status: mapRawStatus(u.status),
      createdAt: u.createdAt,
    }));
  } catch {
    return [];
  }
}

export async function approveAdminUser(userId: string): Promise<AdminUser | null> {
  try {
    const res = await api.put<RawAdminUser>(`admin/users/${userId}/approve`);
    return {
      id: res.id,
      email: res.email,
      firstName: res.firstName || null,
      lastName: res.lastName || null,
      fullName: res.fullName || null,
      role: mapRawRole(res.role),
      status: mapRawStatus(res.status),
      createdAt: res.createdAt,
    };
  } catch {
    return null;
  }
}

export async function updateAdminUser(
  userId: string,
  payload: { role: "student" | "teacher" | "admin"; status: "approved" | "pending" | "limited" | "blocked" }
): Promise<AdminUser | null> {
  try {
    const body = {
      role: payload.role,
      status: payload.status,
    };
    const res = await api.put<RawAdminUser>(`admin/users/${userId}/approve`, body);
    return {
      id: res.id,
      email: res.email,
      firstName: res.firstName || null,
      lastName: res.lastName || null,
      fullName: res.fullName || null,
      role: mapRawRole(res.role),
      status: mapRawStatus(res.status),
      createdAt: res.createdAt,
    };
  } catch {
    return null;
  }
}

export async function blockAdminUser(userId: string): Promise<AdminUser | null> {
  try {
    const res = await api.put<RawAdminUser>(`admin/users/${userId}/block`);
    return {
      id: res.id,
      email: res.email,
      firstName: res.firstName || null,
      lastName: res.lastName || null,
      fullName: res.fullName || null,
      role: mapRawRole(res.role),
      status: mapRawStatus(res.status),
      createdAt: res.createdAt,
    };
  } catch {
    return null;
  }
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
