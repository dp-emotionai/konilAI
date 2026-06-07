import type { Express, Request } from "express";
import { prisma } from "../db";
import { authMiddleware, requireRole, type JwtPayload } from "./middleware";
import { broadcastChatEvent } from "../chat-ws/handlers";

function getUser(req: Request): JwtPayload {
  return (req as Request & { user: JwtPayload }).user;
}

function groupRoom(groupId: string) {
  return `group_${groupId}`;
}

function sessionRoom(sessionId: string) {
  return `session_${sessionId}`;
}

/** In-memory: sessionId -> userId -> lastSentAt (ms). Used for slowmode. */
const sessionSlowmodeMap = new Map<string, Map<string, number>>();

const CHAT_POLICY_MODES = ["lecture_open", "questions_only", "locked", "exam_help_only"] as const;

export function registerChatRoutes(app: Express) {
  // --- Session chat policy (before /sessions/:id/messages) ---

  // GET /sessions/:id/chat-policy — teacher/admin or group member (read)
  app.get("/sessions/:id/chat-policy", authMiddleware, async (req, res) => {
    const user = getUser(req);
    const sessionId = req.params.id;
    try {
      const session = await prisma.session.findUnique({ where: { id: sessionId }, include: { chatPolicy: true } });
      if (!session) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      const isOwner = session.createdById === user.userId;
      const isAdmin = user.role === "admin";
      const isMember = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: session.groupId, userId: user.userId } },
      });
      if (!isOwner && !isAdmin && !isMember) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      const policy = session.chatPolicy ?? {
        sessionId,
        mode: "lecture_open",
        slowmodeSec: 0,
        updatedAt: session.updatedAt,
      };
      res.json({
        sessionId: policy.sessionId,
        mode: policy.mode,
        slowmodeSec: policy.slowmodeSec,
        updatedAt: policy.updatedAt,
      });
    } catch (e) {
      console.error("GET /sessions/:id/chat-policy", e);
      res.status(500).json({ error: "Failed to get chat policy" });
    }
  });

  // PATCH /sessions/:id/chat-policy — teacher (owner) or admin only
  app.patch("/sessions/:id/chat-policy", authMiddleware, requireRole("teacher", "admin"), async (req, res) => {
    const user = getUser(req);
    const sessionId = req.params.id;
    const body = req.body as { mode?: string; slowmodeSec?: number };
    try {
      const session = await prisma.session.findUnique({ where: { id: sessionId } });
      if (!session) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      if (user.role !== "admin" && session.createdById !== user.userId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const mode = body.mode != null && CHAT_POLICY_MODES.includes(body.mode as any) ? body.mode : undefined;
      const slowmodeSec = typeof body.slowmodeSec === "number" && body.slowmodeSec >= 0 ? body.slowmodeSec : undefined;
      const policy = await prisma.sessionChatPolicy.upsert({
        where: { sessionId },
        create: {
          sessionId,
          mode: (mode as string) ?? "lecture_open",
          slowmodeSec: slowmodeSec ?? 0,
        },
        update: {
          ...(mode !== undefined ? { mode } : {}),
          ...(slowmodeSec !== undefined ? { slowmodeSec } : {}),
        },
      });
      res.json({
        sessionId: policy.sessionId,
        mode: policy.mode,
        slowmodeSec: policy.slowmodeSec,
        updatedAt: policy.updatedAt,
      });
    } catch (e) {
      console.error("PATCH /sessions/:id/chat-policy", e);
      res.status(500).json({ error: "Failed to update chat policy" });
    }
  });

  // --- Group Space messages ---

  // GET /groups/:id/messages?tab=announcements|qa|chat
  app.get("/groups/:id/messages", authMiddleware, async (req, res) => {
    const user = getUser(req);
    const groupId = req.params.id;
    const tab = (req.query.tab as string) || "chat";
    const take = 50;

    try {
      // Access: teacher/admin or member
      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (!group) {
        res.status(404).json({ error: "Group not found" });
        return;
      }
      const isOwner = group.teacherId === user.userId;
      const isAdmin = user.role === "admin";
      const isMember = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: user.userId } },
      });
      if (!isOwner && !isAdmin && !isMember) {
        res.status(404).json({ error: "Group not found" });
        return;
      }

      let typeFilter: string[] | undefined;
      if (tab === "announcements") typeFilter = ["announcement", "system"];
      else if (tab === "qa") typeFilter = ["question", "answer"];

      const messages = await prisma.groupMessage.findMany({
        where: {
          groupId,
          ...(typeFilter ? { type: { in: typeFilter } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take,
      });

      res.json(
        messages
          .map((m) => ({
            id: m.id,
            groupId: m.groupId,
            senderId: m.senderId,
            type: m.type,
            text: m.text,
            replyToId: m.replyToId,
            qaStatus: m.qaStatus,
            pinnedAt: m.pinnedAt,
            createdAt: m.createdAt,
            editedAt: m.editedAt,
            deletedAt: m.deletedAt,
          }))
          .reverse()
      );
    } catch (e) {
      console.error("GET /groups/:id/messages", e);
      res.status(500).json({ error: "Failed to load messages" });
    }
  });

  // POST /groups/:id/messages
  app.post("/groups/:id/messages", authMiddleware, async (req, res) => {
    const user = getUser(req);
    const groupId = req.params.id;
    const { type, text, replyToId } = req.body as {
      type?: string;
      text?: string;
      replyToId?: string | null;
    };

    if (!type || !text || !text.toString().trim()) {
      res.status(400).json({ error: "type and text required" });
      return;
    }

    try {
      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (!group) {
        res.status(404).json({ error: "Group not found" });
        return;
      }
      const isOwner = group.teacherId === user.userId;
      const isAdmin = user.role === "admin";
      const membership = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId, userId: user.userId } },
      });

      const isMember = !!membership;

      if (!isOwner && !isAdmin && !isMember) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      // ChatMute: group scope — muted user cannot post
      const groupMute = await prisma.chatMute.findFirst({
        where: {
          scope: "group",
          scopeId: groupId,
          targetUserId: user.userId,
          mutedUntil: { gt: new Date() },
        },
      });
      if (groupMute) {
        res.status(403).json({ error: "User muted in this group" });
        return;
      }

      // Announcements — только teacher/admin
      if (type === "announcement" && !isOwner && !isAdmin) {
        res.status(403).json({ error: "Only teacher can post announcements" });
        return;
      }

      // Questions — только student members
      if (type === "question" && user.role !== "student") {
        res.status(403).json({ error: "Only students can create questions" });
        return;
      }

      const msg = await prisma.groupMessage.create({
        data: {
          groupId,
          senderId: user.userId,
          type,
          text: String(text).trim(),
          replyToId: replyToId || null,
          qaStatus: type === "question" ? "open" : null,
        },
      });

      const payload = {
        scope: "group",
        kind: "message:new",
        message: {
          id: msg.id,
          groupId: msg.groupId,
          senderId: msg.senderId,
          type: msg.type,
          text: msg.text,
          replyToId: msg.replyToId,
          qaStatus: msg.qaStatus,
          pinnedAt: msg.pinnedAt,
          createdAt: msg.createdAt,
        },
      };
      broadcastChatEvent(groupRoom(groupId), payload);

      res.status(201).json(payload.message);
    } catch (e) {
      console.error("POST /groups/:id/messages", e);
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  // POST /groups/:id/announcements/:msgId/read
  app.post("/groups/:id/announcements/:msgId/read", authMiddleware, async (req, res) => {
    const user = getUser(req);
    const groupId = req.params.id;
    const msgId = req.params.msgId;
    try {
      const msg = await prisma.groupMessage.findUnique({ where: { id: msgId } });
      if (!msg || msg.groupId !== groupId || msg.type !== "announcement") {
        res.status(404).json({ error: "Announcement not found" });
        return;
      }
      await prisma.messageRead.upsert({
        where: { groupMessageId_userId: { groupMessageId: msgId, userId: user.userId } },
        update: { readAt: new Date() },
        create: { groupMessageId: msgId, userId: user.userId },
      });
      broadcastChatEvent(groupRoom(groupId), {
        scope: "group",
        kind: "announcement:read",
        messageId: msgId,
        userId: user.userId,
      });
      res.json({ ok: true });
    } catch (e) {
      console.error("POST /groups/:id/announcements/:msgId/read", e);
      res.status(500).json({ error: "Failed to mark as read" });
    }
  });

  // --- Session chat ---

  // GET /sessions/:id/messages?channel=public|help&helpStudentId=...
  app.get("/sessions/:id/messages", authMiddleware, async (req, res) => {
    const user = getUser(req);
    const sessionId = req.params.id;
    const channel = (req.query.channel as string) || "public";
    const helpStudentId = req.query.helpStudentId as string | undefined;
    const take = 100;

    try {
      const session = await prisma.session.findUnique({ where: { id: sessionId } });
      if (!session) {
        res.status(404).json({ error: "Session not found" });
        return;
      }

      // Access: teacher/admin/creator or group member
      const isOwner = session.createdById === user.userId;
      const isAdmin = user.role === "admin";
      let isMember = false;
      if (user.role === "student") {
        const gm = await prisma.groupMember.findUnique({
          where: { groupId_userId: { groupId: session.groupId, userId: user.userId } },
        });
        isMember = !!gm;
      }
      if (!isOwner && !isAdmin && !isMember) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const where: any = { sessionId, channel };
      if (channel === "help") {
        // В help-канале студент видит только свои сообщения, преподаватель — любые
        if (user.role === "student") {
          where.helpStudentId = user.userId;
        } else if (helpStudentId) {
          where.helpStudentId = helpStudentId;
        }
      }

      const messages = await prisma.sessionMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        include: { sender: { select: { id: true, name: true, email: true } } },
      });

      res.json(
        messages
          .map((m) => ({
            id: m.id,
            sessionId: m.sessionId,
            senderId: m.senderId,
            senderName: m.sender?.name ?? m.sender?.email ?? m.senderId,
            senderEmail: m.sender?.email ?? null,
            type: m.type,
            text: m.text,
            channel: m.channel,
            helpStudentId: m.helpStudentId,
            createdAt: m.createdAt,
            editedAt: m.editedAt,
            deletedAt: m.deletedAt,
          }))
          .reverse()
      );
    } catch (e) {
      console.error("GET /sessions/:id/messages", e);
      res.status(500).json({ error: "Failed to load messages" });
    }
  });

  // POST /sessions/:id/messages
  app.post("/sessions/:id/messages", authMiddleware, async (req, res) => {
    const user = getUser(req);
    const sessionId = req.params.id;
    const { type, text, channel, helpStudentId } = req.body as {
      type?: string;
      text?: string;
      channel?: string;
      helpStudentId?: string | null;
    };

    if (!type || !text || !text.toString().trim()) {
      res.status(400).json({ error: "type and text required" });
      return;
    }

    try {
      const session = await prisma.session.findUnique({ where: { id: sessionId } });
      if (!session) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      const isOwner = session.createdById === user.userId;
      const isAdmin = user.role === "admin";
      let isMember = false;
      if (user.role === "student") {
        const gm = await prisma.groupMember.findUnique({
          where: { groupId_userId: { groupId: session.groupId, userId: user.userId } },
        });
        isMember = !!gm;
      }
      if (!isOwner && !isAdmin && !isMember) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      // Load or create chat policy
      let policy = await prisma.sessionChatPolicy.findUnique({ where: { sessionId } });
      if (!policy) {
        policy = await prisma.sessionChatPolicy.create({
          data: { sessionId, mode: "lecture_open", slowmodeSec: 0 },
        });
      }

      // Policy mode: locked — students cannot post
      if (policy.mode === "locked" && user.role === "student") {
        res.status(403).json({ error: "Chat locked" });
        return;
      }

      // Policy mode: questions_only — students only type "question" or "reaction"
      if (policy.mode === "questions_only" && user.role === "student") {
        if (type !== "question" && type !== "reaction") {
          res.status(403).json({ error: "Only questions allowed" });
          return;
        }
      }

      // Policy mode: exam_help_only — students only in help channel
      const effectiveChannel = policy.mode === "exam_help_only" && user.role === "student" ? "help" : (channel === "help" ? "help" : "public");
      const effectiveHelpId = effectiveChannel === "help"
        ? (user.role === "student" ? user.userId : (helpStudentId || null))
        : null;

      // ChatMute: session and group scope
      const sessionMute = await prisma.chatMute.findFirst({
        where: {
          scope: "session",
          scopeId: sessionId,
          targetUserId: user.userId,
          mutedUntil: { gt: new Date() },
        },
      });
      if (sessionMute) {
        res.status(403).json({ error: "User muted in this session" });
        return;
      }
      const groupMuteSession = await prisma.chatMute.findFirst({
        where: {
          scope: "group",
          scopeId: session.groupId,
          targetUserId: user.userId,
          mutedUntil: { gt: new Date() },
        },
      });
      if (groupMuteSession) {
        res.status(403).json({ error: "User muted" });
        return;
      }

      // Slowmode
      if (policy.slowmodeSec > 0) {
        let perSession = sessionSlowmodeMap.get(sessionId);
        if (!perSession) {
          perSession = new Map();
          sessionSlowmodeMap.set(sessionId, perSession);
        }
        const lastSent = perSession.get(user.userId) ?? 0;
        const nowMs = Date.now();
        if (nowMs - lastSent < policy.slowmodeSec * 1000) {
          res.status(429).json({ error: "Slowmode active", retryAfterSec: policy.slowmodeSec });
          return;
        }
      }

      const ch = effectiveChannel;
      const helpId = effectiveHelpId;

      const msg = await prisma.sessionMessage.create({
        data: {
          sessionId,
          senderId: user.userId,
          type,
          text: String(text).trim(),
          channel: ch,
          helpStudentId: helpId,
        },
      });

      const sender = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { name: true, email: true },
      });
      const senderName = sender?.name ?? sender?.email ?? user.userId;

      const messagePayload = {
        id: msg.id,
        sessionId: msg.sessionId,
        senderId: msg.senderId,
        senderName,
        senderEmail: sender?.email ?? null,
        type: msg.type,
        text: msg.text,
        channel: msg.channel,
        helpStudentId: msg.helpStudentId,
        createdAt: msg.createdAt,
      };
      broadcastChatEvent(sessionRoom(sessionId), {
        scope: "session",
        kind: "message:new",
        message: messagePayload,
      });

      if (policy.slowmodeSec > 0) {
        let perSession = sessionSlowmodeMap.get(sessionId);
        if (!perSession) {
          perSession = new Map();
          sessionSlowmodeMap.set(sessionId, perSession);
        }
        perSession.set(user.userId, Date.now());
      }

      res.status(201).json(messagePayload);
    } catch (e) {
      console.error("POST /sessions/:id/messages", e);
      res.status(500).json({ error: "Failed to create message" });
    }
  });
}

