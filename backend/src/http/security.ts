import type { RequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import { CONFIG } from "../config";

function isWildcardVercelAllowed(list: string[]): boolean {
  return list.includes("https://*.vercel.app");
}

function isExactAllowedOrigin(origin: string, list: string[]): boolean {
  return list.includes(origin);
}

function isAllowedByWildcard(origin: string, list: string[]): boolean {
  if (!isWildcardVercelAllowed(list)) return false;

  try {
    const url = new URL(origin);
    return url.protocol === "https:" && url.hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin: string | undefined | null): boolean {
  if (!origin) return true; // same-origin / server-to-server
  if (!CONFIG.corsOrigins.length) return false;

  return (
    isExactAllowedOrigin(origin, CONFIG.corsOrigins) ||
    isAllowedByWildcard(origin, CONFIG.corsOrigins)
  );
}

/**
 * CORS allowlist.
 * Examples:
 * CORS_ORIGINS="http://localhost:3000,https://myapp.vercel.app"
 * CORS_ORIGINS="http://localhost:3000,https://*.vercel.app"
 */
export function corsMiddleware(): RequestHandler {
  return cors({
    origin(origin, cb) {
      if (isAllowedOrigin(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "X-Request-Id"],
    maxAge: 600,
  });
}

/**
 * Helmet baseline for API server.
 */
export function helmetMiddleware(): RequestHandler {
  return helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  });
}