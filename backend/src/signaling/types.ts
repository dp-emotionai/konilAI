import type WebSocket from "ws";

export type Role = "teacher" | "student";

export type ClientId = string;
export type SessionId = string;

export type ClientMetadata = {
  id: ClientId;
  role: Role;
  sessionId: SessionId;
};

export type ClientWithSocket = ClientMetadata & {
  socket: WebSocket;
};

// Messages FROM frontend TO backend
export type ClientMessage =
  | {
      type: "join";
      sessionId: SessionId;
      role: Role;
    }
  | {
      type: "leave";
    }
  | {
      type: "webrtc-offer" | "webrtc-answer";
      to: ClientId;
      sdp: any;
    }
  | {
      type: "webrtc-ice";
      to: ClientId;
      candidate: any;
    }
  | {
      type: "ping";
    };

// Messages FROM backend TO frontend
export type ServerMessage =
  | {
      type: "welcome";
      clientId: ClientId;
    }
  | {
      type: "joined";
      self: ClientMetadata;
      participants: ClientMetadata[];
    }
  | {
      type: "user-joined" | "user-left";
      participant: ClientMetadata;
    }
  | {
      type: "webrtc-offer" | "webrtc-answer";
      from: ClientId;
      sdp: any;
    }
  | {
      type: "webrtc-ice";
      from: ClientId;
      candidate: any;
    }
  | {
      type: "pong";
    }
  | {
      type: "error";
      message: string;
    };

