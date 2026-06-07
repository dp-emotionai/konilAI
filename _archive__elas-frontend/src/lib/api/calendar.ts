import { api, getApiBaseUrl, hasAuth } from "@/lib/api/client";

export type CalendarEvent = {
  id: string;
  title: string;
  kind: string;
  groupId: string | null;
  sessionId: string | null;
  startsAt: string;
  endsAt: string | null;
  createdById: string;
  createdAt?: string;
  updatedAt?: string;
};

export async function getCalendarEvents(params?: { signal?: AbortSignal }): Promise<CalendarEvent[]> {
  if (!getApiBaseUrl() || !hasAuth()) return [];
  const list = await api.get<CalendarEvent[]>("/calendar/events", { signal: params?.signal });
  return Array.isArray(list) ? list : [];
}

export async function createCalendarEvent(
  input: {
    title: string;
    kind?: string;
    groupId?: string | null;
    sessionId?: string | null;
    startsAt: string;
    endsAt?: string | null;
  },
  params?: { signal?: AbortSignal }
): Promise<CalendarEvent> {
  return api.post<CalendarEvent>("/calendar/events", input, { signal: params?.signal });
}

export async function updateCalendarEvent(
  eventId: string,
  input: Partial<Pick<CalendarEvent, "title" | "kind" | "startsAt" | "endsAt">>,
  params?: { signal?: AbortSignal }
): Promise<CalendarEvent> {
  return api.patch<CalendarEvent>(`/calendar/events/${eventId}`, input, { signal: params?.signal });
}

export async function deleteCalendarEvent(eventId: string, params?: { signal?: AbortSignal }): Promise<void> {
  await api.delete(`/calendar/events/${eventId}`, { signal: params?.signal });
}

