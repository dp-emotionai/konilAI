import type { Express, Request } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../db";
import { CONFIG } from "../config";
import { authMiddleware, type JwtPayload } from "./middleware";

const SALT_ROUNDS = 10;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

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
      const normalizedEmail = String(email).trim().toLowerCase();
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (!user || user.status !== "active") {
        console.warn("[auth/login] 401:", user ? "status not active" : "user not found");
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }
      if (!user.passwordHash) {
        res.status(401).json({ error: "This account uses Google sign-in. Use Google login." });
        return;
      }
      const ok = await bcrypt.compare(String(password), user.passwordHash);
      if (!ok) {
        console.warn("[auth/login] 401: password mismatch");
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

  // POST /auth/google — вход/регистрация через Google ID Token
  app.post("/auth/google", async (req, res) => {
    try {
      if (!googleClient || !GOOGLE_CLIENT_ID) {
        res.status(500).json({ error: "Google auth is not configured on server" });
        return;
      }

      const { idToken, role } = req.body as { idToken?: string; role?: string };
      if (!idToken) {
        res.status(400).json({ error: "idToken is required" });
        return;
      }

      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();

      if (!payload?.email) {
        res.status(400).json({ error: "Google did not return email" });
        return;
      }

      const email = String(payload.email).trim().toLowerCase();
      const name = payload.name ? String(payload.name).trim() || null : null;
      const r = role === "teacher" ? "teacher" : "student";

      let user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email,
            name,
            role: r,
            passwordHash: null,
          },
        });
      }

      if (user.status && user.status !== "active") {
        if (user.status === "blocked") {
          res.status(403).json({ error: "Account is blocked" });
          return;
        }
        res.status(401).json({ error: "Account is awaiting admin approval" });
        return;
      }

      const payloadJwt: JwtPayload = { userId: user.id, email: user.email, role: user.role };
      const token = jwt.sign(payloadJwt, CONFIG.jwtSecret, { expiresIn: "7d" });

      res.json({
        user: { id: user.id, email: user.email, role: user.role, name: user.name, status: user.status },
        token,
      });
    } catch (e) {
      console.error("Google auth error", e);
      res.status(500).json({ error: "Google authentication failed" });
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
