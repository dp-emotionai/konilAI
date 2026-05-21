import { getToken } from "@/lib/api/client";
import type {
  ClientMessage,
  ServerMessage,
  Role,
  SessionId,
  ClientId,
  Participant,
} from "./types";

type EventHandlers = {
  open: () => void;
  joined: (self: Participant, participants: Participant[]) => void;
  "user-joined": (participant: Participant) => void;
  "user-left": (participant: Participant) => void;
  "webrtc-offer": (from: ClientId, sdp: RTCSessionDescriptionInit) => void;
  "webrtc-answer": (from: ClientId, sdp: RTCSessionDescriptionInit) => void;
  "webrtc-ice": (from: ClientId, candidate: RTCIceCandidateInit) => void;
  error: (message: string) => void;
  close: () => void;
};

type PartialHandlers = Partial<EventHandlers>;

export class SignalingClient {
  private url: string;
  private socket: WebSocket | null = null;
  private isOpen = false;
  private queue: ClientMessage[] = [];
  private handlers: PartialHandlers = {};
  private resolveOpen: (() => void) | undefined;
  private rejectOpen: ((reason?: unknown) => void) | undefined;
  private openTimer: number | null = null;
  private closedManually = false;

  constructor(url: string) {
    this.url = url;
  }

  private buildUrlWithToken() {
    const token = getToken();
    if (!token) return this.url;

    const hasQuery = this.url.includes("?");
    const separator = hasQuery ? "&" : "?";
    return `${this.url}${separator}token=${encodeURIComponent(token)}`;
  }

  connect() {
    if (this.closedManually) return;

    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.closedManually = false;

    try {
      this.socket = new WebSocket(this.buildUrlWithToken());
    } catch (error) {
      this.rejectOpen?.(error);
      this.rejectOpen = undefined;
      this.resolveOpen = undefined;
      return;
    }

    this.socket.onopen = () => {
      this.isOpen = true;

      if (this.openTimer) {
        window.clearTimeout(this.openTimer);
        this.openTimer = null;
      }

      this.flushQueue();
      this.handlers.open?.();
      this.resolveOpen?.();
      this.resolveOpen = undefined;
      this.rejectOpen = undefined;
    };

    this.socket.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        this.handleServerMessage(msg);
      } catch {
        // ignore malformed packets
      }
    };

    this.socket.onerror = () => {
      this.handlers.error?.("Ошибка соединения с signaling server.");
    };

    this.socket.onclose = () => {
      this.isOpen = false;
      this.socket = null;

      if (this.openTimer) {
        window.clearTimeout(this.openTimer);
        this.openTimer = null;
      }

      this.rejectOpen?.(new Error("Signaling socket closed"));
      this.rejectOpen = undefined;
      this.resolveOpen = undefined;

      if (!this.closedManually) {
        this.handlers.close?.();
      }
    };
  }

  waitForOpen(timeoutMs = 10000): Promise<void> {
    if (this.isOpen && this.socket?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.resolveOpen = resolve;
      this.rejectOpen = reject;

      if (this.openTimer) {
        window.clearTimeout(this.openTimer);
      }

      this.openTimer = window.setTimeout(() => {
        if (this.resolveOpen === resolve) {
          this.resolveOpen = undefined;
          this.rejectOpen = undefined;
          reject(new Error("Signaling WebSocket timeout"));
        }
      }, timeoutMs);

      this.connect();
    });
  }

  on<K extends keyof EventHandlers>(type: K, handler: EventHandlers[K]) {
    (this.handlers as Record<string, unknown>)[type] = handler;
  }

  join(
    sessionId: SessionId,
    role: Role,
    user?: {
      email?: string;
      name?: string;
      firstName?: string;
      lastName?: string;
      fullName?: string;
      avatarUrl?: string;
    }
  ) {
    this.send({ type: "join", sessionId, role, ...user });
  }

  leave() {
    this.closedManually = true;

    if (this.isOpen && this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "leave" satisfies ClientMessage["type"] }));
    }

    this.socket?.close();
    this.socket = null;
    this.isOpen = false;
    this.queue = [];
  }

  sendOffer(to: ClientId, sdp: RTCSessionDescriptionInit) {
    this.send({ type: "webrtc-offer", to, sdp });
  }

  sendAnswer(to: ClientId, sdp: RTCSessionDescriptionInit) {
    this.send({ type: "webrtc-answer", to, sdp });
  }

  sendIceCandidate(to: ClientId, candidate: RTCIceCandidateInit) {
    this.send({ type: "webrtc-ice", to, candidate });
  }

  private send(msg: ClientMessage) {
    if (this.closedManually) return;

    if (!this.socket || !this.isOpen || this.socket.readyState !== WebSocket.OPEN) {
      this.queue.push(msg);
      this.connect();
      return;
    }

    this.socket.send(JSON.stringify(msg));
  }

  private flushQueue() {
    if (!this.socket || !this.isOpen || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    for (const msg of this.queue) {
      this.socket.send(JSON.stringify(msg));
    }

    this.queue = [];
  }

  private handleServerMessage(msg: ServerMessage) {
    switch (msg.type) {
      case "joined":
        this.handlers.joined?.(msg.self, msg.participants);
        break;
      case "user-joined":
        this.handlers["user-joined"]?.(msg.participant);
        break;
      case "user-left":
        this.handlers["user-left"]?.(msg.participant);
        break;
      case "webrtc-offer":
        this.handlers["webrtc-offer"]?.(msg.from, msg.sdp);
        break;
      case "webrtc-answer":
        this.handlers["webrtc-answer"]?.(msg.from, msg.sdp);
        break;
      case "webrtc-ice":
        this.handlers["webrtc-ice"]?.(msg.from, msg.candidate);
        break;
      case "error":
        this.handlers.error?.(msg.message);
        break;
      default:
        break;
    }
  }
}
