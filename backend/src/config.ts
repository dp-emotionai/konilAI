function splitList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PROD = NODE_ENV === "production";

const jwtSecret = process.env.JWT_SECRET;

// В проде требуем реальный секрет
if (IS_PROD && (!jwtSecret || jwtSecret.trim().length < 32)) {
  throw new Error(
    "JWT_SECRET is missing/too short in production. Set a strong secret (32+ chars)."
  );
}

const wsRequireAuthRaw = (process.env.WS_REQUIRE_AUTH || "").trim().toLowerCase();

export const CONFIG = {
  nodeEnv: NODE_ENV,
  isProd: IS_PROD,

  httpPort: Number(process.env.PORT || 4000),
  wsPath: "/ws",
  chatWsPath: "/ws-chat",

  // HTTP CORS
  corsOrigins: splitList(
    process.env.CORS_ORIGINS || process.env.CORS_ORIGIN
  ),

  // WS origins
  wsAllowedOrigins: splitList(
    process.env.WS_ALLOWED_ORIGINS ||
      process.env.CORS_ORIGINS ||
      process.env.CORS_ORIGIN
  ),

  // Если явно указали true/false — используем это.
  // Если не указали вообще:
  //   prod -> true
  //   dev  -> false
  wsRequireAuth:
    wsRequireAuthRaw === "true"
      ? true
      : wsRequireAuthRaw === "false"
        ? false
        : IS_PROD,

  jwtSecret: jwtSecret?.trim() || "elas-dev-secret-change-me",

  jsonBodyLimit: process.env.JSON_BODY_LIMIT || "256kb",

  adminEmail: process.env.ADMIN_EMAIL?.trim() || null,
  adminPassword: process.env.ADMIN_PASSWORD || null,
};