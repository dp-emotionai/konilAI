import type { UserStatus } from "@/lib/api/client";
import type { Role } from "@/lib/roles";

export type AuthApiUser = {
  id?: string;
  email?: string;
  role?: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  status?: string | null;
};

export type AuthApiResponse = {
  user?: AuthApiUser;
  token?: string;
  accessToken?: string;
  message?: string;
};

export type AuthSession = {
  token: string;
  email: string;
  role: Role;
  id?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  status?: UserStatus | null;
};

export function normalizeRole(value: unknown): Role | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "student" || normalized === "teacher" || normalized === "admin") {
    return normalized;
  }
  return null;
}

export function normalizeStatus(value: unknown): UserStatus | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (
    normalized === "pending" ||
    normalized === "approved" ||
    normalized === "limited" ||
    normalized === "blocked"
  ) {
    return normalized as UserStatus;
  }
  return null;
}

function splitFullName(fullName?: string | null) {
  const trimmed = String(fullName || "").trim();
  if (!trimmed) {
    return {
      firstName: null,
      lastName: null,
    };
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? null,
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
}

export function extractAuthSession(data: AuthApiResponse): AuthSession {
  const user = data?.user;
  const token = data?.token ?? data?.accessToken;
  const role = normalizeRole(user?.role);
  const email = user?.email ? String(user.email).trim().toLowerCase() : "";
  const fullName = user?.fullName?.trim() || user?.name?.trim() || null;
  const split = splitFullName(fullName);
  const firstName = user?.firstName?.trim() || split.firstName;
  const lastName = user?.lastName?.trim() || split.lastName;
  const status = normalizeStatus(user?.status);

  if (!user || !token || !role || !email) {
    throw new Error("Некорректный ответ сервера. Попробуйте позже.");
  }

  return {
    token,
    role,
    email,
    id: user.id ?? null,
    firstName,
    lastName,
    fullName: fullName || [firstName, lastName].filter(Boolean).join(" ").trim() || null,
    avatarUrl: user.avatarUrl ?? null,
    status,
  };
}
