import jwt from "jsonwebtoken";
import type WebSocket from "ws";

import { CONFIG } from "../config";
import { prisma } from "../db";
import type { JwtPayload } from "../http/middleware";
import { createClient, addClientToRoom, removeClientFromAllRooms, broadcastToRoom } from "./rooms";
import type { ChatClient, ChatClientMessage, ChatRoomName, ChatServerMessage } from "./types";

export function sendChat(socket: WebSocket, msg: ChatServerMessage) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
}

function roomName(kind: "group" | "session", id: string): ChatRoomName {
  return kind === "group" ? `group_${id}` : `session_${id}`;
}

async function canJoinGroup(userId: string, role: string, groupId: string): Promise<boolean> {
  if (role === "admin") return true;
  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { teacherId: true } });
  if (!group) return false;
  if (group.teacherId === userId) return true;
  const m = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
  return Boolean(m && m.status === "active");
}

async function canJoinSession(userId: string, role: string, sessionId: string): Promise<{ ok: boolean; reason?: string }> {
  if (role === "admin") return { ok: true };
  const session = await prisma.session.findUnique({ where: { id: sessionId }, select: { createdById: true, groupId: true } });
  if (!session) return { ok: false, reason: "session_not_found" };
  if (session.createdById === userId) return { ok: true };

  const m = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId: session.groupId, userId } } });
  if (!m || m.status !== "active") return { ok: false, reason: "not_member" };

  // Consent-first: students must consent before joining session rooms.
  if (role === "student") {
    const hasConsent = await prisma.consentRecord.findUnique({ where: { userId_sessionId: { userId, sessionId } } });
    if (!hasConsent) return { ok: false, reason: "consent_required" };
  }

  return { ok: true };
}

export async function handleChatMessage(
  socket: WebSocket,
  clientRef: { current: ChatClient | null },
  raw: string
): Promise<void> {
  let msg: ChatClientMessage;
  try {
    msg = JSON.parse(raw);
  } catch {
    sendChat(socket, { type: "error", message: "Invalid JSON" });
    return;
  }

  if (msg.type === "ping") {
    sendChat(socket, { type: "pong" });
    return;
  }

  if (msg.type === "auth") {
    try {
      const decoded = jwt.verify(msg.token, CONFIG.jwtSecret) as JwtPayload;
      const client = createClient(socket, decoded.userId, decoded.role);
      clientRef.current = client;
      sendChat(socket, { type: "ready", userId: decoded.userId, role: decoded.role as any });
    } catch {
      sendChat(socket, { type: "error", message: "Invalid or expired token" });
      try {
        socket.close();
      } catch {
        // ignore
      }
    }
    return;
  }

  const client = clientRef.current;
  if (!client) {
    sendChat(socket, { type: "error", message: "Client must auth first" });
    return;
  }

  if (msg.type === "join") {
    try {
      if (msg.room === "group") {
        const ok = await canJoinGroup(client.userId, client.role, msg.id);
        if (!ok) {
          sendChat(socket, { type: "error", message: "Forbidden: cannot join group room" });
          return;
        }
      } else {
        const r = await canJoinSession(client.userId, client.role, msg.id);
        if (!r.ok) {
          const reason = r.reason || "forbidden";
          sendChat(socket, { type: "error", message: reason });
          return;
        }
      }

      const rn = roomName(msg.room, msg.id);
      addClientToRoom(client, rn);
      sendChat(socket, { type: "joined-room", room: rn });
    } catch (e) {
      console.error("chat-ws join error", e);
      sendChat(socket, { type: "error", message: "Join failed" });
    }
    return;
  }

  if (msg.type === "leave") {
    const rn = roomName(msg.room, msg.id);
    removeClientFromAllRooms(client);
    sendChat(socket, { type: "left-room", room: rn });
    return;
  }
}

export function handleChatDisconnect(clientRef: { current: ChatClient | null }) {
  const client = clientRef.current;
  if (!client) return;
  removeClientFromAllRooms(client);
  clientRef.current = null;
}

// Helper for HTTP routes to push chat events into WS rooms.
export function broadcastChatEvent(room: ChatRoomName, event: unknown) {
  broadcastToRoom(room, { type: "chat-event", room, event });
}