import type { IncomingMessage } from "http";
import jwt from "jsonwebtoken";
import { CONFIG } from "../config";

export type WsAuth = { userId: string; role: string; email?: string };

export function assertWsOrigin(req: IncomingMessage) {
  const origin = req.headers.origin;
  if (!origin) return;
  if (!CONFIG.wsAllowedOrigins.length) {
    throw new Error("WS_ALLOWED_ORIGINS is not configured");
  }
  if (!CONFIG.wsAllowedOrigins.includes(origin)) {
    throw new Error(`WS origin blocked: ${origin}`);
  }
}

/**
 * Preferred: Sec-WebSocket-Protocol contains bearer token
 * Example client:
 *   new WebSocket(url, ["elas", "bearer", token])
 */
export function extractWsToken(req: IncomingMessage): string | null {
  const proto = req.headers["sec-websocket-protocol"];
  if (typeof proto === "string") {
    const parts = proto.split(",").map((s) => s.trim());
    const bearerIdx = parts.findIndex((p) => p.toLowerCase() === "bearer");
    if (bearerIdx >= 0 && parts[bearerIdx + 1]) return parts[bearerIdx + 1];
    const maybeJwt = parts.find((p) => p.startsWith("eyJ"));
    if (maybeJwt) return maybeJwt;
  }
  try {
    const url = new URL(req.url || "/", "http://localhost");
    return url.searchParams.get("token");
  } catch {
    return null;
  }
}

export function verifyWsToken(req: IncomingMessage): WsAuth | null {
  const token = extractWsToken(req);
  if (!token) return null;
  const payload = jwt.verify(token, CONFIG.jwtSecret) as any;
  const userId = String(payload?.userId ?? payload?.sub ?? "");
  const role = String(payload?.role ?? "");
  const email = payload?.email ? String(payload.email) : undefined;
  if (!userId || !role) return null;
  return { userId, role, email };
}