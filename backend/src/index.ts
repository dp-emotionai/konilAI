import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";

import { CONFIG } from "./config";
import { registerRoutes } from "./http/routes";
import { handleMessage, handleDisconnect, send } from "./signaling/handlers";
import type { ClientWithSocket } from "./signaling/types";
import { handleChatMessage, handleChatDisconnect } from "./chat-ws/handlers";
import type { ChatClient } from "./chat-ws/types";

const app = express();

app.use(
  cors({
    origin: CONFIG.corsOrigin,
    credentials: true,
  })
);

app.use(express.json());
registerRoutes(app);

const server = http.createServer(app);

// ✅ Create WS servers in "noServer" mode
const wssSignaling = new WebSocketServer({ noServer: true });
const wssChat = new WebSocketServer({ noServer: true });

// ✅ Manual upgrade router (fixes /ws-chat not connecting)
server.on("upgrade", (req, socket, head) => {
  try {
    const url = req.url ?? "";
    const pathname = new URL(url, "http://localhost").pathname;

    const ua = req.headers["user-agent"] ?? "";
    console.log(`[WS UPGRADE] url=${pathname} ua=${String(ua).slice(0, 60)}`);

    if (pathname === CONFIG.wsPath) {
      wssSignaling.handleUpgrade(req, socket, head, (ws) => {
        wssSignaling.emit("connection", ws, req);
      });
      return;
    }

    if (pathname === CONFIG.chatWsPath) {
      wssChat.handleUpgrade(req, socket, head, (ws) => {
        wssChat.emit("connection", ws, req);
      });
      return;
    }

    socket.destroy();
  } catch {
    socket.destroy();
  }
});

// ===== Signaling WS =====
wssSignaling.on("connection", (socket, req) => {
  console.log(`[WS] signaling connected url=${req.url}`);

  const clientRef: { current: ClientWithSocket | null } = { current: null };

  send(socket, { type: "welcome", clientId: uuidv4() });

  socket.on("message", (data) => {
    const raw = typeof data === "string" ? data : data.toString("utf-8");
    handleMessage(socket, clientRef, raw);
  });

  socket.on("close", () => handleDisconnect(clientRef));
  socket.on("error", () => handleDisconnect(clientRef));
});

// ===== Chat WS =====
wssChat.on("connection", (socket, req) => {
  console.log(`[WS] chat connected url=${req.url}`);

  const clientRef: { current: ChatClient | null } = { current: null };

  socket.on("message", (data) => {
    const raw = typeof data === "string" ? data : data.toString("utf-8");
    handleChatMessage(socket, clientRef, raw);
  });

  socket.on("close", () => handleChatDisconnect(clientRef));
  socket.on("error", () => handleChatDisconnect(clientRef));
});

server.listen(CONFIG.httpPort, () => {
  console.log(`ELAS backend listening on http://localhost:${CONFIG.httpPort}`);
  console.log(
    `WebSocket signaling on ws://localhost:${CONFIG.httpPort}${CONFIG.wsPath}`
  );
  console.log(
    `WebSocket chat on ws://localhost:${CONFIG.httpPort}${CONFIG.chatWsPath}`
  );
});