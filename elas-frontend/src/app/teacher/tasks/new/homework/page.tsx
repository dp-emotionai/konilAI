"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";

export default function CreateHomeworkPage() {
    const searchParams = useSearchParams();

    const groupId = searchParams.get("groupId");
    const sessionId = searchParams.get("sessionId");

    return (
        <div className="min-h-screen bg-[#fbfbff] px-6 py-8 text-slate-900">
            <div className="mx-auto max-w-4xl">
                <Link
                    href="/teacher/tasks"
                    className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-violet-600"
                >
                    <ArrowLeft size={18} />
                    Назад
                </Link>

                <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                    <h1 className="text-3xl font-extrabold text-slate-950">
                        Создать домашнее задание
                    </h1>

                    <p className="mt-2 text-slate-500">
                        Настройте текст задания, дедлайн, баллы и тип ответа.
                    </p>

                    <div className="mt-8 space-y-5">
                        <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-500">
                Название
              </span>
                            <input
                                placeholder="Например: 5 есеп шығару"
                                className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                            />
                        </label>

                        <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-500">
                Описание
              </span>
                            <textarea
                                rows={6}
                                placeholder="Что нужно сделать студенту?"
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                            />
                        </label>

                        <div className="grid gap-4 md:grid-cols-2">
                            <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-500">
                  groupId
                </span>
                                <input
                                    value={groupId || ""}
                                    readOnly
                                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-600"
                                />
                            </label>

                            <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-500">
                  sessionId
                </span>
                                <input
                                    value={sessionId || ""}
                                    readOnly
                                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-600"
                                />
                            </label>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-500">
                  Тип
                </span>
                                <select className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100">
                                    <option value="homework">Домашка</option>
                                    <option value="text_answer">Текстовый ответ</option>
                                    <option value="file_upload">Файл</option>
                                </select>
                            </label>

                            <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-500">
                  Баллы
                </span>
                                <input
                                    defaultValue="10"
                                    type="number"
                                    className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                                />
                            </label>

                            <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-500">
                  Deadline
                </span>
                                <input
                                    type="datetime-local"
                                    className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm font-semibold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                                />
                            </label>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-7 text-sm font-extrabold text-white shadow-lg shadow-violet-100 hover:bg-violet-700">
                                <Save size={18} />
                                Опубликовать
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}