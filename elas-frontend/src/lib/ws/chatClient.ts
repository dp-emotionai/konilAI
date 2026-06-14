import { io, type Socket } from "socket.io-client";
import { getSocketBaseUrl } from "@/lib/env";
import { getToken } from "@/lib/api/client";

type ChatEventHandler = (event: unknown) => void;
type Subscription =
    | { scope: "session"; sessionId: string }
    | { scope: "group"; groupId: string }
    | { scope: "user" };

type ChatServerPacket =
    | { type?: string; [key: string]: unknown }
    | null;

const REALTIME_EVENT_TYPES = new Set([
  "message.new",
  "notification.new",
  "calendar.event.created",
  "calendar.event.updated",
  "calendar.event.deleted",
  "material.assigned",
  "material.unassigned",
  "material.created",
  "material.updated",
  "material.deleted",
]);

const READY_EVENT_TYPES = new Set(["auth-ok", "auth_ok", "ready", "connect"]);
const SUBSCRIBED_EVENT_TYPES = new Set(["subscribed", "subscribe-ok"]);

export class ChatClient {
  private socket: Socket | null = null;
  private token: string | null = null;
  private onEvent: ChatEventHandler | null = null;
  private manuallyClosed = false;
  private authenticated = false;
  private pendingSubscriptions: Subscription[] = [];
  private subscribedKeys = new Set<string>();

  constructor(onEvent?: ChatEventHandler) {
    if (onEvent) this.onEvent = onEvent;
  }

  setEventHandler(handler: ChatEventHandler) {
    this.onEvent = handler;
  }

  private makeSubscriptionKey(subscription: Subscription) {
    if (subscription.scope === "session") return `session:${subscription.sessionId}`;
    if (subscription.scope === "group") return `group:${subscription.groupId}`;
    return "user";
  }

  private send(packet: Record<string, unknown>) {
    if (!this.socket || !this.socket.connected) return;

    const type = typeof packet.type === "string" ? packet.type : "";
    if (!type) return;

    const payload = { ...packet };
    delete payload.type;
    this.socket.emit(type, payload);
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
      } else if (subscription.scope === "group") {
        this.send({
          type: "subscribe",
          scope: "group",
          groupId: subscription.groupId,
        });
      } else {
        this.send({
          type: "subscribe",
          scope: "user",
        });
      }

      this.subscribedKeys.add(key);
    }
  }

  private toServerPacket(eventName: string, payload: unknown): ChatServerPacket {
    if (payload && typeof payload === "object") {
      const packet = payload as Record<string, unknown>;
      return {
        ...packet,
        type: typeof packet.type === "string" ? packet.type : eventName,
      };
    }

    return { type: eventName, payload };
  }

  private handleServerPacket(packet: ChatServerPacket) {
    if (!packet || typeof packet !== "object") return;

    const type = typeof packet.type === "string" ? packet.type : "";

    if (READY_EVENT_TYPES.has(type)) {
      this.authenticated = true;
      this.flushSubscriptions();
      return;
    }

    if (REALTIME_EVENT_TYPES.has(type)) {
      this.onEvent?.(packet);
      return;
    }

    if (SUBSCRIBED_EVENT_TYPES.has(type)) {
      return;
    }

    if (type === "error") {
      const message =
          typeof packet.message === "string" ? packet.message.toLowerCase() : "";

      if (message.includes("auth")) {
        this.authenticated = false;
      }
    }
  }

  connect() {
    if (this.manuallyClosed) return;

    if (this.socket?.connected || this.socket?.active) {
      return;
    }

    const token = getToken();
    if (!token) return;
    this.token = token;
    this.manuallyClosed = false;
    this.authenticated = false;

    const base = getSocketBaseUrl();
    if (!base) return;

    this.socket = io(base, {
      reconnection: true,
      reconnectionAttempts: 8,
      timeout: 20_000,
      auth: { token },
    });

    this.socket.on("connect", () => {
      this.authenticated = true;
      this.subscribedKeys.clear();

      if (this.token) {
        this.send({ type: "auth", token: this.token });
      }
      this.flushSubscriptions();
    });

    this.socket.onAny((eventName, payload) => {
      this.handleServerPacket(this.toServerPacket(eventName, payload));
    });

    this.socket.on("disconnect", () => {
      this.authenticated = false;
      this.subscribedKeys.clear();

      if (this.manuallyClosed) {
        this.socket = null;
      }
    });

    this.socket.on("connect_error", () => {
      this.authenticated = false;
    });
  }

  disconnect() {
    this.manuallyClosed = true;
    this.authenticated = false;
    this.subscribedKeys.clear();

    this.socket?.removeAllListeners();
    this.socket?.offAny();
    this.socket?.disconnect();
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

  joinUser() {
    const subscription: Subscription = { scope: "user" };
    const key = this.makeSubscriptionKey(subscription);
    if (!this.pendingSubscriptions.some((item) => this.makeSubscriptionKey(item) === key)) {
      this.pendingSubscriptions.push(subscription);
    }

    if (!this.socket) this.connect();
    this.flushSubscriptions();
  }
}
