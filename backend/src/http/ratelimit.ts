import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";

/**
 * IMPORTANT: In express, enable `app.set('trust proxy', 1)` when behind a proxy.
 */

export const authLimiter: RequestHandler = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

export const writeLimiter: RequestHandler = rateLimit({
  windowMs: 10_000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
});

export const readLimiter: RequestHandler = rateLimit({
  windowMs: 10_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});