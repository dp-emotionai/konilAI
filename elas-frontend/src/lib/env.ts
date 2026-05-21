export function getWsBaseUrl() {
  const value = process.env.NEXT_PUBLIC_WS_BASE_URL?.trim();
  if (value) {
    return value.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "ws://localhost:10000";
    }

    if (protocol === "https:") {
      return "wss://elas-backend.onrender.com";
    }

    return "ws://elas-backend.onrender.com";
  }

  return "wss://elas-backend.onrender.com";
}