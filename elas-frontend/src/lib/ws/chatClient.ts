import { getWsBaseUrl } from "@/lib/env";
import { getToken } from "@/lib/api/client";

type ChatEventHandler = (event: unknown) => void;
type Subscription =
  | { scope: "session"; sessionId: string }
  | { scope: "group"; groupId: string };

type ChatServerPacket =
  | { type?: string; [key: string]: unknown }
  | null;

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function buildCandidateUrls() {
  const base = getWsBaseUrl().replace(/\/$/, "");
  return unique([`${base}/ws-chat`, `${base}/api/ws-chat`]);
}

export class ChatClient {
  private socket: WebSocket | null = null;
  private token: string | null = null;
  private reconnectTimer: number | null = null;
  private onEvent: ChatEventHandler | null = null;
  private reconnectAttempts = 0;
  private manuallyClosed = false;
  private authenticated = false;
  private pendingSubscriptions: Subscription[] = [];
  private subscribedKeys = new Set<string>();
  private urlCandidates = buildCandidateUrls();
  private urlIndex = 0;

  constructor(onEvent?: ChatEventHandler) {
    if (onEvent) this.onEvent = onEvent;
  }

  setEventHandler(handler: ChatEventHandler) {
    this.onEvent = handler;
  }

  private get currentUrl() {
    return this.urlCandidates[this.urlIndex] ?? this.urlCandidates[0] ?? "";
  }

  private makeSubscriptionKey(subscription: Subscription) {
    return subscription.scope === "session"
      ? `session:${subscription.sessionId}`
      : `group:${subscription.groupId}`;
  }

  private send(packet: Record<string, unknown>) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(packet));
  }

  private flushSubscriptions() {
    if (!this.authenticated) return;

    for (const subscription of this.pendingSubscriptions) {
      const key = this.makeSubscriptionKey(subscription);
      if (this.subscribedKeys.has(key)) continue;

      if (subscription.scope === "session") {
        this.send({
          type: "subscribe",
          scope: "session",
          sessionId: subscription.sessionId,
        });
      } else {
        this.send({
          type: "subscribe",
          scope: "group",
          groupId: subscription.groupId,
        });
      }

      this.subscribedKeys.add(key);
    }
  }

  connect() {
    if (this.manuallyClosed) return;

    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const token = getToken();
    if (!token) return;
    this.token = token;
    this.manuallyClosed = false;
    this.authenticated = false;

    try {
      this.socket = new WebSocket(this.currentUrl);
    } catch {
      this.rotateUrlCandidate();
      return;
    }

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.authenticated = false;
      this.subscribedKeys.clear();

      if (this.token) {
        this.send({ type: "auth", token: this.token });
      }
    };

    this.socket.onmessage = (event) => {
      try {
        const packet = JSON.parse(event.data) as ChatServerPacket;
        if (!packet || typeof packet !== "object") return;

        const type = typeof packet.type === "string" ? packet.type : "";

        if (type === "auth-ok" || type === "auth_ok" || type === "ready") {
          this.authenticated = true;
          this.flushSubscriptions();
          return;
        }

        if (type === "message.new") {
          this.onEvent?.(packet);
          return;
        }

        if (type === "subscribed" || type === "subscribe-ok") {
          return;
        }

        if (type === "error") {
          const message =
            typeof packet.message === "string" ? packet.message.toLowerCase() : "";

          if (message.includes("auth")) {
            this.authenticated = false;
          }
        }
      } catch {
        // ignore malformed packets
      }
    };

    this.socket.onclose = () => {
      this.socket = null;
      this.authenticated = false;
      this.subscribedKeys.clear();

      if (this.manuallyClosed) return;
      if (this.reconnectAttempts >= 6) return;
      if (this.reconnectTimer !== null) return;

      this.reconnectAttempts += 1;
      this.rotateUrlCandidate();
      this.reconnectTimer = window.setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 1500);
    };

    this.socket.onerror = () => {
      // onclose handles reconnect
    };
  }

  private rotateUrlCandidate() {
    if (this.urlCandidates.length <= 1) return;
    this.urlIndex = (this.urlIndex + 1) % this.urlCandidates.length;
  }

  disconnect() {
    this.manuallyClosed = true;
    this.authenticated = false;
    this.subscribedKeys.clear();

    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.socket?.close();
    this.socket = null;
  }

  joinGroup(groupId: string) {
    if (!groupId) return;

    const subscription: Subscription = { scope: "group", groupId };
    const key = this.makeSubscriptionKey(subscription);
    if (!this.pendingSubscriptions.some((item) => this.makeSubscriptionKey(item) === key)) {
      this.pendingSubscriptions.push(subscription);
    }

    if (!this.socket) this.connect();
    this.flushSubscriptions();
  }

  joinSession(sessionId: string) {
    if (!sessionId) return;

    const subscription: Subscription = { scope: "session", sessionId };
    const key = this.makeSubscriptionKey(subscription);
    if (!this.pendingSubscriptions.some((item) => this.makeSubscriptionKey(item) === key)) {
      this.pendingSubscriptions.push(subscription);
    }

    if (!this.socket) this.connect();
    this.flushSubscriptions();
  }
}
