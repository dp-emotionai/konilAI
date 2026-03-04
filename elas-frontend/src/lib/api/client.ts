/**
 * API client for ELAS backend.
 * Uses NEXT_PUBLIC_API_URL and token from auth storage (localStorage).
 */

const AUTH_KEY = "elas_auth_v1";

export type AuthPayload = { token: string; role: "student" | "teacher" | "admin"; email: string; name?: string | null };

export function getApiBaseUrl(): string {
  if (typeof window === "undefined") return "";
  return (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
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
  localStorage.setItem(AUTH_KEY, JSON.stringify(payload));
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
    return JSON.parse(raw) as AuthPayload;
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
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${base}${path.startsWith("/") ? path : "/" + path}`, {
    ...fetchOptions,
    headers,
  });
  if (!res.ok) {
    const body = await res.text();
    let message = body;
    try {
      const j = JSON.parse(body);
      if (j?.error) message = j.error;
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
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestInit, "method" | "body">) =>
    request<T>(path, {
      ...options,
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string, options?: Omit<RequestInit, "method" | "body">) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
