import type WebSocket from "ws";

export type ChatRole = "student" | "teacher" | "admin";

export type ChatClientId = string;
export type ChatRoomName = string; // e.g. "group_<id>" or "session_<id>"

export type ChatClient = {
  id: ChatClientId;
  socket: WebSocket;
  userId: string;
  role: ChatRole;
  rooms: Set<ChatRoomName>;
};

// Messages FROM frontend TO backend
export type ChatClientMessage =
  | {
      type: "auth";
      token: string;
    }
  | {
      type: "join";
      room: "group" | "session";
      id: string;
    }
  | {
      type: "leave";
      room: "group" | "session";
      id: string;
    }
  | {
      type: "ping";
    };

// Messages FROM backend TO frontend
export type ChatServerMessage =
  | {
      type: "ready";
      userId: string;
      role: ChatRole;
    }
  | {
      type: "joined-room";
      room: ChatRoomName;
    }
  | {
      type: "left-room";
      room: ChatRoomName;
    }
  | {
      type: "chat-event";
      room: ChatRoomName;
      event: unknown;
    }
  | {
      type: "pong";
    }
  | {
      type: "error";
      message: string;
    };

