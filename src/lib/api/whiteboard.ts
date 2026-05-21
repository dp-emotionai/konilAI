import { api, getApiBaseUrl, hasAuth } from "@/lib/api/client";

export type WhiteboardPoint = {
  x: number;
  y: number;
};

export type WhiteboardElement = {
  id: string;
  points: WhiteboardPoint[];
  color?: string;
  width?: number;
  createdAt?: string;
  userId?: string | null;
};

export type SessionWhiteboard = {
  sessionId: string;
  elements: WhiteboardElement[];
  version: number;
  updatedAt: string | null;
};

export async function getSessionWhiteboard(
  sessionId: string,
  params?: { signal?: AbortSignal }
): Promise<SessionWhiteboard | null> {
  if (!getApiBaseUrl() || !hasAuth() || !sessionId) return null;
  return api.get<SessionWhiteboard>(`/sessions/${sessionId}/whiteboard`, {
    signal: params?.signal,
  });
}

export async function putSessionWhiteboard(
  sessionId: string,
  input: { elements: WhiteboardElement[]; version: number },
  params?: { signal?: AbortSignal }
): Promise<SessionWhiteboard | null> {
  if (!getApiBaseUrl() || !hasAuth() || !sessionId) return null;
  return api.put<SessionWhiteboard>(`/sessions/${sessionId}/whiteboard`, input, {
    signal: params?.signal,
  });
}

export async function postWhiteboardOperation(
  sessionId: string,
  input: { kind: "draw_batch" | "replace_snapshot" | "reset"; payload: Record<string, unknown> },
  params?: { signal?: AbortSignal }
): Promise<{
  ok: true;
  operation: {
    id: string;
    sessionId: string;
    userId: string;
    kind: string;
    payload: unknown;
    version: number;
    createdAt: string;
  };
  whiteboard: SessionWhiteboard;
} | null> {
  if (!getApiBaseUrl() || !hasAuth() || !sessionId) return null;
  return api.post(`/sessions/${sessionId}/whiteboard/op`, input, {
    signal: params?.signal,
  });
}

