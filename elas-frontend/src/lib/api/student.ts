import { api, hasAuth, getApiBaseUrl } from "./client";

export type StudentSessionRow = {
  id: string;
  title: string;
  type: "lecture" | "exam";
  date: string;
  scheduledAt?: string | null;
  teacher: string;
  status: "upcoming" | "live" | "ended";
};

function mapBackendToRow(raw: {
  id: string;
  title: string;
  type: string;
  status: string;
  teacher?: string;
  date?: string;
  groupName?: string;
}): StudentSessionRow {
  const status = raw.status === "live" ? "live" : raw.status === "ended" ? "ended" : "upcoming";
  const scheduledAt = raw.date ?? null;
  const date = scheduledAt
    ? new Date(scheduledAt).toLocaleString("ru-RU", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  return {
    id: raw.id,
    title: raw.title,
    type: raw.type === "exam" ? "exam" : "lecture",
    date,
    scheduledAt,
    teacher: raw.teacher || "",
    status,
  };
}

/**
 * Student API: Uses real backend endpoints.
 */
export type SessionJoinInfo = {
  title: string;
  type: string;
  status: string;
  consentRequired: boolean;
  allowedToJoin: boolean;
  reason?: "session_not_started" | "session_ended" | "consent_required";
  groupName?: string;
};

export type StudentSessionDetails = {
  id: string;
  title: string;
  type: "lecture" | "exam";
  status: string;
  code: string;
  groupId: string;
  groupName?: string;
  teacher?: string | null;
  teacherFullName?: string | null;
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt?: string;
};

export async function getSessionJoinInfo(sessionId: string): Promise<SessionJoinInfo | null> {
  if (!getApiBaseUrl() || !hasAuth()) return null;
  const data = await api.get<SessionJoinInfo>(`sessions/${sessionId}/join-info`);
  return data ?? null;
}

export async function getStudentSessionDetails(
  sessionId: string
): Promise<StudentSessionDetails | null> {
  if (!getApiBaseUrl() || !hasAuth()) return null;

  try {
    const data = await api.get<{
      id: string;
      title: string;
      type: string;
      status: string;
      code: string;
      groupId: string;
      groupName?: string;
      teacher?: string | null;
      teacherName?: string | null;
      startedAt?: string | null;
      endedAt?: string | null;
      createdAt?: string;
    }>(`sessions/${sessionId}`);

    return {
      id: data.id,
      title: data.title,
      type: data.type === "exam" ? "exam" : "lecture",
      status: data.status,
      code: data.code,
      groupId: data.groupId,
      groupName: data.groupName,
      teacher: data.teacher ?? null,
      teacherFullName: data.teacherName?.trim() || null,
      startedAt: data.startedAt,
      endedAt: data.endedAt,
      createdAt: data.createdAt,
    };
  } catch {
    return null;
  }
}

/** Записать согласие на сессию (после принятия на странице /consent). */
export async function recordSessionConsent(sessionId: string): Promise<void> {
  await api.post(`sessions/${sessionId}/consent`, {});
}

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

export type InvitationRow = {
  id: string;
  groupId: string;
  groupName: string;
  inviteeEmail: string;
  status: string;
  createdAt: string;
};

export async function getInvitations(): Promise<InvitationRow[]> {
  if (!getApiBaseUrl() || !hasAuth()) return [];
  try {
    const list = await api.get<InvitationRow[]>("invitations");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function acceptInvitation(invitationId: string): Promise<{ groupId: string; groupName: string }> {
  return api.post(`invitations/${invitationId}/accept`, {});
}

export async function declineInvitation(invitationId: string): Promise<void> {
  await api.post(`invitations/${invitationId}/decline`, {});
}

/** Отправить результат ML в бэкенд для live-монитора преподавателя. */
export async function sendSessionMetrics(
  sessionId: string,
  metrics: {
    emotion: string;
    confidence: number;
    risk: number;
    state: string;
    dominant_emotion: string;
    /** Direct ML output 0..1 */
    engagement?: number;
    /** Direct ML output 0..1 */
    stress?: number;
    /** Direct ML output 0..1 */
    fatigue?: number;
  }
): Promise<void> {
  if (!getApiBaseUrl() || !hasAuth()) return;
  try {
    await api.post(`sessions/${sessionId}/metrics`, metrics);
  } catch {
    // ignore network/backend errors
  }
}

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

export type StudentGroupRow = {
  id: string;
  name: string;
  teacherId: string;
  teacher: string;
  teacherFullName: string;
  sessionCount: number;
  createdAt: string;
};

export async function getStudentGroups(): Promise<StudentGroupRow[]> {
  if (!getApiBaseUrl() || !hasAuth()) return [];
  try {
    const list = await api.get<StudentGroupRow[]>("groups");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export type StudentGroupDetail = {
  id: string;
  name: string;
  teacherFullName: string;
  teacher: string;
  sessions: { id: string; title: string; type: string; status: string; code?: string; startedAt?: string | null; endedAt?: string | null }[];
  members: { id: string; fullName: string | null; email: string }[];
  createdAt: string;
};

export async function getStudentGroupDetail(groupId: string): Promise<StudentGroupDetail | null> {
  if (!getApiBaseUrl() || !hasAuth()) return null;
  try {
    const raw = await api.get<StudentGroupDetail>(`groups/${groupId}`);
    return raw;
  } catch {
    return null;
  }
}

export type StudentEmotionsSummary = {
  analyzedSessions: number;
  avgEngagement: number;
  stressPeaks: number;
  bestTimeWindow: string | null;
  engagementSeries: number[];
  dropsSeries: number[];
  weekCompare: {
    thisWeek: number;
    prevWeek: number;
    delta: number;
  };
  emotionsDistribution: Record<string, number>;
};

export async function getStudentEmotionsSummary(): Promise<StudentEmotionsSummary | null> {
  if (!getApiBaseUrl() || !hasAuth()) return null;
  const data = await api.get<StudentEmotionsSummary>("student/me/emotions-summary");
  return data;
}

export async function getStudentSessionsList(): Promise<StudentSessionRow[]> {
  if (!getApiBaseUrl() || !hasAuth()) {
    return [];
  }
  const list = await api.get<Parameters<typeof mapBackendToRow>[0][]>("sessions");
  const arr = Array.isArray(list) ? list : [];
  return arr.map(mapBackendToRow);
}
