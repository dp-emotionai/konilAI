import { getApiBaseUrl, getToken } from "@/lib/api/client";

type ChatEventHandler = (event: any) => void;

type RoomKind = "group" | "session";

export class ChatClient {
  private socket: WebSocket | null = null;
  private url: string;
  private reconnectTimer: number | null = null;
  private connected = false;
  private ready = false;
  private pendingRooms: { kind: RoomKind; id: string }[] = [];
  private onEvent: ChatEventHandler | null = null;

  constructor(onEvent?: ChatEventHandler) {
    const base = getApiBaseUrl();
    const wsBase = base.replace(/^http/, "ws");
    this.url = `${wsBase}/ws-chat`;
    if (onEvent) this.onEvent = onEvent;
  }

  setEventHandler(handler: ChatEventHandler) {
    this.onEvent = handler;
  }

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    const token = getToken();
    if (!token) return;

    this.socket = new WebSocket(this.url);
    this.connected = false;
    this.ready = false;

    this.socket.onopen = () => {
      this.connected = true;
      this.send({ type: "auth", token });
    };

    this.socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "ready") {
          this.ready = true;
          // join any rooms queued before ready
          for (const r of this.pendingRooms) {
            this.send({ type: "join", room: r.kind, id: r.id });
          }
          this.pendingRooms = [];
        } else if (msg.type === "chat-event" && this.onEvent) {
          this.onEvent(msg);
        }
      } catch {
        // ignore
      }
    };

    this.socket.onclose = () => {
      this.connected = false;
      this.ready = false;
      this.socket = null;
      if (this.reconnectTimer === null) {
        this.reconnectTimer = window.setTimeout(() => {
          this.reconnectTimer = null;
          this.connect();
        }, 2000);
      }
    };

    this.socket.onerror = () => {
      // noop, handled by close
    };
  }

  private send(msg: any) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(msg));
  }

  joinGroup(groupId: string) {
    if (!groupId) return;
    if (!this.connected) this.connect();
    if (!this.ready) {
      this.pendingRooms.push({ kind: "group", id: groupId });
      return;
    }
    this.send({ type: "join", room: "group", id: groupId });
  }

  joinSession(sessionId: string) {
    if (!sessionId) return;
    if (!this.connected) this.connect();
    if (!this.ready) {
      this.pendingRooms.push({ kind: "session", id: sessionId });
      return;
    }
    this.send({ type: "join", room: "session", id: sessionId });
  }
}

