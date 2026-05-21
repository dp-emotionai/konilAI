import type { Express } from "express";
import { registerAuthRoutes } from "./auth";
import { registerGroupsRoutes } from "./groups";
import { registerSessionsRoutes } from "./sessions";
import { registerAuditRoutes } from "./audit";
import { registerInvitationsRoutes } from "./invitations";
import { registerChatRoutes } from "./chat";
import { registerSearchRoutes } from "./search";

export function registerRoutes(app: Express) {
  app.get("/", (_req, res) => {
    res.status(200).json({
      service: "ELAS backend",
      status: "ok",
    });
  });

  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
    });
  });

  app.get("/.well-known/appspecific/com.chrome.devtools.json", (_req, res) => {
    res.status(204).end();
  });

  registerAuthRoutes(app);
  registerGroupsRoutes(app);
  registerSessionsRoutes(app);
  registerAuditRoutes(app);
  registerInvitationsRoutes(app);
  registerChatRoutes(app);
  registerSearchRoutes(app);
}