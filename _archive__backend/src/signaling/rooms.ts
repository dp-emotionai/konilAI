import type WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";
import type {
  ClientId,
  SessionId,
  Role,
  ClientWithSocket,
  ClientMetadata,
  ServerMessage,
} from "./types";

type Room = {
  id: SessionId;
  participants: Map<ClientId, ClientWithSocket>;
};

const rooms = new Map<SessionId, Room>();

export function createClient(socket: WebSocket, sessionId: SessionId, role: Role): ClientWithSocket {
  const id = uuidv4();
  return { id, sessionId, role, socket };
}

export function getOrCreateRoom(sessionId: SessionId): Room {
  let room = rooms.get(sessionId);
  if (!room) {
    room = { id: sessionId, participants: new Map() };
    rooms.set(sessionId, room);
  }
  return room;
}

export function addParticipant(client: ClientWithSocket) {
  const room = getOrCreateRoom(client.sessionId);
  room.participants.set(client.id, client);
}

export function removeParticipant(client: ClientWithSocket) {
  const room = rooms.get(client.sessionId);
  if (!room) return;
  room.participants.delete(client.id);
  if (room.participants.size === 0) {
    rooms.delete(client.sessionId);
  }
}

export function listParticipants(sessionId: SessionId): ClientMetadata[] {
  const room = rooms.get(sessionId);
  if (!room) return [];
  return Array.from(room.participants.values()).map(({ socket: _s, ...meta }) => meta);
}

export function findClient(targetId: ClientId): ClientWithSocket | undefined {
  for (const room of rooms.values()) {
    const client = room.participants.get(targetId);
    if (client) return client;
  }
  return undefined;
}

export function broadcastToRoom(
  sessionId: SessionId,
  message: ServerMessage,
  options: { excludeClientId?: ClientId } = {}
) {
  const room = rooms.get(sessionId);
  if (!room) return;

  const payload = JSON.stringify(message);
  for (const [id, client] of room.participants) {
    if (options.excludeClientId && id === options.excludeClientId) continue;
    if (client.socket.readyState === client.socket.OPEN) {
      client.socket.send(payload);
    }
  }
}

