"use client";

import {
    Suspense,
    useEffect,
    useMemo,
    useState,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
    ArrowLeft,
    CheckCircle2,
    Copy,
    Eye,
    GripVertical,
    Loader2,
    Plus,
    RotateCcw,
    Save,
    Settings2,
    Trash2,
    X,
} from "lucide-react";

import { api } from "@/lib/api/client";
import {
    getGroupById,
    getTeacherGroups,
    type GroupSession,
    type TeacherGroup,
} from "@/lib/api/teacher";
import { createTask } from "@/lib/api/tasks";

type QuestionType = "single_choice" | "multiple_choice";

type BuilderOption = {
    clientId: string;
    text: string;
    isCorrect: boolean;
};

type BuilderQuestion = {
    clientId: string;
    type: QuestionType;
    text: string;
    points: string;
    explanation: string;
    options: BuilderOption[];
};

type CreatedTest = {
    id: string;
    title: string;
    status: "draft" | "published" | "closed";
};

type CreatedQuestion = {
    id: string;
};

function makeClientId(prefix: string) {
    const random =
        typeof globalThis.crypto !== "undefined" &&
        typeof globalThis.crypto.randomUUID === "function"
            ? globalThis.crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    return `${prefix}-${random}`;
}

function createOption(
    text = "",
    isCorrect = false,
    id?: string
): BuilderOption {
    return {
        clientId: id || makeClientId("option"),
        text,
        isCorrect,
    };
}

function createQuestion(id?: string): BuilderQuestion {
    return {
        clientId: id || makeClientId("question"),
        type: "single_choice",
        text: "",
        points: "1",
        explanation: "",
        options: [
            createOption("", true),
            createOption(""),
            createOption(""),
            createOption(""),
        ],
    };
}

function createInitialQuestion(): BuilderQuestion {
    return {
        clientId: "initial-question",
        type: "single_choice",
        text: "",
        points: "1",
        explanation: "",
        options: [
            createOption("", true, "initial-option-1"),
            createOption("", false, "initial-option-2"),
            createOption("", false, "initial-option-3"),
            createOption("", false, "initial-option-4"),
        ],
    };
}

function toIsoDate(value: string): string | null {
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toISOString();
}

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

function Toggle({
                    checked,
                    onChange,
                    disabled,
                }: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={[
                "relative h-6 w-11 rounded-full transition disabled:cursor-not-allowed disabled:opacity-50",
                checked ? "bg-violet-600" : "bg-slate-300",
            ].join(" ")}
        >
      <span
          className={[
              "absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition",
              checked ? "left-6" : "left-1",
          ].join(" ")}
      />
        </button>
    );
}

function CreateTestContent() {
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

    const [questions, setQuestions] = useState<BuilderQuestion[]>([
        createInitialQuestion(),
    ]);

    const [timeLimitMinutes, setTimeLimitMinutes] = useState("30");
    const [attemptsAllowed, setAttemptsAllowed] = useState("1");
    const [startsAt, setStartsAt] = useState("");
    const [endsAt, setEndsAt] = useState("");

    const [shuffleQuestions, setShuffleQuestions] = useState(false);
    const [shuffleOptions, setShuffleOptions] = useState(false);

    const [previewOpen, setPreviewOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState<string | null>(null);

    const totalPoints = useMemo(() => {
        return questions.reduce((sum, question) => {
            const value = Number(question.points);
            return sum + (Number.isFinite(value) ? Math.max(0, value) : 0);
        }, 0);
    }, [questions]);

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
                    if (current && list.some((session) => session.id === current)) {
                        return current;
                    }

                    const canUseInitialSession =
                        selectedGroupId === initialGroupId &&
                        list.some((session) => session.id === initialSessionId);

                    return canUseInitialSession ? initialSessionId : "";
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

    function updateQuestion(
        questionId: string,
        updates: Partial<BuilderQuestion>
    ) {
        setQuestions((current) =>
            current.map((question) =>
                question.clientId === questionId
                    ? { ...question, ...updates }
                    : question
            )
        );
    }

    function updateOption(
        questionId: string,
        optionId: string,
        updates: Partial<BuilderOption>
    ) {
        setQuestions((current) =>
            current.map((question) => {
                if (question.clientId !== questionId) {
                    return question;
                }

                return {
                    ...question,
                    options: question.options.map((option) =>
                        option.clientId === optionId
                            ? { ...option, ...updates }
                            : option
                    ),
                };
            })
        );
    }

    function changeQuestionType(
        questionId: string,
        type: QuestionType
    ) {
        setQuestions((current) =>
            current.map((question) => {
                if (question.clientId !== questionId) {
                    return question;
                }

                if (type === "single_choice") {
                    const firstCorrectIndex = question.options.findIndex(
                        (option) => option.isCorrect
                    );

                    return {
                        ...question,
                        type,
                        options: question.options.map((option, index) => ({
                            ...option,
                            isCorrect:
                                firstCorrectIndex >= 0
                                    ? index === firstCorrectIndex
                                    : index === 0,
                        })),
                    };
                }

                return {
                    ...question,
                    type,
                };
            })
        );
    }

    function toggleCorrectOption(
        questionId: string,
        optionId: string
    ) {
        setQuestions((current) =>
            current.map((question) => {
                if (question.clientId !== questionId) {
                    return question;
                }

                if (question.type === "single_choice") {
                    return {
                        ...question,
                        options: question.options.map((option) => ({
                            ...option,
                            isCorrect: option.clientId === optionId,
                        })),
                    };
                }

                return {
                    ...question,
                    options: question.options.map((option) =>
                        option.clientId === optionId
                            ? { ...option, isCorrect: !option.isCorrect }
                            : option
                    ),
                };
            })
        );
    }

    function addQuestion() {
        setQuestions((current) => [...current, createQuestion()]);

        window.setTimeout(() => {
            window.scrollTo({
                top: document.body.scrollHeight,
                behavior: "smooth",
            });
        }, 50);
    }

    function duplicateQuestion(questionId: string) {
        setQuestions((current) => {
            const source = current.find(
                (question) => question.clientId === questionId
            );

            if (!source) {
                return current;
            }

            const duplicate: BuilderQuestion = {
                ...source,
                clientId: makeClientId("question"),
                options: source.options.map((option) => ({
                    ...option,
                    clientId: makeClientId("option"),
                })),
            };

            const index = current.findIndex(
                (question) => question.clientId === questionId
            );

            const next = [...current];
            next.splice(index + 1, 0, duplicate);

            return next;
        });
    }

    function deleteQuestion(questionId: string) {
        if (questions.length === 1) {
            setQuestions([createQuestion()]);
            return;
        }

        setQuestions((current) =>
            current.filter(
                (question) => question.clientId !== questionId
            )
        );
    }

    function addOption(questionId: string) {
        setQuestions((current) =>
            current.map((question) => {
                if (question.clientId !== questionId) {
                    return question;
                }

                return {
                    ...question,
                    options: [...question.options, createOption()],
                };
            })
        );
    }

    function deleteOption(
        questionId: string,
        optionId: string
    ) {
        setQuestions((current) =>
            current.map((question) => {
                if (question.clientId !== questionId) {
                    return question;
                }

                if (question.options.length <= 2) {
                    return question;
                }

                const nextOptions = question.options.filter(
                    (option) => option.clientId !== optionId
                );

                if (
                    question.type === "single_choice" &&
                    !nextOptions.some((option) => option.isCorrect)
                ) {
                    nextOptions[0] = {
                        ...nextOptions[0],
                        isCorrect: true,
                    };
                }

                return {
                    ...question,
                    options: nextOptions,
                };
            })
        );
    }

    function resetBuilder() {
        const confirmed = window.confirm(
            "Очистить название, настройки и все вопросы?"
        );

        if (!confirmed) return;

        setTitle("");
        setDescription("");
        setQuestions([createQuestion()]);
        setTimeLimitMinutes("30");
        setAttemptsAllowed("1");
        setStartsAt("");
        setEndsAt("");
        setShuffleQuestions(false);
        setShuffleOptions(false);
        setError(null);
    }

    function validate(): string | null {
        if (!title.trim()) {
            return "Введите название теста";
        }

        if (!selectedGroupId) {
            return "Выберите группу";
        }

        if (questions.length === 0) {
            return "Добавьте хотя бы один вопрос";
        }

        const startDate = startsAt ? new Date(startsAt) : null;
        const endDate = endsAt ? new Date(endsAt) : null;

        if (
            startDate &&
            Number.isNaN(startDate.getTime())
        ) {
            return "Неверная дата начала";
        }

        if (
            endDate &&
            Number.isNaN(endDate.getTime())
        ) {
            return "Неверная дата завершения";
        }

        if (
            startDate &&
            endDate &&
            endDate.getTime() <= startDate.getTime()
        ) {
            return "Дата завершения должна быть позже даты начала";
        }

        for (let index = 0; index < questions.length; index += 1) {
            const question = questions[index];

            if (!question.text.trim()) {
                return `Введите текст вопроса №${index + 1}`;
            }

            const points = Number(question.points);

            if (!Number.isFinite(points) || points <= 0) {
                return `Укажите количество баллов для вопроса №${index + 1}`;
            }

            const filledOptions = question.options.filter(
                (option) => option.text.trim()
            );

            if (filledOptions.length < 2) {
                return `У вопроса №${index + 1} должно быть минимум 2 варианта`;
            }

            const correctCount = filledOptions.filter(
                (option) => option.isCorrect
            ).length;

            if (
                question.type === "single_choice" &&
                correctCount !== 1
            ) {
                return `У вопроса №${index + 1} должен быть ровно 1 правильный ответ`;
            }

            if (
                question.type === "multiple_choice" &&
                correctCount < 1
            ) {
                return `У вопроса №${index + 1} должен быть хотя бы 1 правильный ответ`;
            }
        }

        return null;
    }

    async function handlePublish() {
        const validationError = validate();

        if (validationError) {
            setError(validationError);
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }

        setSaving(true);
        setError(null);

        let createdTestId: string | null = null;
        let testPublished = false;

        try {
            const createdTest = await api.post<CreatedTest>("tests", {
                title: title.trim(),
                description: description.trim() || null,
                groupId: selectedGroupId,
                sessionId: selectedSessionId || null,
                timeLimitMinutes:
                    Number(timeLimitMinutes) > 0
                        ? Number(timeLimitMinutes)
                        : null,
                attemptsAllowed: Math.max(
                    1,
                    Number(attemptsAllowed) || 1
                ),
                shuffleQuestions,
                shuffleOptions,
                startsAt: toIsoDate(startsAt),
                endsAt: toIsoDate(endsAt),
            });

            createdTestId = createdTest.id;

            for (
                let questionIndex = 0;
                questionIndex < questions.length;
                questionIndex += 1
            ) {
                const question = questions[questionIndex];

                await api.post<CreatedQuestion>(
                    `tests/${createdTest.id}/questions`,
                    {
                        type: question.type,
                        text: question.text.trim(),
                        points: Number(question.points),
                        order: questionIndex,
                        explanation:
                            question.explanation.trim() || null,
                        options: question.options
                            .filter((option) => option.text.trim())
                            .map((option, optionIndex) => ({
                                text: option.text.trim(),
                                isCorrect: option.isCorrect,
                                order: optionIndex,
                            })),
                    }
                );
            }

            await api.post<CreatedTest>(
                `tests/${createdTest.id}/publish`
            );

            testPublished = true;

            await createTask({
                title: title.trim(),
                description: description.trim() || null,
                type: "test",
                status: "published",
                groupId: selectedGroupId,
                sessionId: selectedSessionId || null,
                testId: createdTest.id,
                deadline: toIsoDate(endsAt),
                points: totalPoints,
            });

            router.push("/teacher/tasks");
            router.refresh();
        } catch (requestError) {
            if (createdTestId && !testPublished) {
                try {
                    await api.delete<{ ok: boolean }>(
                        `tests/${createdTestId}`
                    );
                } catch {
                    // Не блокируем основную ошибку, если очистить draft не удалось.
                }
            }

            const fallback = testPublished
                ? "Тест опубликован, но карточка задачи не была создана"
                : "Не удалось создать тест";

            setError(getErrorMessage(requestError, fallback));
            window.scrollTo({ top: 0, behavior: "smooth" });
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#f8f9ff] px-4 py-5 text-slate-900 md:px-6">
            <div className="mx-auto max-w-[1500px]">
                <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                    <div className="flex items-center gap-5">
                        <Link
                            href="/teacher/tasks"
                            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-violet-600"
                        >
                            <ArrowLeft size={18} />
                            Назад
                        </Link>

                        <nav className="hidden items-center gap-8 md:flex">
                            <button
                                type="button"
                                onClick={() =>
                                    document
                                        .getElementById("test-questions")
                                        ?.scrollIntoView({ behavior: "smooth" })
                                }
                                className="border-b-2 border-violet-600 px-2 py-2 text-sm font-extrabold text-violet-600"
                            >
                                Вопросы
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    document
                                        .getElementById("test-settings")
                                        ?.scrollIntoView({ behavior: "smooth" })
                                }
                                className="px-2 py-2 text-sm font-extrabold text-slate-500 transition hover:text-violet-600"
                            >
                                Настройки
                            </button>
                        </nav>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3">
                        <button
                            type="button"
                            onClick={() => setPreviewOpen(true)}
                            className="hidden items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 md:inline-flex"
                        >
                            <Eye size={18} />
                            Предпросмотр
                        </button>

                        <button
                            type="button"
                            onClick={resetBuilder}
                            disabled={saving}
                            title="Очистить форму"
                            className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
                        >
                            <RotateCcw size={18} />
                        </button>

                        <button
                            type="button"
                            onClick={() => void handlePublish()}
                            disabled={
                                saving ||
                                loadingGroups ||
                                !selectedGroupId
                            }
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-extrabold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saving ? (
                                <Loader2
                                    size={17}
                                    className="animate-spin"
                                />
                            ) : (
                                <Save size={17} />
                            )}

                            {saving ? "Публикуем..." : "Опубликовать"}
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

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_230px_330px]">
                    <main
                        id="test-questions"
                        className="min-w-0 space-y-5"
                    >
                        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="h-2 bg-violet-600" />

                            <div className="p-6 md:p-8">
                                <input
                                    value={title}
                                    onChange={(event) =>
                                        setTitle(event.target.value)
                                    }
                                    placeholder="Название теста"
                                    className="w-full border-none bg-transparent text-2xl font-extrabold text-slate-950 outline-none placeholder:text-slate-300 md:text-3xl"
                                />

                                <textarea
                                    value={description}
                                    onChange={(event) =>
                                        setDescription(event.target.value)
                                    }
                                    rows={2}
                                    placeholder="Описание теста (необязательно)"
                                    className="mt-5 w-full resize-none border-none bg-transparent text-sm font-medium leading-6 text-slate-600 outline-none placeholder:text-slate-400"
                                />
                            </div>
                        </section>

                        {questions.map((question, questionIndex) => (
                            <section
                                key={question.clientId}
                                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                            >
                                <div className="flex justify-center py-2 text-slate-300">
                                    <GripVertical size={20} />
                                </div>

                                <div className="grid gap-6 px-6 pb-6 md:px-7 lg:grid-cols-[minmax(0,1fr)_230px]">
                                    <div className="min-w-0">
                                        <div className="mb-3 text-xs font-extrabold uppercase tracking-wide text-violet-600">
                                            Вопрос {questionIndex + 1}
                                        </div>

                                        <textarea
                                            value={question.text}
                                            onChange={(event) =>
                                                updateQuestion(question.clientId, {
                                                    text: event.target.value,
                                                })
                                            }
                                            rows={2}
                                            placeholder="Введите вопрос"
                                            className="w-full resize-none border-b border-slate-200 bg-transparent pb-3 text-base font-extrabold leading-7 text-slate-950 outline-none transition focus:border-violet-500"
                                        />

                                        <div className="mt-6 space-y-3">
                                            {question.options.map(
                                                (option, optionIndex) => (
                                                    <div
                                                        key={option.clientId}
                                                        className="group flex items-center gap-3"
                                                    >
                                                        <input
                                                            type={
                                                                question.type ===
                                                                "single_choice"
                                                                    ? "radio"
                                                                    : "checkbox"
                                                            }
                                                            name={`correct-${question.clientId}`}
                                                            checked={option.isCorrect}
                                                            onChange={() =>
                                                                toggleCorrectOption(
                                                                    question.clientId,
                                                                    option.clientId
                                                                )
                                                            }
                                                            className="h-4 w-4 shrink-0 accent-violet-600"
                                                        />

                                                        <input
                                                            value={option.text}
                                                            onChange={(event) =>
                                                                updateOption(
                                                                    question.clientId,
                                                                    option.clientId,
                                                                    {
                                                                        text: event.target.value,
                                                                    }
                                                                )
                                                            }
                                                            placeholder={`Вариант ${optionIndex + 1}`}
                                                            className="min-w-0 flex-1 border-b border-transparent bg-transparent px-1 py-2 text-sm font-semibold text-slate-700 outline-none transition hover:border-slate-200 focus:border-violet-500"
                                                        />

                                                        <button
                                                            type="button"
                                                            disabled={
                                                                question.options.length <= 2
                                                            }
                                                            onClick={() =>
                                                                deleteOption(
                                                                    question.clientId,
                                                                    option.clientId
                                                                )
                                                            }
                                                            title="Удалить вариант"
                                                            className="rounded-lg p-2 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 disabled:hidden group-hover:opacity-100"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                )
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                addOption(question.clientId)
                                            }
                                            className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-violet-600 transition hover:text-violet-700"
                                        >
                                            <Plus size={16} />
                                            Добавить вариант
                                        </button>

                                        <input
                                            value={question.explanation}
                                            onChange={(event) =>
                                                updateQuestion(question.clientId, {
                                                    explanation: event.target.value,
                                                })
                                            }
                                            placeholder="Пояснение правильного ответа (необязательно)"
                                            className="mt-6 w-full border-b border-slate-200 bg-transparent py-2 text-sm font-medium text-slate-600 outline-none transition focus:border-violet-500"
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                        Тип вопроса
                      </span>

                                            <select
                                                value={question.type}
                                                onChange={(event) =>
                                                    changeQuestionType(
                                                        question.clientId,
                                                        event.target
                                                            .value as QuestionType
                                                    )
                                                }
                                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                                            >
                                                <option value="single_choice">
                                                    Один правильный ответ
                                                </option>

                                                <option value="multiple_choice">
                                                    Несколько правильных
                                                </option>
                                            </select>
                                        </label>

                                        <label className="block">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                        Баллы
                      </span>

                                            <input
                                                type="number"
                                                min="0.5"
                                                step="0.5"
                                                value={question.points}
                                                onChange={(event) =>
                                                    updateQuestion(question.clientId, {
                                                        points: event.target.value,
                                                    })
                                                }
                                                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                                            />
                                        </label>

                                        <div className="rounded-xl bg-violet-50 px-4 py-3 text-xs font-semibold leading-5 text-violet-700">
                                            Отметьте кружком или галочкой правильный ответ.
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            duplicateQuestion(question.clientId)
                                        }
                                        title="Дублировать вопрос"
                                        className="rounded-xl p-2.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                    >
                                        <Copy size={17} />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            deleteQuestion(question.clientId)
                                        }
                                        title="Удалить вопрос"
                                        className="rounded-xl p-2.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                                    >
                                        <Trash2 size={17} />
                                    </button>
                                </div>
                            </section>
                        ))}
                    </main>

                    <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm xl:sticky xl:top-5">
                        <button
                            type="button"
                            onClick={addQuestion}
                            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-600 transition hover:bg-violet-50 hover:text-violet-600"
                        >
                            <Plus size={19} />
                            Добавить вопрос
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                document
                                    .getElementById("test-settings")
                                    ?.scrollIntoView({ behavior: "smooth" })
                            }
                            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-600 transition hover:bg-violet-50 hover:text-violet-600"
                        >
                            <Settings2 size={19} />
                            Настройки теста
                        </button>

                        <button
                            type="button"
                            onClick={() => setPreviewOpen(true)}
                            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold text-slate-600 transition hover:bg-violet-50 hover:text-violet-600"
                        >
                            <Eye size={19} />
                            Предпросмотр
                        </button>
                    </aside>

                    <aside
                        id="test-settings"
                        className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-5"
                    >
                        <h2 className="mb-6 text-lg font-extrabold text-slate-950">
                            Настройки теста
                        </h2>

                        <div className="space-y-5">
                            <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-500">
                  Группа
                </span>

                                <select
                                    value={selectedGroupId}
                                    disabled={loadingGroups}
                                    onChange={(event) => {
                                        setSelectedGroupId(event.target.value);
                                        setSelectedSessionId("");
                                    }}
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:opacity-50"
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
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:opacity-50"
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

                            <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-500">
                  Баллы за тест
                </span>

                                <div className="flex h-11 items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-extrabold text-slate-700">
                                    <span>{totalPoints}</span>
                                    <span className="text-xs font-semibold text-slate-400">
                    сумма вопросов
                  </span>
                                </div>
                            </label>

                            <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-500">
                  Время на тест
                </span>

                                <div className="relative">
                                    <input
                                        type="number"
                                        min="1"
                                        value={timeLimitMinutes}
                                        onChange={(event) =>
                                            setTimeLimitMinutes(
                                                event.target.value
                                            )
                                        }
                                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 pr-20 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                                    />

                                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    минут
                  </span>
                                </div>
                            </label>

                            <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-500">
                  Количество попыток
                </span>

                                <input
                                    type="number"
                                    min="1"
                                    value={attemptsAllowed}
                                    onChange={(event) =>
                                        setAttemptsAllowed(event.target.value)
                                    }
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                                />
                            </label>

                            <div className="border-t border-slate-100 pt-5">
                                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-bold text-slate-600">
                    Перемешивать вопросы
                  </span>

                                    <Toggle
                                        checked={shuffleQuestions}
                                        onChange={setShuffleQuestions}
                                    />
                                </div>

                                <div className="mt-5 flex items-center justify-between gap-4">
                  <span className="text-sm font-bold text-slate-600">
                    Перемешивать варианты
                  </span>

                                    <Toggle
                                        checked={shuffleOptions}
                                        onChange={setShuffleOptions}
                                    />
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-5">
                                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-500">
                    Доступен с
                  </span>

                                    <input
                                        type="datetime-local"
                                        value={startsAt}
                                        onChange={(event) =>
                                            setStartsAt(event.target.value)
                                        }
                                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                                    />
                                </label>

                                <label className="mt-4 block">
                  <span className="mb-2 block text-sm font-bold text-slate-500">
                    Дедлайн
                  </span>

                                    <input
                                        type="datetime-local"
                                        value={endsAt}
                                        onChange={(event) =>
                                            setEndsAt(event.target.value)
                                        }
                                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                                    />
                                </label>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            {previewOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
                        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
                            <div>
                                <h2 className="text-xl font-extrabold text-slate-950">
                                    Предпросмотр теста
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Так тест будет выглядеть для студента
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setPreviewOpen(false)}
                                className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"
                            >
                                <X size={21} />
                            </button>
                        </div>

                        <div className="space-y-5 p-6">
                            <div className="rounded-2xl border border-violet-200 bg-violet-50 p-6">
                                <h3 className="text-2xl font-extrabold text-slate-950">
                                    {title.trim() || "Без названия"}
                                </h3>

                                {description.trim() && (
                                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                        {description}
                                    </p>
                                )}

                                <div className="mt-4 text-sm font-bold text-violet-700">
                                    {questions.length} вопросов ·{" "}
                                    {totalPoints} баллов
                                </div>
                            </div>

                            {questions.map((question, index) => (
                                <div
                                    key={question.clientId}
                                    className="rounded-2xl border border-slate-200 p-6"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <h4 className="font-extrabold leading-6 text-slate-900">
                                            {index + 1}.{" "}
                                            {question.text.trim() ||
                                                "Текст вопроса"}
                                        </h4>

                                        <span className="shrink-0 text-xs font-bold text-slate-400">
                      {question.points || 0} балл.
                    </span>
                                    </div>

                                    <div className="mt-5 space-y-3">
                                        {question.options.map((option) => (
                                            <label
                                                key={option.clientId}
                                                className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3"
                                            >
                                                <input
                                                    type={
                                                        question.type ===
                                                        "single_choice"
                                                            ? "radio"
                                                            : "checkbox"
                                                    }
                                                    disabled
                                                    className="h-4 w-4"
                                                />

                                                <span className="text-sm font-medium text-slate-700">
                          {option.text.trim() ||
                              "Вариант ответа"}
                        </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
                                <CheckCircle2 size={20} />
                                Предпросмотр не отправляет ответы.
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function CreateTestPage() {
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
            <CreateTestContent />
        </Suspense>
    );
}