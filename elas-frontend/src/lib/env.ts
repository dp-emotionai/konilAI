function normalizeSocketOrigin(rawValue: string) {
  const value = rawValue
      .trim()
      .replace(/^wss:\/\//i, "https://")
      .replace(/^ws:\/\//i, "http://");

  try {
    return new URL(value).origin;
  } catch {
    return value
        .replace(/\/api\/ws\/?$/i, "")
        .replace(/\/socket\.io\/?$/i, "")
        .replace(/\/ws\/?$/i, "")
        .replace(/\/api\/?$/i, "")
        .replace(/\/$/, "");
  }
}

export function getSocketBaseUrl() {
  /**
   * В старом фронтенде видеозвонок брал URL из NEXT_PUBLIC_WS_BASE_URL.
   * Оставляем его как fallback, чтобы новый фронт не ломался на старых env в Vercel.
   */
  const configured =
      process.env.NEXT_PUBLIC_SOCKET_BASE_URL?.trim() ||
      process.env.NEXT_PUBLIC_WS_BASE_URL?.trim();

  if (configured) {
    return normalizeSocketOrigin(configured);
  }

  const apiBase =
      process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
      process.env.NEXT_PUBLIC_API_URL?.trim();

  if (apiBase) {
    return normalizeSocketOrigin(apiBase);
  }

  if (typeof window !== "undefined") {
    const { hostname } = window.location;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:10000";
    }
  }

  return "https://elas-backend.onrender.com";
}
