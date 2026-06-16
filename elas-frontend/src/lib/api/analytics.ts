/**
 * Analytics API — session, group, and teacher analytics + export.
 * Endpoints: GET /api/analytics/session|group|teacher, GET .../export
 */

import { api, getApiBaseUrl, getToken, hasAuth } from "./client";

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

  // optional future participant-level analytics
  participants?: SessionAnalyticsParticipantResponse[];
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

export type SessionAnalyticsParticipantResponse = {
  user_id?: string;
  userId?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  emotion?: string;
  dominant_emotion?: string;
  dominantEmotion?: string;
  engagement?: number;
  stress?: number;
  fatigue?: number;
  risk?: number;
  confidence?: number;
};

export type GroupAnalyticsResponse = {
  group_id?: string;
  groupId?: string;
  groupName?: string;
  total_sessions?: number;
  totalSessions?: number;
  studentCount?: number;
  materialCount?: number;
  taskCount?: number;
  testCount?: number;
  average_engagement?: number;
  avgEngagement?: number;
  avg_engagement?: number;
  averageEngagement?: number;
  averageAttendance?: number;
  taskCompletionRate?: number;
  averageScore?: number;
  engagement_trend?: GroupTrendPointResponse[];
  engagementTrend?: GroupTrendPointResponse[];
  attendanceTrend?: GroupAttendancePointResponse[];
  materialBreakdown?: GroupBreakdownResponse[];
  assignmentStatus?: GroupStatusResponse[];
  topStudents?: GroupStudentResponse[];
  students?: GroupStudentResponse[];
};

export type GroupTrendPointResponse = {
  sessionId?: string;
  label?: string;
  date?: string;
  time_sec?: number;
  timeSec?: number;
  engagement?: number;
  avg_engagement?: number;
  avgEngagement?: number;
};

export type GroupAttendancePointResponse = {
  sessionId?: string;
  title?: string;
  label?: string;
  date?: string;
  joined?: number;
  total?: number;
  rate?: number;
};

export type GroupBreakdownResponse = {
  kind?: string;
  count?: number;
};

export type GroupStatusResponse = {
  status?: string;
  count?: number;
};

export type GroupStudentResponse = {
  userId?: string;
  fullName?: string;
  email?: string;
  attendanceRate?: number;
  taskCompletionRate?: number;
  averageScore?: number;
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

export type SessionAnalyticsParticipant = {
  userId: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  emotion?: string;
  dominantEmotion?: string;
  engagement?: number;
  stress?: number;
  fatigue?: number;
  risk?: number;
  confidence?: number;
};

export type SessionAnalytics = {
  sessionId: string;
  averageEngagement: number;
  stressEvents: number;
  attentionDrops: number;
  timeline: { timeSec: number; engagement: number; stress?: number; risk?: number }[];
  quality?: string;
  durationMinutes?: number;
  aiSummary?: string | null;
  participants?: SessionAnalyticsParticipant[];
};

export type GroupAnalytics = {
  groupId: string;
  groupName?: string;
  totalSessions: number;
  studentCount: number;
  materialCount: number;
  taskCount: number;
  testCount: number;
  averageEngagement: number;
  averageAttendance: number;
  taskCompletionRate: number;
  averageScore: number;
  engagementTrend: { sessionId?: string; label: string; date?: string; timeSec: number; engagement: number }[];
  attendanceTrend: { sessionId?: string; label: string; date?: string; joined: number; total: number; rate: number }[];
  materialBreakdown: { kind: string; count: number }[];
  assignmentStatus: { status: string; count: number }[];
  topStudents: { userId: string; fullName: string; email?: string; attendanceRate: number; taskCompletionRate: number; averageScore: number }[];
  students: { userId: string; fullName: string; email?: string; attendanceRate: number; taskCompletionRate: number; averageScore: number }[];
};

export type TeacherAnalytics = {
  totalSessions: number;
  averageEngagement: number;
  stressEvents: number;
};

function toNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && !Number.isNaN(value) ? value : fallback;
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizePercent(value: unknown): number {
  const n = toNumber(value, 0);
  if (n >= 0 && n <= 1) return clampPercent(n * 100);
  return clampPercent(n);
}

function normalizeMaybePercent(value: unknown): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  if (value >= 0 && value <= 1) return clampPercent(value * 100);
  return clampPercent(value);
}

function normSessionAnalytics(
    raw: SessionAnalyticsResponse,
    sessionId: string
): SessionAnalytics {
  const avg =
      raw.average_engagement ?? raw.avgEngagement ?? raw.avg_engagement ?? 0;

  const stress = raw.stress_events ?? raw.stressEvents ?? 0;
  const drops = raw.attention_drops ?? raw.attentionDrops ?? 0;
  const timelineRaw = Array.isArray(raw.timeline) ? raw.timeline : [];

  const timeline = timelineRaw.map((p) => ({
    timeSec: toNumber(p.time_sec ?? p.timeSec ?? p.from_sec ?? 0, 0),
    engagement: normalizePercent(
        p.engagement ?? p.avg_engagement ?? p.avgEngagement ?? 0
    ),
    stress: normalizeMaybePercent(p.stress),
    risk: normalizeMaybePercent(p.risk),
  }));

  const participants = Array.isArray(raw.participants)
      ? raw.participants.map((p, index) => ({
        userId: String(p.user_id ?? p.userId ?? `participant-${index + 1}`),
        fullName: String(p.fullName ?? p.email ?? `Участник ${index + 1}`),
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email ?? null,
        emotion: p.emotion,
        dominantEmotion: p.dominant_emotion ?? p.dominantEmotion,
        engagement: normalizeMaybePercent(p.engagement),
        stress: normalizeMaybePercent(p.stress),
        fatigue: normalizeMaybePercent(p.fatigue),
        risk: normalizeMaybePercent(p.risk),
        confidence: normalizeMaybePercent(p.confidence),
      }))
      : [];

  return {
    sessionId: raw.sessionId ?? raw.session_id ?? sessionId,
    averageEngagement: normalizePercent(avg),
    stressEvents: toNumber(stress, 0),
    attentionDrops: toNumber(drops, 0),
    timeline,
    quality: raw.quality,
    durationMinutes:
        typeof raw.duration_minutes === "number"
            ? raw.duration_minutes
            : typeof raw.durationMinutes === "number"
                ? raw.durationMinutes
                : undefined,
    aiSummary: raw.ai_summary ?? undefined,
    participants,
  };
}

function normGroupAnalytics(
    raw: GroupAnalyticsResponse,
    groupId: string
): GroupAnalytics {
  const total = raw.total_sessions ?? raw.totalSessions ?? 0;
  const avg =
      raw.averageEngagement ??
      raw.average_engagement ??
      raw.avgEngagement ??
      raw.avg_engagement ??
      0;
  const trendRaw = raw.engagement_trend ?? raw.engagementTrend ?? [];

  const engagementTrend = trendRaw.map((p, index) => ({
    sessionId: p.sessionId,
    label: String(p.label ?? p.date ?? `Сессия ${index + 1}`),
    date: p.date,
    timeSec: toNumber(p.time_sec ?? p.timeSec ?? index * 60, index * 60),
    engagement: normalizePercent(
        p.engagement ?? p.avg_engagement ?? p.avgEngagement ?? 0
    ),
  }));

  const attendanceTrend = (raw.attendanceTrend ?? []).map((p, index) => ({
    sessionId: p.sessionId,
    label: String(p.label ?? p.title ?? p.date ?? `Сессия ${index + 1}`),
    date: p.date,
    joined: toNumber(p.joined, 0),
    total: toNumber(p.total, 0),
    rate: normalizePercent(p.rate ?? 0),
  }));

  const normalizeStudent = (p: GroupStudentResponse, index: number) => ({
    userId: String(p.userId ?? `student-${index + 1}`),
    fullName: String(p.fullName ?? p.email ?? `Студент ${index + 1}`),
    email: p.email,
    attendanceRate: normalizePercent(p.attendanceRate ?? 0),
    taskCompletionRate: normalizePercent(p.taskCompletionRate ?? 0),
    averageScore: normalizePercent(p.averageScore ?? 0),
  });

  return {
    groupId: raw.groupId ?? raw.group_id ?? groupId,
    groupName: raw.groupName,
    totalSessions: toNumber(total, 0),
    studentCount: toNumber(raw.studentCount, 0),
    materialCount: toNumber(raw.materialCount, 0),
    taskCount: toNumber(raw.taskCount, 0),
    testCount: toNumber(raw.testCount, 0),
    averageEngagement: normalizePercent(avg),
    averageAttendance: normalizePercent(raw.averageAttendance ?? 0),
    taskCompletionRate: normalizePercent(raw.taskCompletionRate ?? 0),
    averageScore: normalizePercent(raw.averageScore ?? 0),
    engagementTrend,
    attendanceTrend,
    materialBreakdown: (raw.materialBreakdown ?? []).map((p) => ({
      kind: String(p.kind ?? "Файл"),
      count: toNumber(p.count, 0),
    })),
    assignmentStatus: (raw.assignmentStatus ?? []).map((p) => ({
      status: String(p.status ?? "Статус"),
      count: toNumber(p.count, 0),
    })),
    topStudents: (raw.topStudents ?? []).map(normalizeStudent),
    students: (raw.students ?? []).map(normalizeStudent),
  };
}

function normTeacherAnalytics(raw: TeacherAnalyticsResponse): TeacherAnalytics {
  const total = raw.total_sessions ?? raw.totalSessions ?? 0;
  const avg =
      raw.average_engagement ?? raw.avgEngagement ?? raw.avg_engagement ?? 0;
  const stress = raw.stress_events ?? raw.stressEvents ?? 0;

  return {
    totalSessions: toNumber(total, 0),
    averageEngagement: normalizePercent(avg),
    stressEvents: toNumber(stress, 0),
  };
}

const ANALYTICS_PREFIX = "analytics";

export async function fetchSessionAnalytics(
    sessionId: string
): Promise<SessionAnalytics | null> {
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

export async function fetchGroupAnalytics(
    groupId: string
): Promise<GroupAnalytics | null> {
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
    const raw = await api.get<TeacherAnalyticsResponse>(
        `${ANALYTICS_PREFIX}/teacher`
    );
    return raw ? normTeacherAnalytics(raw) : null;
  } catch {
    return null;
  }
}

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

  const path = `${base.replace(/\/$/, "")}/analytics/session/${sessionId}/export?format=${format}`;

  const res = await fetch(path, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`Export failed: ${res.status}`);

  const blob = await res.blob();
  const ext = format === "pdf" ? "pdf" : format;
  const name = res.headers
      .get("Content-Disposition")
      ?.match(/filename="?([^";]+)"?/)?.[1];

  downloadBlob(blob, name ?? `session-${sessionId}-report.${ext}`);
}

export async function exportGroupReport(groupId: string): Promise<void> {
  const base = getApiBaseUrl();
  const token = getToken();
  if (!base || !token) throw new Error("API not configured or not authenticated");

  const path = `${base.replace(/\/$/, "")}/analytics/group/${groupId}/export?format=pdf`;

  const res = await fetch(path, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`Export failed: ${res.status}`);

  const blob = await res.blob();
  const name = res.headers
      .get("Content-Disposition")
      ?.match(/filename="?([^";]+)"?/)?.[1];

  downloadBlob(blob, name ?? `group-${groupId}-report.pdf`);
}

export async function exportTeacherReport(): Promise<void> {
  const base = getApiBaseUrl();
  const token = getToken();
  if (!base || !token) throw new Error("API not configured or not authenticated");

  const path = `${base.replace(/\/$/, "")}/analytics/teacher/export`;

  const res = await fetch(path, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`Export failed: ${res.status}`);

  const blob = await res.blob();
  const name = res.headers
      .get("Content-Disposition")
      ?.match(/filename="?([^";]+)"?/)?.[1];

  downloadBlob(blob, name ?? "teacher-analytics-report.pdf");
}