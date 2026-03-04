export type SessionStatus = "upcoming" | "live" | "ended";

const KEY = "elas_session_status_overrides_v1";

/**
 * Overrides structure:
 * {
 *   [sessionId]: "upcoming" | "live" | "ended"
 * }
 */
function readOverrides(): Record<string, SessionStatus> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, SessionStatus>;
  } catch {
    return {};
  }
}

function writeOverrides(next: Record<string, SessionStatus>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function getSessionStatusOverride(sessionId: string): SessionStatus | null {
  const map = readOverrides();
  return map[sessionId] ?? null;
}

export function setSessionStatusOverride(sessionId: string, status: SessionStatus) {
  const map = readOverrides();
  map[sessionId] = status;
  writeOverrides(map);
}

export function clearSessionStatusOverride(sessionId: string) {
  const map = readOverrides();
  delete map[sessionId];
  writeOverrides(map);
}

/**
 * Teacher controls:
 * - If upcoming -> start => live
 * - If live -> end => ended
 * - If ended -> reopen => live (optional)
 */
export function nextTeacherAction(status: SessionStatus) {
  if (status === "upcoming") return { label: "Start", next: "live" as SessionStatus };
  if (status === "live") return { label: "End", next: "ended" as SessionStatus };
  return { label: "Reopen", next: "live" as SessionStatus };
}

// Consent is stored in UI store / localStorage (per your spec).
export function readConsent(): boolean {
  if (typeof window === "undefined") return false;
  const v = localStorage.getItem("consent");
  return v === "true";
}