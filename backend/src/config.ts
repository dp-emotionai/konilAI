function splitList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PROD = NODE_ENV === "production";

// IMPORTANT: never ship a hardcoded prod secret.
const jwtSecret = process.env.JWT_SECRET;
if (IS_PROD && (!jwtSecret || jwtSecret.length < 24)) {
  throw new Error(
    "JWT_SECRET is missing/too short in production. Set a strong secret (32+ chars)."
  );
}

export const CONFIG = {
  nodeEnv: NODE_ENV,
  isProd: IS_PROD,

  httpPort: Number(process.env.PORT || 4000),
  wsPath: "/ws",
  chatWsPath: "/ws-chat",

  // Comma-separated allowlist.
  // Example: CORS_ORIGINS="http://localhost:3000,https://elas.app"
  corsOrigins: splitList(process.env.CORS_ORIGINS || process.env.CORS_ORIGIN),

  // WS origin allowlist (falls back to corsOrigins if not provided)
  wsAllowedOrigins: splitList(
    process.env.WS_ALLOWED_ORIGINS ||
      process.env.CORS_ORIGINS ||
      process.env.CORS_ORIGIN
  ),

  // WS auth requirement (default true in production)
  wsRequireAuth:
    (process.env.WS_REQUIRE_AUTH || "").toLowerCase() === "true" || IS_PROD,

  jwtSecret: jwtSecret || "elas-dev-secret-change-me",

  jsonBodyLimit: process.env.JSON_BODY_LIMIT || "256kb",

  /** Закреплённый админ: задаётся через ADMIN_EMAIL и ADMIN_PASSWORD в .env; создаётся через seed. */
  adminEmail: process.env.ADMIN_EMAIL?.trim() || null,
  adminPassword: process.env.ADMIN_PASSWORD || null,
};