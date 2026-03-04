import type { Express, Request } from "express";
import { prisma } from "../db";
import { authMiddleware, type JwtPayload } from "./middleware";
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

export function registerChatRoutes(app: Express) {
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
      });

      res.json(
        messages
          .map((m) => ({
            id: m.id,
            sessionId: m.sessionId,
            senderId: m.senderId,
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

      const ch = channel === "help" ? "help" : "public";
      let helpId: string | null = null;
      if (ch === "help") {
        if (user.role === "student") helpId = user.userId;
        else if (helpStudentId) helpId = helpStudentId;
      }

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

      const payload = {
        scope: "session",
        kind: "message:new",
        message: {
          id: msg.id,
          sessionId: msg.sessionId,
          senderId: msg.senderId,
          type: msg.type,
          text: msg.text,
          channel: msg.channel,
          helpStudentId: msg.helpStudentId,
          createdAt: msg.createdAt,
        },
      };
      broadcastChatEvent(sessionRoom(sessionId), payload);

      res.status(201).json(payload.message);
    } catch (e) {
      console.error("POST /sessions/:id/messages", e);
      res.status(500).json({ error: "Failed to create message" });
    }
  });
}

