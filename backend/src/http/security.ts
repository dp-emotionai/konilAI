import type { RequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import { CONFIG } from "../config";

function isAllowedOrigin(origin: string | undefined | null): boolean {
  if (!origin) return true; // same-origin / server-to-server
  if (!CONFIG.corsOrigins.length) return false;
  return CONFIG.corsOrigins.includes(origin);
}

/**
 * CORS allowlist.
 * NOTE: set CORS_ORIGINS="https://your-frontend.com,https://preview.vercel.app".
 */
export function corsMiddleware(): RequestHandler {
  return cors({
    origin(origin, cb) {
      if (isAllowedOrigin(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true, // keep true if frontend sends Authorization + wants cookies later
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
    maxAge: 600,
  });
}

/**
 * Helmet baseline for API server.
 * We keep CSP off here because Next/Vercel usually controls it for the frontend,
 * and an API CSP can be misleading.
 */
export function helmetMiddleware(): RequestHandler {
  return helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  });
}