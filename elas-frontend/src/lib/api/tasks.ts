import { api, clearAuth, getApiBaseUrl, getToken, hasAuth } from "./client";

export type TaskType = "test" | "homework" | "file_upload" | "text_answer";
export type TaskStatus = "draft" | "published" | "closed" | "archived";
export type TaskSubmissionStatus = "submitted" | "graded";

export type TaskUser = {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
};

export type TaskGroup = {
  id: string;
  name: string;
  teacherId?: string | null;
};

export type TaskSession = {
  id: string;
  title: string;
  type?: string | null;
  status?: string | null;
  groupId?: string | null;
};

export type TaskTest = {
  id: string;
  title: string;
  description?: string | null;
  groupId?: string | null;
  sessionId?: string | null;
  status?: string | null;
  timeLimitMinutes?: number | null;
  attemptsAllowed?: number | null;
  questionCount?: number | null;
  submissionCount?: number | null;
};

export type TaskSubmission = {
  id: string;
  taskId: string;
  studentId: string;
  student?: TaskUser | null;
  status: TaskSubmissionStatus | string;
  textAnswer?: string | null;
  attachmentFileName?: string | null;
  attachmentMimeType?: string | null;
  attachmentSize?: number | null;
  attachmentUrl?: string | null;
  score?: number | null;
  feedback?: string | null;
  submittedAt?: string | null;
  gradedAt?: string | null;
  gradedById?: string | null;
  gradedBy?: TaskUser | null;
};

export type LinkedTestSubmission = {
  id: string;
  testId: string;
  studentId: string;
  student?: TaskUser | null;
  status: string;
  score?: number | null;
  maxScore?: number | null;
  startedAt?: string | null;
  submittedAt?: string | null;
};

export type Task = {
  id: string;
  title: string;
  description?: string | null;
  type: TaskType;
  status: TaskStatus;
  deadline?: string | null;
  points: number;
  groupId?: string | null;
  sessionId?: string | null;
  testId?: string | null;
  createdById: string;
  createdBy?: TaskUser | null;
  group?: TaskGroup | null;
  session?: TaskSession | null;
  test?: TaskTest | null;
  submissionCount?: number | null;
  mySubmission?: TaskSubmission | null;
  myTestSubmission?: LinkedTestSubmission | null;
};

export type CreateTaskBody = {
  title: string;
  description?: string | null;
  type: TaskType;
  groupId?: string | null;
  sessionId?: string | null;
  testId?: string | null;
  deadline?: string | null;
  points?: number;
  status?: TaskStatus;
};

export type UpdateTaskBody = Partial<CreateTaskBody>;

function buildQuery(params: Record<string, string | null | undefined>) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) {
      search.set(key, String(value));
    }
  });

  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

async function rawRequest<T>(
  path: string,
  options: RequestInit & { parseJson?: boolean } = {}
): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) throw new Error("API URL not configured");

  const token = getToken();
  const { parseJson = true, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers);

  if (token) headers.set("Authorization", `Bearer ${token}`);

  const isFormData = typeof FormData !== "undefined" && fetchOptions.body instanceof FormData;
  if (fetchOptions.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const safePath = path.startsWith("/") ? path : `/${path}`;

  const res = await fetch(`${base}${safePath}`, {
    ...fetchOptions,
    credentials: fetchOptions.credentials ?? "include",
    headers,
  });

  if (res.status === 401) clearAuth();

  if (!res.ok) {
    const body = await res.text();
    let message = body;

    try {
      const json = JSON.parse(body);
      message = json?.error || json?.message || body;
    } catch {}

    throw new Error(message || `HTTP ${res.status}`);
  }

  if (!parseJson) return undefined as T;
  return res.json() as Promise<T>;
}

export function buildTaskAttachmentUrl(submissionId: string) {
  const base = getApiBaseUrl();
  if (!base) return "#";
  return `${base}/tasks/submissions/${submissionId}/attachment`;
}

export async function getTasks(params: {
  groupId?: string | null;
  sessionId?: string | null;
  type?: TaskType | null;
  status?: TaskStatus | null;
} = {}): Promise<Task[]> {
  if (!getApiBaseUrl() || !hasAuth()) return [];
  const list = await api.get<Task[]>(`tasks${buildQuery(params)}`);
  return Array.isArray(list) ? list : [];
}

export async function getTask(taskId: string): Promise<Task> {
  return api.get<Task>(`tasks/${taskId}`);
}

export async function createTask(body: CreateTaskBody): Promise<Task> {
  return api.post<Task>("tasks", body);
}

export async function updateTask(taskId: string, body: UpdateTaskBody): Promise<Task> {
  return api.patch<Task>(`tasks/${taskId}`, body);
}

export async function deleteTask(taskId: string): Promise<void> {
  await api.delete(`tasks/${taskId}`);
}

export async function submitTask(
  taskId: string,
  body: { textAnswer?: string; attachment?: File | null }
): Promise<TaskSubmission> {
  const formData = new FormData();

  if (body.textAnswer?.trim()) formData.append("textAnswer", body.textAnswer.trim());
  if (body.attachment) formData.append("attachment", body.attachment);

  return rawRequest<TaskSubmission>(`tasks/${taskId}/submit`, {
    method: "POST",
    body: formData,
  });
}

export async function getMyTaskSubmission(taskId: string): Promise<{
  type: "task" | "test";
  submission: TaskSubmission | LinkedTestSubmission;
}> {
  return api.get(`tasks/${taskId}/my-submission`);
}

export async function getTaskSubmissions(taskId: string): Promise<{
  type: "task" | "test";
  submissions: TaskSubmission[] | LinkedTestSubmission[];
}> {
  return api.get(`tasks/${taskId}/submissions`);
}

export async function gradeTaskSubmission(
  taskId: string,
  submissionId: string,
  body: { score: number; feedback?: string | null }
): Promise<TaskSubmission> {
  return api.patch<TaskSubmission>(`tasks/${taskId}/submissions/${submissionId}/grade`, body);
}

export async function getTaskAttachmentDownloadUrl(submissionId: string): Promise<{
  url: string;
  fileName?: string | null;
  mimeType?: string | null;
  size?: number | null;
}> {
  return api.get(`tasks/submissions/${submissionId}/attachment-url`);
}