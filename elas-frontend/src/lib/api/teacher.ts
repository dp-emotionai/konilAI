import { api, hasAuth, getApiBaseUrl } from "./client";
import type { Session } from "@/lib/mock/sessions";
import type { GroupSession } from "@/lib/mock/groupSessions";
import type { Group } from "@/lib/mock/groups";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Teacher API: uses real backend when API URL is set and user has token; otherwise mock.
 */

function mapBackendToSession(raw: {
  id: string;
  title: string;
  type: string;
  status: string;
  code?: string;
  groupName?: string;
  teacher?: string;
  startedAt?: string | null;
  endedAt?: string | null;
  createdAt?: string;
}): Session {
  const date = raw.startedAt || raw.createdAt || new Date().toISOString();
  return {
    id: raw.id,
    code: raw.code || "",
    type: raw.type === "exam" ? "exam" : "lecture",
    title: raw.title,
    group: raw.groupName || "",
    teacher: raw.teacher || "",
    date,
    participants: 0,
    status: raw.status === "active" ? "active" : raw.status === "finished" ? "finished" : "draft",
    quality: "medium",
  };
}

function mapBackendToGroupSession(raw: {
  id: string;
  title: string;
  type: string;
  status: string;
  groupId: string;
  groupName?: string;
  teacher?: string;
  startedAt?: string | null;
  endedAt?: string | null;
}): GroupSession {
  const status = raw.status === "active" ? "live" : raw.status === "finished" ? "ended" : "upcoming";
  return {
    id: raw.id,
    title: raw.title,
    type: raw.type === "exam" ? "exam" : "lecture",
    status,
    groupId: raw.groupId,
    startsAt: raw.startedAt || undefined,
  };
}

export async function getTeacherDashboardSessions(): Promise<Session[]> {
  if (getApiBaseUrl() && hasAuth()) {
    try {
      const list = await api.get<Parameters<typeof mapBackendToSession>[0][]>("sessions");
      const arr = Array.isArray(list) ? list : [];
      return arr.map(mapBackendToSession);
    } catch {
      await delay(80);
      return [];
    }
  }
  await delay(120);
  return [];
}

export async function getTeacherAllSessions(): Promise<GroupSession[]> {
  if (getApiBaseUrl() && hasAuth()) {
    try {
      const list = await api.get<Parameters<typeof mapBackendToGroupSession>[0][]>("sessions");
      const arr = Array.isArray(list) ? list : [];
      return arr.map(mapBackendToGroupSession);
    } catch {
      await delay(80);
      return [];
    }
  }
  await delay(140);
  return [];
}

export type TeacherGroup = { id: string; name: string; teacherId: string; sessionCount?: number };

/** Один запрос: группа с сессиями и участниками (для страницы группы). */
export type GroupDetailResponse = {
  id: string;
  name: string;
  teacherId: string;
  teacher: string;
  teacherName: string;
  sessions: { id: string; title: string; type: string; status: string; code?: string; startedAt?: string | null; endedAt?: string | null }[];
  members: { id: string; name: string | null; email: string }[];
  createdAt: string;
};

export type GroupWithSessions = { group: Group; sessions: GroupSession[] };

export async function getGroupById(groupId: string): Promise<GroupWithSessions | null> {
  if (!getApiBaseUrl() || !hasAuth()) return null;
  try {
    const raw = await api.get<GroupDetailResponse>(`groups/${groupId}`);
    const sessions: GroupSession[] = (raw.sessions ?? []).map((s) => ({
      id: s.id,
      title: s.title,
      type: s.type === "exam" ? "exam" : "lecture",
      status: s.status === "active" ? "live" : s.status === "finished" ? "ended" : "upcoming",
      groupId: raw.id,
      startsAt: s.startedAt ?? undefined,
    }));
    const group: Group = {
      id: raw.id,
      name: raw.name,
      program: raw.name,
      status: "active",
      teacher: { id: raw.teacherId, name: raw.teacherName ?? raw.teacher, email: raw.teacher },
      students: (raw.members ?? []).map((m) => ({ id: m.id, name: m.name ?? m.email, email: m.email })),
      createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date(raw.createdAt).toISOString(),
    };
    return { group, sessions };
  } catch {
    return null;
  }
}

export async function getTeacherGroups(): Promise<TeacherGroup[]> {
  if (getApiBaseUrl() && hasAuth()) {
    try {
      const list = await api.get<TeacherGroup[]>("groups");
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Участник с ML-метриками для live-монитора. */
export type LiveMetricsParticipant = {
  userId: string;
  name: string;
  email?: string | null;
  emotion: string;
  confidence: number;
  risk: number;
  state: string;
  dominant_emotion: string;
  updatedAt: string;
};

export type SessionLiveMetrics = {
  participants: LiveMetricsParticipant[];
  avgRisk: number;
  avgConfidence: number;
};

export async function getSessionLiveMetrics(sessionId: string): Promise<SessionLiveMetrics | null> {
  if (!getApiBaseUrl() || !hasAuth() || !sessionId) return null;
  try {
    return await api.get<SessionLiveMetrics>(`sessions/${sessionId}/live-metrics`);
  } catch {
    return null;
  }
}

// --- Session summary / analytics ---

export type SessionSummary = {
  sessionId: string;
  avgEngagement: number;
  attentionDrops: number;
  quality: "good" | "medium" | "poor" | string;
  avgStress?: number | null;
  durationMinutes?: number | null;
};

export async function getSessionSummary(sessionId: string): Promise<SessionSummary | null> {
  if (!getApiBaseUrl() || !hasAuth() || !sessionId) return null;
  try {
    // Ожидаемый endpoint партнёра: GET /sessions/:id/summary
    const raw = await api.get<SessionSummary | (SessionSummary & { id?: string })>(
      `sessions/${sessionId}/summary`
    );
    if (!raw) return null;
    const baseId = (raw as any).sessionId ?? (raw as any).id ?? sessionId;
    return {
      sessionId: baseId,
      avgEngagement: typeof raw.avgEngagement === "number" ? raw.avgEngagement : 0,
      attentionDrops:
        typeof raw.attentionDrops === "number" ? raw.attentionDrops : 0,
      quality: (raw.quality as any) ?? "medium",
      avgStress:
        typeof raw.avgStress === "number" ? raw.avgStress : null,
      durationMinutes:
        typeof raw.durationMinutes === "number" ? raw.durationMinutes : null,
    };
  } catch {
    return null;
  }
}

export type CreateGroupResult = { id: string; name: string; teacherId: string; createdAt: string };

export async function createGroup(name: string): Promise<CreateGroupResult> {
  const res = await api.post<CreateGroupResult>("groups", { name: name.trim() });
  return res;
}

export type CreateSessionBody = { title: string; type: "lecture" | "exam"; groupId: string };
export type CreateSessionResult = { id: string; title: string; type: string; status: string; code: string; groupId: string; createdAt: string };

export async function createSession(body: CreateSessionBody): Promise<CreateSessionResult> {
  const res = await api.post<CreateSessionResult>("sessions", body);
  return res;
}

/** Start (active), end (finished), or reopen (draft). */
export async function updateSessionStatus(
  sessionId: string,
  status: "active" | "finished" | "draft"
): Promise<void> {
  await api.patch(`sessions/${sessionId}`, { status });
}

/** Пригласить студентов в группу по email (список через запятую или массив). */
export async function createInvitations(groupId: string, emails: string[]): Promise<{ created: { email: string; invitationId: string }[] }> {
  const res = await api.post<{ created: { email: string; invitationId: string }[] }>(`groups/${groupId}/invitations`, { emails });
  return res;
}

export type GroupInvitationRow = {
  id: string;
  inviteeEmail: string;
  inviteeUserId: string | null;
  status: string;
  createdAt: string;
};

export async function getGroupInvitations(groupId: string): Promise<GroupInvitationRow[]> {
  const list = await api.get<GroupInvitationRow[]>(`groups/${groupId}/invitations`);
  return Array.isArray(list) ? list : [];
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  await api.post(`invitations/${invitationId}/revoke`);
}

export type GroupMemberRow = {
  id: string;
  email: string;
  name: string | null;
  addedAt: string;
  status?: string;
  removedAt?: string | null;
};

export type GroupMembersResponse = { teacher: { id: string; email: string; name: string | null }; students: GroupMemberRow[] };

export async function getGroupMembers(groupId: string, includeRemoved = false): Promise<GroupMembersResponse> {
  const url = includeRemoved ? `groups/${groupId}/members?includeRemoved=true` : `groups/${groupId}/members`;
  return api.get<GroupMembersResponse>(url);
}

export async function removeMemberFromGroup(groupId: string, userId: string): Promise<void> {
  await api.delete(`groups/${groupId}/members/${userId}`);
}

export async function blockMemberInGroup(groupId: string, userId: string): Promise<void> {
  await api.post(`groups/${groupId}/members/${userId}/block`);
}

// --- Group chat / announcements ---

export type GroupMessage = {
  id: string;
  groupId: string;
  senderId: string;
  type: string;
  text: string;
  replyToId?: string | null;
  qaStatus?: string | null;
  pinnedAt?: string | null;
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
};

export async function getGroupMessages(groupId: string, tab: "announcements" | "qa" | "chat" = "announcements"): Promise<GroupMessage[]> {
  const list = await api.get<GroupMessage[]>(`groups/${groupId}/messages?tab=${tab}`);
  return Array.isArray(list) ? list : [];
}

export async function postGroupMessage(
  groupId: string,
  payload: { type: "message" | "announcement" | "question" | "answer"; text: string; replyToId?: string | null }
): Promise<GroupMessage> {
  return api.post<GroupMessage>(`groups/${groupId}/messages`, payload);
}

// --- Session chat ---

export type SessionMessage = {
  id: string;
  sessionId: string;
  senderId: string;
  senderName?: string | null;
  senderEmail?: string | null;
  type: string;
  text: string;
  channel: "public" | "help";
  helpStudentId?: string | null;
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
};

export async function getSessionMessages(
  sessionId: string,
  opts: { channel?: "public" | "help"; helpStudentId?: string } = {}
): Promise<SessionMessage[]> {
  if (!getApiBaseUrl() || !hasAuth()) return [];
  const params = new URLSearchParams();
  if (opts.channel) params.set("channel", opts.channel);
  if (opts.helpStudentId) params.set("helpStudentId", opts.helpStudentId);
  const qs = params.toString();
  const path = qs ? `sessions/${sessionId}/messages?${qs}` : `sessions/${sessionId}/messages`;
  try {
    const list = await api.get<SessionMessage[]>(path);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function postSessionMessage(
  sessionId: string,
  payload: { type: string; text: string; channel?: "public" | "help"; helpStudentId?: string | null }
): Promise<SessionMessage | null> {
  try {
    return await api.post<SessionMessage>(`sessions/${sessionId}/messages`, payload);
  } catch {
    return null;
  }
}

/** Chat policy for session (mode + slowmode). */
export type SessionChatPolicy = {
  sessionId: string;
  mode: "lecture_open" | "questions_only" | "locked" | "exam_help_only";
  slowmodeSec: number;
  updatedAt: string;
};

export async function getSessionChatPolicy(sessionId: string): Promise<SessionChatPolicy | null> {
  if (!getApiBaseUrl() || !hasAuth()) return null;
  try {
    return await api.get<SessionChatPolicy>(`sessions/${sessionId}/chat-policy`);
  } catch {
    return null;
  }
}

export async function updateSessionChatPolicy(
  sessionId: string,
  payload: { mode?: SessionChatPolicy["mode"]; slowmodeSec?: number }
): Promise<SessionChatPolicy> {
  return api.patch<SessionChatPolicy>(`sessions/${sessionId}/chat-policy`, payload);
}
