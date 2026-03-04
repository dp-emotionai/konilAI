import type { Express } from "express";
import { registerAuthRoutes } from "./auth";
import { registerGroupsRoutes } from "./groups";
import { registerSessionsRoutes } from "./sessions";
import { registerAuditRoutes } from "./audit";
import { registerInvitationsRoutes } from "./invitations";
import { registerChatRoutes } from "./chat";

export function registerRoutes(app: Express) {
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Chrome DevTools запрашивает этот URL — отдаём 204, чтобы не светить 404 в консоли
  app.get("/.well-known/appspecific/com.chrome.devtools.json", (_req, res) => {
    res.status(204).end();
  });

  registerAuthRoutes(app);
  registerGroupsRoutes(app);
  registerSessionsRoutes(app);
  registerAuditRoutes(app);
  registerInvitationsRoutes(app);
  registerChatRoutes(app);
}
