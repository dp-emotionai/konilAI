export function getWsBaseUrl() {
  const value = process.env.NEXT_PUBLIC_WS_BASE_URL?.trim();
  if (value) {
    return value.replace(/\/$/, "");
  }

  // If WS base is not explicitly configured, derive it from API env vars when possible
  // to avoid hard-coded host mismatches across environments.
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim();
  if (apiBase) {
    const origin = apiBase.replace(/\/$/, "").replace(/\/api$/, "");

    if (origin.startsWith("wss://") || origin.startsWith("ws://")) {
      return origin.replace(/\/$/, "");
    }

    if (origin.startsWith("https://")) {
      return `wss://${origin.slice("https://".length)}`;
    }

    if (origin.startsWith("http://")) {
      return `ws://${origin.slice("http://".length)}`;
    }
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname } = window.location;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "ws://localhost:10000";
    }

    if (protocol === "https:") {
      return "wss://backend-7x7i.onrender.com";
    }

    return "wss://backend-7x7i.onrender.com";
  }

  return "wss://backend-7x7i.onrender.com";
}

export const getSocketBaseUrl = getWsBaseUrl;