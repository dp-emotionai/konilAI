/**
 * API-first global search. GET /search?q=...&types=...&limit=...
 * Server filters by role (student/teacher: sessions, groups; admin: + users).
 */

import { api, getApiBaseUrl, hasAuth } from "./client";

export type SearchSession = {
  id: string;
  title: string;
  status?: string;
  startAt?: string;
  groupName?: string;
};

export type SearchGroup = {
  id: string;
  name: string;
  membersCount?: number;
};

export type SearchUser = {
  id: string;
  name: string;
  email?: string;
  role?: string;
};

export type SearchResponse = {
  q: string;
  results: {
    sessions: SearchSession[];
    groups: SearchGroup[];
    users?: SearchUser[];
  };
};

const MIN_QUERY_LENGTH = 2;
const DEFAULT_LIMIT = 10;

function buildParams(q: string, role: "student" | "teacher" | "admin", limit = DEFAULT_LIMIT): string {
  const params = new URLSearchParams();
  params.set("q", q);
  const types = role === "admin" ? ["sessions", "groups", "users"] : ["sessions", "groups"];
  params.set("types", types.join(","));
  params.set("limit", String(limit));
  return params.toString();
}

export async function search(
  q: string,
  role: "student" | "teacher" | "admin",
  options?: { limit?: number; signal?: AbortSignal }
): Promise<SearchResponse> {
  if (!getApiBaseUrl() || !hasAuth()) {
    return { q, results: { sessions: [], groups: [], ...(role === "admin" ? { users: [] } : {}) } };
  }
  const params = buildParams(q, role, options?.limit);
  const url = `search?${params}`;
  const res = await api.get<SearchResponse>(url, { signal: options?.signal });
  return res;
}

export function isSearchAvailable(): boolean {
  return Boolean(getApiBaseUrl() && hasAuth());
}

export { MIN_QUERY_LENGTH };
