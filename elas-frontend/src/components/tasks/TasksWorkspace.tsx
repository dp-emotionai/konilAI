"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  Grid3X3,
  HelpCircle,
  List,
  Loader2,
  MoreVertical,
  Paperclip,
  Plus,
  RefreshCw,
  Star,
  Upload,
  X,
} from "lucide-react";

import { getStudentGroupDetail, getStudentGroups } from "@/lib/api/student";
import { getGroupById, getTeacherGroups } from "@/lib/api/teacher";
import { useRouter } from "next/navigation";

import {
  buildTaskAttachmentUrl,
  createTask,
  deleteTask,
  getTaskSubmissions,
  getTasks,
  gradeTaskSubmission,
  submitTask,
  updateTask,
  type LinkedTestSubmission,
  type Task,
  type TaskStatus,
  type TaskSubmission,
  type TaskType,
} from "@/lib/api/tasks";

type RoleMode = "student" | "teacher";
type ViewMode = "list" | "grid";

type GroupOption = {
  id: string;
  name: string;
};

type SessionOption = {
  id: string;
  title: string;
  status?: string | null;
  type?: string | null;
};

type TaskForm = {
  title: string;
  description: string;
  type: TaskType;
  status: TaskStatus;
  deadline: string;
  points: string;
  testId: string;
};

const EMPTY_FORM: TaskForm = {
  title: "",
  description: "",
  type: "homework",
  status: "published",
  deadline: "",
  points: "10",
  testId: "",
};

const TYPE_LABELS: Record<TaskType, string> = {
  test: "Тест",
  homework: "Задание",
  file_upload: "Файл",
  text_answer: "Ответ",
};

type ApiSessionLike = {
  id?: string | number | null;
  title?: string | null;
  name?: string | null;
  status?: string | null;
  type?: string | null;
};

type ApiGroupDetailLike = {
  sessions?: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getSafeGroup(row: unknown): GroupOption | null {
  if (!isObject(row)) return null;

  const source = isObject(row.group) ? row.group : row;

  if (!source.id) return null;

  return {
    id: String(source.id),
    name: String(source.name || "Без названия"),
  };
}

function getSafeSessions(list: unknown): SessionOption[] {
  if (!Array.isArray(list)) return [];

  return list
      .filter((item): item is ApiSessionLike => isObject(item) && Boolean(item.id))
      .map((item) => ({
        id: String(item.id),
        title: String(item.title || item.name || "Урок"),
        status: item.status || null,
        type: item.type || null,
      }));
}

function formatDate(value?: string | null) {
  if (!value) return "Без дедлайна";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateForInput(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (num: number) => String(num).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function toIsoDate(value: string) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

function isDeadlinePassed(value?: string | null) {
  if (!value) return false;

  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

function getTestHref(role: RoleMode, testId?: string | null) {
  if (!testId) return "#";
  return role === "student" ? `/student/tests/${testId}` : `/teacher/tests/${testId}`;
}

function getStudentName(submission: TaskSubmission | LinkedTestSubmission) {
  const user = submission.student;

  if (!user) return "Студент";

  return (
      user.fullName ||
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      user.email ||
      "Студент"
  );
}

function typeIcon(type: TaskType): ReactNode {
  if (type === "test") return <HelpCircle size={28} />;
  if (type === "file_upload") return <Paperclip size={28} />;
  return <FileText size={28} />;
}

function typeBoxClass(type: TaskType) {
  if (type === "test") return "bg-violet-50 text-violet-600";
  if (type === "file_upload") return "bg-blue-50 text-blue-600";
  if (type === "text_answer") return "bg-emerald-50 text-emerald-600";
  return "bg-emerald-50 text-emerald-600";
}

function studentStatusLabel(task: Task) {
  if (task.type === "test") {
    if (!task.myTestSubmission) {
      return "Не выполнено";
    }

    if (
      task.myTestSubmission.score !== null &&
      task.myTestSubmission.score !== undefined
    ) {
      return "Оценено";
    }

    return "Выполнено";
  }

  if (!task.mySubmission) {
    return "Не сдано";
  }

  if (
    task.mySubmission.status === "graded" ||
    task.mySubmission.score !== null &&
      task.mySubmission.score !== undefined
  ) {
    return "Оценено";
  }

  if (task.mySubmission.isLate) {
    return "Сдано с опозданием";
  }

  return "Сдано";
}

function studentStatusClass(task: Task) {
  if (task.type === "test") {
    if (!task.myTestSubmission) {
      return "bg-orange-50 text-orange-700";
    }

    if (
      task.myTestSubmission.score !== null &&
      task.myTestSubmission.score !== undefined
    ) {
      return "bg-violet-50 text-violet-700";
    }

    return "bg-emerald-50 text-emerald-700";
  }

  if (!task.mySubmission) {
    return "bg-orange-50 text-orange-700";
  }

  if (
    task.mySubmission.status === "graded" ||
    task.mySubmission.score !== null &&
      task.mySubmission.score !== undefined
  ) {
    return "bg-violet-50 text-violet-700";
  }

  if (task.mySubmission.isLate) {
    return "bg-orange-50 text-orange-700";
  }

  return "bg-emerald-50 text-emerald-700";
}

function taskActionLabel(task: Task, role: RoleMode) {
  if (role === "teacher") {
    return "Ответы";
  }

  if (task.type === "test") {
    if (task.myTestSubmission) {
      return "Посмотреть баллы";
    }

    return "Пройти тест";
  }

  if (task.mySubmission) {
    if (
      task.mySubmission.status === "graded" ||
      task.mySubmission.score !== null &&
        task.mySubmission.score !== undefined
    ) {
      return "Посмотреть оценку";
    }

    return "Посмотреть отправку";
  }

  return "Открыть задание";
}


function ModalShell({
                      title,
                      description,
                      children,
                      onClose,
                      size = "normal",
                    }: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  size?: "normal" | "wide";
}) {
  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-8">
        <div
            className={[
              "max-h-[90vh] w-full overflow-auto rounded-3xl border border-slate-200 bg-white shadow-2xl",
              size === "wide" ? "max-w-6xl" : "max-w-4xl",
            ].join(" ")}
        >
          <div className="flex items-start justify-between border-b border-slate-200 px-8 py-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{title}</h2>
              {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
            </div>

            <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <X size={22} />
            </button>
          </div>

          <div className="p-8">{children}</div>
        </div>
      </div>
  );
}

function Field({
                 label,
                 children,
               }: {
  label: string;
  children: ReactNode;
}) {
  return (
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-500">{label}</span>
        {children}
      </label>
  );
}

function SelectField({
                       value,
                       onChange,
                       children,
                       disabled,
                     }: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
      <select
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:opacity-50"
      >
        {children}
      </select>
  );
}

function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
      <input
          {...props}
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      />
  );
}

function TextArea({
                    value,
                    onChange,
                    placeholder,
                    rows = 4,
                  }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
      <textarea
          value={value}
          rows={rows}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
      />
  );
}

function TasksWorkspace({ role }: { role: RoleMode }) {
  const router = useRouter();

  function goToCreatePage(type: "test" | "homework") {
    const params = new URLSearchParams();

    if (selectedGroupId) params.set("groupId", selectedGroupId);
    if (selectedSessionId) params.set("sessionId", selectedSessionId);

    router.push(`/teacher/tasks/new/${type}?${params.toString()}`);
  }

  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");

  const [typeFilter, setTypeFilter] = useState<"all" | TaskType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createChoiceOpen, setCreateChoiceOpen] = useState(false);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskForm>(EMPTY_FORM);
  const [savingTask, setSavingTask] = useState(false);

  const [submitTaskItem, setSubmitTaskItem] = useState<Task | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [submissionsTask, setSubmissionsTask] = useState<Task | null>(null);
  const [submissions, setSubmissions] = useState<Array<TaskSubmission | LinkedTestSubmission>>([]);
  const [submissionsType, setSubmissionsType] = useState<"task" | "test">("task");
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeScore, setGradeScore] = useState("");
  const [gradeFeedback, setGradeFeedback] = useState("");

  const selectedGroup = useMemo(
      () => groups.find((group) => group.id === selectedGroupId) || null,
      [groups, selectedGroupId]
  );

  const selectedSession = useMemo(
      () => sessions.find((session) => session.id === selectedSessionId) || null,
      [sessions, selectedSessionId]
  );

  const sessionCounts = useMemo(() => {
    const map = new Map<string, number>();

    tasks.forEach((task) => {
      if (!task.sessionId) return;
      map.set(task.sessionId, (map.get(task.sessionId) || 0) + 1);
    });

    return map;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (selectedSessionId && task.sessionId !== selectedSessionId) return false;
      if (typeFilter !== "all" && task.type !== typeFilter) return false;
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      return true;
    });
  }, [tasks, selectedSessionId, typeFilter, statusFilter]);

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    setError(null);

    try {
      const result = role === "student" ? await getStudentGroups() : await getTeacherGroups();

      const normalized = (Array.isArray(result) ? result : [])
          .map(getSafeGroup)
          .filter(Boolean) as GroupOption[];

      setGroups(normalized);

      if (!selectedGroupId && normalized[0]) {
        setSelectedGroupId(normalized[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить группы");
    } finally {
      setLoadingGroups(false);
    }
  }, [role, selectedGroupId]);

  const loadSessions = useCallback(async () => {
    if (!selectedGroupId) {
      setSessions([]);
      setSelectedSessionId("");
      return;
    }

    setLoadingSessions(true);
    setError(null);

    try {
      if (role === "student") {
        const detail = await getStudentGroupDetail(selectedGroupId);
        setSessions(getSafeSessions((detail as ApiGroupDetailLike | null)?.sessions));
      } else {
        const detail = await getGroupById(selectedGroupId);
        setSessions(getSafeSessions((detail as ApiGroupDetailLike | null)?.sessions));
      }

      setSelectedSessionId("");
    } catch (err) {
      setSessions([]);
      setError(err instanceof Error ? err.message : "Не удалось загрузить уроки");
    } finally {
      setLoadingSessions(false);
    }
  }, [role, selectedGroupId]);

  const loadTasks = useCallback(async () => {
    if (!selectedGroupId) {
      setTasks([]);
      return;
    }

    setLoadingTasks(true);
    setError(null);

    try {
      const result = await getTasks({
        groupId: selectedGroupId,
        type: typeFilter === "all" ? null : typeFilter,
        status: statusFilter === "all" ? null : statusFilter,
      });

      setTasks(Array.isArray(result) ? result : []);
    } catch (err) {
      setTasks([]);
      setError(err instanceof Error ? err.message : "Не удалось загрузить задачи");
    } finally {
      setLoadingTasks(false);
    }
  }, [selectedGroupId, typeFilter, statusFilter]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  function resetFilters() {
    setTypeFilter("all");
    setStatusFilter("all");
    setSelectedSessionId("");
  }

  function openCreateChoice() {
    setCreateChoiceOpen(true);
  }

  function openEditModal(task: Task) {
    setEditingTask(task);

    setForm({
      title: task.title,
      description: task.description || "",
      type: task.type,
      status: task.status,
      deadline: formatDateForInput(task.deadline),
      points: String(task.points || 0),
      testId: task.testId || "",
    });

    setTaskModalOpen(true);
  }

  async function handleSaveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedGroupId) {
      setError("Сначала выберите группу");
      return;
    }

    const title = form.title.trim();

    if (!title) {
      setError("Название задачи обязательно");
      return;
    }

    if (form.type === "test" && !form.testId.trim()) {
      setError("Для типа test нужно указать testId");
      return;
    }

    setSavingTask(true);
    setError(null);

    try {
      const body = {
        title,
        description: form.description.trim() || null,
        type: form.type,
        status: form.status,
        groupId: selectedGroupId,
        sessionId: selectedSessionId || null,
        testId: form.type === "test" ? form.testId.trim() : null,
        deadline: toIsoDate(form.deadline),
        points: Number(form.points || 0),
      };

      if (editingTask) {
        await updateTask(editingTask.id, body);
      } else {
        await createTask(body);
      }

      setTaskModalOpen(false);
      setEditingTask(null);
      setForm(EMPTY_FORM);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить задачу");
    } finally {
      setSavingTask(false);
    }
  }

  async function handleDeleteTask(task: Task) {
    const ok = window.confirm(`Удалить задачу "${task.title}"?`);
    if (!ok) return;

    try {
      await deleteTask(task.id);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить задачу");
    }
  }

  function openSubmitModal(task: Task) {
    setSubmitTaskItem(task);
    setTextAnswer(task.mySubmission?.textAnswer || "");
    setAttachment(null);
  }

  async function handleSubmitTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!submitTaskItem) return;

    setSubmitting(true);
    setError(null);

    try {
      await submitTask(submitTaskItem.id, {
        textAnswer,
        attachment,
      });

      setSubmitTaskItem(null);
      setTextAnswer("");
      setAttachment(null);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сдать задачу");
    } finally {
      setSubmitting(false);
    }
  }

  async function openSubmissions(task: Task) {
    setSubmissionsTask(task);
    setLoadingSubmissions(true);
    setSubmissions([]);
    setError(null);

    try {
      const result = await getTaskSubmissions(task.id);
      setSubmissionsType(result.type);
      setSubmissions(Array.isArray(result.submissions) ? result.submissions : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить ответы");
    } finally {
      setLoadingSubmissions(false);
    }
  }

  async function handleGrade() {
    if (!submissionsTask || !gradingId) return;

    const score = Number(gradeScore);

    if (!Number.isFinite(score) || score < 0) {
      setError("Score должен быть числом");
      return;
    }

    try {
      await gradeTaskSubmission(submissionsTask.id, gradingId, {
        score,
        feedback: gradeFeedback.trim() || null,
      });

      setGradingId(null);
      setGradeScore("");
      setGradeFeedback("");
      await openSubmissions(submissionsTask);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось поставить оценку");
    }
  }

  const canSubmitText = submitTaskItem?.type === "text_answer" || submitTaskItem?.type === "homework";
  const canSubmitFile = submitTaskItem?.type === "file_upload" || submitTaskItem?.type === "homework";

  return (
      <div className="min-h-screen bg-[#fbfbff] px-6 py-8 text-slate-900">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-950">Задачи</h1>

            {role === "teacher" && (
                <button
                    type="button"
                    onClick={openCreateChoice}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700"
                >
                  <Plus size={18} />
                  Создать задачу
                </button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_1fr_auto]">
            <Field label="Группа">
              <SelectField
                  value={selectedGroupId}
                  disabled={loadingGroups || groups.length === 0}
                  onChange={setSelectedGroupId}
              >
                {groups.length === 0 ? (
                    <option value="">Групп нет</option>
                ) : (
                    groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                    ))
                )}
              </SelectField>
            </Field>

            <Field label="Сессия (урок)">
              <SelectField
                  value={selectedSessionId}
                  disabled={!selectedGroupId || loadingSessions}
                  onChange={setSelectedSessionId}
              >
                <option value="">Все уроки</option>
                {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.title}
                    </option>
                ))}
              </SelectField>
            </Field>

            <Field label="Тип">
              <SelectField value={typeFilter} onChange={(value) => setTypeFilter(value as "all" | TaskType)}>
                <option value="all">Все типы</option>
                <option value="test">Тест</option>
                <option value="homework">Задание</option>
                <option value="file_upload">Файл</option>
                <option value="text_answer">Ответ</option>
              </SelectField>
            </Field>

            <Field label="Статус">
              <SelectField
                  value={statusFilter}
                  onChange={(value) => setStatusFilter(value as "all" | TaskStatus)}
              >
                <option value="all">Все статусы</option>
                <option value="draft">Черновик</option>
                <option value="published">Опубликовано</option>
                <option value="closed">Закрыто</option>
                <option value="archived">Архив</option>
              </SelectField>
            </Field>

            <div className="flex items-end">
              <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
              >
                <RefreshCw size={17} />
                Сбросить
              </button>
            </div>
          </div>

          {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
                {error}
              </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-5 text-xl font-bold text-slate-950">Уроки</h2>

              <div className="space-y-2">
                {sessions.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      Уроков пока нет
                    </div>
                ) : (
                    sessions.slice(0, 6).map((session) => {
                      const active = selectedSessionId === session.id;
                      const count = sessionCounts.get(session.id) || 0;

                      return (
                          <button
                              key={session.id}
                              type="button"
                              onClick={() => setSelectedSessionId(session.id)}
                              className={[
                                "flex w-full items-center justify-between rounded-xl px-4 py-4 text-left transition",
                                active ? "bg-violet-50 text-violet-700" : "hover:bg-slate-50",
                              ].join(" ")}
                          >
                            <div>
                              <div className="font-bold">{session.title}</div>
                              <div className="mt-1 text-xs text-slate-500">{count} задачи</div>
                            </div>

                            <span
                                className={[
                                  "h-3 w-3 rounded-full",
                                  active ? "bg-violet-600" : "bg-slate-300",
                                ].join(" ")}
                            />
                          </button>
                      );
                    })
                )}
              </div>

              <button
                  type="button"
                  onClick={() => setSelectedSessionId("")}
                  className="mt-6 h-11 w-full rounded-xl border border-slate-200 bg-white text-sm font-bold text-violet-600 transition hover:bg-violet-50"
              >
                Показать все уроки
              </button>
            </aside>

            <main className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-950">
                    {selectedSession?.title || selectedGroup?.name || "Задачи"}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {filteredTasks.length} задачи
                  </p>
                </div>

                <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
                  <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={[
                        "rounded-lg p-2 transition",
                        viewMode === "list" ? "bg-violet-50 text-violet-600" : "text-slate-400 hover:text-slate-700",
                      ].join(" ")}
                  >
                    <List size={20} />
                  </button>

                  <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={[
                        "rounded-lg p-2 transition",
                        viewMode === "grid" ? "bg-violet-50 text-violet-600" : "text-slate-400 hover:text-slate-700",
                      ].join(" ")}
                  >
                    <Grid3X3 size={20} />
                  </button>
                </div>
              </div>

              {loadingTasks ? (
                  <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 py-16 text-slate-500">
                    <Loader2 className="animate-spin" size={20} />
                    Загрузка задач...
                  </div>
              ) : filteredTasks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
                    <ClipboardList className="mx-auto mb-3 text-slate-400" size={34} />
                    <div className="font-bold text-slate-800">Задач пока нет</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {role === "teacher"
                          ? "Нажмите “Создать задачу”, чтобы добавить первую задачу."
                          : "Когда преподаватель добавит задачу, она появится здесь."}
                    </div>
                  </div>
              ) : (
                  <div className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2" : "space-y-4"}>
                    {filteredTasks.map((task) => {
                      const deadlinePassed = isDeadlinePassed(task.deadline);

                      return (
                          <article
                              key={task.id}
                              className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-violet-200 hover:shadow-md"
                          >
                            <div className="flex flex-col gap-4 md:flex-row md:items-center">
                              <div
                                  className={[
                                    "flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-xl",
                                    typeBoxClass(task.type),
                                  ].join(" ")}
                              >
                                {typeIcon(task.type)}
                                <span className="mt-2 text-sm font-extrabold">{TYPE_LABELS[task.type]}</span>
                              </div>

                              <div className="min-w-0 flex-1">
                                <h3 className="text-lg font-extrabold text-slate-950">{task.title}</h3>

                                {task.description && (
                                    <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-slate-500">
                                      {task.description}
                                    </p>
                                )}

                                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Star size={15} />
                              {task.points || 0} баллов
                            </span>

                                  <span className="inline-flex items-center gap-1">
                              <CalendarDays size={15} />
                              Дедлайн: {formatDate(task.deadline)}
                            </span>

                                  <span className="inline-flex items-center gap-1">
                              <Star size={15} />
                                    {task.session?.title || selectedSession?.title || "Общая задача"}
                            </span>
                                </div>

                                {deadlinePassed && task.status === "published" && (
                                    <div className="mt-3 text-xs font-bold text-red-600">Дедлайн өтті</div>
                                )}
                              </div>

                              <div className="flex shrink-0 flex-col items-start gap-3 md:items-end">
                                {role === "student" ? (
                                    <span
                                        className={[
                                          "rounded-lg px-3 py-2 text-sm font-extrabold",
                                          studentStatusClass(task),
                                        ].join(" ")}
                                    >
                              {studentStatusLabel(task)}
                            </span>
                                ) : (
                                    <span className="rounded-lg bg-violet-50 px-3 py-2 text-sm font-extrabold text-violet-700">
                              {task.submissionCount || 0} ответов
                            </span>
                                )}

                                <div className="flex items-center gap-2">
                                  {role === "student" ? (
                                      task.type === "test" ? (
                                          <Link
                                              href={getTestHref(role, task.testId)}
                                              className="inline-flex h-11 items-center justify-center rounded-xl bg-violet-600 px-5 text-sm font-extrabold text-white shadow-lg shadow-violet-100 transition hover:bg-violet-700"
                                          >
                                            {taskActionLabel(task, role)}
                                          </Link>
                                      ) : (
                                          <Link
                                              href={`/student/tasks/${task.id}`}
                                              className="inline-flex h-11 items-center justify-center rounded-xl border border-violet-300 bg-white px-5 text-sm font-extrabold text-violet-600 transition hover:bg-violet-50"
                                          >
                                            {taskActionLabel(task, role)}
                                          </Link>
                                          )
                                    ) : (
                                      <>
                                        <button
                                            type="button"
                                            onClick={() => void openSubmissions(task)}
                                            className="inline-flex h-11 items-center justify-center rounded-xl bg-violet-600 px-5 text-sm font-extrabold text-white shadow-lg shadow-violet-100 transition hover:bg-violet-700"
                                        >
                                          Ответы
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => openEditModal(task)}
                                            className="rounded-xl border border-slate-200 p-3 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                                            title="Редактировать"
                                        >
                                          <MoreVertical size={18} />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => void handleDeleteTask(task)}
                                            className="rounded-xl border border-red-100 p-3 text-red-500 transition hover:bg-red-50"
                                            title="Удалить"
                                        >
                                          <X size={18} />
                                        </button>
                                      </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </article>
                      );
                    })}
                  </div>
              )}

              <div className="mt-6 rounded-2xl bg-violet-50 px-5 py-4 text-violet-900">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-violet-600" size={22} />
                  <div>
                    <div className="font-extrabold">Как выполнять задания?</div>
                    <p className="mt-1 text-sm font-medium leading-6 text-violet-900/70">
                      Выберите задачу и нажмите соответствующую кнопку действий. После выполнения вы сможете увидеть результат и обратную связь от преподавателя.
                    </p>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>

        {createChoiceOpen && (
            <ModalShell
                title="Создать задачу"
                description="Выберите тип задачи, чтобы перейти к созданию"
                onClose={() => setCreateChoiceOpen(false)}
                size="wide"
            >
              <div className="grid gap-6 lg:grid-cols-[1fr_1fr_300px]">
                <button
                    type="button"
                    onClick={() => goToCreatePage("test")}
                    className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl"
                >
                  <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-violet-100 text-violet-600 transition group-hover:scale-105">
                    <ClipboardList size={58} />
                  </div>

                  <h3 className="mt-8 text-2xl font-extrabold text-slate-950">Тест</h3>

                  <p className="mx-auto mt-4 max-w-xs text-base font-medium leading-7 text-slate-500">
                    Вопросы, варианты ответов и автоматическая проверка
                  </p>

                  <div className="mt-10 inline-flex h-12 w-full max-w-xs items-center justify-center gap-3 rounded-xl bg-violet-600 px-6 text-sm font-extrabold text-white shadow-lg shadow-violet-100 transition group-hover:bg-violet-700">
                    Создать тест
                    <span className="text-xl">→</span>
                  </div>

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 rounded-b-3xl bg-gradient-to-t from-violet-50 to-transparent" />
                </button>

                <button
                    type="button"
                    onClick={() => goToCreatePage("homework")}
                    className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"
                >
                  <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition group-hover:scale-105">
                    <FileText size={58} />
                  </div>

                  <h3 className="mt-8 text-2xl font-extrabold text-slate-950">Домашнее задание</h3>

                  <p className="mx-auto mt-4 max-w-xs text-base font-medium leading-7 text-slate-500">
                    Текстовый ответ, файл или ссылка, проверка учителем
                  </p>

                  <div className="mt-10 inline-flex h-12 w-full max-w-xs items-center justify-center gap-3 rounded-xl bg-violet-600 px-6 text-sm font-extrabold text-white shadow-lg shadow-violet-100 transition group-hover:bg-violet-700">
                    Создать домашку
                    <span className="text-xl">→</span>
                  </div>

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 rounded-b-3xl bg-gradient-to-t from-blue-50 to-transparent" />
                </button>

                <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                    <HelpCircle size={28} />
                  </div>

                  <h3 className="mt-6 text-xl font-extrabold text-violet-600">Как это работает?</h3>

                  <p className="mt-4 text-base font-medium leading-7 text-slate-500">
                    После выбора типа задачи откроется форма создания, где можно настроить параметры, дедлайн, баллы и опубликовать задание для учеников.
                  </p>

                  <div className="mt-6 rounded-2xl bg-violet-50 px-4 py-3 text-sm font-semibold leading-6 text-violet-700">
                    Тест — для автоматической проверки. Домашка — для файла или текстового ответа.
                  </div>
                </div>
              </div>
            </ModalShell>
        )}

        {taskModalOpen && (
            <ModalShell
                title={editingTask ? "Редактировать задачу" : "Создать задачу"}
                description="Задача будет привязана к выбранной группе и уроку."
                onClose={() => setTaskModalOpen(false)}
            >
              <form className="space-y-5" onSubmit={handleSaveTask}>
                <Field label="Название">
                  <TextInput
                      value={form.title}
                      onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="Например: 5 есеп шығару"
                  />
                </Field>

                <Field label="Описание">
                  <TextArea
                      value={form.description}
                      onChange={(value) => setForm((prev) => ({ ...prev, description: value }))}
                      placeholder="Что нужно сделать студенту?"
                  />
                </Field>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Тип">
                    <SelectField
                        value={form.type}
                        onChange={(value) => setForm((prev) => ({ ...prev, type: value as TaskType }))}
                    >
                      <option value="homework">Задание</option>
                      <option value="text_answer">Текстовый ответ</option>
                      <option value="file_upload">Файл</option>
                      <option value="test">Тест</option>
                    </SelectField>
                  </Field>

                  <Field label="Статус">
                    <SelectField
                        value={form.status}
                        onChange={(value) => setForm((prev) => ({ ...prev, status: value as TaskStatus }))}
                    >
                      <option value="draft">Черновик</option>
                      <option value="published">Опубликовано</option>
                      <option value="closed">Закрыто</option>
                      <option value="archived">Архив</option>
                    </SelectField>
                  </Field>
                </div>

                {form.type === "test" && (
                    <Field label="testId">
                      <TextInput
                          value={form.testId}
                          onChange={(event) => setForm((prev) => ({ ...prev, testId: event.target.value }))}
                          placeholder="ID существующего теста"
                      />
                    </Field>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Deadline">
                    <TextInput
                        type="datetime-local"
                        value={form.deadline}
                        onChange={(event) => setForm((prev) => ({ ...prev, deadline: event.target.value }))}
                    />
                  </Field>

                  <Field label="Points">
                    <TextInput
                        type="number"
                        min="0"
                        step="0.5"
                        value={form.points}
                        onChange={(event) => setForm((prev) => ({ ...prev, points: event.target.value }))}
                    />
                  </Field>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                      type="button"
                      onClick={() => setTaskModalOpen(false)}
                      className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Отмена
                  </button>

                  <button
                      type="submit"
                      disabled={savingTask}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"
                  >
                    {savingTask && <Loader2 className="animate-spin" size={17} />}
                    Сохранить
                  </button>
                </div>
              </form>
            </ModalShell>
        )}

        {submitTaskItem && (
            <ModalShell
                title={`Сдать: ${submitTaskItem.title}`}
                description="Отправьте текстовый ответ или загрузите файл."
                onClose={() => setSubmitTaskItem(null)}
            >
              <form className="space-y-5" onSubmit={handleSubmitTask}>
                {canSubmitText && (
                    <Field label="Текстовый ответ">
                      <TextArea
                          value={textAnswer}
                          onChange={setTextAnswer}
                          placeholder="Напишите ответ..."
                          rows={6}
                      />
                    </Field>
                )}

                {canSubmitFile && (
                    <Field label="Файл">
                      <input
                          type="file"
                          onChange={(event) => setAttachment(event.target.files?.[0] || null)}
                          className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm file:mr-4 file:rounded-lg file:border-0 file:bg-violet-50 file:px-4 file:py-2 file:font-bold file:text-violet-600"
                      />
                    </Field>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button
                      type="button"
                      onClick={() => setSubmitTaskItem(null)}
                      className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Отмена
                  </button>

                  <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={17} /> : <Upload size={17} />}
                    Отправить
                  </button>
                </div>
              </form>
            </ModalShell>
        )}

        {submissionsTask && (
            <ModalShell
                title={`Ответы: ${submissionsTask.title}`}
                description={
                  submissionsType === "test"
                      ? "Это ответы теста. Оценивание идёт через модуль тестов."
                      : "Проверьте ответы студентов и поставьте score/feedback."
                }
                onClose={() => setSubmissionsTask(null)}
            >
              {loadingSubmissions ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
                    <Loader2 className="animate-spin" size={20} />
                    Загрузка...
                  </div>
              ) : submissions.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 py-12 text-center text-slate-500">
                    Ответов пока нет
                  </div>
              ) : (
                  <div className="space-y-4">
                    {submissions.map((submission) => {
                      const isTaskSubmission = submissionsType === "task";
                      const taskSubmission = submission as TaskSubmission;
                      const testSubmission = submission as LinkedTestSubmission;

                      return (
                          <div key={submission.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                              <div className="min-w-0 flex-1">
                                <div className="text-lg font-extrabold text-slate-950">
                                  {getStudentName(submission)}
                                </div>

                                <div className="mt-1 text-sm font-medium text-slate-500">
                                  Сдано:{" "}
                                  {formatDate(
                                      isTaskSubmission ? taskSubmission.submittedAt : testSubmission.submittedAt
                                  )}
                                </div>

                                {isTaskSubmission && taskSubmission.textAnswer && (
                                    <div className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                                      {taskSubmission.textAnswer}
                                    </div>
                                )}

                                {isTaskSubmission && taskSubmission.attachmentFileName && (
                                    <a
                                        href={buildTaskAttachmentUrl(taskSubmission.id)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-violet-600 shadow-sm hover:bg-violet-50"
                                    >
                                      <Download size={17} />
                                      {taskSubmission.attachmentFileName}
                                    </a>
                                )}

                                {isTaskSubmission && taskSubmission.feedback && (
                                    <div className="mt-3 text-sm font-medium text-slate-500">
                                      Feedback: {taskSubmission.feedback}
                                    </div>
                                )}
                              </div>

                              <div className="rounded-xl bg-slate-50 px-5 py-4 text-sm">
                                <div className="text-slate-500">Score</div>
                                <div className="mt-1 text-xl font-extrabold text-slate-950">
                                  {isTaskSubmission
                                      ? taskSubmission.score ?? "—"
                                      : testSubmission.score ?? "—"}
                                </div>
                              </div>
                            </div>

                            {isTaskSubmission && gradingId === taskSubmission.id ? (
                                <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-[140px_1fr_auto] md:items-end">
                                  <Field label="Score">
                                    <TextInput
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={gradeScore}
                                        onChange={(event) => setGradeScore(event.target.value)}
                                    />
                                  </Field>

                                  <Field label="Feedback">
                                    <TextInput
                                        value={gradeFeedback}
                                        onChange={(event) => setGradeFeedback(event.target.value)}
                                        placeholder="Комментарий"
                                    />
                                  </Field>

                                  <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => void handleGrade()}
                                        className="h-11 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white hover:bg-violet-700"
                                    >
                                      OK
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setGradingId(null)}
                                        className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600 hover:bg-white"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                            ) : isTaskSubmission ? (
                                <div className="mt-5 flex justify-end">
                                  <button
                                      type="button"
                                      onClick={() => {
                                        setGradingId(taskSubmission.id);
                                        setGradeScore(taskSubmission.score == null ? "" : String(taskSubmission.score));
                                        setGradeFeedback(taskSubmission.feedback || "");
                                      }}
                                      className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
                                  >
                                    Поставить оценку
                                  </button>
                                </div>
                            ) : null}
                          </div>
                      );
                    })}
                  </div>
              )}
            </ModalShell>
        )}
      </div>
  );
}

export default TasksWorkspace;