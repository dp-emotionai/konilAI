import { getWsBaseUrl } from "@/lib/env";
import { getToken } from "@/lib/api/client";

type ChatEventHandler = (event: any) => void;
type RoomKind = "group" | "session";

export class ChatClient {
  private socket: WebSocket | null = null;
  private url: string;
  private token: string | null = null;
  private reconnectTimer: number | null = null;
  private connected = false;
  private ready = false;
  private pendingRooms: { kind: RoomKind; id: string }[] = [];
  private onEvent: ChatEventHandler | null = null;
  private reconnectAttempts = 0;
  private manuallyClosed = false;

  constructor(onEvent?: ChatEventHandler) {
    this.url = `${getWsBaseUrl()}/ws-chat`;
    if (onEvent) this.onEvent = onEvent;
  }

  setEventHandler(handler: ChatEventHandler) {
    this.onEvent = handler;
  }

  connect() {
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

    try {
      this.socket = new WebSocket(this.url, ["elas", "bearer", token]);
    } catch {
      return;
    }

    this.connected = false;
    this.ready = false;

    this.socket.onopen = () => {
      this.connected = true;
      this.ready = false;
      this.reconnectAttempts = 0;

      // WS‑чат требует явной аутентификации сообщением { type: \"auth\", token }.
      // Только после этого join в комнаты будет принят.
      if (this.token) {
        this.send({ type: "auth", token: this.token });
      }

      this.ready = true;
      for (const r of this.pendingRooms) {
        this.send({ type: "join", room: r.kind, id: r.id });
      }
      this.pendingRooms = [];
    };

    this.socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "chat-event" && this.onEvent) {
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

      if (this.manuallyClosed) return;
      if (this.reconnectAttempts >= 5) return;
      if (this.reconnectTimer !== null) return;

      this.reconnectAttempts += 1;
      this.reconnectTimer = window.setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 1500);
    };

    this.socket.onerror = () => {
      // handled by close
    };
  }

  disconnect() {
    this.manuallyClosed = true;

    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.socket?.close();
    this.socket = null;
    this.connected = false;
    this.ready = false;
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