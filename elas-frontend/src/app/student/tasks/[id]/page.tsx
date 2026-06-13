"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  File,
  GraduationCap,
  Loader2,
  Paperclip,
  Send,
  Star,
  UploadCloud,
  X,
} from "lucide-react";

import {
  getTask,
  getTaskAttachmentDownloadUrl,
  getTaskMaterialDownloadUrl,
  submitTask,
  type Task,
  type TaskMaterial,
} from "@/lib/api/tasks";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  return error instanceof Error
    ? error.message
    : fallback;
}

function formatDate(
  value?: string | null
): string {
  if (!value) return "Без дедлайна";

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

function formatFileSize(
  value?: number | null
): string {
  if (!value || value <= 0) return "";

  if (value < 1024) {
    return `${value} Б`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} КБ`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} МБ`;
}

function isDeadlinePassed(
  value?: string | null
): boolean {
  if (!value) return false;

  const date = new Date(value);

  return (
    !Number.isNaN(date.getTime()) &&
    date.getTime() < Date.now()
  );
}

function getTaskTypeLabel(
  task: Task
): string {
  if (task.type === "file_upload") {
    return "Ответ файлом";
  }

  if (task.type === "text_answer") {
    return "Текстовый ответ";
  }

  return "Домашнее задание";
}

function MaterialRow({
  material,
  downloading,
  onDownload,
}: {
  material: TaskMaterial;
  downloading: boolean;
  onDownload: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onDownload}
      disabled={downloading}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-violet-200 hover:bg-violet-50/30 disabled:cursor-wait disabled:opacity-60"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
          <File size={20} />
        </div>

        <div className="min-w-0">
          <div className="truncate text-sm font-extrabold text-slate-800">
            {material.fileName}
          </div>

          <div className="mt-1 text-xs font-medium text-slate-400">
            {[
              material.mimeType,
              formatFileSize(material.size),
            ]
              .filter(Boolean)
              .join(" • ") ||
              "Материал задания"}
          </div>
        </div>
      </div>

      {downloading ? (
        <Loader2
          className="shrink-0 animate-spin text-violet-600"
          size={20}
        />
      ) : (
        <Download
          className="shrink-0 text-violet-600"
          size={20}
        />
      )}
    </button>
  );
}

export default function StudentHomeworkPage() {
  const params = useParams<{
    id: string;
  }>();

  const taskId = params.id;

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [task, setTask] =
    useState<Task | null>(null);

  const [textAnswer, setTextAnswer] =
    useState("");

  const [attachment, setAttachment] =
    useState<File | null>(null);

  const [dragActive, setDragActive] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [
    downloadingMaterialId,
    setDownloadingMaterialId,
  ] = useState<string | null>(null);

  const [
    downloadingSubmission,
    setDownloadingSubmission,
  ] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const loadTask = useCallback(async () => {
    if (!taskId) {
      setError("ID задания не найден");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const loadedTask =
        await getTask(taskId);

      if (loadedTask.type === "test") {
        setError(
          "Это тест. Откройте его через страницу теста."
        );

        setTask(loadedTask);
        return;
      }

      setTask(loadedTask);

      setTextAnswer(
        loadedTask.mySubmission
          ?.textAnswer || ""
      );
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "Не удалось загрузить домашнее задание"
        )
      );
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void loadTask();
  }, [loadTask]);

  const deadlinePassed = useMemo(
    () =>
      isDeadlinePassed(
        task?.deadline
      ),
    [task?.deadline]
  );

  const canSendText =
    task?.type === "text_answer" ||
    task?.type === "homework";

  const canSendFile =
    task?.type === "file_upload" ||
    task?.type === "homework";

  const submissionLocked =
    !task ||
    task.status !== "published" ||
    (deadlinePassed &&
      !task.allowLateSubmission);

  function selectFile(
    file: File | null
  ) {
    setError(null);

    if (!file) {
      setAttachment(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setAttachment(null);

      setError(
        "Размер файла не должен превышать 100 МБ"
      );

      return;
    }

    setAttachment(file);
  }

  function handleDrop(
    event: DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    setDragActive(false);

    const file =
      event.dataTransfer.files?.[0] ||
      null;

    selectFile(file);
  }

  async function handleMaterialDownload(
    material: TaskMaterial
  ) {
    if (!task) return;

    setDownloadingMaterialId(
      material.id
    );

    setError(null);

    const openedWindow =
      window.open("", "_blank");

    try {
      const result =
        await getTaskMaterialDownloadUrl(
          task.id,
          material.id
        );

      if (openedWindow) {
        openedWindow.location.href =
          result.url;
      } else {
        window.location.href =
          result.url;
      }
    } catch (requestError) {
      openedWindow?.close();

      setError(
        getErrorMessage(
          requestError,
          "Не удалось скачать материал"
        )
      );
    } finally {
      setDownloadingMaterialId(null);
    }
  }

  async function handleSubmissionDownload() {
    if (!task?.mySubmission) return;

    setDownloadingSubmission(true);
    setError(null);

    const openedWindow =
      window.open("", "_blank");

    try {
      const result =
        await getTaskAttachmentDownloadUrl(
          task.mySubmission.id
        );

      if (openedWindow) {
        openedWindow.location.href =
          result.url;
      } else {
        window.location.href =
          result.url;
      }
    } catch (requestError) {
      openedWindow?.close();

      setError(
        getErrorMessage(
          requestError,
          "Не удалось скачать отправленный файл"
        )
      );
    } finally {
      setDownloadingSubmission(false);
    }
  }

  async function handleSubmit() {
    if (
      !task ||
      submissionLocked
    ) {
      return;
    }

    const cleanText =
      textAnswer.trim();

    if (
      task.type ===
        "text_answer" &&
      !cleanText
    ) {
      setError(
        "Введите текстовый ответ"
      );

      return;
    }

    if (
      task.type ===
        "file_upload" &&
      !attachment
    ) {
      setError(
        "Выберите файл для отправки"
      );

      return;
    }

    if (
      task.type === "homework" &&
      !cleanText &&
      !attachment
    ) {
      setError(
        "Введите ответ или выберите файл"
      );

      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await submitTask(task.id, {
        textAnswer: cleanText,
        attachment,
      });

      setAttachment(null);

      setSuccess(
        task.mySubmission
          ? "Ответ успешно обновлён"
          : "Задание успешно отправлено"
      );

      await loadTask();
    } catch (requestError) {
      setError(
        getErrorMessage(
          requestError,
          "Не удалось отправить задание"
        )
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fc]">
        <div className="flex items-center gap-3 text-sm font-bold text-slate-500">
          <Loader2
            className="animate-spin text-violet-600"
            size={24}
          />

          Загрузка задания...
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-[#f7f8fc] px-5 py-8">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/student/tasks"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-violet-600"
          >
            <ArrowLeft size={18} />
            Назад к заданиям
          </Link>

          <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
            <AlertCircle
              className="mx-auto"
              size={36}
            />

            <div className="mt-3 font-extrabold">
              {error ||
                "Задание не найдено"}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const submission =
    task.mySubmission;

  const materials =
    Array.isArray(task.materials)
      ? task.materials
      : [];

  return (
    <div className="min-h-screen bg-[#f7f8fc] px-4 py-6 text-slate-900 md:px-6 md:py-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/student/tasks"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-violet-600"
        >
          <ArrowLeft size={18} />
          Назад к заданиям
        </Link>

        {error && (
          <div className="mt-5 flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={() =>
                setError(null)
              }
            >
              <X size={18} />
            </button>
          </div>
        )}

        {success && (
          <div className="mt-5 flex items-start justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 size={18} />
              {success}
            </span>

            <button
              type="button"
              onClick={() =>
                setSuccess(null)
              }
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <main className="space-y-6">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-6 md:px-8">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-extrabold text-violet-700">
                    {getTaskTypeLabel(
                      task
                    )}
                  </span>

                  {task.session
                    ?.title && (
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                      {
                        task.session
                          .title
                      }
                    </span>
                  )}
                </div>

                <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-950 md:text-4xl">
                  {task.title}
                </h1>

                <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <Star
                      size={17}
                      className="text-amber-500"
                    />

                    {task.points || 0}{" "}
                    баллов
                  </span>

                  <span className="inline-flex items-center gap-2">
                    <CalendarDays
                      size={17}
                      className="text-violet-600"
                    />

                    Дедлайн:{" "}
                    {formatDate(
                      task.deadline
                    )}
                  </span>

                  {task.group?.name && (
                    <span className="inline-flex items-center gap-2">
                      <GraduationCap
                        size={17}
                        className="text-blue-600"
                      />

                      {
                        task.group
                          .name
                      }
                    </span>
                  )}
                </div>
              </div>

              <div className="px-6 py-7 md:px-8">
                <h2 className="text-lg font-extrabold text-slate-950">
                  Описание задания
                </h2>

                {task.description ? (
                  <div className="mt-4 whitespace-pre-wrap text-[15px] font-medium leading-8 text-slate-700">
                    {
                      task.description
                    }
                  </div>
                ) : (
                  <p className="mt-4 text-sm font-medium text-slate-400">
                    Преподаватель не
                    добавил описание.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <Paperclip
                    size={21}
                  />
                </div>

                <div>
                  <h2 className="text-lg font-extrabold text-slate-950">
                    Материалы
                    преподавателя
                  </h2>

                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Файлы,
                    прикреплённые к
                    заданию
                  </p>
                </div>
              </div>

              {materials.length > 0 ? (
                <div className="mt-5 space-y-3">
                  {materials.map(
                    (material) => (
                      <MaterialRow
                        key={
                          material.id
                        }
                        material={
                          material
                        }
                        downloading={
                          downloadingMaterialId ===
                          material.id
                        }
                        onDownload={() =>
                          void handleMaterialDownload(
                            material
                          )
                        }
                      />
                    )
                  )}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl bg-slate-50 px-5 py-7 text-center text-sm font-medium text-slate-500">
                  Материалы не
                  прикреплены
                </div>
              )}
            </section>

            {submission && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-extrabold text-slate-950">
                      Ваша последняя
                      отправка
                    </h2>

                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Отправлено:{" "}
                      {formatDate(
                        submission
                          .submittedAt
                      )}
                    </p>
                  </div>

                  <span
                    className={[
                      "rounded-full px-3 py-1.5 text-xs font-extrabold",
                      submission.isLate
                        ? "bg-orange-50 text-orange-700"
                        : "bg-emerald-50 text-emerald-700",
                    ].join(" ")}
                  >
                    {submission.isLate
                      ? "Сдано с опозданием"
                      : "Сдано вовремя"}
                  </span>
                </div>

                {submission.textAnswer && (
                  <div className="mt-5 whitespace-pre-wrap rounded-2xl bg-slate-50 px-5 py-4 text-sm font-medium leading-7 text-slate-700">
                    {
                      submission.textAnswer
                    }
                  </div>
                )}

                {submission.attachmentFileName && (
                  <button
                    type="button"
                    onClick={() =>
                      void handleSubmissionDownload()
                    }
                    disabled={
                      downloadingSubmission
                    }
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-violet-600 transition hover:bg-violet-50 disabled:opacity-60"
                  >
                    {downloadingSubmission ? (
                      <Loader2
                        className="animate-spin"
                        size={17}
                      />
                    ) : (
                      <Download
                        size={17}
                      />
                    )}

                    {
                      submission.attachmentFileName
                    }
                  </button>
                )}

                {(submission.status ===
                  "graded" ||
                  submission.score !=
                    null) && (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl bg-violet-50 px-5 py-4">
                      <div className="text-xs font-bold uppercase tracking-wide text-violet-500">
                        Оценка
                      </div>

                      <div className="mt-2 text-2xl font-extrabold text-violet-800">
                        {submission.score ??
                          "—"}{" "}
                        /{" "}
                        {task.points ||
                          0}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-5 py-4">
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        Комментарий
                      </div>

                      <div className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                        {submission.feedback ||
                          "Без комментария"}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}
          </main>

          <aside className="h-fit lg:sticky lg:top-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-950">
                    Моя работа
                  </h2>

                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {submission
                      ? "Ответ уже отправлен"
                      : "Ответ ещё не отправлен"}
                  </p>
                </div>

                <div
                  className={[
                    "flex h-11 w-11 items-center justify-center rounded-xl",
                    submission
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-orange-50 text-orange-600",
                  ].join(" ")}
                >
                  {submission ? (
                    <CheckCircle2
                      size={22}
                    />
                  ) : (
                    <Clock3
                      size={22}
                    />
                  )}
                </div>
              </div>

              {deadlinePassed && (
                <div
                  className={[
                    "mt-5 rounded-2xl px-4 py-3 text-sm font-bold",
                    task.allowLateSubmission
                      ? "bg-orange-50 text-orange-700"
                      : "bg-red-50 text-red-700",
                  ].join(" ")}
                >
                  {task.allowLateSubmission
                    ? "Дедлайн прошёл, но поздняя сдача разрешена"
                    : "Дедлайн прошёл. Отправка закрыта"}
                </div>
              )}

              {task.status !==
                "published" && (
                <div className="mt-5 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600">
                  Задание сейчас не
                  принимает ответы
                </div>
              )}

              <div className="mt-6 space-y-5">
                {canSendText && (
                  <label className="block">
                    <span className="mb-2 block text-sm font-extrabold text-slate-700">
                      {task.type ===
                      "text_answer"
                        ? "Ваш ответ"
                        : "Текстовый ответ"}
                    </span>

                    <textarea
                      value={
                        textAnswer
                      }
                      onChange={(
                        event
                      ) =>
                        setTextAnswer(
                          event.target
                            .value
                        )
                      }
                      disabled={
                        submissionLocked ||
                        submitting
                      }
                      rows={7}
                      placeholder={
                        task.type ===
                        "text_answer"
                          ? "Введите ответ или вставьте ссылку..."
                          : "Напишите ответ (необязательно, если отправляете файл)..."
                      }
                      className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:bg-slate-50 disabled:opacity-70"
                    />
                  </label>
                )}

                {canSendFile && (
                  <div>
                    <span className="mb-2 block text-sm font-extrabold text-slate-700">
                      Прикрепить файл
                    </span>

                    <div
                      onDragEnter={(
                        event
                      ) => {
                        event.preventDefault();

                        if (
                          !submissionLocked
                        ) {
                          setDragActive(
                            true
                          );
                        }
                      }}
                      onDragOver={(
                        event
                      ) => {
                        event.preventDefault();

                        if (
                          !submissionLocked
                        ) {
                          setDragActive(
                            true
                          );
                        }
                      }}
                      onDragLeave={(
                        event
                      ) => {
                        event.preventDefault();

                        setDragActive(
                          false
                        );
                      }}
                      onDrop={
                        handleDrop
                      }
                      className={[
                        "rounded-2xl border border-dashed px-4 py-6 text-center transition",
                        dragActive
                          ? "border-violet-500 bg-violet-50"
                          : "border-slate-300 bg-slate-50/60",
                        submissionLocked
                          ? "pointer-events-none opacity-60"
                          : "",
                      ].join(" ")}
                    >
                      <UploadCloud
                        className="mx-auto text-violet-600"
                        size={32}
                      />

                      <div className="mt-3 text-sm font-extrabold text-slate-700">
                        Перетащите файл
                        сюда
                      </div>

                      <p className="mt-1 text-xs font-medium text-slate-500">
                        Любой формат,
                        один файл до 100
                        МБ
                      </p>

                      <input
                        ref={
                          fileInputRef
                        }
                        type="file"
                        className="hidden"
                        disabled={
                          submissionLocked ||
                          submitting
                        }
                        onChange={(
                          event
                        ) => {
                          selectFile(
                            event.target
                              .files?.[0] ||
                              null
                          );

                          event.target.value =
                            "";
                        }}
                      />

                      <button
                        type="button"
                        disabled={
                          submissionLocked ||
                          submitting
                        }
                        onClick={() =>
                          fileInputRef.current?.click()
                        }
                        className="mt-4 rounded-xl bg-white px-4 py-2.5 text-sm font-extrabold text-violet-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Выбрать файл
                      </button>
                    </div>

                    {attachment && (
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-extrabold text-violet-800">
                            {
                              attachment.name
                            }
                          </div>

                          <div className="mt-1 text-xs font-medium text-violet-600">
                            {formatFileSize(
                              attachment.size
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setAttachment(
                              null
                            )
                          }
                          className="rounded-lg p-1.5 text-violet-500 hover:bg-white"
                        >
                          <X size={17} />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() =>
                    void handleSubmit()
                  }
                  disabled={
                    submissionLocked ||
                    submitting
                  }
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-extrabold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {submitting ? (
                    <Loader2
                      className="animate-spin"
                      size={18}
                    />
                  ) : (
                    <Send size={18} />
                  )}

                  {submission
                    ? "Обновить отправку"
                    : "Отправить задание"}
                </button>

                {submission && (
                  <p className="text-center text-xs font-medium leading-5 text-slate-400">
                    При повторной
                    отправке предыдущий
                    ответ будет
                    обновлён.
                  </p>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
