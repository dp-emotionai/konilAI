import type WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";
import type { ChatClient, ChatClientId, ChatRoomName, ChatServerMessage } from "./types";

const rooms = new Map<ChatRoomName, Set<ChatClient>>();

export function createClient(socket: WebSocket, userId: string, role: string): ChatClient {
  const id: ChatClientId = uuidv4();
  return {
    id,
    socket,
    userId,
    role: role as ChatClient["role"],
    rooms: new Set(),
  };
}

export function addClientToRoom(client: ChatClient, room: ChatRoomName) {
  let set = rooms.get(room);
  if (!set) {
    set = new Set();
    rooms.set(room, set);
  }
  set.add(client);
  client.rooms.add(room);
}

export function removeClientFromRoom(client: ChatClient, room: ChatRoomName) {
  const set = rooms.get(room);
  if (set) {
    set.delete(client);
    if (set.size === 0) rooms.delete(room);
  }
  client.rooms.delete(room);
}

export function removeClientFromAllRooms(client: ChatClient) {
  for (const room of Array.from(client.rooms)) {
    removeClientFromRoom(client, room);
  }
}

export function broadcastToRoom(
  room: ChatRoomName,
  message: ChatServerMessage,
  options: { excludeClientId?: ChatClientId } = {}
) {
  const set = rooms.get(room);
  if (!set) return;
  const payload = JSON.stringify(message);
  for (const client of set) {
    if (options.excludeClientId && client.id === options.excludeClientId) continue;
    if (client.socket.readyState === client.socket.OPEN) {
      client.socket.send(payload);
    }
  }
}

