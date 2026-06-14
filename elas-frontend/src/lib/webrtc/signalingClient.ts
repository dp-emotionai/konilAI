import { io, type Socket } from "socket.io-client";
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

function normalizeSocketIoUrl(rawUrl: string) {
  const withHttpProtocol = rawUrl
    .replace(/^wss:\/\//i, "https://")
    .replace(/^ws:\/\//i, "http://");

  try {
    const url = new URL(withHttpProtocol);
    return url.origin;
  } catch {
    return withHttpProtocol
      .replace(/\/api\/ws\/?$/i, "")
      .replace(/\/ws\/?$/i, "")
      .replace(/\/$/, "");
  }
}

export class SignalingClient {
  private urls: string[];
  private urlIndex = 0;
  private socket: Socket | null = null;
  private isOpen = false;
  private openedInCurrentConnection = false;
  private failedCandidatesInCycle = 0;
  private queue: ClientMessage[] = [];
  private handlers: PartialHandlers = {};
  private resolveOpen: (() => void) | undefined;
  private rejectOpen: ((reason?: unknown) => void) | undefined;
  private openTimer: number | null = null;
  private closedManually = false;

  constructor(url: string | string[]) {
    const urls = Array.isArray(url) ? url : [url];
    this.urls = Array.from(
      new Set(
        urls
          .map((u) => normalizeSocketIoUrl(String(u || "").trim()))
          .filter(Boolean)
      )
    );
  }

  private get currentUrl() {
    return this.urls[this.urlIndex] ?? this.urls[0] ?? "";
  }

  private rotateUrlCandidate() {
    if (this.urls.length <= 1) return;
    this.urlIndex = (this.urlIndex + 1) % this.urls.length;
  }

  connect() {
    if (this.closedManually) return;

    if (this.socket?.connected || this.socket?.active) {
      return;
    }

    this.closedManually = false;
    this.openedInCurrentConnection = false;

    const url = this.currentUrl;
    if (!url) {
      this.rejectOpen?.(new Error("Signaling Socket.IO URL is not configured"));
      this.rejectOpen = undefined;
      this.resolveOpen = undefined;
      return;
    }

    const token = getToken();
    this.socket = io(url, {
      transports: ["polling", "websocket"],
      reconnection: true,
      auth: token ? { token } : undefined,
    });

    this.socket.on("connect", () => {
      this.isOpen = true;
      this.openedInCurrentConnection = true;
      this.failedCandidatesInCycle = 0;

      if (this.openTimer) {
        window.clearTimeout(this.openTimer);
        this.openTimer = null;
      }

      this.flushQueue();
      this.handlers.open?.();
      this.resolveOpen?.();
      this.resolveOpen = undefined;
      this.rejectOpen = undefined;
    });

    this.socket.onAny((eventName, payload) => {
      this.handleServerMessage(this.toServerMessage(eventName, payload));
    });

    this.socket.on("connect_error", (error) => {
      this.handlers.error?.("Ошибка соединения с signaling server.");

      if (
        !this.openedInCurrentConnection &&
        this.urls.length > 1 &&
        this.failedCandidatesInCycle < this.urls.length - 1
      ) {
        this.failedCandidatesInCycle += 1;
        this.rotateUrlCandidate();
        this.socket?.removeAllListeners();
        this.socket?.offAny();
        this.socket?.disconnect();
        this.socket = null;
        this.connect();
        return;
      }

      this.rejectOpen?.(error);
      this.rejectOpen = undefined;
      this.resolveOpen = undefined;
    });

    this.socket.on("disconnect", () => {
      this.isOpen = false;

      if (this.openTimer) {
        window.clearTimeout(this.openTimer);
        this.openTimer = null;
      }

      this.rejectOpen?.(new Error("Signaling socket closed"));
      this.rejectOpen = undefined;
      this.resolveOpen = undefined;

      if (!this.closedManually) {
        this.handlers.close?.();
      } else {
        this.socket = null;
      }
    });
  }

  waitForOpen(timeoutMs = 10000): Promise<void> {
    if (this.isOpen && this.socket?.connected) {
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
          reject(new Error("Signaling Socket.IO timeout"));
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

    if (this.isOpen && this.socket?.connected) {
      this.emitMessage({ type: "leave" satisfies ClientMessage["type"] });
    }

    this.socket?.removeAllListeners();
    this.socket?.offAny();
    this.socket?.disconnect();
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

    if (!this.socket || !this.isOpen || !this.socket.connected) {
      this.queue.push(msg);
      this.connect();
      return;
    }

    this.emitMessage(msg);
  }

  private flushQueue() {
    if (!this.socket || !this.isOpen || !this.socket.connected) {
      return;
    }

    for (const msg of this.queue) {
      this.emitMessage(msg);
    }

    this.queue = [];
  }

  private emitMessage(msg: ClientMessage) {
    if (!this.socket?.connected) return;

    const { type, ...payload } = msg;
    this.socket.emit(type, payload);
  }

  private toServerMessage(eventName: string, payload: unknown): ServerMessage {
    if (payload && typeof payload === "object") {
      const packet = payload as Record<string, unknown>;
      return {
        ...packet,
        type: typeof packet.type === "string" ? packet.type : eventName,
      } as ServerMessage;
    }

    return { type: eventName } as ServerMessage;
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
