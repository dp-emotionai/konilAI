import type WebSocket from "ws";
import { createClient, addParticipant, removeParticipant, listParticipants, findClient, broadcastToRoom } from "./rooms";
import type { ClientMessage, ServerMessage, ClientWithSocket } from "./types";

export function send(socket: WebSocket, msg: ServerMessage) {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
}

export function handleMessage(socket: WebSocket, clientRef: { current: ClientWithSocket | null }, raw: string) {
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
    const client = createClient(socket, msg.sessionId, msg.role);
    clientRef.current = client;
    addParticipant(client);

    const participants = listParticipants(client.sessionId);

    send(socket, {
      type: "joined",
      self: { id: client.id, role: client.role, sessionId: client.sessionId },
      participants,
    });

    broadcastToRoom(client.sessionId, {
      type: "user-joined",
      participant: { id: client.id, role: client.role, sessionId: client.sessionId },
    }, { excludeClientId: client.id });

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

