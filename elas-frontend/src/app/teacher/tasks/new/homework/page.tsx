"use client";

import {
    Suspense,
    useEffect,
    useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    FileText,
    Loader2,
    Paperclip,
    Save,
    Send,
    X,
} from "lucide-react";

import {
    getGroupById,
    getTeacherGroups,
    type GroupSession,
    type TeacherGroup,
} from "@/lib/api/teacher";
import {
    createTask,
    type TaskStatus,
    type TaskType,
} from "@/lib/api/tasks";

type HomeworkType =
    | "homework"
    | "text_answer"
    | "file_upload";

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

function toIsoDate(value: string): string | null {
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toISOString();
}

function CreateHomeworkContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const initialGroupId = searchParams.get("groupId") || "";
    const initialSessionId = searchParams.get("sessionId") || "";

    const [groups, setGroups] = useState<TeacherGroup[]>([]);
    const [sessions, setSessions] = useState<GroupSession[]>([]);

    const [selectedGroupId, setSelectedGroupId] = useState("");
    const [selectedSessionId, setSelectedSessionId] = useState("");

    const [loadingGroups, setLoadingGroups] = useState(true);
    const [loadingSessions, setLoadingSessions] = useState(false);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    const [type, setType] =
        useState<HomeworkType>("homework");

    const [points, setPoints] = useState("10");
    const [deadline, setDeadline] = useState("");

    const [savingStatus, setSavingStatus] =
        useState<TaskStatus | null>(null);

    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;

        async function loadGroups() {
            setLoadingGroups(true);

            try {
                const result = await getTeacherGroups();

                if (!active) return;

                const list = Array.isArray(result) ? result : [];

                setGroups(list);

                const initialExists = list.some(
                    (group) => group.id === initialGroupId
                );

                setSelectedGroupId(
                    initialExists ? initialGroupId : list[0]?.id || ""
                );
            } catch (requestError) {
                if (!active) return;

                setError(
                    getErrorMessage(
                        requestError,
                        "Не удалось загрузить группы"
                    )
                );
            } finally {
                if (active) {
                    setLoadingGroups(false);
                }
            }
        }

        void loadGroups();

        return () => {
            active = false;
        };
    }, [initialGroupId]);

    useEffect(() => {
        let active = true;

        async function loadSessions() {
            if (!selectedGroupId) {
                setSessions([]);
                setSelectedSessionId("");
                return;
            }

            setLoadingSessions(true);

            try {
                const detail = await getGroupById(selectedGroupId);

                if (!active) return;

                const list = Array.isArray(detail?.sessions)
                    ? detail.sessions
                    : [];

                setSessions(list);

                setSelectedSessionId((current) => {
                    if (
                        current &&
                        list.some((session) => session.id === current)
                    ) {
                        return current;
                    }

                    const canUseInitialSession =
                        selectedGroupId === initialGroupId &&
                        list.some(
                            (session) => session.id === initialSessionId
                        );

                    return canUseInitialSession
                        ? initialSessionId
                        : "";
                });
            } catch (requestError) {
                if (!active) return;

                setSessions([]);
                setSelectedSessionId("");
                setError(
                    getErrorMessage(
                        requestError,
                        "Не удалось загрузить уроки"
                    )
                );
            } finally {
                if (active) {
                    setLoadingSessions(false);
                }
            }
        }

        void loadSessions();

        return () => {
            active = false;
        };
    }, [selectedGroupId, initialGroupId, initialSessionId]);

    function validate(): string | null {
        if (!title.trim()) {
            return "Введите название задания";
        }

        if (!selectedGroupId) {
            return "Выберите группу";
        }

        const numericPoints = Number(points);

        if (
            !Number.isFinite(numericPoints) ||
            numericPoints < 0
        ) {
            return "Баллы должны быть положительным числом";
        }

        if (deadline) {
            const date = new Date(deadline);

            if (Number.isNaN(date.getTime())) {
                return "Неверный формат дедлайна";
            }
        }

        return null;
    }

    async function handleSave(status: "draft" | "published") {
        const validationError = validate();

        if (validationError) {
            setError(validationError);
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }

        setSavingStatus(status);
        setError(null);

        try {
            await createTask({
                title: title.trim(),
                description: description.trim() || null,
                type: type as TaskType,
                status,
                groupId: selectedGroupId,
                sessionId: selectedSessionId || null,
                testId: null,
                deadline: toIsoDate(deadline),
                points: Number(points) || 0,
            });

            router.push("/teacher/tasks");
            router.refresh();
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError,
                    status === "draft"
                        ? "Не удалось сохранить черновик"
                        : "Не удалось опубликовать задание"
                )
            );

            window.scrollTo({ top: 0, behavior: "smooth" });
        } finally {
            setSavingStatus(null);
        }
    }

    const saving = savingStatus !== null;

    return (
        <div className="min-h-screen bg-[#f8f9ff] px-4 py-6 text-slate-900 md:px-6">
            <div className="mx-auto max-w-6xl">
                <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                    <Link
                        href="/teacher/tasks"
                        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-violet-600"
                    >
                        <ArrowLeft size={18} />
                        Назад к задачам
                    </Link>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            disabled={saving}
                            onClick={() => void handleSave("draft")}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {savingStatus === "draft" ? (
                                <Loader2
                                    size={17}
                                    className="animate-spin"
                                />
                            ) : (
                                <Save size={17} />
                            )}

                            Сохранить черновик
                        </button>

                        <button
                            type="button"
                            disabled={saving}
                            onClick={() => void handleSave("published")}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-extrabold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {savingStatus === "published" ? (
                                <Loader2
                                    size={17}
                                    className="animate-spin"
                                />
                            ) : (
                                <Send size={17} />
                            )}

                            Опубликовать
                        </button>
                    </div>
                </header>

                {error && (
                    <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                        <span>{error}</span>

                        <button
                            type="button"
                            onClick={() => setError(null)}
                            className="shrink-0"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
                    <main className="space-y-6">
                        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                            <div className="h-2 bg-violet-600" />

                            <div className="p-6 md:p-8">
                                <div className="mb-7">
                                    <h1 className="text-3xl font-extrabold text-slate-950">
                                        Создать домашнее задание
                                    </h1>

                                    <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                                        Добавьте инструкцию, выберите формат ответа,
                                        баллы и дедлайн.
                                    </p>
                                </div>

                                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-600">
                    Название задания
                  </span>

                                    <input
                                        value={title}
                                        onChange={(event) =>
                                            setTitle(event.target.value)
                                        }
                                        placeholder="Например: Решить задачи 1–5"
                                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                                    />
                                </label>

                                <label className="mt-6 block">
                  <span className="mb-2 block text-sm font-bold text-slate-600">
                    Инструкция для студента
                  </span>

                                    <textarea
                                        value={description}
                                        onChange={(event) =>
                                            setDescription(event.target.value)
                                        }
                                        rows={10}
                                        placeholder="Подробно опишите, что должен сделать студент. Здесь также можно указать ссылку."
                                        className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                                    />
                                </label>
                            </div>
                        </section>

                        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                            <h2 className="text-xl font-extrabold text-slate-950">
                                Как студент будет отвечать?
                            </h2>

                            <p className="mt-2 text-sm font-medium text-slate-500">
                                Выберите подходящий формат сдачи задания.
                            </p>

                            <div className="mt-6 grid gap-4 md:grid-cols-3">
                                <button
                                    type="button"
                                    onClick={() => setType("homework")}
                                    className={[
                                        "rounded-2xl border p-5 text-left transition",
                                        type === "homework"
                                            ? "border-violet-500 bg-violet-50 ring-4 ring-violet-100"
                                            : "border-slate-200 bg-white hover:border-violet-200",
                                    ].join(" ")}
                                >
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                                        <CheckCircle2 size={22} />
                                    </div>

                                    <div className="mt-4 font-extrabold text-slate-900">
                                        Текст или файл
                                    </div>

                                    <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
                                        Студент сможет отправить текст, файл или оба варианта.
                                    </p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setType("text_answer")}
                                    className={[
                                        "rounded-2xl border p-5 text-left transition",
                                        type === "text_answer"
                                            ? "border-violet-500 bg-violet-50 ring-4 ring-violet-100"
                                            : "border-slate-200 bg-white hover:border-violet-200",
                                    ].join(" ")}
                                >
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                                        <FileText size={22} />
                                    </div>

                                    <div className="mt-4 font-extrabold text-slate-900">
                                        Только текст
                                    </div>

                                    <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
                                        Студент должен написать текстовый ответ.
                                    </p>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setType("file_upload")}
                                    className={[
                                        "rounded-2xl border p-5 text-left transition",
                                        type === "file_upload"
                                            ? "border-violet-500 bg-violet-50 ring-4 ring-violet-100"
                                            : "border-slate-200 bg-white hover:border-violet-200",
                                    ].join(" ")}
                                >
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                                        <Paperclip size={22} />
                                    </div>

                                    <div className="mt-4 font-extrabold text-slate-900">
                                        Только файл
                                    </div>

                                    <p className="mt-2 text-xs font-medium leading-5 text-slate-500">
                                        Студент должен обязательно загрузить файл.
                                    </p>
                                </button>
                            </div>
                        </section>

                        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                            <h2 className="text-xl font-extrabold text-slate-950">
                                Оценивание и сроки
                            </h2>

                            <div className="mt-6 grid gap-5 md:grid-cols-2">
                                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-600">
                    Максимальный балл
                  </span>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={points}
                                        onChange={(event) =>
                                            setPoints(event.target.value)
                                        }
                                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                                    />
                                </label>

                                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-600">
                    Дедлайн
                  </span>

                                    <div className="relative">
                                        <CalendarDays
                                            size={18}
                                            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                        />

                                        <input
                                            type="datetime-local"
                                            value={deadline}
                                            onChange={(event) =>
                                                setDeadline(event.target.value)
                                            }
                                            className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                                        />
                                    </div>
                                </label>
                            </div>
                        </section>
                    </main>

                    <aside className="h-fit space-y-6 lg:sticky lg:top-5">
                        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h2 className="text-lg font-extrabold text-slate-950">
                                Публикация
                            </h2>

                            <div className="mt-5 space-y-5">
                                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-500">
                    Группа
                  </span>

                                    <select
                                        value={selectedGroupId}
                                        disabled={loadingGroups}
                                        onChange={(event) => {
                                            setSelectedGroupId(
                                                event.target.value
                                            );
                                            setSelectedSessionId("");
                                        }}
                                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:opacity-50"
                                    >
                                        {groups.length === 0 ? (
                                            <option value="">
                                                Групп нет
                                            </option>
                                        ) : (
                                            groups.map((group) => (
                                                <option
                                                    key={group.id}
                                                    value={group.id}
                                                >
                                                    {group.name}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </label>

                                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-500">
                    Сессия (урок)
                  </span>

                                    <select
                                        value={selectedSessionId}
                                        disabled={
                                            !selectedGroupId || loadingSessions
                                        }
                                        onChange={(event) =>
                                            setSelectedSessionId(
                                                event.target.value
                                            )
                                        }
                                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:opacity-50"
                                    >
                                        <option value="">
                                            Без привязки к уроку
                                        </option>

                                        {sessions.map((session) => (
                                            <option
                                                key={session.id}
                                                value={session.id}
                                            >
                                                {session.title}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>

                            <div className="mt-6 rounded-2xl bg-violet-50 px-4 py-4 text-sm font-medium leading-6 text-violet-800">
                                После публикации задание появится у студентов выбранной группы.
                            </div>
                        </section>

                        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <h3 className="font-extrabold text-slate-900">
                                Формат ответа
                            </h3>

                            <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                                {type === "homework" &&
                                    "Студент сможет отправить текстовый ответ, файл или оба варианта."}

                                {type === "text_answer" &&
                                    "Без текстового ответа студент не сможет сдать задание."}

                                {type === "file_upload" &&
                                    "Без загруженного файла студент не сможет сдать задание."}
                            </p>
                        </section>
                    </aside>
                </div>
            </div>
        </div>
    );
}

export default function CreateHomeworkPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center bg-[#f8f9ff]">
                    <Loader2
                        size={28}
                        className="animate-spin text-violet-600"
                    />
                </div>
            }
        >
            <CreateHomeworkContent />
        </Suspense>
    );
}