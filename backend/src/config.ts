export const CONFIG = {
  httpPort: Number(process.env.PORT || 4000),
  wsPath: "/ws",
  chatWsPath: "/ws-chat",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  jwtSecret: process.env.JWT_SECRET || "elas-dev-secret-change-in-production",
  /** Закреплённый админ: задаётся через ADMIN_EMAIL и ADMIN_PASSWORD в .env; создаётся через seed. */
  adminEmail: process.env.ADMIN_EMAIL?.trim() || null,
  adminPassword: process.env.ADMIN_PASSWORD || null,
};

