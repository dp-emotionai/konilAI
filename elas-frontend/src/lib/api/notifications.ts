import {
  api,
  getApiBaseUrl,
  hasAuth,
} from "@/lib/api/client";

export type NotificationData = {
  taskId?: string | null;
  taskType?: string | null;
  groupId?: string | null;
  sessionId?: string | null;
  testId?: string | null;
  href?: string | null;
  category?: string | null;
  [key: string]: unknown;
};

export type NotificationRow = {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  data: NotificationData | null;
  readAt: string | null;
  createdAt: string;
  isRead: boolean;
};

export type NotificationCounts = {
  totalUnread: number;
  taskUnread: number;
};

export type MarkNotificationsReadResult =
    NotificationCounts & {
  ok: boolean;
  updatedCount: number;
};

export type MarkNotificationReadResult =
    NotificationCounts & {
  notification: NotificationRow;
};

function logNotificationApiCheck(action: string) {
  console.log("NOTIFICATION API CHECK", {
    action,
    apiBaseUrl: getApiBaseUrl(),
    hasAuth: hasAuth(),
  });
}

export async function getNotifications(params?: {
  signal?: AbortSignal;
}): Promise<NotificationRow[]> {
  logNotificationApiCheck("getNotifications");

  if (!getApiBaseUrl() || !hasAuth()) {
    return [];
  }

  const list = await api.get<NotificationRow[]>(
      "/notifications",
      {
        signal: params?.signal,
      }
  );

  return Array.isArray(list) ? list : [];
}

export async function getNotificationCounts(params?: {
  signal?: AbortSignal;
}): Promise<NotificationCounts> {
  logNotificationApiCheck("getNotificationCounts");

  if (!getApiBaseUrl() || !hasAuth()) {
    return {
      totalUnread: 0,
      taskUnread: 0,
    };
  }

  return api.get<NotificationCounts>(
      "/notifications/counts",
      {
        signal: params?.signal,
      }
  );
}

export async function markNotificationRead(
    notificationId: string,
    params?: {
      signal?: AbortSignal;
    }
): Promise<MarkNotificationReadResult | null> {
  logNotificationApiCheck("markNotificationRead");

  if (!getApiBaseUrl() || !hasAuth()) {
    return null;
  }

  if (!notificationId) {
    return null;
  }

  return api.patch<MarkNotificationReadResult>(
      `/notifications/${notificationId}/read`,
      {},
      {
        signal: params?.signal,
      }
  );
}

export async function markTaskNotificationsRead(
    taskId: string,
    params?: {
      signal?: AbortSignal;
    }
): Promise<MarkNotificationsReadResult | null> {
  logNotificationApiCheck("markTaskNotificationsRead");

  if (!getApiBaseUrl() || !hasAuth()) {
    return null;
  }

  if (!taskId) {
    return null;
  }

  return api.patch<MarkNotificationsReadResult>(
      `/notifications/task/${taskId}/read`,
      {},
      {
        signal: params?.signal,
      }
  );
}

export async function markAllNotificationsRead(params?: {
  signal?: AbortSignal;
}): Promise<MarkNotificationsReadResult | null> {
  logNotificationApiCheck("markAllNotificationsRead");

  if (!getApiBaseUrl() || !hasAuth()) {
    return null;
  }

  return api.patch<MarkNotificationsReadResult>(
      "/notifications/read-all",
      {},
      {
        signal: params?.signal,
      }
  );
}
