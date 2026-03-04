import type { Express, Request } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../db";
import { CONFIG } from "../config";
import { authMiddleware, type JwtPayload } from "./middleware";

const SALT_ROUNDS = 10;

export function registerAuthRoutes(app: Express) {
  // POST /auth/register
  app.post("/auth/register", async (req, res) => {
    try {
      const { email, password, role = "student", name } = req.body as {
        email?: string;
        password?: string;
        role?: string;
        name?: string;
      };
      if (!email || !password) {
        res.status(400).json({ error: "Email and password required" });
        return;
      }
      // Роль admin не выдаётся через регистрацию — только через seed (закреплённый админ)
      const r = role === "teacher" ? "teacher" : "student";
      const existing = await prisma.user.findUnique({ where: { email: String(email).trim().toLowerCase() } });
      if (existing) {
        res.status(409).json({ error: "Email already registered" });
        return;
      }
      const passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);
      const user = await prisma.user.create({
        data: {
          email: String(email).trim().toLowerCase(),
          passwordHash,
          role: r,
          name: name ? String(name).trim() || null : null,
        },
      });
      const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
      const token = jwt.sign(payload, CONFIG.jwtSecret, { expiresIn: "7d" });
      res.status(201).json({
        user: { id: user.id, email: user.email, role: user.role, name: user.name },
        token,
      });
    } catch (e) {
      console.error("Register error", e);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // POST /auth/login
  app.post("/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body as { email?: string; password?: string };
      if (!email || !password) {
        res.status(400).json({ error: "Email and password required" });
        return;
      }
      const user = await prisma.user.findUnique({
        where: { email: String(email).trim().toLowerCase() },
      });
      if (!user || user.status !== "active") {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      const ok = await bcrypt.compare(String(password), user.passwordHash);
      if (!ok) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      const payload: JwtPayload = { userId: user.id, email: user.email, role: user.role };
      const token = jwt.sign(payload, CONFIG.jwtSecret, { expiresIn: "7d" });
      res.json({
        user: { id: user.id, email: user.email, role: user.role, name: user.name },
        token,
      });
    } catch (e) {
      console.error("Login error", e);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // GET /auth/me — current user (requires token)
  app.get("/auth/me", authMiddleware, async (req, res) => {
    const { userId } = (req as Request & { user: JwtPayload }).user;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, name: true, status: true },
    });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  });
}
