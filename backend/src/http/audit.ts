import type { Express } from "express";
import { prisma } from "../db";
import { authMiddleware, requireRole } from "./middleware";

export function registerAuditRoutes(app: Express) {
  app.get("/audit", authMiddleware, requireRole("admin"), async (_req, res) => {
    try {
      const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      res.json(
        logs.map((l) => ({
          id: l.id,
          actorId: l.actorId,
          action: l.action,
          entityType: l.entityType,
          entityId: l.entityId,
          meta: l.meta,
          createdAt: l.createdAt,
        }))
      );
    } catch (e) {
      console.error("GET /audit", e);
      res.status(500).json({ error: "Failed to list audit logs" });
    }
  });
}
