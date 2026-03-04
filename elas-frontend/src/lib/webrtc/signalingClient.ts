import type { ClientMessage, ServerMessage, Participant, Role, SessionId, ClientId } from "./types";

type EventHandlers = {
  joined: (self: Participant, participants: Participant[]) => void;
  "user-joined": (participant: Participant) => void;
  "user-left": (participant: Participant) => void;
  "webrtc-offer": (from: ClientId, sdp: any) => void;
  "webrtc-answer": (from: ClientId, sdp: any) => void;
  "webrtc-ice": (from: ClientId, candidate: any) => void;
  error: (message: string) => void;
};

type PartialHandlers = Partial<EventHandlers>;

export class SignalingClient {
  private url: string;
  private socket: WebSocket | null = null;
  private isOpen = false;
  private queue: ClientMessage[] = [];
  private handlers: PartialHandlers = {};
  private resolveOpen: (() => void) | undefined;
  private rejectOpen: (() => void) | undefined;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      this.isOpen = true;
      this.flushQueue();
      this.resolveOpen?.();
      this.resolveOpen = undefined;
    };

    this.socket.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        this.handleServerMessage(msg);
      } catch {
        // ignore
      }
    };

    this.socket.onclose = () => {
      this.isOpen = false;
      this.socket = null;
      this.rejectOpen?.();
      this.rejectOpen = undefined;
    };

    this.socket.onerror = () => {
      // noop for now; could report to UI
    };
  }

  /** Дождаться открытия WebSocket (или таймаут 10 с). */
  waitForOpen(timeoutMs = 10000): Promise<void> {
    if (this.isOpen && this.socket?.readyState === WebSocket.OPEN) return Promise.resolve();
    return new Promise((resolve, reject) => {
      this.resolveOpen = resolve;
      this.rejectOpen = reject;
      setTimeout(() => {
        if (this.resolveOpen === resolve) {
          this.resolveOpen = undefined;
          this.rejectOpen = undefined;
          reject(new Error("Signaling WebSocket timeout"));
        }
      }, timeoutMs);
    });
  }

  on<K extends keyof EventHandlers>(type: K, handler: EventHandlers[K]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.handlers as any)[type] = handler;
  }

  join(sessionId: SessionId, role: Role) {
    this.send({ type: "join", sessionId, role });
  }

  leave() {
    this.send({ type: "leave" });
  }

  sendOffer(to: ClientId, sdp: any) {
    this.send({ type: "webrtc-offer", to, sdp });
  }

  sendAnswer(to: ClientId, sdp: any) {
    this.send({ type: "webrtc-answer", to, sdp });
  }

  sendIceCandidate(to: ClientId, candidate: any) {
    this.send({ type: "webrtc-ice", to, candidate });
  }

  private send(msg: ClientMessage) {
    if (!this.socket || !this.isOpen) {
      this.queue.push(msg);
      this.connect();
      return;
    }
    this.socket.send(JSON.stringify(msg));
  }

  private flushQueue() {
    if (!this.socket || !this.isOpen) return;
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
      case "welcome":
      case "pong":
      default:
        break;
    }
  }
}

