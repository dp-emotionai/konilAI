import { api } from "@/lib/api/client";

export type LessonPlan = {
    id: string;
    sessionId: string;
    teacherId: string;
    date: string;
    title: string;
    description?: string | null;
};

export const lessonPlansApi = {
    getToday: (sessionId: string, date: string) =>
        api.get<LessonPlan | null>(`/lesson-plans/session/${sessionId}?date=${date}`),

    save: (sessionId: string, data: { date: string; title: string; description?: string }) =>
        api.post<LessonPlan>(`/lesson-plans/session/${sessionId}`, data),

    update: (planId: string, data: { date?: string; title?: string; description?: string }) =>
        api.patch<LessonPlan>(`/lesson-plans/${planId}`, data),

    remove: (planId: string) =>
        api.delete<{ ok: true }>(`/lesson-plans/${planId}`),
};