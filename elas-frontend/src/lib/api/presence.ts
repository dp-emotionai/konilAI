import { api, getApiBaseUrl, hasAuth } from "@/lib/api/client";

export type SessionPresenceRow = {
  userId: string;
  fullName: string;
  email?: string | null;
  status: "online" | "offline" | string;
  joinedAt?: string | null;
  leftAt?: string | null;
  updatedAt?: string | null;
};

export async function getSessionPresence(sessionId: string, params?: { signal?: AbortSignal }): Promise<SessionPresenceRow[]> {
  if (!getApiBaseUrl() || !hasAuth() || !sessionId) return [];
  const list = await api.get<SessionPresenceRow[]>(`/sessions/${sessionId}/presence`, { signal: params?.signal });
  return Array.isArray(list) ? list : [];
}

export async function joinSessionPresence(sessionId: string, params?: { signal?: AbortSignal }): Promise<void> {
  if (!getApiBaseUrl() || !hasAuth() || !sessionId) return;
  await api.post(`/sessions/${sessionId}/presence/join`, {}, { signal: params?.signal });
}

export async function leaveSessionPresence(sessionId: string, params?: { signal?: AbortSignal }): Promise<void> {
  if (!getApiBaseUrl() || !hasAuth() || !sessionId) return;
  await api.post(`/sessions/${sessionId}/presence/leave`, {}, { signal: params?.signal });
}

