import jwt from "jsonwebtoken";
import type WebSocket from "ws";

import { CONFIG } from "../config";
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

export function handleChatMessage(socket: WebSocket, clientRef: { current: ChatClient | null }, raw: string) {
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
    const rn = roomName(msg.room, msg.id);
    addClientToRoom(client, rn);
    sendChat(socket, { type: "joined-room", room: rn });
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

