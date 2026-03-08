import type { Express } from "express";
import { prisma } from "../db";
import { logAudit } from "../audit";
import { authMiddleware, requireRole, type JwtPayload } from "./middleware";

function getUser(req: Express.Request): JwtPayload {
  return (req as Express.Request & { user: JwtPayload }).user;
}

// In-memory live metrics: sessionId -> userId -> { emotion, confidence, risk, state, dominant_emotion, updatedAt }
const liveMetricsStore = new Map<
  string,
  Map<string, { emotion: string; confidence: number; risk: number; state: string; dominant_emotion: string; updatedAt: Date }>
>();

function getOrCreateSessionMetrics(sessionId: string): Map<string, { emotion: string; confidence: number; risk: number; state: string; dominant_emotion: string; updatedAt: Date }> {
  let m = liveMetricsStore.get(sessionId);
  if (!m) {
    m = new Map();
    liveMetricsStore.set(sessionId, m);
  }
  return m;
}

/** Build analytics summary from live metrics and session times. */
function buildSummaryFromLiveMetrics(
  sessionId: string,
  startedAt: Date | null,
  endedAt: Date | null
): Record<string, unknown> {
  const start = startedAt ?? new Date(0);
  const end = endedAt ?? new Date();
  const durationSeconds = Math.max(0, (end.getTime() - start.getTime()) / 1000);
  const metrics = liveMetricsStore.get(sessionId);
  let avgRisk = 0;
  let avgConfidence = 0;
  let dominantEmotion = "neutral";
  if (metrics && metrics.size > 0) {
    const entries = Array.from(metrics.values());
    avgRisk = entries.reduce((s, m) => s + m.risk, 0) / entries.length;
    avgConfidence = entries.reduce((s, m) => s + m.confidence, 0) / entries.length;
    const emotionCounts = new Map<string, number>();
    for (const m of entries) {
      const e = (m.dominant_emotion || "Neutral").toLowerCase();
      emotionCounts.set(e, (emotionCounts.get(e) ?? 0) + 1);
    }
    const sorted = [...emotionCounts.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) dominantEmotion = sorted[0][0];
  }
  return {
    sessionId,
    startedAt: start.toISOString(),
    endedAt: end.toISOString(),
    durationSeconds: Math.round(durationSeconds * 10) / 10,
    metrics: {
      avgEngagement: 1 - avgRisk,
      avgStress: avgRisk * 0.6,
      avgFatigue: (1 - avgConfidence) * 0.4,
      stability: avgConfidence,
    },
    dominantEmotion,
    group: {
      engagement: 1 - avgRisk,
      stress: avgRisk * 0.6,
      fatigue: (1 - avgConfidence) * 0.4,
      tzState: "stable",
      groupState: avgRisk > 0.5 ? "low_engagement" : "high_engagement",
      emotionDistribution: { [dominantEmotion]: 1 },
    },
    attentionDrops: [],
  };
}

function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "ELAS-";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

async function ensureUniqueCode(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = randomCode();
    const exists = await prisma.session.findUnique({ where: { code } });
    if (!exists) return code;
  }
  return "ELAS-" + Date.now().toString(36).toUpperCase().slice(-4);
}

export function registerSessionsRoutes(app: Express) {
  app.use("/sessions", authMiddleware);

  // GET /sessions — list sessions (teacher: own; student: by group enrollment — for now teacher + admin see all they created)
  app.get("/sessions", async (req, res) => {
    const user = getUser(req);
    try {
      const role = user.role;
      if (role === "admin") {
        const sessions = await prisma.session.findMany({
          include: { group: true, teacher: { select: { email: true, name: true } } },
          orderBy: { createdAt: "desc" },
        });
        return res.json(
          sessions.map((s) => ({
            id: s.id,
            title: s.title,
            type: s.type,
            status: s.status,
            code: s.code,
            groupId: s.groupId,
            groupName: s.group.name,
            teacher: s.teacher.email,
            teacherName: s.teacher.name,
            startedAt: s.startedAt,
            endedAt: s.endedAt,
            createdAt: s.createdAt,
          }))
        );
      }
      if (role === "teacher") {
        const sessions = await prisma.session.findMany({
          where: { createdById: user.userId },
          include: { group: true },
          orderBy: { createdAt: "desc" },
        });
        return res.json(
          sessions.map((s) => ({
            id: s.id,
            title: s.title,
            type: s.type,
            status: s.status,
            code: s.code,
            groupId: s.groupId,
            groupName: s.group.name,
            teacher: user.email,
            startedAt: s.startedAt,
            endedAt: s.endedAt,
            createdAt: s.createdAt,
          }))
        );
      }
      // Student: только сессии групп, где он член (group_members)
      const memberGroups = await prisma.groupMember.findMany({
        where: { userId: user.userId },
        select: { groupId: true },
      });
      const groupIds = memberGroups.map((m) => m.groupId);
      const sessions = await prisma.session.findMany({
        where: { groupId: { in: groupIds }, status: { in: ["draft", "active"] } },
        include: { group: true, teacher: { select: { email: true } } },
        orderBy: { createdAt: "desc" },
      });
      res.json(
        sessions.map((s) => ({
          id: s.id,
          title: s.title,
          type: s.type,
          status: s.status === "active" ? "live" : "upcoming",
          code: s.code,
          groupName: s.group.name,
          teacher: s.teacher.email,
          date: s.startedAt || s.createdAt,
        }))
      );
    } catch (e) {
      console.error("GET /sessions", e);
      res.status(500).json({ error: "Failed to list sessions" });
    }
  });

  // GET /sessions/:id/join-info — для студента: можно ли войти (LIVE + consent), без полной детали сессии
  app.get("/sessions/:id/join-info", async (req, res) => {
    const user = getUser(req);
    try {
      const id = req.params.id;
      const session = await prisma.session.findUnique({
        where: { id },
        include: { group: true },
      });
      if (!session) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      const isTeacherOrAdmin = user.role === "teacher" || user.role === "admin";
      const isOwner = session.createdById === user.userId;
      const consentRequired = true;
      const isLive = session.status === "active";

      if (user.role === "student") {
        const isMember = await prisma.groupMember.findUnique({
          where: { groupId_userId: { groupId: session.groupId, userId: user.userId } },
        });
        if (!isMember) {
          res.status(404).json({ error: "Session not found" });
          return;
        }
      }

      if (isTeacherOrAdmin || isOwner) {
        return res.json({
          title: session.title,
          type: session.type,
          status: session.status,
          consentRequired,
          allowedToJoin: true,
          groupName: session.group.name,
        });
      }

      const hasConsent = await prisma.consentRecord.findUnique({
        where: { userId_sessionId: { userId: user.userId, sessionId: id } },
      });

      const allowedToJoin = isLive && !!hasConsent;
      let reason: string | undefined;
      if (!isLive) reason = session.status === "finished" ? "session_ended" : "session_not_started";
      else if (!hasConsent) reason = "consent_required";

      res.json({
        title: session.title,
        type: session.type,
        status: session.status,
        consentRequired,
        allowedToJoin,
        reason,
        groupName: session.group.name,
      });
    } catch (e) {
      console.error("GET /sessions/:id/join-info", e);
      res.status(500).json({ error: "Failed to get join info" });
    }
  });

  // GET /sessions/:id
  app.get("/sessions/:id", async (req, res) => {
    const user = getUser(req);
    try {
      const id = req.params.id;
      const session = await prisma.session.findUnique({
        where: { id },
        include: { group: true, teacher: { select: { id: true, email: true, name: true } } },
      });
      if (!session) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      const isOwner = session.createdById === user.userId;
      const isAdmin = user.role === "admin";
      if (!isOwner && !isAdmin && user.role === "student") {
        // Student can only view if session is active (to join)
        if (session.status !== "active") {
          res.status(404).json({ error: "Session not found" });
          return;
        }
      } else if (!isOwner && !isAdmin) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      res.json({
        id: session.id,
        title: session.title,
        type: session.type,
        status: session.status,
        code: session.code,
        groupId: session.groupId,
        groupName: session.group.name,
        teacher: session.teacher.email,
        teacherName: session.teacher.name,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        createdAt: session.createdAt,
      });
    } catch (e) {
      console.error("GET /sessions/:id", e);
      res.status(500).json({ error: "Failed to get session" });
    }
  });

  // POST /sessions — create (teacher)
  app.post("/sessions", requireRole("teacher"), async (req, res) => {
    const user = getUser(req);
    try {
      const { title, type, groupId } = req.body as { title?: string; type?: string; groupId?: string };
      if (!title || !String(title).trim()) {
        res.status(400).json({ error: "Title required" });
        return;
      }
      const gId = groupId && String(groupId).trim() ? String(groupId).trim() : null;
      if (!gId) {
        res.status(400).json({ error: "groupId required" });
        return;
      }
      const group = await prisma.group.findFirst({
        where: { id: gId, teacherId: user.userId },
      });
      if (!group) {
        res.status(404).json({ error: "Group not found" });
        return;
      }
      const sessionType = type === "exam" ? "exam" : "lecture";
      const code = await ensureUniqueCode();
      const session = await prisma.session.create({
        data: {
          title: String(title).trim(),
          type: sessionType,
          groupId: gId,
          createdById: user.userId,
          code,
        },
      });
      await logAudit(user.userId, "session_created", "session", session.id, JSON.stringify({ title: session.title, type: sessionType, groupId: gId }));
      res.status(201).json({
        id: session.id,
        title: session.title,
        type: session.type,
        status: session.status,
        code: session.code,
        groupId: session.groupId,
        createdAt: session.createdAt,
      });
    } catch (e) {
      console.error("POST /sessions", e);
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  // PATCH /sessions/:id — update or start/end
  app.patch("/sessions/:id", async (req, res) => {
    const user = getUser(req);
    try {
      const id = req.params.id;
      const session = await prisma.session.findUnique({ where: { id } });
      if (!session) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      const isOwner = session.createdById === user.userId;
      const isAdmin = user.role === "admin";
      if (!isOwner && !isAdmin) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const body = req.body as { title?: string; status?: string; type?: string };
      const updates: {
        title?: string;
        status?: string;
        type?: string;
        startedAt?: Date;
        endedAt?: Date;
        analyticsSummary?: unknown;
      } = {};
      if (body.title !== undefined) updates.title = String(body.title).trim();
      if (body.type === "lecture" || body.type === "exam") updates.type = body.type;
      if (body.status === "active") {
        updates.status = "active";
        updates.startedAt = session.startedAt || new Date();
        await logAudit(user.userId, "session_started", "session", id, null);
      } else if (body.status === "finished") {
        updates.status = "finished";
        const endedAt = new Date();
        updates.endedAt = endedAt;
        updates.analyticsSummary = buildSummaryFromLiveMetrics(
          id,
          session.startedAt,
          endedAt
        );
        await logAudit(user.userId, "session_ended", "session", id, null);
      } else if (body.status === "draft") {
        updates.status = "draft";
      }
      const updated = await prisma.session.update({
        where: { id },
        data: updates,
        include: { group: true },
      });
      res.json({
        id: updated.id,
        title: updated.title,
        type: updated.type,
        status: updated.status,
        code: updated.code,
        groupId: updated.groupId,
        groupName: updated.group.name,
        startedAt: updated.startedAt,
        endedAt: updated.endedAt,
      });
    } catch (e) {
      console.error("PATCH /sessions/:id", e);
      res.status(500).json({ error: "Failed to update session" });
    }
  });

  // POST /sessions/:id/metrics — student sends ML result (emotion, risk, state) for live session
  app.post("/sessions/:id/metrics", requireRole("student"), async (req, res) => {
    const user = getUser(req);
    try {
      const sessionId = req.params.id;
      const session = await prisma.session.findUnique({ where: { id: sessionId } });
      if (!session) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      if (session.status !== "active") {
        res.status(400).json({ error: "Session is not live" });
        return;
      }
      const isMember = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: session.groupId, userId: user.userId } },
      });
      if (!isMember) {
        res.status(403).json({ error: "Not a member of this session's group" });
        return;
      }
      const body = req.body as { emotion?: string; confidence?: number; risk?: number; state?: string; dominant_emotion?: string };
      const metrics = getOrCreateSessionMetrics(sessionId);
      metrics.set(user.userId, {
        emotion: typeof body.emotion === "string" ? body.emotion : "Neutral",
        confidence: typeof body.confidence === "number" ? body.confidence : 0,
        risk: typeof body.risk === "number" ? body.risk : 0,
        state: typeof body.state === "string" ? body.state : "NORMAL",
        dominant_emotion: typeof body.dominant_emotion === "string" ? body.dominant_emotion : "Neutral",
        updatedAt: new Date(),
      });
      res.status(204).end();
    } catch (e) {
      console.error("POST /sessions/:id/metrics", e);
      res.status(500).json({ error: "Failed to store metrics" });
    }
  });

  // GET /sessions/:id/live-metrics — teacher gets current participant metrics for live session
  app.get("/sessions/:id/live-metrics", async (req, res) => {
    const user = getUser(req);
    try {
      const sessionId = req.params.id;
      const session = await prisma.session.findUnique({ where: { id: sessionId }, include: { group: true } });
      if (!session) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      const isOwner = session.createdById === user.userId;
      const isAdmin = user.role === "admin";
      if (!isOwner && !isAdmin) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const metrics = liveMetricsStore.get(sessionId);
      if (!metrics || metrics.size === 0) {
        return res.json({ participants: [], avgRisk: 0, avgConfidence: 0 });
      }
      const userIds = Array.from(metrics.keys());
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, email: true, name: true },
      });
      const userMap = new Map(users.map((u) => [u.id, u]));
      const participants = userIds.map((uid) => {
        const m = metrics.get(uid)!;
        const u = userMap.get(uid);
        return {
          userId: uid,
          name: u?.name ?? u?.email ?? uid,
          email: u?.email,
          ...m,
          updatedAt: m.updatedAt.toISOString(),
        };
      });
      const avgRisk = participants.reduce((s, p) => s + p.risk, 0) / participants.length;
      const avgConfidence = participants.reduce((s, p) => s + p.confidence, 0) / participants.length;
      res.json({ participants, avgRisk, avgConfidence });
    } catch (e) {
      console.error("GET /sessions/:id/live-metrics", e);
      res.status(500).json({ error: "Failed to get live metrics" });
    }
  });

  // POST /sessions/:id/consent — student records consent for session
  app.post("/sessions/:id/consent", requireRole("student"), async (req, res) => {
    const user = getUser(req);
    try {
      const sessionId = req.params.id;
      const session = await prisma.session.findUnique({ where: { id: sessionId } });
      if (!session) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      await prisma.consentRecord.upsert({
        where: {
          userId_sessionId: { userId: user.userId, sessionId },
        },
        create: { userId: user.userId, sessionId },
        update: {},
      });
      res.status(201).json({ ok: true, sessionId });
    } catch (e) {
      console.error("POST /sessions/:id/consent", e);
      res.status(500).json({ error: "Failed to record consent" });
    }
  });

  // GET /sessions/:id/analytics/summary — ML/analytics summary (from DB or live metrics)
  app.get("/sessions/:id/analytics/summary", async (req, res) => {
    const user = getUser(req);
    try {
      const sessionId = req.params.id;
      const session = await prisma.session.findUnique({ where: { id: sessionId } });
      if (!session) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      const isOwner = session.createdById === user.userId;
      const isAdmin = user.role === "admin";
      if (!isOwner && !isAdmin) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const stored = session.analyticsSummary as Record<string, unknown> | null;
      if (stored && typeof stored === "object" && (stored.sessionId != null || stored.metrics != null)) {
        const startedAt = session.startedAt ?? session.createdAt;
        const endedAt = session.endedAt ?? new Date();
        res.json({
          sessionId: (stored.sessionId as string) ?? sessionId,
          startedAt: (stored.startedAt as string) ?? (startedAt instanceof Date ? startedAt.toISOString() : new Date(startedAt).toISOString()),
          endedAt: (stored.endedAt as string) ?? (endedAt instanceof Date ? endedAt.toISOString() : new Date(endedAt).toISOString()),
          durationSeconds: (stored.durationSeconds as number) ?? 0,
          metrics: (stored.metrics as Record<string, number>) ?? {},
          dominantEmotion: (stored.dominantEmotion as string) ?? "neutral",
          group: (stored.group as Record<string, unknown>) ?? {},
          attentionDrops: Array.isArray(stored.attentionDrops) ? stored.attentionDrops : [],
        });
        return;
      }
      const summary = buildSummaryFromLiveMetrics(
        sessionId,
        session.startedAt,
        session.endedAt ?? new Date()
      );
      res.json(summary);
    } catch (e) {
      console.error("GET /sessions/:id/analytics/summary", e);
      res.status(500).json({ error: "Failed to get analytics summary" });
    }
  });

  // POST /sessions/:id/analytics/ingest — save full summary (e.g. from Python ML service)
  app.post("/sessions/:id/analytics/ingest", requireRole("teacher", "admin"), async (req, res) => {
    const user = getUser(req);
    try {
      const sessionId = req.params.id;
      const session = await prisma.session.findUnique({ where: { id: sessionId } });
      if (!session) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      if (user.role !== "admin" && session.createdById !== user.userId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const body = req.body as Record<string, unknown>;
      const summary = {
        sessionId: body.sessionId ?? sessionId,
        startedAt: body.startedAt ?? (session.startedAt?.toISOString() ?? session.createdAt.toISOString()),
        endedAt: body.endedAt ?? (session.endedAt?.toISOString() ?? new Date().toISOString()),
        durationSeconds: typeof body.durationSeconds === "number" ? body.durationSeconds : 0,
        metrics: (body.metrics as Record<string, number>) ?? {},
        dominantEmotion: (body.dominantEmotion as string) ?? "neutral",
        group: (body.group as Record<string, unknown>) ?? {},
        attentionDrops: Array.isArray(body.attentionDrops) ? body.attentionDrops : [],
      };
      await prisma.session.update({
        where: { id: sessionId },
        data: { analyticsSummary: summary },
      });
      res.status(200).json({ ok: true, sessionId });
    } catch (e) {
      console.error("POST /sessions/:id/analytics/ingest", e);
      res.status(500).json({ error: "Failed to ingest analytics summary" });
    }
  });
}
