export type Role = "teacher" | "student";

export type ClientId = string;
export type SessionId = string;
export type UserId = string;

export type Participant = {
  /** WebRTC / signaling client id */
  id: ClientId;
  /** Real backend user id if server sends it */
  userId?: UserId;
  role: Role;
  sessionId: SessionId;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  avatarUrl?: string;
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
      sdp: RTCSessionDescriptionInit;
    }
  | {
      type: "webrtc-ice";
      from: ClientId;
      candidate: RTCIceCandidateInit;
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
      email?: string;
      firstName?: string;
      lastName?: string;
      fullName?: string;
      avatarUrl?: string;
    }
  | { type: "leave" }
  | { type: "ping" }
  | {
      type: "webrtc-offer" | "webrtc-answer";
      to: ClientId;
      sdp: RTCSessionDescriptionInit;
    }
  | {
      type: "webrtc-ice";
      to: ClientId;
      candidate: RTCIceCandidateInit;
    };