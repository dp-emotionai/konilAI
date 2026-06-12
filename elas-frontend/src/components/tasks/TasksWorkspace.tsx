"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BookOpenCheck,
  Clock3,
  Download,
  Eye,
  FileUp,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Trash2,
} from "lucide-react";

import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Section from "@/components/common/Section";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { Card, CardContent } from "@/components/ui/Card";

import {
  getStudentGroupDetail,
  getStudentGroups,
  type StudentGroupDetail,
  type StudentGroupRow,
} from "@/lib/api/student";

import {
  getGroupById,
  getTeacherGroups,
  type TeacherGroup,
} from "@/lib/api/teacher";

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
  homework: "Домашка",
  file_upload: "Файл",
  text_answer: "Текст",
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  draft: "Черновик",
  published: "Опубликовано",
  closed: "Закрыто",
  archived: "Архив",
};

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatForInput(value?: string | null) {
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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
      {children}
    </div>
  );
}

function SelectBox({
  value,
  onChange,
  disabled,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-elas border border-border bg-surface px-3 text-sm text-fg shadow-soft outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
    >
      {children}
    </select>
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
      className="w-full rounded-elas border border-border bg-surface px-4 py-3 text-sm text-fg shadow-soft outline-none transition placeholder:text-muted-2 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
    />
  );
}

function TaskIcon({ type }: { type: TaskType }) {
  if (type === "test") return <BookOpenCheck size={16} />;
  if (type === "file_upload") return <FileUp size={16} />;
  return <Send size={16} />;
}
function TasksWorkspace({ role }: { role: RoleMode }) {
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [sessions, setSessions] = useState<SessionOption[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");

  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const [error, setError] = useState<string | null>(null);

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

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    setError(null);

    try {
      const result = role === "student" ? await getStudentGroups() : await getTeacherGroups();

      const normalized = (result as Array<StudentGroupRow | TeacherGroup>).map((group) => ({
        id: group.id,
        name: group.name,
      }));

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
        const detail: StudentGroupDetail | null = await getStudentGroupDetail(selectedGroupId);

        setSessions(
          (detail?.sessions || []).map((session) => ({
            id: session.id,
            title: session.title,
            status: session.status,
            type: session.type,
          }))
        );
      } else {
        const detail = await getGroupById(selectedGroupId);

        setSessions(
          (detail?.sessions || []).map((session) => ({
            id: session.id,
            title: session.title,
            status: session.status,
            type: session.type,
          }))
        );
      }

      setSelectedSessionId("");
    } catch (err) {
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
        sessionId: selectedSessionId || null,
      });

      setTasks(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить задачи");
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }, [selectedGroupId, selectedSessionId]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  function openCreateModal() {
    setEditingTask(null);
    setForm(EMPTY_FORM);
    setTaskModalOpen(true);
  }

  function openEditModal(task: Task) {
    setEditingTask(task);

    setForm({
      title: task.title,
      description: task.description || "",
      type: task.type,
      status: task.status,
      deadline: formatForInput(task.deadline),
      points: String(task.points || 0),
      testId: task.testId || "",
    });

    setTaskModalOpen(true);
  }

  async function handleSaveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = form.title.trim();

    if (!selectedGroupId) {
      setError("Сначала выберите группу");
      return;
    }

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
    <div className="space-y-10 pb-16">
      <Breadcrumbs
        items={[
          {
            label: role === "student" ? "Студент" : "Преподаватель",
            href: role === "student" ? "/student/dashboard" : "/teacher/dashboard",
          },
          { label: "Задачи" },
        ]}
      />

      <PageHero
        title="Задачи"
        subtitle={
          role === "student"
            ? "Выберите группу и урок, чтобы увидеть тесты, домашние задания и загрузки файлов."
            : "Создавайте задачи, привязывайте их к группе или уроку и проверяйте ответы студентов."
        }
      />

      <Section>
        <Card>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <div>
                <FieldLabel>Группа</FieldLabel>

                <SelectBox
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
                </SelectBox>
              </div>

              <div>
                <FieldLabel>Урок</FieldLabel>

                <SelectBox
                  value={selectedSessionId}
                  disabled={!selectedGroupId || loadingSessions}
                  onChange={setSelectedSessionId}
                >
                  <option value="">Все задачи группы</option>

                  {sessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {session.title}
                    </option>
                  ))}
                </SelectBox>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => void loadTasks()}>
                  <RefreshCw size={16} />
                  Обновить
                </Button>

                {role === "teacher" && (
                  <Button type="button" onClick={openCreateModal}>
                    <Plus size={16} />
                    Создать
                  </Button>
                )}
              </div>
            </div>

            {error && (
              <div className="flex gap-2 rounded-2xl border border-error/20 bg-error/8 px-4 py-3 text-sm text-error">
                <AlertCircle size={17} />
                {error}
              </div>
            )}
          </CardContent>
        </Card>
      </Section>

      <Section>
        {loadingTasks ? (
          <Card>
            <CardContent className="flex items-center justify-center gap-2 py-12 text-muted">
              <Loader2 className="animate-spin" size={20} />
              Загрузка задач...
            </CardContent>
          </Card>
        ) : tasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted">
              Задач пока нет
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {tasks.map((task) => {
              const deadlinePassed = isDeadlinePassed(task.deadline);
              const submitted = Boolean(task.mySubmission || task.myTestSubmission);

              return (
                <Card key={task.id} interactive>
                  <CardContent className="space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="mb-2 flex flex-wrap gap-2">
                          <Badge variant={task.type === "test" ? "primary" : "secondary"}>
                            <TaskIcon type={task.type} />
                            {TYPE_LABELS[task.type]}
                          </Badge>

                          <Badge variant={task.status === "published" ? "success" : "outline"}>
                            {STATUS_LABELS[task.status]}
                          </Badge>

                          {deadlinePassed && task.status === "published" && (
                            <Badge variant="danger">Deadline өтті</Badge>
                          )}
                        </div>

                        <h3 className="text-lg font-semibold text-fg">{task.title}</h3>

                        {task.description && (
                          <p className="mt-1 text-sm leading-6 text-muted">
                            {task.description}
                          </p>
                        )}
                      </div>

                      <div className="rounded-2xl border border-border bg-surface-subtle px-4 py-3 text-sm">
                        <div className="flex items-center gap-2 text-muted">
                          <Clock3 size={15} />
                          {formatDate(task.deadline)}
                        </div>

                        <div className="mt-1 font-semibold text-fg">
                          {task.points || 0} балл
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 text-sm md:grid-cols-3">
                      <div className="rounded-2xl bg-surface-subtle px-4 py-3">
                        <div className="text-xs text-muted">Группа</div>
                        <div className="mt-1 font-medium text-fg">
                          {task.group?.name || "—"}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-surface-subtle px-4 py-3">
                        <div className="text-xs text-muted">Урок</div>
                        <div className="mt-1 font-medium text-fg">
                          {task.session?.title || "Общая задача"}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-surface-subtle px-4 py-3">
                        <div className="text-xs text-muted">Статус</div>
                        <div className="mt-1 font-medium text-fg">
                          {role === "student"
                            ? submitted
                              ? "Сдано"
                              : "Не сдано"
                            : `${task.submissionCount || 0} ответов`}
                        </div>
                      </div>
                    </div>

                    {role === "student" && task.mySubmission?.feedback && (
                      <div className="rounded-2xl border border-success/20 bg-success/8 px-4 py-3 text-sm">
                        <div className="font-semibold text-success">
                          Score: {task.mySubmission.score ?? "—"} / {task.points || "—"}
                        </div>
                        <div className="mt-1 text-muted">
                          Feedback: {task.mySubmission.feedback}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                      {role === "student" ? (
                        task.type === "test" ? (
                          <Link
                            href={getTestHref(role, task.testId)}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#7448FF] px-5 text-sm font-semibold text-white shadow-md transition hover:bg-[#623ce6]"
                          >
                            <Eye size={16} />
                            Открыть тест
                          </Link>
                        ) : (
                          <Button
                            type="button"
                            onClick={() => openSubmitModal(task)}
                            disabled={task.status !== "published" || deadlinePassed}
                          >
                            <Send size={16} />
                            {submitted ? "Пересдать" : "Сдать"}
                          </Button>
                        )
                      ) : (
                        <>
                          <Button type="button" variant="outline" onClick={() => void openSubmissions(task)}>
                            <Eye size={16} />
                            Ответы
                          </Button>

                          <Button type="button" variant="outline" onClick={() => openEditModal(task)}>
                            <Pencil size={16} />
                            Edit
                          </Button>

                          <Button type="button" variant="danger" onClick={() => void handleDeleteTask(task)}>
                            <Trash2 size={16} />
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </Section>

      <Modal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        title={editingTask ? "Редактировать задачу" : "Создать задачу"}
        description="Задача будет привязана к выбранной группе и уроку."
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setTaskModalOpen(false)}>
              Отмена
            </Button>

            <Button type="submit" form="task-form" disabled={savingTask}>
              {savingTask && <Loader2 size={16} className="animate-spin" />}
              Сохранить
            </Button>
          </div>
        }
      >
        <form id="task-form" className="space-y-4" onSubmit={handleSaveTask}>
          <Input
            label="Название"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Домашнее задание №1"
          />

          <div>
            <FieldLabel>Описание</FieldLabel>
            <TextArea
              value={form.description}
              onChange={(value) => setForm((prev) => ({ ...prev, description: value }))}
              placeholder="Что нужно сделать студенту?"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel>Тип</FieldLabel>
              <SelectBox
                value={form.type}
                onChange={(value) => setForm((prev) => ({ ...prev, type: value as TaskType }))}
              >
                <option value="homework">homework</option>
                <option value="text_answer">text_answer</option>
                <option value="file_upload">file_upload</option>
                <option value="test">test</option>
              </SelectBox>
            </div>

            <div>
              <FieldLabel>Status</FieldLabel>
              <SelectBox
                value={form.status}
                onChange={(value) => setForm((prev) => ({ ...prev, status: value as TaskStatus }))}
              >
                <option value="draft">draft</option>
                <option value="published">published</option>
                <option value="closed">closed</option>
                <option value="archived">archived</option>
              </SelectBox>
            </div>
          </div>

          {form.type === "test" && (
            <Input
              label="testId"
              value={form.testId}
              onChange={(event) => setForm((prev) => ({ ...prev, testId: event.target.value }))}
              placeholder="ID существующего теста"
            />
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Deadline"
              type="datetime-local"
              value={form.deadline}
              onChange={(event) => setForm((prev) => ({ ...prev, deadline: event.target.value }))}
            />

            <Input
              label="Points"
              type="number"
              min="0"
              step="0.5"
              value={form.points}
              onChange={(event) => setForm((prev) => ({ ...prev, points: event.target.value }))}
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(submitTaskItem)}
        onClose={() => setSubmitTaskItem(null)}
        title={submitTaskItem ? `Сдать: ${submitTaskItem.title}` : "Сдать задачу"}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setSubmitTaskItem(null)}>
              Отмена
            </Button>

            <Button type="submit" form="submit-task-form" disabled={submitting}>
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Отправить
            </Button>
          </div>
        }
      >
        <form id="submit-task-form" className="space-y-4" onSubmit={handleSubmitTask}>
          {canSubmitText && (
            <div>
              <FieldLabel>Текстовый ответ</FieldLabel>
              <TextArea
                value={textAnswer}
                onChange={setTextAnswer}
                placeholder="Напишите ответ..."
                rows={6}
              />
            </div>
          )}

          {canSubmitFile && (
            <div>
              <FieldLabel>Файл</FieldLabel>
              <input
                type="file"
                onChange={(event) => setAttachment(event.target.files?.[0] || null)}
                className="block w-full rounded-elas border border-border bg-surface px-4 py-2 text-sm text-fg shadow-soft"
              />
            </div>
          )}
        </form>
      </Modal>

      <Modal
        open={Boolean(submissionsTask)}
        onClose={() => setSubmissionsTask(null)}
        title={submissionsTask ? `Ответы: ${submissionsTask.title}` : "Ответы"}
        description={
          submissionsType === "test"
            ? "Это ответы теста. Оценивание идёт через модуль тестов."
            : "Проверьте ответы студентов и поставьте score/feedback."
        }
        size="xl"
      >
        {loadingSubmissions ? (
          <div className="flex justify-center gap-2 py-10 text-muted">
            <Loader2 className="animate-spin" size={20} />
            Загрузка...
          </div>
        ) : submissions.length === 0 ? (
          <div className="py-10 text-center text-muted">Ответов пока нет</div>
        ) : (
          <div className="space-y-3">
            {submissions.map((submission) => {
              const isTaskSubmission = submissionsType === "task";
              const taskSubmission = submission as TaskSubmission;
              const testSubmission = submission as LinkedTestSubmission;

              return (
                <div key={submission.id} className="rounded-2xl border border-border bg-surface-subtle p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-fg">{getStudentName(submission)}</div>

                      <div className="mt-1 text-xs text-muted">
                        Сдано:{" "}
                        {formatDate(
                          isTaskSubmission ? taskSubmission.submittedAt : testSubmission.submittedAt
                        )}
                      </div>

                      {isTaskSubmission && taskSubmission.textAnswer && (
                        <div className="mt-3 whitespace-pre-wrap rounded-xl bg-surface px-3 py-2 text-sm">
                          {taskSubmission.textAnswer}
                        </div>
                      )}

                      {isTaskSubmission && taskSubmission.attachmentFileName && (
                        <a
                          href={buildTaskAttachmentUrl(taskSubmission.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                        >
                          <Download size={16} />
                          {taskSubmission.attachmentFileName}
                        </a>
                      )}

                      {isTaskSubmission && taskSubmission.feedback && (
                        <div className="mt-2 text-sm text-muted">
                          Feedback: {taskSubmission.feedback}
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl bg-surface px-4 py-3 text-sm">
                      <div className="text-xs text-muted">Score</div>
                      <div className="mt-1 font-semibold text-fg">
                        {isTaskSubmission
                          ? taskSubmission.score ?? "—"
                          : testSubmission.score ?? "—"}
                      </div>
                    </div>
                  </div>

                  {isTaskSubmission && gradingId === taskSubmission.id ? (
                    <div className="mt-4 grid gap-3 rounded-2xl border border-border bg-surface p-3 md:grid-cols-[140px_1fr_auto] md:items-end">
                      <Input
                        label="Score"
                        type="number"
                        min="0"
                        step="0.5"
                        value={gradeScore}
                        onChange={(event) => setGradeScore(event.target.value)}
                      />

                      <Input
                        label="Feedback"
                        value={gradeFeedback}
                        onChange={(event) => setGradeFeedback(event.target.value)}
                      />

                      <div className="flex gap-2">
                        <Button type="button" size="sm" onClick={() => void handleGrade()}>
                          OK
                        </Button>

                        <Button type="button" size="sm" variant="ghost" onClick={() => setGradingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : isTaskSubmission ? (
                    <div className="mt-4 flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setGradingId(taskSubmission.id);
                          setGradeScore(taskSubmission.score == null ? "" : String(taskSubmission.score));
                          setGradeFeedback(taskSubmission.feedback || "");
                        }}
                      >
                        Поставить оценку
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}

export default TasksWorkspace;