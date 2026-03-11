/**
 * Analytics API — session, group, and teacher analytics + export.
 * Endpoints: GET /api/analytics/session|group|teacher, GET .../export
 */

import { api, getApiBaseUrl, getToken, hasAuth } from "./client";

// ——— Response types (backend may use snake_case; we normalize to camelCase) ———

export type SessionAnalyticsResponse = {
  session_id?: string;
  sessionId?: string;
  average_engagement?: number;
  avgEngagement?: number;
  avg_engagement?: number;
  stress_events?: number;
  stressEvents?: number;
  attention_drops?: number;
  attentionDrops?: number;
  timeline?: SessionAnalyticsTimelinePoint[];
  quality?: string;
  duration_minutes?: number;
  durationMinutes?: number;
  ai_summary?: string | null;
};

export type SessionAnalyticsTimelinePoint = {
  time_sec?: number;
  timeSec?: number;
  from_sec?: number;
  to_sec?: number;
  engagement?: number;
  avg_engagement?: number;
  avgEngagement?: number;
  stress?: number;
  risk?: number;
};

export type GroupAnalyticsResponse = {
  group_id?: string;
  groupId?: string;
  total_sessions?: number;
  totalSessions?: number;
  average_engagement?: number;
  avgEngagement?: number;
  avg_engagement?: number;
  engagement_trend?: SessionAnalyticsTimelinePoint[] | { time_sec?: number; engagement?: number }[];
  engagementTrend?: SessionAnalyticsTimelinePoint[];
};

export type TeacherAnalyticsResponse = {
  total_sessions?: number;
  totalSessions?: number;
  average_engagement?: number;
  avgEngagement?: number;
  avg_engagement?: number;
  stress_events?: number;
  stressEvents?: number;
};

// ——— Normalized front-end types ———

export type SessionAnalytics = {
  sessionId: string;
  averageEngagement: number;
  stressEvents: number;
  attentionDrops: number;
  timeline: { timeSec: number; engagement: number; stress?: number }[];
  quality?: string;
  durationMinutes?: number;
  aiSummary?: string | null;
};

export type GroupAnalytics = {
  groupId: string;
  totalSessions: number;
  averageEngagement: number;
  engagementTrend: { timeSec: number; engagement: number }[];
};

export type TeacherAnalytics = {
  totalSessions: number;
  averageEngagement: number;
  stressEvents: number;
};

function normSessionAnalytics(raw: SessionAnalyticsResponse, sessionId: string): SessionAnalytics {
  const avg =
    raw.average_engagement ?? raw.avgEngagement ?? raw.avg_engagement ?? 0;
  const stress = raw.stress_events ?? raw.stressEvents ?? 0;
  const drops = raw.attention_drops ?? raw.attentionDrops ?? 0;
  const timelineRaw = raw.timeline ?? [];
  const timeline = timelineRaw.map((p) => ({
    timeSec: p.time_sec ?? p.timeSec ?? p.from_sec ?? 0,
    engagement: p.engagement ?? p.avg_engagement ?? p.avgEngagement ?? 0,
    stress: p.stress ?? undefined,
  }));
  return {
    sessionId: raw.sessionId ?? raw.session_id ?? sessionId,
    averageEngagement: typeof avg === "number" ? avg : 0,
    stressEvents: typeof stress === "number" ? stress : 0,
    attentionDrops: typeof drops === "number" ? drops : 0,
    timeline,
    quality: raw.quality,
    durationMinutes: raw.duration_minutes ?? raw.durationMinutes,
    aiSummary: raw.ai_summary ?? undefined,
  };
}

function normGroupAnalytics(raw: GroupAnalyticsResponse, groupId: string): GroupAnalytics {
  const total = raw.total_sessions ?? raw.totalSessions ?? 0;
  const avg =
    raw.average_engagement ?? raw.avgEngagement ?? raw.avg_engagement ?? 0;
  const trendRaw = raw.engagement_trend ?? raw.engagementTrend ?? [];
  const engagementTrend = trendRaw.map((p: SessionAnalyticsTimelinePoint | { time_sec?: number; engagement?: number }) => ({
    timeSec: (p as SessionAnalyticsTimelinePoint).time_sec ?? (p as SessionAnalyticsTimelinePoint).timeSec ?? (p as { time_sec?: number }).time_sec ?? 0,
    engagement:
      (p as SessionAnalyticsTimelinePoint).engagement ??
      (p as SessionAnalyticsTimelinePoint).avg_engagement ??
      (p as SessionAnalyticsTimelinePoint).avgEngagement ??
      (p as { engagement?: number }).engagement ??
      0,
  }));
  return {
    groupId: raw.groupId ?? raw.group_id ?? groupId,
    totalSessions: typeof total === "number" ? total : 0,
    averageEngagement: typeof avg === "number" ? avg : 0,
    engagementTrend,
  };
}

function normTeacherAnalytics(raw: TeacherAnalyticsResponse): TeacherAnalytics {
  const total = raw.total_sessions ?? raw.totalSessions ?? 0;
  const avg =
    raw.average_engagement ?? raw.avgEngagement ?? raw.avg_engagement ?? 0;
  const stress = raw.stress_events ?? raw.stressEvents ?? 0;
  return {
    totalSessions: typeof total === "number" ? total : 0,
    averageEngagement: typeof avg === "number" ? avg : 0,
    stressEvents: typeof stress === "number" ? stress : 0,
  };
}

// ——— Fetch analytics (JSON) ———

const ANALYTICS_PREFIX = "api/analytics";

export async function fetchSessionAnalytics(sessionId: string): Promise<SessionAnalytics | null> {
  if (!getApiBaseUrl() || !hasAuth() || !sessionId) return null;
  try {
    const raw = await api.get<SessionAnalyticsResponse>(
      `${ANALYTICS_PREFIX}/session/${sessionId}`
    );
    return raw ? normSessionAnalytics(raw, sessionId) : null;
  } catch {
    return null;
  }
}

export async function fetchGroupAnalytics(groupId: string): Promise<GroupAnalytics | null> {
  if (!getApiBaseUrl() || !hasAuth() || !groupId) return null;
  try {
    const raw = await api.get<GroupAnalyticsResponse>(
      `${ANALYTICS_PREFIX}/group/${groupId}`
    );
    return raw ? normGroupAnalytics(raw, groupId) : null;
  } catch {
    return null;
  }
}

export async function fetchTeacherAnalytics(): Promise<TeacherAnalytics | null> {
  if (!getApiBaseUrl() || !hasAuth()) return null;
  try {
    const raw = await api.get<TeacherAnalyticsResponse>(`${ANALYTICS_PREFIX}/teacher`);
    return raw ? normTeacherAnalytics(raw) : null;
  } catch {
    return null;
  }
}

// ——— Export (blob download) ———

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportSessionReport(
  sessionId: string,
  format: "json" | "csv" | "pdf"
): Promise<void> {
  const base = getApiBaseUrl();
  const token = getToken();
  if (!base || !token) throw new Error("API not configured or not authenticated");
  const path = `${base.replace(/\/$/, "")}/api/analytics/session/${sessionId}/export?format=${format}`;
  const res = await fetch(path, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  const blob = await res.blob();
  const ext = format === "pdf" ? "pdf" : format;
  const name = res.headers.get("Content-Disposition")?.match(/filename="?([^";]+)"?/)?.[1];
  downloadBlob(blob, name ?? `session-${sessionId}-report.${ext}`);
}

export async function exportGroupReport(groupId: string): Promise<void> {
  const base = getApiBaseUrl();
  const token = getToken();
  if (!base || !token) throw new Error("API not configured or not authenticated");
  const path = `${base.replace(/\/$/, "")}/api/analytics/group/${groupId}/export`;
  const res = await fetch(path, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  const blob = await res.blob();
  const name = res.headers.get("Content-Disposition")?.match(/filename="?([^";]+)"?/)?.[1];
  downloadBlob(blob, name ?? `group-${groupId}-report.pdf`);
}

export async function exportTeacherReport(): Promise<void> {
  const base = getApiBaseUrl();
  const token = getToken();
  if (!base || !token) throw new Error("API not configured or not authenticated");
  const path = `${base.replace(/\/$/, "")}/api/analytics/teacher/export`;
  const res = await fetch(path, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  const blob = await res.blob();
  const name = res.headers.get("Content-Disposition")?.match(/filename="?([^";]+)"?/)?.[1];
  downloadBlob(blob, name ?? "teacher-analytics-report.pdf");
}
