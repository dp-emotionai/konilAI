"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { lessonPlansApi, type LessonPlan } from "@/lib/api/lessonPlans";

function today() {
    return new Date().toISOString().slice(0, 10);
}

export default function LessonPlanPanel({
                                            sessionId,
                                            role,
                                        }: {
    sessionId: string;
    role: "teacher" | "student";
}) {
    const [date, setDate] = useState(today());
    const [plan, setPlan] = useState<LessonPlan | null>(null);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    async function loadPlan() {
        const data = await lessonPlansApi.getToday(sessionId, date);
        setPlan(data);
        setTitle(data?.title ?? "");
        setDescription(data?.description ?? "");
    }

    useEffect(() => {
        if (sessionId) loadPlan().catch(console.error);
    }, [sessionId, date]);

    async function savePlan() {
        if (!title.trim()) return;

        const saved = plan
            ? await lessonPlansApi.update(plan.id, { date, title, description })
            : await lessonPlansApi.save(sessionId, { date, title, description });

        setPlan(saved);
    }

    async function deletePlan() {
        if (!plan) return;
        await lessonPlansApi.remove(plan.id);
        setPlan(null);
        setTitle("");
        setDescription("");
    }

    return (
        <div className="rounded-[28px] border border-slate-100 bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold text-slate-900">План занятия</h3>
                    <p className="text-xs text-slate-500">План на выбранный день</p>
                </div>

                <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
            </div>

            {role === "teacher" ? (
                <div className="space-y-3">
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Тема занятия"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />

                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Описание плана"
                        className="min-h-[100px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />

                    <div className="flex gap-2">
                        <Button onClick={savePlan}>Сохранить</Button>

                        {plan && (
                            <Button variant="danger" onClick={deletePlan}>
                                Удалить
                            </Button>
                        )}
                    </div>
                </div>
            ) : plan ? (
                <div>
                    <div className="font-semibold text-slate-900">{plan.title}</div>
                    {plan.description && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                            {plan.description}
                        </p>
                    )}
                </div>
            ) : (
                <p className="text-sm text-slate-500">
                    На этот день план занятия ещё не добавлен.
                </p>
            )}
        </div>
    );
}