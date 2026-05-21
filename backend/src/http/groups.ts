import type { Express } from "express";
import { prisma } from "../db";
import { logAudit } from "../audit";
import { authMiddleware, requireRole, type JwtPayload } from "./middleware";

function getUser(req: Express.Request): JwtPayload {
  return (req as Express.Request & { user: JwtPayload }).user;
}

export function registerGroupsRoutes(app: Express) {
  app.use("/groups", authMiddleware);

  // GET /groups — teacher: свои; admin: все; student: группы, где член
  app.get("/groups", async (req, res) => {
    const user = getUser(req);
    try {
      if (user.role === "admin") {
        const groups = await prisma.group.findMany({
          include: { teacher: { select: { email: true, name: true } }, _count: { select: { sessions: true } } },
          orderBy: { createdAt: "desc" },
        });
        return res.json(
          groups.map((g) => ({
            id: g.id,
            name: g.name,
            teacherId: g.teacherId,
            teacher: g.teacher.email,
            teacherName: g.teacher.name,
            sessionCount: g._count.sessions,
            createdAt: g.createdAt,
          }))
        );
      }
      if (user.role === "teacher") {
        const groups = await prisma.group.findMany({
          where: { teacherId: user.userId },
          include: { teacher: { select: { email: true, name: true } }, _count: { select: { sessions: true } } },
          orderBy: { createdAt: "desc" },
        });
        return res.json(
          groups.map((g) => ({
            id: g.id,
            name: g.name,
            teacherId: g.teacherId,
            teacher: g.teacher.email,
            teacherName: g.teacher.name,
            sessionCount: g._count.sessions,
            createdAt: g.createdAt,
          }))
        );
      }
      // student: только группы, где он в group_members
      const memberships = await prisma.groupMember.findMany({
        where: { userId: user.userId },
        include: { group: { include: { teacher: { select: { email: true, name: true } }, _count: { select: { sessions: true } } } } },
      });
      res.json(
        memberships.map((m) => ({
          id: m.group.id,
          name: m.group.name,
          teacherId: m.group.teacherId,
          teacher: m.group.teacher.email,
          teacherName: m.group.teacher.name,
          sessionCount: m.group._count.sessions,
          createdAt: m.group.createdAt,
        }))
      );
    } catch (e) {
      console.error("GET /groups", e);
      res.status(500).json({ error: "Failed to list groups" });
    }
  });

  // GET /groups/:id — teacher (owner), admin, или student (member)
  app.get("/groups/:id", authMiddleware, async (req, res) => {
    const user = getUser(req);
    try {
      const id = req.params.id;
      const group = await prisma.group.findUnique({
        where: { id },
        include: {
          teacher: { select: { id: true, email: true, name: true } },
          sessions: true,
        },
      });
      if (!group) {
        res.status(404).json({ error: "Group not found" });
        return;
      }
      const isOwner = group.teacherId === user.userId;
      const isAdmin = user.role === "admin";
      const isMember = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: id, userId: user.userId } },
      });
      if (!isOwner && !isAdmin && !isMember) {
        res.status(404).json({ error: "Group not found" });
        return;
      }
      const members = await prisma.groupMember.findMany({
        where: { groupId: id },
        include: { user: { select: { id: true, email: true, name: true } } },
      });
      res.json({
        id: group.id,
        name: group.name,
        teacherId: group.teacherId,
        teacher: group.teacher.email,
        teacherName: group.teacher.name,
        sessions: group.sessions.map((s) => ({
          id: s.id,
          title: s.title,
          type: s.type,
          status: s.status,
          code: s.code,
          startedAt: s.startedAt,
          endedAt: s.endedAt,
        })),
        members: members.map((m) => ({ id: m.user.id, name: m.user.name ?? m.user.email, email: m.user.email })),
        createdAt: group.createdAt,
      });
    } catch (e) {
      console.error("GET /groups/:id", e);
      res.status(500).json({ error: "Failed to get group" });
    }
  });

  // GET /groups/:id/members — участники группы (teacher видит всех, student — только active)
  app.get("/groups/:id/members", authMiddleware, async (req, res) => {
    const user = getUser(req);
    try {
      const id = req.params.id;
      const group = await prisma.group.findUnique({
        where: { id },
        include: { teacher: { select: { id: true, email: true, name: true } } },
      });
      if (!group) {
        res.status(404).json({ error: "Group not found" });
        return;
      }
      const isOwner = group.teacherId === user.userId;
      const isAdmin = user.role === "admin";
      const isMember = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: id, userId: user.userId } },
      });
      if (!isOwner && !isAdmin && !isMember) {
        res.status(404).json({ error: "Group not found" });
        return;
      }
      const membersList = await prisma.groupMember.findMany({
        where: { groupId: id },
        include: { user: { select: { id: true, email: true, name: true } } },
        orderBy: { addedAt: "asc" },
      });
      res.json({
        teacher: { id: group.teacher.id, email: group.teacher.email, name: group.teacher.name },
        students: membersList.map((m) => ({
          id: m.user.id,
          email: m.user.email,
          name: m.user.name,
          addedAt: m.addedAt,
        })),
      });
    } catch (e) {
      console.error("GET /groups/:id/members", e);
      res.status(500).json({ error: "Failed to list members" });
    }
  });

  // DELETE /groups/:id/members/:userId — удалить из группы, teacher/admin
  app.delete("/groups/:id/members/:userId", authMiddleware, requireRole("teacher", "admin"), async (req, res) => {
    const user = getUser(req);
    try {
      const { id: groupId, userId: targetUserId } = req.params;
      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (!group) {
        res.status(404).json({ error: "Group not found" });
        return;
      }
      if (user.role !== "admin" && group.teacherId !== user.userId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      await prisma.groupMember.delete({
        where: { groupId_userId: { groupId, userId: targetUserId } },
      });
      await logAudit(user.userId, "member_removed", "group", groupId, JSON.stringify({ removedUserId: targetUserId }));
      res.json({ ok: true });
    } catch (e) {
      console.error("DELETE /groups/:id/members/:userId", e);
      res.status(500).json({ error: "Failed to remove member" });
    }
  });

  // POST /groups/:id/members/:userId/block — заблокировать в группе (удалить запись), teacher/admin
  app.post("/groups/:id/members/:userId/block", authMiddleware, requireRole("teacher", "admin"), async (req, res) => {
    const user = getUser(req);
    try {
      const { id: groupId, userId: targetUserId } = req.params;
      const group = await prisma.group.findUnique({ where: { id: groupId } });
      if (!group) {
        res.status(404).json({ error: "Group not found" });
        return;
      }
      if (user.role !== "admin" && group.teacherId !== user.userId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      await prisma.groupMember.deleteMany({
        where: { groupId, userId: targetUserId },
      });
      await logAudit(user.userId, "member_blocked", "group", groupId, JSON.stringify({ userId: targetUserId }));
      res.json({ ok: true });
    } catch (e) {
      console.error("POST /groups/:id/members/:userId/block", e);
      res.status(500).json({ error: "Failed to block member" });
    }
  });

  // GET /groups/:id/invitations — список приглашений группы (teacher/admin)
  app.get("/groups/:id/invitations", authMiddleware, requireRole("teacher", "admin"), async (req, res) => {
    const user = getUser(req);
    try {
      const id = req.params.id;
      const group = await prisma.group.findUnique({ where: { id } });
      if (!group) {
        res.status(404).json({ error: "Group not found" });
        return;
      }
      if (user.role !== "admin" && group.teacherId !== user.userId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const list = await prisma.invitation.findMany({
        where: { groupId: id },
        orderBy: { createdAt: "desc" },
      });
      res.json(
        list.map((i) => ({
          id: i.id,
          inviteeEmail: i.inviteeEmail,
          inviteeUserId: i.inviteeUserId,
          status: i.status,
          createdAt: i.createdAt,
        }))
      );
    } catch (e) {
      console.error("GET /groups/:id/invitations", e);
      res.status(500).json({ error: "Failed to list invitations" });
    }
  });

  // POST /groups/:id/invitations — пригласить по email (teacher или admin)
  app.post("/groups/:id/invitations", authMiddleware, requireRole("teacher", "admin"), async (req, res) => {
    const user = getUser(req);
    try {
      const id = req.params.id;
      const group = await prisma.group.findUnique({ where: { id } });
      if (!group) {
        res.status(404).json({ error: "Group not found" });
        return;
      }
      const isAdmin = user.role === "admin";
      if (!isAdmin && group.teacherId !== user.userId) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      const body = req.body as { emails?: string[] };
      const emails = Array.isArray(body.emails) ? body.emails.map((e) => String(e).trim().toLowerCase()).filter(Boolean) : [];
      if (emails.length === 0) {
        res.status(400).json({ error: "emails array required" });
        return;
      }
      const created: { email: string; userId?: string; invitationId: string }[] = [];
      for (const email of emails) {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        const alreadyMember = existingUser
          ? await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId: id, userId: existingUser.id } } })
          : null;
        if (alreadyMember) continue;
        const existingInv = await prisma.invitation.findFirst({
          where: { groupId: id, inviteeEmail: email, status: "pending" },
        });
        if (existingInv) continue;
        const inv = await prisma.invitation.create({
          data: {
            groupId: id,
            inviteeEmail: email,
            inviteeUserId: existingUser?.id ?? null,
            status: "pending",
          },
        });
        created.push({ email, userId: existingUser?.id ?? undefined, invitationId: inv.id });
      }
      await logAudit(user.userId, "invitations_created", "group", id, JSON.stringify({ count: created.length }));
      res.status(201).json({ created });
    } catch (e) {
      console.error("POST /groups/:id/invitations", e);
      res.status(500).json({ error: "Failed to create invitations" });
    }
  });

  // POST /groups — create (teacher or admin)
  app.post("/groups", requireRole("teacher", "admin"), async (req, res) => {
    const user = getUser(req);
    try {
      const { name } = req.body as { name?: string };
      if (!name || !String(name).trim()) {
        res.status(400).json({ error: "Name required" });
        return;
      }
      const group = await prisma.group.create({
        data: { name: String(name).trim(), teacherId: user.userId },
      });
      await logAudit(user.userId, "group_created", "group", group.id, JSON.stringify({ name: group.name }));
      res.status(201).json({ id: group.id, name: group.name, teacherId: group.teacherId, createdAt: group.createdAt });
    } catch (e) {
      console.error("POST /groups", e);
      res.status(500).json({ error: "Failed to create group" });
    }
  });

  // PATCH /groups/:id
  app.patch("/groups/:id", async (req, res) => {
    const user = getUser(req);
    try {
      const id = req.params.id;
      const isAdmin = user.role === "admin";
      const existing = await prisma.group.findFirst({
        where: { id, ...(isAdmin ? {} : { teacherId: user.userId }) },
      });
      if (!existing) {
        res.status(404).json({ error: "Group not found" });
        return;
      }
      const { name } = req.body as { name?: string };
      const group = await prisma.group.update({
        where: { id },
        data: name !== undefined ? { name: String(name).trim() } : {},
      });
      res.json({ id: group.id, name: group.name, teacherId: group.teacherId, updatedAt: group.updatedAt });
    } catch (e) {
      console.error("PATCH /groups/:id", e);
      res.status(500).json({ error: "Failed to update group" });
    }
  });
}
