import { api, getApiBaseUrl, getApiOriginUrl, hasAuth } from "@/lib/api/client";

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

export function resolveDownloadUrl(downloadUrl: string): string {
  const raw = String(downloadUrl || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  const origin = getApiOriginUrl();
  if (!origin) return raw;
  return `${origin}${raw.startsWith("/") ? raw : "/" + raw}`;
}

