import type WebSocket from "ws";
import { createClient, addParticipant, removeParticipant, listParticipants, findClient, broadcastToRoom } from "./rooms";
import type { ClientMessage, ServerMessage, ClientWithSocket } from "./types";
import { CONFIG } from "../config";
import { prisma } from "../db";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "../http/middleware";

export function send(socket: WebSocket, msg: ServerMessage) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
}

async function authorizeJoin(sessionId: string, user: JwtPayload): Promise<{ ok: boolean; role?: any; reason?: string }> {
  const session = await prisma.session.findUnique({ where: { id: sessionId }, select: { createdById: true, groupId: true, status: true } });
  if (!session) return { ok: false, reason: "session_not_found" };

  // teacher/admin can connect even if not active, for prep/monitoring
  if (user.role === "admin") return { ok: true, role: "teacher" };
  if (session.createdById === user.userId) return { ok: true, role: "teacher" };

  // students must be members of the group
  const m = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId: session.groupId, userId: user.userId } } });
  if (!m || m.status !== "active") return { ok: false, reason: "not_member" };

  // consent-first: require consent before WebRTC signaling
  const hasConsent = await prisma.consentRecord.findUnique({ where: { userId_sessionId: { userId: user.userId, sessionId } } });
  if (!hasConsent) return { ok: false, reason: "consent_required" };

  return { ok: true, role: "student" };
}

function extractTokenFromJoin(msg: any): string | null {
  const t = msg?.token;
  return typeof t === "string" && t.length > 10 ? t : null;
}

export async function handleMessage(
  socket: WebSocket,
  clientRef: { current: ClientWithSocket | null },
  raw: string,
  wsAuthFromUpgrade?: { userId: string; role: string; email?: string } | null
): Promise<void> {
  let msg: ClientMessage;
  try {
    msg = JSON.parse(raw);
  } catch {
    send(socket, { type: "error", message: "Invalid JSON" });
    return;
  }

  if (msg.type === "ping") {
    send(socket, { type: "pong" });
    return;
  }

  if (msg.type === "join") {
    // Security: server-authoritative role + access control
    try {
      let user: JwtPayload | null = null;

      if (wsAuthFromUpgrade) {
        // Upgrade auth is already verified, reuse it
        user = { userId: wsAuthFromUpgrade.userId, role: wsAuthFromUpgrade.role, email: wsAuthFromUpgrade.email || "" } as any;
      } else {
        const token = extractTokenFromJoin(msg as any);
        if (CONFIG.wsRequireAuth) {
          if (!token) {
            send(socket, { type: "error", message: "auth_required" });
            return;
          }
          user = jwt.verify(token, CONFIG.jwtSecret) as JwtPayload;
        }
      }

      // If auth is not required (dev), keep legacy behavior, but still sanitize role.
      if (!user) {
        const safeRole = msg.role === "teacher" ? "teacher" : "student";
        const client = createClient(socket, msg.sessionId, safeRole);
        clientRef.current = client;
        addParticipant(client);
      } else {
        const authz = await authorizeJoin(msg.sessionId, user);
        if (!authz.ok) {
          send(socket, { type: "error", message: authz.reason || "forbidden" });
          return;
        }
        const client = createClient(socket, msg.sessionId, authz.role);
        clientRef.current = client;
        addParticipant(client);
      }

      const participants = listParticipants(msg.sessionId);

      const client = clientRef.current!;
      send(socket, {
        type: "joined",
        self: { id: client.id, role: client.role, sessionId: client.sessionId },
        participants,
      });

      broadcastToRoom(
        client.sessionId,
        {
          type: "user-joined",
          participant: { id: client.id, role: client.role, sessionId: client.sessionId },
        },
        { excludeClientId: client.id }
      );
    } catch (e) {
      console.error("signaling join error", e);
      send(socket, { type: "error", message: "join_failed" });
    }

    return;
  }

  const client = clientRef.current;
  if (!client) {
    send(socket, { type: "error", message: "Client must join a session first" });
    return;
  }

  if (msg.type === "leave") {
    broadcastToRoom(client.sessionId, {
      type: "user-left",
      participant: { id: client.id, role: client.role, sessionId: client.sessionId },
    }, { excludeClientId: client.id });
    removeParticipant(client);
    clientRef.current = null;
    return;
  }

  if (msg.type === "webrtc-offer" || msg.type === "webrtc-answer") {
    const target = findClient(msg.to);
    if (!target) return;
    send(target.socket, {
      type: msg.type,
      from: client.id,
      sdp: msg.sdp,
    });
    return;
  }

  if (msg.type === "webrtc-ice") {
    const target = findClient(msg.to);
    if (!target) return;
    send(target.socket, {
      type: "webrtc-ice",
      from: client.id,
      candidate: msg.candidate,
    });
    return;
  }
}

export function handleDisconnect(clientRef: { current: ClientWithSocket | null }) {
  const client = clientRef.current;
  if (!client) return;
  broadcastToRoom(client.sessionId, {
    type: "user-left",
    participant: { id: client.id, role: client.role, sessionId: client.sessionId },
  }, { excludeClientId: client.id });
  removeParticipant(client);
  clientRef.current = null;
}