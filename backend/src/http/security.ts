import type { RequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import { CONFIG } from "../config";

function isAllowedOrigin(origin: string | undefined | null): boolean {
  if (!origin) return true; // same-origin / server-to-server

  const allowed = CONFIG.corsOrigins;

  if (!allowed.length) return false;

  if (allowed.includes(origin)) return true;

  // Allow Vercel preview deployments if explicitly enabled in env
  const allowVercelPreview = allowed.includes("https://*.vercel.app");
  if (allowVercelPreview) {
    try {
      const url = new URL(origin);
      if (url.protocol === "https:" && url.hostname.endsWith(".vercel.app")) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
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