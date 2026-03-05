export function getWsBaseUrl() {
  return process.env.NEXT_PUBLIC_WS_BASE_URL ?? "ws://localhost:4000";
}