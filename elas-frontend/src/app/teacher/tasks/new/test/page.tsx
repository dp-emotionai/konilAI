"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    ArrowLeft,
    Eye,
    MoreVertical,
    PlusCircle,
    RotateCcw,
    Save,
    Settings,
    Trash2,
} from "lucide-react";

export default function CreateTestPage() {
    const searchParams = useSearchParams();

    const groupId = searchParams.get("groupId");
    const sessionId = searchParams.get("sessionId");

    return (
        <div className="min-h-screen bg-[#fbfbff] px-6 py-6 text-slate-900">
            <div className="mx-auto max-w-7xl">
                <header className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link
                            href="/teacher/tasks"
                            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-violet-600"
                        >
                            <ArrowLeft size={18} />
                            Назад
                        </Link>

                        <nav className="hidden items-center gap-10 md:flex">
                            <button className="border-b-2 border-violet-600 px-2 pb-3 text-sm font-extrabold text-violet-600">
                                Вопросы
                            </button>
                            <button className="px-2 pb-3 text-sm font-extrabold text-slate-500">
                                Настройки
                            </button>
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="hidden items-center gap-2 text-sm font-bold text-slate-500 md:inline-flex">
                            <Eye size={18} />
                            Предпросмотр
                        </button>

                        <button className="rounded-xl p-2 text-slate-500 hover:bg-slate-100">
                            <RotateCcw size={18} />
                        </button>

                        <button className="rounded-xl p-2 text-slate-500 hover:bg-slate-100">
                            <MoreVertical size={18} />
                        </button>

                        <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 text-sm font-extrabold text-white shadow-lg shadow-violet-100 hover:bg-violet-700">
                            <Save size={17} />
                            Опубликовать
                        </button>
                    </div>
                </header>

                <div className="grid gap-6 lg:grid-cols-[1fr_220px_320px]">
                    <main className="space-y-6">
                        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="h-2 bg-violet-600" />

                            <div className="p-7">
                                <input
                                    defaultValue="Python basics"
                                    className="w-full border-none bg-transparent text-3xl font-extrabold text-slate-950 outline-none"
                                    placeholder="Название теста"
                                />

                                <input
                                    className="mt-6 w-full border-none bg-transparent text-sm font-medium text-slate-500 outline-none"
                                    placeholder="Описание теста (необязательно)"
                                />

                                <div className="mt-6 flex items-center gap-5 text-slate-500">
                                    <button className="font-bold">B</button>
                                    <button className="italic">I</button>
                                    <button className="underline">U</button>
                                    <button>🔗</button>
                                </div>
                            </div>
                        </section>

                        {[1, 2].map((number) => (
                            <section
                                key={number}
                                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                            >
                                <div className="grid gap-6 p-7 md:grid-cols-[1fr_230px]">
                                    <div>
                    <textarea
                        defaultValue={
                            number === 1
                                ? "Какой тип данных используется для хранения целых чисел в Python?"
                                : "Как вывести текст в консоль в Python?"
                        }
                        className="min-h-20 w-full resize-none border-none bg-transparent text-base font-extrabold leading-7 text-slate-950 outline-none"
                    />

                                        <div className="mt-6 space-y-4">
                                            {["str", "int", "float", "bool"].map((option, index) => (
                                                <label key={option} className="flex items-center gap-4">
                                                    <input
                                                        type="radio"
                                                        name={`question-${number}`}
                                                        defaultChecked={number === 1 && index === 1}
                                                        className="h-4 w-4 accent-violet-600"
                                                    />
                                                    <input
                                                        defaultValue={number === 2 && index === 1 ? `print("Hello")` : option}
                                                        className="flex-1 border-none bg-transparent text-sm font-semibold text-slate-700 outline-none"
                                                    />
                                                </label>
                                            ))}
                                        </div>

                                        <button className="mt-5 text-sm font-bold text-violet-600">
                                            Добавить вариант
                                        </button>
                                    </div>

                                    <div>
                                        <select className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100">
                                            <option>Один правильный ответ</option>
                                            <option>Несколько правильных ответов</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-4 border-t border-slate-100 px-7 py-4">
                                    <button className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700">
                                        <Trash2 size={18} />
                                    </button>

                                    <span className="text-sm font-bold text-slate-500">
                    Обязательный вопрос
                  </span>

                                    <input type="checkbox" defaultChecked className="h-5 w-5 accent-violet-600" />
                                </div>
                            </section>
                        ))}
                    </main>

                    <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-600 hover:bg-violet-50 hover:text-violet-600">
                            <PlusCircle size={19} />
                            Добавить вопрос
                        </button>

                        <button className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-600 hover:bg-violet-50 hover:text-violet-600">
                            <Settings size={19} />
                            Добавить описание
                        </button>
                    </aside>

                    <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-6 text-lg font-extrabold text-slate-950">
                            Настройки теста
                        </h2>

                        <div className="space-y-5">
                            <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-500">
                  groupId
                </span>
                                <input
                                    value={groupId || ""}
                                    readOnly
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-600"
                                />
                            </label>

                            <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-500">
                  sessionId
                </span>
                                <input
                                    value={sessionId || ""}
                                    readOnly
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-600"
                                />
                            </label>

                            <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-500">
                  Баллы за тест
                </span>
                                <input
                                    defaultValue="10"
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                                />
                            </label>

                            <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-500">
                  Время на тест
                </span>
                                <input
                                    defaultValue="30"
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                                />
                            </label>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}