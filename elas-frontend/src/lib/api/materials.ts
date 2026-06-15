import { api, getApiBaseUrl, getApiOriginUrl, getToken, hasAuth } from "@/lib/api/client";

export type MaterialRow = {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  mimeType: string | null;
  storageKey: string;
  size: number | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
};

export type MaterialAssignmentRow = {
  id: string;
  materialId: string;
  groupId: string;
  sessionId: string | null;
  visibleFrom: string | null;
  visibleTo: string | null;
  createdAt: string;
};

export type MaterialUploadResult = {
  storageKey: string;
  fileName: string;
  mimeType: string | null;
  size: number | null;
};

export type AssignedMaterialRow = {
  assignmentId: string;
  materialId: string;
  title: string;
  description: string | null;
  fileName: string | null;
  mimeType: string | null;
  size: number | null;
  createdAt: string;
  visibleFrom: string | null;
  visibleTo: string | null;
};

export async function getMyMaterials(params?: { signal?: AbortSignal }): Promise<MaterialRow[]> {
  if (!getApiBaseUrl() || !hasAuth()) return [];
  const list = await api.get<MaterialRow[]>("/materials", { signal: params?.signal });
  return Array.isArray(list) ? list : [];
}

export async function createMaterial(
    input: {
      title: string;
      description?: string | null;
      fileName: string;
      mimeType?: string | null;
      storageKey: string;
      size?: number | null;
    },
    params?: { signal?: AbortSignal }
): Promise<MaterialRow> {
  return api.post<MaterialRow>("/materials", input, { signal: params?.signal });
}

export async function uploadMaterialFile(file: File): Promise<MaterialUploadResult> {
  const base = getApiBaseUrl();
  const token = getToken();
  if (!base || !token) throw new Error("API URL or auth token not configured");

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${base}/materials/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "include",
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Upload failed: ${response.status}`);
  }

  return response.json() as Promise<MaterialUploadResult>;
}

export async function updateMaterial(
    materialId: string,
    input: Partial<Pick<MaterialRow, "title" | "description" | "fileName" | "mimeType" | "storageKey" | "size">>,
    params?: { signal?: AbortSignal }
): Promise<MaterialRow> {
  return api.patch<MaterialRow>(`/materials/${materialId}`, input, { signal: params?.signal });
}

export async function deleteMaterial(materialId: string, params?: { signal?: AbortSignal }): Promise<void> {
  await api.delete(`/materials/${materialId}`, { signal: params?.signal });
}

export async function assignMaterial(
    materialId: string,
    input: {
      groupId?: string;
      sessionId?: string;
      visibleFrom?: string | null;
      visibleTo?: string | null;
    },
    params?: { signal?: AbortSignal }
): Promise<MaterialAssignmentRow> {
  return api.post<MaterialAssignmentRow>(`/materials/${materialId}/assign`, input, { signal: params?.signal });
}

export async function unassignMaterial(
    materialId: string,
    assignmentId: string,
    params?: { signal?: AbortSignal }
): Promise<void> {
  await api.delete(`/materials/${materialId}/assignments/${assignmentId}`, { signal: params?.signal });
}

export async function getMaterialAssignments(
    materialId: string,
    params?: { signal?: AbortSignal }
): Promise<MaterialAssignmentRow[]> {
  if (!getApiBaseUrl() || !hasAuth() || !materialId) return [];
  const list = await api.get<MaterialAssignmentRow[]>(`/materials/${materialId}/assignments`, {
    signal: params?.signal,
  });
  return Array.isArray(list) ? list : [];
}

export async function getGroupMaterials(groupId: string, params?: { signal?: AbortSignal }): Promise<AssignedMaterialRow[]> {
  if (!getApiBaseUrl() || !hasAuth() || !groupId) return [];
  const list = await api.get<AssignedMaterialRow[]>(`/materials/groups/${groupId}/materials`, { signal: params?.signal });
  return Array.isArray(list) ? list : [];
}

export async function getSessionMaterials(sessionId: string, params?: { signal?: AbortSignal }): Promise<AssignedMaterialRow[]> {
  if (!getApiBaseUrl() || !hasAuth() || !sessionId) return [];
  const list = await api.get<AssignedMaterialRow[]>(`/materials/sessions/${sessionId}/materials`, { signal: params?.signal });
  return Array.isArray(list) ? list : [];
}

export async function getStudentMaterials(params?: { signal?: AbortSignal }): Promise<AssignedMaterialRow[]> {
  if (!getApiBaseUrl() || !hasAuth()) return [];
  const list = await api.get<AssignedMaterialRow[]>("/materials/student/materials", { signal: params?.signal });
  return Array.isArray(list) ? list : [];
}

export async function getMaterialDownload(
    materialId: string,
    params?: { signal?: AbortSignal }
): Promise<{ downloadUrl: string; fileName: string } | null> {
  if (!getApiBaseUrl() || !hasAuth() || !materialId) return null;
  return api.get<{ downloadUrl: string; fileName: string }>(`/materials/${materialId}/download`, { signal: params?.signal });
}

export async function getMaterialDownloadByStorageKey(
    input: { storageKey: string; fileName?: string | null },
    params?: { signal?: AbortSignal }
): Promise<{ downloadUrl: string; fileName: string } | null> {
  const storageKey = String(input.storageKey || "").trim();
  if (!getApiBaseUrl() || !hasAuth() || !storageKey) return null;

  const query = new URLSearchParams({ key: storageKey });
  const fileName = String(input.fileName || "").trim();

  if (fileName) {
    query.set("fileName", fileName);
  }

  return api.get<{ downloadUrl: string; fileName: string }>(`/materials/download-by-key?${query.toString()}`, {
    signal: params?.signal,
  });
}

export function downloadFromUrl(url: string, fileName?: string | null): void {
  if (typeof window === "undefined" || !url) return;

  const link = document.createElement("a");
  link.href = url;
  link.rel = "noreferrer";
  link.target = "_blank";

  if (fileName) {
    link.download = fileName;
  }

  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function resolveDownloadUrl(downloadUrl: string): string {
  const raw = String(downloadUrl || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;

  const origin = getApiOriginUrl();
  if (!origin) return raw;

  return `${origin}${raw.startsWith("/") ? raw : "/" + raw}`;
}