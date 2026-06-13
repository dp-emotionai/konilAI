"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Bold,
  CalendarDays,
  ExternalLink,
  FileText,
  Files,
  Italic,
  Link2,
  List,
  Loader2,
  MoreVertical,
  Paperclip,
  Save,
  Send,
  Underline,
  UploadCloud,
  Users,
  X,
} from "lucide-react";

import {
  getGroupById,
  getTeacherGroups,
  type GroupSession,
  type TeacherGroup,
} from "@/lib/api/teacher";
import { createTask,
    updateTask,
    uploadTaskMaterials,
    type TaskStatus,
    type TaskType,
} from "@/lib/api/tasks";

type AnswerMode =
  | "text"
  | "file"
  | "file_or_text"
  | "link";

type AnswerTypeCard = {
  id: AnswerMode;
  title: string;
  description: string;
  icon: typeof FileText;
  iconClassName: string;
};

const ANSWER_TYPES: AnswerTypeCard[] = [
  {
    id: "text",
    title: "Текстовый ответ",
    description: "Студент пишет ответ в текстовом поле",
    icon: FileText,
    iconClassName: "bg-violet-100 text-violet-600",
  },
  {
    id: "file",
    title: "Файл",
    description: "Студент загружает один файл",
    icon: Paperclip,
    iconClassName: "bg-blue-100 text-blue-600",
  },
  {
    id: "file_or_text",
    title: "Файл или текст",
    description: "Студент может выбрать формат ответа",
    icon: Files,
    iconClassName: "bg-fuchsia-100 text-fuchsia-600",
  },
  {
    id: "link",
    title: "Ссылка",
    description: "Студент предоставляет ссылку",
    icon: ExternalLink,
    iconClassName: "bg-emerald-100 text-emerald-600",
  },
];

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  return error instanceof Error
    ? error.message
    : fallback;
}

function toIsoDate(value: string): string | null {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function getTaskType(answerMode: AnswerMode): TaskType {
  if (answerMode === "file") {
    return "file_upload";
  }

  if (
    answerMode === "text" ||
    answerMode === "link"
  ) {
    return "text_answer";
  }

  return "homework";
}

function Switch({
  checked,
  onChange,
  disabled = false,
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
        "relative h-6 w-11 shrink-0 rounded-full transition",
        checked ? "bg-violet-600" : "bg-slate-300",
        disabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer",
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

function CreateHomeworkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const descriptionRef =
    useRef<HTMLTextAreaElement | null>(null);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const initialGroupId =
    searchParams.get("groupId") || "";

  const initialSessionId =
    searchParams.get("sessionId") || "";

  const [groups, setGroups] =
    useState<TeacherGroup[]>([]);

  const [sessions, setSessions] =
    useState<GroupSession[]>([]);

  const [selectedGroupId, setSelectedGroupId] =
    useState("");

  const [selectedSessionId, setSelectedSessionId] =
    useState("");

  const [loadingGroups, setLoadingGroups] =
    useState(true);

  const [loadingSessions, setLoadingSessions] =
    useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");

  const [studentInstructions, setStudentInstructions] =
    useState("");

  const [answerMode, setAnswerMode] =
    useState<AnswerMode>("text");

  const [points, setPoints] = useState("10");
  const [deadline, setDeadline] = useState("");

  const [publishNow, setPublishNow] =
    useState(true);

    const [ allowLateSubmission,
        setAllowLateSubmission,
    ] = useState(false);

  const [selectedFiles, setSelectedFiles] =
    useState<File[]>([]);

  const [dragActive, setDragActive] =
    useState(false);

  const [savingStatus, setSavingStatus] =
    useState<TaskStatus | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadGroups() {
      setLoadingGroups(true);

      try {
        const result = await getTeacherGroups();

        if (!active) return;

        const list = Array.isArray(result)
          ? result
          : [];

        setGroups(list);

        const initialExists = list.some(
          (group) => group.id === initialGroupId
        );

        setSelectedGroupId(
          initialExists
            ? initialGroupId
            : list[0]?.id || ""
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
        const detail =
          await getGroupById(selectedGroupId);

        if (!active) return;

        const list = Array.isArray(detail?.sessions)
          ? detail.sessions
          : [];

        setSessions(list);

        setSelectedSessionId((current) => {
          if (
            current &&
            list.some(
              (session) => session.id === current
            )
          ) {
            return current;
          }

          const initialSessionExists =
            selectedGroupId === initialGroupId &&
            list.some(
              (session) =>
                session.id === initialSessionId
            );

          return initialSessionExists
            ? initialSessionId
            : list[0]?.id || "";
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
  }, [
    selectedGroupId,
    initialGroupId,
    initialSessionId,
  ]);

  function formatDescription(
    prefix: string,
    suffix = prefix
  ) {
    const textarea = descriptionRef.current;

    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = description.slice(
      start,
      end
    );

    const nextValue =
      description.slice(0, start) +
      prefix +
      selectedText +
      suffix +
      description.slice(end);

    setDescription(nextValue.slice(0, 2000));

    window.setTimeout(() => {
      textarea.focus();

      const cursorPosition =
        start +
        prefix.length +
        selectedText.length +
        suffix.length;

      textarea.setSelectionRange(
        cursorPosition,
        cursorPosition
      );
    }, 0);
  }

  function addList() {
    const textarea = descriptionRef.current;

    if (!textarea) return;

    const start = textarea.selectionStart;

    const nextValue =
      description.slice(0, start) +
      "\n• " +
      description.slice(start);

    setDescription(nextValue.slice(0, 2000));

    window.setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + 3,
        start + 3
      );
    }, 0);
  }

  function addLinkTemplate() {
    const textarea = descriptionRef.current;

    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const selectedText =
      description.slice(start, end) || "ссылка";

    const template = `[${selectedText}](https://)`;

const nextValue =
    description.slice(0, start) +
    template +
    description.slice(end);

setDescription(nextValue.slice(0, 2000));
}

function addFiles(files: File[]) {
    const accepted = files.filter(
        (file) => file.size <= 100 * 1024 * 1024
    );

    setSelectedFiles((current) => {
        const existing = new Set(
            current.map(
                (file) =>
                    `${file.name}-${file.size}-${file.lastModified}`
            )
        );

        const unique = accepted.filter(
            (file) =>
                !existing.has(
                    `${file.name}-${file.size}-${file.lastModified}`
                )
        );

        return [...current, ...unique];
    });
}

function handleDrop(
    event: DragEvent<HTMLDivElement>
) {
    event.preventDefault();
    setDragActive(false);

    addFiles(Array.from(event.dataTransfer.files));
}

function removeFile(index: number) {
    setSelectedFiles((current) =>
        current.filter(
            (_, fileIndex) => fileIndex !== index
        )
    );
}

function validate(): string | null {
    if (!title.trim()) {
        return "Введите название задания";
    }

    if (!selectedGroupId) {
        return "Выберите группу";
    }

    if (
        sessions.length > 0 &&
        !selectedSessionId
    ) {
        return "Выберите сессию";
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
            return "Укажите правильный дедлайн";
        }
    }

    return null;
}

async function handleSave(
    requestedStatus: "draft" | "published"
) {
    const validationError = validate();

    if (validationError) {
        setError(validationError);

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });

        return;
    }

    const finalStatus =
        requestedStatus === "draft"
            ? "draft"
            : publishNow
                ? "published"
                : "draft";

    setSavingStatus(requestedStatus);
    setError(null);

    try {
        const descriptionParts = [
            description.trim(),
            studentInstructions.trim()
                ? `Инструкции для студента:\n${studentInstructions.trim()}`
                : "",
            answerMode === "link"
                ? "Формат ответа: ссылка"
                : "",
        ].filter(Boolean);

        const createdTask = await createTask({
            title: title.trim(), description: descriptionParts.join("\n\n") || null,
            type: getTaskType(answerMode),
            status: "draft",
            groupId: selectedGroupId,
            sessionId: selectedSessionId || null,
            testId: null,
            deadline: toIsoDate(deadline),
            points: Number(points) || 0,
            allowLateSubmission,
        });
        if (selectedFiles.length > 0) {
            await uploadTaskMaterials(
                createdTask.id, selectedFiles
            );
        }
        if (finalStatus === "published") {
            await updateTask(createdTask.id, {
                status: "published",
            });
        }

        router.push("/teacher/tasks");
        router.refresh();
    } catch (requestError) {
        setError(
            getErrorMessage(
                requestError,
                requestedStatus === "draft"
                    ? "Не удалось сохранить черновик"
                    : "Не удалось создать задание"
            )
        );

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    } finally {
        setSavingStatus(null);
    }
}

const saving = savingStatus !== null;

return (
    <div className="min-h-screen bg-[#fafbff] px-4 py-6 text-slate-900 md:px-6">
        <div className="mx-auto max-w-[1500px]">
            <Link
                href="/teacher/tasks"
                className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-violet-600"
            >
                <ArrowLeft size={17} />
                Назад
            </Link>

            <div className="mt-5">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">
                    Создание домашнего задания 📝
                </h1>

                <p className="mt-2 text-sm font-medium text-slate-500">
                    Создайте новое задание для вашей группы
                </p>
            </div>

            {error && (
                <div className="mt-6 flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
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

            <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
                <main className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
                    <label className="block">
              <span className="mb-2 block text-sm font-extrabold text-slate-600">
                Название задания{" "}
                  <span className="text-red-500">*</span>
              </span>

                        <input
                            value={title}
                            maxLength={200}
                            onChange={(event) =>
                                setTitle(event.target.value)
                            }
                            placeholder="Введите название задания"
                            className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                        />

                        <span className="mt-1 block text-right text-xs font-medium text-slate-400">
                {title.length}/200
              </span>
                    </label>

                    <div className="mt-5">
              <span className="mb-2 block text-sm font-extrabold text-slate-600">
                Описание задания
              </span>

                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100">
                            <div className="flex items-center gap-1 border-b border-slate-200 px-3 py-2 text-slate-500">
                                <button
                                    type="button"
                                    title="Жирный текст"
                                    onClick={() =>
                                        formatDescription("**")
                                    }
                                    className="rounded-lg p-2 transition hover:bg-slate-100 hover:text-violet-600"
                                >
                                    <Bold size={17} />
                                </button>

                                <button
                                    type="button"
                                    title="Курсив"
                                    onClick={() =>
                                        formatDescription("*")
                                    }
                                    className="rounded-lg p-2 transition hover:bg-slate-100 hover:text-violet-600"
                                >
                                    <Italic size={17} />
                                </button>

                                <button
                                    type="button"
                                    title="Подчёркивание"
                                    onClick={() =>
                                        formatDescription("<u>", "</u>")
                                    }
                                    className="rounded-lg p-2 transition hover:bg-slate-100 hover:text-violet-600"
                                >
                                    <Underline size={17} />
                                </button>

                                <button
                                    type="button"
                                    title="Список"
                                    onClick={addList}
                                    className="rounded-lg p-2 transition hover:bg-slate-100 hover:text-violet-600"
                                >
                                    <List size={17} />
                                </button>

                                <button
                                    type="button"
                                    title="Ссылка"
                                    onClick={addLinkTemplate}
                                    className="rounded-lg p-2 transition hover:bg-slate-100 hover:text-violet-600"
                                >
                                    <Link2 size={17} />
                                </button>

                                <button
                                    type="button"
                                    title="Дополнительно"
                                    className="rounded-lg p-2 transition hover:bg-slate-100 hover:text-violet-600"
                                >
                                    <MoreVertical size={17} />
                                </button>
                            </div>

                            <textarea
                                ref={descriptionRef}
                                value={description}
                                maxLength={2000}
                                onChange={(event) =>
                                    setDescription(event.target.value)
                                }
                                rows={8}
                                placeholder="Подробно опишите задание, требования и критерии оценки..."
                                className="w-full resize-y border-none px-4 py-4 text-sm font-medium leading-7 text-slate-700 outline-none placeholder:text-slate-400"
                            />

                            <span className="block px-4 pb-3 text-right text-xs font-medium text-slate-400">
                  {description.length}/2000
                </span>
                        </div>
                    </div>

                    <div className="mt-6">
              <span className="mb-3 block text-sm font-extrabold text-slate-600">
                Тип ответа{" "}
                  <span className="text-red-500">*</span>
              </span>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {ANSWER_TYPES.map((item) => {
                                const Icon = item.icon;
                                const selected =
                                    answerMode === item.id;

                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() =>
                                            setAnswerMode(item.id)
                                        }
                                        className={[
                                            "min-h-28 rounded-xl border p-4 text-left transition",
                                            selected
                                                ? "border-violet-500 bg-violet-50 ring-2 ring-violet-100"
                                                : "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/30",
                                        ].join(" ")}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                className={[
                                                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                                                    item.iconClassName,
                                                ].join(" ")}
                                            >
                                                <Icon size={18} />
                                            </div>

                                            <div>
                                                <div className="text-sm font-extrabold text-slate-900">
                                                    {item.title}
                                                </div>

                                                <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                                                    {item.description}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-7">
              <span className="mb-3 block text-sm font-extrabold text-slate-600">
                Прикрепить материалы{" "}
                  <span className="font-medium text-slate-400">
                  (необязательно)
                </span>
              </span>

                        <div
                            onDragEnter={(event) => {
                                event.preventDefault();
                                setDragActive(true);
                            }}
                            onDragOver={(event) => {
                                event.preventDefault();
                                setDragActive(true);
                            }}
                            onDragLeave={(event) => {
                                event.preventDefault();
                                setDragActive(false);
                            }}
                            onDrop={handleDrop}
                            className={[
                                "rounded-2xl border border-dashed px-5 py-8 text-center transition",
                                dragActive
                                    ? "border-violet-500 bg-violet-50"
                                    : "border-violet-200 bg-violet-50/20",
                            ].join(" ")}
                        >
                            <UploadCloud
                                size={38}
                                className="mx-auto text-violet-600"
                            />

                            <div className="mt-3 text-sm font-extrabold text-slate-800">
                                Перетащите файлы сюда или нажмите для выбора
                            </div>

                            <p className="mt-2 text-xs font-medium text-slate-500">
                                Поддерживаются PDF, DOCX, PPTX, ZIP,
                                изображения и видео до 100 МБ
                            </p>

                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                className="hidden"
                                onChange={(event) => {
                                    addFiles(
                                        Array.from(
                                            event.target.files || []
                                        )
                                    );

                                    event.target.value = "";
                                }}
                            />

                            <button
                                type="button"
                                onClick={() =>
                                    fileInputRef.current?.click()
                                }
                                className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-violet-600 px-6 text-sm font-extrabold text-white transition hover:bg-violet-700"
                            >
                                Выбрать файл
                            </button>
                        </div>

                        {selectedFiles.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {selectedFiles.map((file, index) => (
                                    <div
                                        key={`${file.name}-${file.size}-${file.lastModified}`}
                                        className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
                                    >
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-bold text-slate-700">
                                                {file.name}
                                            </div>

                                            <div className="mt-1 text-xs font-medium text-slate-400">
                                                {(file.size / 1024 / 1024).toFixed(
                                                    2
                                                )}{" "}
                                                МБ
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeFile(index)
                                            }
                                            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                                        >
                                            <X size={17} />
                                        </button>
                                    </div>
                                ))}

                                <p className="text-xs font-semibold text-emerald-600">
                                    Выбрано файлов: {selectedFiles.length}
                                </p>
                            </div>
                        )}
                    </div>
                </main>

                <aside className="h-fit space-y-5 xl:sticky xl:top-5">
                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h2 className="text-lg font-extrabold text-slate-950">
                            Настройки задания
                        </h2>

                        <div className="mt-6 space-y-5">
                            <label className="block">
                  <span className="mb-2 block text-sm font-extrabold text-slate-600">
                    Группа{" "}
                      <span className="text-red-500">*</span>
                  </span>

                                <div className="relative">
                                    <Users
                                        size={17}
                                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                    />

                                    <select
                                        value={selectedGroupId}
                                        disabled={loadingGroups}
                                        onChange={(event) => {
                                            setSelectedGroupId(
                                                event.target.value
                                            );
                                            setSelectedSessionId("");
                                        }}
                                        className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-bold text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:opacity-50"
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
                                </div>
                            </label>

                            <label className="block">
                  <span className="mb-2 block text-sm font-extrabold text-slate-600">
                    Сессия (урок){" "}
                      {sessions.length > 0 && (
                          <span className="text-red-500">
                        *
                      </span>
                      )}
                  </span>

                                <div className="relative">
                                    <Users
                                        size={17}
                                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                    />

                                    <select
                                        value={selectedSessionId}
                                        disabled={
                                            !selectedGroupId ||
                                            loadingSessions
                                        }
                                        onChange={(event) =>
                                            setSelectedSessionId(
                                                event.target.value
                                            )
                                        }
                                        className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-bold text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:opacity-50"
                                    >
                                        {sessions.length === 0 && (
                                            <option value="">
                                                Сессий нет
                                            </option>
                                        )}

                                        {sessions.map((session) => (
                                            <option
                                                key={session.id}
                                                value={session.id}
                                            >
                                                {session.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </label>

                            <label className="block">
                  <span className="mb-2 block text-sm font-extrabold text-slate-600">
                    Баллы{" "}
                      <span className="text-red-500">*</span>
                  </span>

                                <div className="relative">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={points}
                                        onChange={(event) =>
                                            setPoints(event.target.value)
                                        }
                                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-20 text-sm font-bold text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                                    />

                                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      баллов
                    </span>
                                </div>
                            </label>

                            <label className="block">
                  <span className="mb-2 block text-sm font-extrabold text-slate-600">
                    Дедлайн
                  </span>

                                <div className="relative">
                                    <CalendarDays
                                        size={17}
                                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                    />

                                    <input
                                        type="datetime-local"
                                        value={deadline}
                                        onChange={(event) =>
                                            setDeadline(event.target.value)
                                        }
                                        className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                                    />
                                </div>
                            </label>

                            <label className="block">
                  <span className="mb-2 block text-sm font-extrabold text-slate-600">
                    Инструкции для студента
                  </span>

                                <textarea
                                    value={studentInstructions}
                                    maxLength={500}
                                    onChange={(event) =>
                                        setStudentInstructions(
                                            event.target.value
                                        )
                                    }
                                    rows={4}
                                    placeholder="Дополнительные инструкции (необязательно)"
                                    className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                                />

                                <span className="mt-1 block text-right text-xs font-medium text-slate-400">
                    {studentInstructions.length}/500
                  </span>
                            </label>

                            <div className="border-t border-slate-100 pt-5">
                                <div className="flex items-start justify-between gap-5">
                                    <div>
                                        <div className="text-sm font-extrabold text-slate-800">
                                            Опубликовать сразу
                                        </div>

                                        <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                                            Задание станет доступным для студентов
                                        </p>
                                    </div>

                                    <Switch
                                        checked={publishNow}
                                        onChange={setPublishNow}
                                    />
                                </div>

                                <div className="mt-6 flex items-start justify-between gap-5">
                                    <div>
                                        <div className="text-sm font-extrabold text-slate-800">
                                            Разрешить позднюю сдачу
                                        </div>

                                        <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                                            Студенты смогут отправить ответ после дедлайна
                                        </p>
                                    </div>

                                    <Switch
                                        checked={allowLateSubmission}
                                        onChange={setAllowLateSubmission}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                                void handleSave("draft")
                            }
                            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {savingStatus === "draft" ? (
                                <Loader2
                                    size={17}
                                    className="animate-spin"
                                />
                            ) : (
                                <Save size={17} />
                            )}

                            Сохранить как черновик
                        </button>

                        <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                                void handleSave("published")
                            }
                            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-extrabold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {savingStatus === "published" ? (
                                <Loader2
                                    size={17}
                                    className="animate-spin"
                                />
                            ) : (
                                <Send size={17} />
                            )}

                            Создать задание
                        </button>
                    </div>
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
                <div className="flex min-h-screen items-center justify-center bg-[#fafbff]">
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