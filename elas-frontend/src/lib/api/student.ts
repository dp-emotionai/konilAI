import { api, hasAuth, getApiBaseUrl } from "./client";
import { mockSessions } from "@/lib/mock/sessions";

export type StudentSessionRow = {
  id: string;
  title: string;
  type: "lecture" | "exam";
  date: string;
  teacher: string;
  status: "upcoming" | "live" | "ended";
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  const date = raw.date ? new Date(raw.date).toLocaleString() : "";
  return {
    id: raw.id,
    title: raw.title,
    type: raw.type === "exam" ? "exam" : "lecture",
    date,
    teacher: raw.teacher || "",
    status,
  };
}

/**
 * Student API: uses real backend when API URL is set and user has token; otherwise mock.
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

export async function getSessionJoinInfo(sessionId: string): Promise<SessionJoinInfo | null> {
  if (!getApiBaseUrl() || !hasAuth()) return null;
  try {
    return await api.get<SessionJoinInfo>(`sessions/${sessionId}/join-info`);
  } catch {
    return null;
  }
}

/** Записать согласие на сессию (после принятия на странице /consent). */
export async function recordSessionConsent(sessionId: string): Promise<void> {
  await api.post(`sessions/${sessionId}/consent`, {});
}

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
  metrics: { emotion: string; confidence: number; risk: number; state: string; dominant_emotion: string }
): Promise<void> {
  if (!getApiBaseUrl() || !hasAuth()) return;
  try {
    await api.post(`sessions/${sessionId}/metrics`, metrics);
  } catch {
    // ignore network/backend errors
  }
}

export type StudentGroupRow = {
  id: string;
  name: string;
  teacherId: string;
  teacher: string;
  teacherName: string;
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
  teacherName: string;
  teacher: string;
  sessions: { id: string; title: string; type: string; status: string; code?: string; startedAt?: string | null; endedAt?: string | null }[];
  members: { id: string; name: string | null; email: string }[];
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

export async function getStudentSessionsList(): Promise<StudentSessionRow[]> {
  if (getApiBaseUrl() && hasAuth()) {
    try {
      const list = await api.get<Parameters<typeof mapBackendToRow>[0][]>("sessions");
      const arr = Array.isArray(list) ? list : [];
      return arr.map(mapBackendToRow);
    } catch {
      await delay(80);
      return mockSessions.map((s) => ({
        id: s.id,
        title: s.title,
        type: s.type,
        date: new Date(s.date).toLocaleString(),
        teacher: s.teacher,
        status: (s.status === "active" ? "live" : s.status === "finished" ? "ended" : "upcoming") as StudentSessionRow["status"],
      }));
    }
  }
  await delay(130);
  return mockSessions.map((s) => ({
    id: s.id,
    title: s.title,
    type: s.type,
    date: new Date(s.date).toLocaleString(),
    teacher: s.teacher,
    status: (s.status === "active" ? "live" : s.status === "finished" ? "ended" : "upcoming") as StudentSessionRow["status"],
  }));
}
