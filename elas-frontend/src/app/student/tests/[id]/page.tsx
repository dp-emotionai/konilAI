"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Clock3,
    Loader2,
    Send,
} from "lucide-react";

import { api } from "@/lib/api/client";

type QuestionType =
    | "single_choice"
    | "multiple_choice"
    | "text";

type StudentTestOption = {
    id: string;
    questionId: string;
    text?: string | null;
    order: number;
};

type StudentTestQuestion = {
    id: string;
    testId: string;
    type: QuestionType;
    text: string;
    points: number;
    order: number;
    options: StudentTestOption[];
};

type StudentTest = {
    id: string;
    title: string;
    description?: string | null;
    groupId?: string | null;
    sessionId?: string | null;
    status: "draft" | "published" | "closed";
    timeLimitMinutes?: number | null;
    attemptsAllowed?: number | null;
    startsAt?: string | null;
    endsAt?: string | null;
    questions: StudentTestQuestion[];
};

type TestSubmission = {
    id: string;
    testId: string;
    studentId: string;
    status: string;
    score?: number | null;
    maxScore?: number | null;
    startedAt?: string | null;
    submittedAt?: string | null;
};

type SelectedAnswers = Record<string, string[]>;
type TextAnswers = Record<string, string>;

function getErrorMessage(
    error: unknown,
    fallback: string
): string {
    return error instanceof Error ? error.message : fallback;
}

function formatDate(value?: string | null): string {
    if (!value) return "Не указано";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function StudentTestPage() {
    const params = useParams<{ id: string }>();

    const testId =
        typeof params.id === "string" ? params.id : "";

    const [test, setTest] = useState<StudentTest | null>(
        null
    );

    const [result, setResult] =
        useState<TestSubmission | null>(null);

    const [selectedAnswers, setSelectedAnswers] =
        useState<SelectedAnswers>({});

    const [textAnswers, setTextAnswers] =
        useState<TextAnswers>({});

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [error, setError] = useState<string | null>(
        null
    );

    const answeredCount = useMemo(() => {
        if (!test) return 0;

        return test.questions.filter((question) => {
            if (question.type === "text") {
                return Boolean(
                    textAnswers[question.id]?.trim()
                );
            }

            return Boolean(
                selectedAnswers[question.id]?.length
            );
        }).length;
    }, [test, selectedAnswers, textAnswers]);

    const loadExistingResult =
        useCallback(async (): Promise<TestSubmission | null> => {
            if (!testId) return null;

            try {
                return await api.get<TestSubmission>(
                    `tests/${testId}/my-result`
                );
            } catch {
                return null;
            }
        }, [testId]);

    const loadTest = useCallback(async () => {
        if (!testId) {
            setError("ID теста не найден");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const existingResult =
                await loadExistingResult();

            if (existingResult) {
                setResult(existingResult);
                return;
            }

            const loadedTest = await api.get<StudentTest>(
                `tests/student/${testId}`
            );

            setTest(loadedTest);
        } catch (requestError) {
            setError(
                getErrorMessage(
                    requestError,
                    "Не удалось загрузить тест"
                )
            );
        } finally {
            setLoading(false);
        }
    }, [testId, loadExistingResult]);

    useEffect(() => {
        void loadTest();
    }, [loadTest]);

    function selectSingleAnswer(
        questionId: string,
        optionId: string
    ) {
        setSelectedAnswers((current) => ({
            ...current,
            [questionId]: [optionId],
        }));
    }

    function toggleMultipleAnswer(
        questionId: string,
        optionId: string
    ) {
        setSelectedAnswers((current) => {
            const selected = current[questionId] || [];

            const next = selected.includes(optionId)
                ? selected.filter((id) => id !== optionId)
                : [...selected, optionId];

            return {
                ...current,
                [questionId]: next,
            };
        });
    }

    function validateAnswers(): string | null {
        if (!test) {
            return "Тест не загружен";
        }

        for (
            let index = 0;
            index < test.questions.length;
            index += 1
        ) {
            const question = test.questions[index];

            if (question.type === "text") {
                if (!textAnswers[question.id]?.trim()) {
                    return `Ответьте на вопрос №${index + 1}`;
                }

                continue;
            }

            const selected =
                selectedAnswers[question.id] || [];

            if (selected.length === 0) {
                return `Выберите ответ в вопросе №${index + 1}`;
            }

            if (
                question.type === "single_choice" &&
                selected.length !== 1
            ) {
                return `В вопросе №${index + 1} можно выбрать только один ответ`;
            }
        }

        return null;
    }

    async function handleSubmit() {
        if (!test || submitting) return;

        const validationError = validateAnswers();

        if (validationError) {
            setError(validationError);
            window.scrollTo({
                top: 0,
                behavior: "smooth",
            });
            return;
        }

        const confirmed = window.confirm(
            "Отправить тест? После отправки изменить ответы нельзя."
        );

        if (!confirmed) return;

        setSubmitting(true);
        setError(null);

        try {
            const answers = test.questions.map(
                (question) => {
                    if (question.type === "text") {
                        return {
                            questionId: question.id,
                            selectedOptionIds: [],
                            textAnswer:
                                textAnswers[question.id]?.trim() ||
                                null,
                        };
                    }

                    return {
                        questionId: question.id,
                        selectedOptionIds:
                            selectedAnswers[question.id] || [],
                        textAnswer: null,
                    };
                }
            );

            const submitted =
                await api.post<TestSubmission>(
                    `tests/${test.id}/submit`,
                    {
                        answers,
                    }
                );

            setResult(submitted);

            window.scrollTo({
                top: 0,
                behavior: "smooth",
            });
        } catch (requestError) {
            const message = getErrorMessage(
                requestError,
                "Не удалось отправить тест"
            );

            if (
                message.includes(
                    "You have already submitted this test"
                )
            ) {
                const existingResult =
                    await loadExistingResult();

                if (existingResult) {
                    setResult(existingResult);
                    setError(null);
                    return;
                }
            }

            setError(message);

            window.scrollTo({
                top: 0,
                behavior: "smooth",
            });
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f8f9ff]">
                <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
                    <Loader2
                        size={24}
                        className="animate-spin text-violet-600"
                    />
                    Загрузка теста...
                </div>
            </div>
        );
    }

    if (result) {
        const score = result.score ?? 0;
        const maxScore = result.maxScore ?? 0;

        const percentage =
            maxScore > 0
                ? Math.round((score / maxScore) * 100)
                : 0;

        return (
            <div className="min-h-screen bg-[#f8f9ff] px-4 py-10 text-slate-900 md:px-6">
                <div className="mx-auto max-w-2xl">
                    <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm md:p-10">
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <CheckCircle2 size={42} />
                        </div>

                        <h1 className="mt-6 text-3xl font-extrabold text-slate-950">
                            Тест уже сдан
                        </h1>

                        <p className="mt-3 text-sm font-medium text-slate-500">
                            Ваш результат сохранён
                        </p>

                        <div className="mt-8 rounded-2xl bg-violet-50 px-6 py-7">
                            <div className="text-5xl font-extrabold text-violet-600">
                                {score} / {maxScore}
                            </div>

                            <div className="mt-3 text-sm font-bold text-violet-700">
                                {percentage}%
                            </div>
                        </div>

                        {result.submittedAt && (
                            <p className="mt-5 text-sm font-medium text-slate-500">
                                Отправлено:{" "}
                                {formatDate(result.submittedAt)}
                            </p>
                        )}

                        <Link
                            href="/student/tasks"
                            className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-7 text-sm font-extrabold text-white transition hover:bg-violet-700"
                        >
                            <ArrowLeft size={18} />
                            Вернуться к задачам
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (error && !test) {
        return (
            <div className="min-h-screen bg-[#f8f9ff] px-4 py-10 text-slate-900 md:px-6">
                <div className="mx-auto max-w-2xl">
                    <div className="rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                            <AlertCircle size={32} />
                        </div>

                        <h1 className="mt-5 text-2xl font-extrabold text-slate-950">
                            Тест не удалось открыть
                        </h1>

                        <p className="mt-3 text-sm font-medium text-red-600">
                            {error}
                        </p>

                        <div className="mt-7 flex justify-center gap-3">
                            <button
                                type="button"
                                onClick={() => void loadTest()}
                                className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                            >
                                Повторить
                            </button>

                            <Link
                                href="/student/tasks"
                                className="inline-flex h-11 items-center justify-center rounded-xl bg-violet-600 px-5 text-sm font-bold text-white transition hover:bg-violet-700"
                            >
                                К задачам
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!test) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[#f8f9ff] px-4 py-6 text-slate-900 md:px-6">
            <div className="mx-auto max-w-5xl">
                <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                    <Link
                        href="/student/tasks"
                        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-violet-600"
                    >
                        <ArrowLeft size={18} />
                        Назад к задачам
                    </Link>

                    <div className="flex items-center gap-2 rounded-xl bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700">
                        <Clock3 size={17} />

                        {test.timeLimitMinutes
                            ? `${test.timeLimitMinutes} минут`
                            : "Без ограничения времени"}
                    </div>
                </header>

                {error && (
                    <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
                        <AlertCircle
                            size={19}
                            className="mt-0.5 shrink-0"
                        />
                        {error}
                    </div>
                )}

                <section className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <div className="h-2 bg-violet-600" />

                    <div className="p-6 md:p-8">
                        <h1 className="text-3xl font-extrabold text-slate-950">
                            {test.title}
                        </h1>

                        {test.description && (
                            <p className="mt-4 whitespace-pre-wrap text-sm font-medium leading-7 text-slate-600">
                                {test.description}
                            </p>
                        )}

                        <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold">
              <span className="rounded-xl bg-violet-50 px-4 py-2 text-violet-700">
                {test.questions.length} вопросов
              </span>

                            <span className="rounded-xl bg-slate-100 px-4 py-2 text-slate-600">
                Отвечено: {answeredCount}/
                                {test.questions.length}
              </span>

                            {test.endsAt && (
                                <span className="rounded-xl bg-orange-50 px-4 py-2 text-orange-700">
                  Дедлайн: {formatDate(test.endsAt)}
                </span>
                            )}
                        </div>
                    </div>
                </section>

                <main className="space-y-5">
                    {test.questions.map(
                        (question, questionIndex) => {
                            const selected =
                                selectedAnswers[question.id] || [];

                            return (
                                <section
                                    key={question.id}
                                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
                                >
                                    <div className="flex items-start justify-between gap-5">
                                        <h2 className="text-base font-extrabold leading-7 text-slate-950">
                                            {questionIndex + 1}.{" "}
                                            {question.text}
                                        </h2>

                                        <span className="shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">
                      {question.points} балл.
                    </span>
                                    </div>

                                    {question.type === "text" ? (
                                        <textarea
                                            value={
                                                textAnswers[question.id] || ""
                                            }
                                            onChange={(event) =>
                                                setTextAnswers((current) => ({
                                                    ...current,
                                                    [question.id]:
                                                    event.target.value,
                                                }))
                                            }
                                            rows={5}
                                            placeholder="Введите ваш ответ..."
                                            className="mt-6 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                                        />
                                    ) : (
                                        <div className="mt-6 space-y-3">
                                            {question.options.map(
                                                (option) => {
                                                    const checked =
                                                        selected.includes(option.id);

                                                    return (
                                                        <label
                                                            key={option.id}
                                                            className={[
                                                                "flex cursor-pointer items-center gap-4 rounded-2xl border px-5 py-4 transition",
                                                                checked
                                                                    ? "border-violet-500 bg-violet-50 ring-4 ring-violet-100"
                                                                    : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/40",
                                                            ].join(" ")}
                                                        >
                                                            <input
                                                                type={
                                                                    question.type ===
                                                                    "single_choice"
                                                                        ? "radio"
                                                                        : "checkbox"
                                                                }
                                                                name={`question-${question.id}`}
                                                                checked={checked}
                                                                onChange={() => {
                                                                    if (
                                                                        question.type ===
                                                                        "single_choice"
                                                                    ) {
                                                                        selectSingleAnswer(
                                                                            question.id,
                                                                            option.id
                                                                        );
                                                                    } else {
                                                                        toggleMultipleAnswer(
                                                                            question.id,
                                                                            option.id
                                                                        );
                                                                    }
                                                                }}
                                                                className="h-4 w-4 shrink-0 accent-violet-600"
                                                            />

                                                            <span className="text-sm font-semibold text-slate-700">
                                {option.text ||
                                    "Вариант ответа"}
                              </span>
                                                        </label>
                                                    );
                                                }
                                            )}
                                        </div>
                                    )}
                                </section>
                            );
                        }
                    )}
                </main>

                <div className="sticky bottom-4 mt-7 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
                    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                        <div className="text-sm font-bold text-slate-500">
                            Отвечено: {answeredCount} из{" "}
                            {test.questions.length}
                        </div>

                        <button
                            type="button"
                            onClick={() => void handleSubmit()}
                            disabled={submitting}
                            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-7 text-sm font-extrabold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        >
                            {submitting ? (
                                <Loader2
                                    size={18}
                                    className="animate-spin"
                                />
                            ) : (
                                <Send size={18} />
                            )}

                            {submitting
                                ? "Отправляем..."
                                : "Завершить тест"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}