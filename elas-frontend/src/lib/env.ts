export function getWsBaseUrl() {
  const value = process.env.NEXT_PUBLIC_WS_BASE_URL?.trim();
  if (value) return value;

  if (typeof window !== "undefined") {
    const host = window.location.hostname;

    if (host === "localhost" || host === "127.0.0.1") {
      return "ws://localhost:10000";
    }
  }

  return "wss://elas-backend.onrender.com";
}