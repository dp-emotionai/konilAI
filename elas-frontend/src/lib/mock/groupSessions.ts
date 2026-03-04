import { groups } from "@/lib/mock/groups";
import { mockSessions as rawSessions } from "@/lib/mock/sessions";
import { getSessionStatusOverride, type SessionStatus } from "@/lib/mock/sessionLifecycle";

export type SessionType = "lecture" | "exam";

export type GroupSession = {
  id: string;
  title: string;
  type: SessionType;
  status: SessionStatus;
  startsAt?: string;
  groupId: string;
};

// --- Helpers (safe) ---
function pickString(v: unknown, fallback: string) {
  return typeof v === "string" && v.trim() ? v : fallback;
}
function pickStatus(v: unknown): SessionStatus {
  if (v === "upcoming" || v === "live" || v === "ended") return v;

  // common alternates in mocks
  if (v === "scheduled") return "upcoming";
  if (v === "active") return "live";
  if (v === "finished") return "ended";

  return "upcoming";
}
function pickType(v: unknown): SessionType {
  if (v === "lecture" || v === "exam") return v;
  if (v === "test") return "exam";
  if (v === "lesson") return "lecture";
  return "lecture";
}
function pickStartsAt(obj: any): string | undefined {
  return (
    (typeof obj?.startsAt === "string" ? obj.startsAt : undefined) ||
    (typeof obj?.startAt === "string" ? obj.startAt : undefined) ||
    (typeof obj?.scheduledAt === "string" ? obj.scheduledAt : undefined) ||
    (typeof obj?.date === "string" ? obj.date : undefined) ||
    undefined
  );
}

// --- Mapping group assignment ---
const groupIds = groups.map((g) => g.id);
function assignGroupId(index: number) {
  if (groupIds.length === 0) return "G-UNKNOWN";
  return groupIds[index % groupIds.length];
}

export const groupSessions: GroupSession[] = (rawSessions as any[]).map((s, i) => {
  const id = pickString(s?.id, `S-${i + 1}`);
  const title = pickString(s?.title, pickString(s?.name, `Session ${i + 1}`));
  const type = pickType(s?.type);

  const baseStatus = pickStatus(s?.status);
  const override = typeof window !== "undefined" ? getSessionStatusOverride(id) : null;
  const status = override ?? baseStatus;

  const startsAt = pickStartsAt(s);

  return {
    id,
    title,
    type,
    status,
    startsAt,
    groupId: assignGroupId(i),
  };
});

export function getSessionsByGroup(groupId: string) {
  return groupSessions.filter((s) => s.groupId === groupId);
}

export function getSessionsByGroupAndStatus(groupId: string, status: SessionStatus) {
  return groupSessions.filter((s) => s.groupId === groupId && s.status === status);
}