import { api, getApiBaseUrl, hasAuth } from "@/lib/api/client";

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
  isRead: boolean;
};

export async function getNotifications(params?: { signal?: AbortSignal }): Promise<NotificationRow[]> {
  if (!getApiBaseUrl() || !hasAuth()) return [];
  const list = await api.get<NotificationRow[]>("/notifications", { signal: params?.signal });
  return Array.isArray(list) ? list : [];
}

export async function markNotificationRead(
  notificationId: string,
  params?: { signal?: AbortSignal }
): Promise<{ id: string; readAt: string; isRead: true } | null> {
  if (!getApiBaseUrl() || !hasAuth()) return null;
  if (!notificationId) return null;
  return api.patch<{ id: string; readAt: string; isRead: true }>(
    `/notifications/${notificationId}/read`,
    {},
    { signal: params?.signal }
  );
}

