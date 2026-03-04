export type Role = "teacher" | "student";

export type ClientId = string;
export type SessionId = string;

export type Participant = {
  id: ClientId;
  role: Role;
  sessionId: SessionId;
};

// Messages mirrored from backend (subset needed on frontend)

export type ServerMessage =
  | {
      type: "welcome";
      clientId: ClientId;
    }
  | {
      type: "joined";
      self: Participant;
      participants: Participant[];
    }
  | {
      type: "user-joined" | "user-left";
      participant: Participant;
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

export type ClientMessage =
  | {
      type: "join";
      sessionId: SessionId;
      role: Role;
    }
  | { type: "leave" }
  | { type: "ping" }
  | {
      type: "webrtc-offer" | "webrtc-answer";
      to: ClientId;
      sdp: any;
    }
  | {
      type: "webrtc-ice";
      to: ClientId;
      candidate: any;
    };

