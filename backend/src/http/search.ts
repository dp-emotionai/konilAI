import type { Express } from "express";
import { prisma } from "../db";
import { authMiddleware, type JwtPayload } from "./middleware";

const MIN_QUERY_LENGTH = 2;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

function getUser(req: Express.Request): JwtPayload {
  return (req as Express.Request & { user: JwtPayload }).user;
}

export function registerSearchRoutes(app: Express) {
  app.get("/search", authMiddleware, async (req, res) => {
    const user = getUser(req);
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const typesRaw = req.query.types;
    const types = Array.isArray(typesRaw)
      ? (typesRaw as string[])
      : typeof typesRaw === "string"
        ? typesRaw.split(",").map((t) => t.trim())
        : ["sessions", "groups"];
    const limit = Math.min(
      MAX_LIMIT,
      typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) || DEFAULT_LIMIT : DEFAULT_LIMIT
    );

    const includeSessions = types.includes("sessions");
    const includeGroups = types.includes("groups");
    const includeUsers = types.includes("users") && user.role === "admin";

    const results: {
      sessions: Array<{ id: string; title: string; status?: string; startAt?: string; groupName?: string }>;
      groups: Array<{ id: string; name: string; membersCount?: number }>;
      users?: Array<{ id: string; name: string; email?: string; role?: string }>;
    } = {
      sessions: [],
      groups: [],
    };
    if (includeUsers) results.users = [];

    if (q.length < MIN_QUERY_LENGTH) {
      return res.json({ q, results });
    }

    const search = `%${q}%`;

    try {
      if (includeSessions) {
        if (user.role === "admin") {
          const sessions = await prisma.session.findMany({
            where: { title: { contains: q } },
            include: { group: true },
            take: limit,
            orderBy: { updatedAt: "desc" },
          });
          results.sessions = sessions.map((s) => ({
            id: s.id,
            title: s.title,
            status: s.status,
            startAt: s.startedAt?.toISOString(),
            groupName: s.group.name,
          }));
        } else if (user.role === "teacher") {
          const sessions = await prisma.session.findMany({
            where: { createdById: user.userId, title: { contains: q } },
            include: { group: true },
            take: limit,
            orderBy: { updatedAt: "desc" },
          });
          results.sessions = sessions.map((s) => ({
            id: s.id,
            title: s.title,
            status: s.status,
            startAt: s.startedAt?.toISOString(),
            groupName: s.group.name,
          }));
        } else {
          const memberGroups = await prisma.groupMember.findMany({
            where: { userId: user.userId },
            select: { groupId: true },
          });
          const groupIds = memberGroups.map((m) => m.groupId);
          const sessions = await prisma.session.findMany({
            where: {
              groupId: { in: groupIds },
              title: { contains: q },
            },
            include: { group: true },
            take: limit,
            orderBy: { updatedAt: "desc" },
          });
          results.sessions = sessions.map((s) => ({
            id: s.id,
            title: s.title,
            status: s.status,
            startAt: s.startedAt?.toISOString(),
            groupName: s.group.name,
          }));
        }
      }

      if (includeGroups) {
        if (user.role === "admin") {
          const groups = await prisma.group.findMany({
            where: { name: { contains: q } },
            include: { _count: { select: { members: true } } },
            take: limit,
            orderBy: { updatedAt: "desc" },
          });
          results.groups = groups.map((g) => ({
            id: g.id,
            name: g.name,
            membersCount: g._count.members,
          }));
        } else if (user.role === "teacher") {
          const groups = await prisma.group.findMany({
            where: { teacherId: user.userId, name: { contains: q } },
            include: { _count: { select: { members: true } } },
            take: limit,
            orderBy: { updatedAt: "desc" },
          });
          results.groups = groups.map((g) => ({
            id: g.id,
            name: g.name,
            membersCount: g._count.members,
          }));
        } else {
          const memberGroups = await prisma.groupMember.findMany({
            where: { userId: user.userId },
            select: { groupId: true },
          });
          const groupIds = memberGroups.map((m) => m.groupId);
          const groups = await prisma.group.findMany({
            where: { id: { in: groupIds }, name: { contains: q } },
            include: { _count: { select: { members: true } } },
            take: limit,
            orderBy: { updatedAt: "desc" },
          });
          results.groups = groups.map((g) => ({
            id: g.id,
            name: g.name,
            membersCount: g._count.members,
          }));
        }
      }

      if (includeUsers && user.role === "admin") {
        const users = await prisma.user.findMany({
          where: {
            OR: [
              { email: { contains: q } },
              { name: { contains: q } },
            ],
          },
          take: limit,
          orderBy: { updatedAt: "desc" },
        });
        results.users = users.map((u) => ({
          id: u.id,
          name: u.name ?? "",
          email: u.email,
          role: u.role,
        }));
      }

      res.json({ q, results });
    } catch (e) {
      console.error("Search error", e);
      res.status(500).json({ error: "Search failed" });
    }
  });
}
