/**
 * API client for ELAS backend.
 * Uses NEXT_PUBLIC_API_URL and token from auth storage (localStorage).
 */

const AUTH_KEY = "elas_auth_v1";

export type UserStatus = "pending" | "approved" | "limited" | "blocked";
export type UserRole = "student" | "teacher" | "admin";

export type AuthPayload = {
  token: string;
  role: UserRole;
  email: string;
  /** User UUID — same as the backend userId from JWT */
  id?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  status?: UserStatus | null;
};

function normalizeRole(value: unknown): UserRole | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "student" || v === "teacher" || v === "admin") return v;
  return null;
}

function normalizeStatus(value: unknown): UserStatus | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "pending" || v === "approved" || v === "limited" || v === "blocked") {
    return v as UserStatus;
  }
  return null;
}

function normalizeAuthPayload(payload: Partial<AuthPayload> & { token: string; email: string }): AuthPayload {
  return {
    token: String(payload.token),
    email: String(payload.email).trim().toLowerCase(),
    role: normalizeRole(payload.role) ?? "student",
    id: typeof payload.id === "string" && payload.id ? payload.id : null,
    firstName: payload.firstName != null ? String(payload.firstName) : null,
    lastName: payload.lastName != null ? String(payload.lastName) : null,
    fullName: payload.fullName != null ? String(payload.fullName) : null,
    avatarUrl: payload.avatarUrl != null ? String(payload.avatarUrl) : null,
    status: normalizeStatus(payload.status) ?? null,
  };
}

export function getApiBaseUrl(): string {
  if (typeof window === "undefined") return "";

  const explicit = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!base) return "";

  const trimmed = base.replace(/\/$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

/**
 * Backend origin (no `/api` suffix). Useful for resolving `/uploads/*` urls.
 */
export function getApiOriginUrl(): string {
  if (typeof window === "undefined") return "";

  const explicit = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!explicit) return "";

  return explicit.replace(/\/$/, "").replace(/\/api$/, "");
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as { token?: string };
    return data?.token ?? null;
  } catch {
    return null;
  }
}

export function setAuth(payload: AuthPayload): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeAuthPayload(payload);
  localStorage.setItem(AUTH_KEY, JSON.stringify(normalized));
}

export function clearAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_KEY);
}

export function getStoredAuth(): AuthPayload | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<AuthPayload> & {
      token?: string;
      email?: string;
    };

    if (!parsed?.token || !parsed?.email) return null;

    return normalizeAuthPayload({
      token: parsed.token,
      email: parsed.email,
      role: parsed.role,
      id: parsed.id,
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      fullName: parsed.fullName,
      avatarUrl: parsed.avatarUrl,
      status: parsed.status,
    });
  } catch {
    return null;
  }
}

export function isApiAvailable(): boolean {
  return Boolean(getApiBaseUrl());
}

export function hasAuth(): boolean {
  return Boolean(getToken());
}

/** True if id looks like a real backend session UUID (not a mock like "s1"). */
export function isRealSessionId(id: string | undefined): boolean {
  if (!id || typeof id !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id
  );
}
/**
 * Resolves an avatar URL against the API base if it's relative.
 */
export function resolveAvatarUrl(url: string | null | undefined, version?: number): string | null {
  if (!url) return null;
  
  let finalUrl = url;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    const origin = getApiOriginUrl();
    finalUrl = `${origin.replace(/\/$/, "")}${url.startsWith("/") ? url : "/" + url}`;
  }

  if (version) {
    const sep = finalUrl.includes("?") ? "&" : "?";
    finalUrl += `${sep}v=${version}`;
  }
  
  return finalUrl;
}

async function request<T>(
  path: string,
  options: RequestInit & { parseJson?: boolean } = {}
): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) throw new Error("API URL not configured");

  const { parseJson = true, ...fetchOptions } = options;
  const token = getToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const safePath = typeof path === "string" ? path : "";

  const res = await fetch(`${base}${safePath.startsWith("/") ? safePath : "/" + safePath}`, {
    ...fetchOptions,
    // Many deployments use httpOnly cookies for auth on a different origin (e.g. onrender.com).
    // `include` keeps those working, while still allowing Bearer tokens when present.
    credentials: fetchOptions.credentials ?? "include",
    headers,
  });

  if (res.status === 401) {
    clearAuth();
  }

  if (!res.ok) {
    const body = await res.text();
    let message = body;

    try {
      const j = JSON.parse(body);
      if (j?.error) message = j.error;
      else if (j?.message) message = j.message;
    } catch {}

    throw new Error(message || `HTTP ${res.status}`);
  }

  if (!parseJson) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestInit, "method" | "body">) =>
    request<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: Omit<RequestInit, "method" | "body">) =>
    request<T>(path, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  put: <T>(path: string, body?: unknown, options?: Omit<RequestInit, "method" | "body">) =>
    request<T>(path, {
      ...options,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown, options?: Omit<RequestInit, "method" | "body">) =>
    request<T>(path, {
      ...options,
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string, options?: Omit<RequestInit, "method" | "body">) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
