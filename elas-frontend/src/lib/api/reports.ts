import { api } from "@/lib/api/client";

export type SessionStatus = "draft" | "active" | "finished";
export type SessionType = "lecture" | "exam";

export type ReportRow = {
  id: string;
  title: string;
  type: SessionType;
  status: SessionStatus;
  code: string;
  groupId: string;
  groupName: string;
  teacher: string;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  avgEngagement?: number | null;
  avgStress?: number | null;
  attentionDrops?: number | null;
};

export type LiveMetrics = {
  participants: Array<{
    userId: string;
    name: string;
    email?: string;
    emotion: string;
    confidence: number;
    risk: number;
    state: string;
    dominant_emotion: string;
    updatedAt: string;
  }>;
  avgRisk: number;
  avgConfidence: number;
};

export async function getTeacherSessionsAsReports(params?: {
  signal?: AbortSignal;
}): Promise<ReportRow[]> {
  return api.get<ReportRow[]>("/sessions", { signal: params?.signal });
}

export async function getTeacherReportsFromSessions(params?: {
  query?: string;
  status?: SessionStatus | "all";
  type?: SessionType | "all";
  signal?: AbortSignal;
}): Promise<ReportRow[]> {
  const sessions = await getTeacherSessionsAsReports({ signal: params?.signal });
  const query = params?.query?.trim().toLowerCase();

  return sessions.filter((s) => {
    if (params?.status && params.status !== "all" && s.status !== params.status) return false;
    if (params?.type && params.type !== "all" && s.type !== params.type) return false;
    if (query && !`${s.title} ${s.groupName}`.toLowerCase().includes(query)) return false;
    return true;
  });
}

export async function getLiveMetrics(sessionId: string, params?: { signal?: AbortSignal }) {
  return api.get<LiveMetrics>(`/sessions/${sessionId}/live-metrics`, { signal: params?.signal });
}
