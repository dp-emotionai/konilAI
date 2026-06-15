import { api, getApiBaseUrl, hasAuth } from "@/lib/api/client";
import {
  getSessionMaterials as getSessionMaterialsApi,
  type MaterialKind,
} from "@/lib/api/materials";

export type SessionContentFile = {
  id: string;
  materialId?: string;
  title: string;
  description?: string | null;
  kind?: MaterialKind | null;
  fileName?: string | null;
  url?: string | null;
  mimeType?: string | null;
  size?: number | null;
  createdAt?: string | null;
  groupId?: string | null;
  groupName?: string | null;
};

export type SessionContent = {
  sessionId: string;
  lessonPlan: string | null;
  keyPoints: string[];
  files: SessionContentFile[];
};

type RawObject = Record<string, unknown>;

function isObject(value: unknown): value is RawObject {
  return typeof value === "object" && value !== null;
}

function toStringOrNull(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const result = String(value).trim();
  return result || null;
}

function toMaterialKind(value: unknown): MaterialKind | null {
  const kind = toStringOrNull(value)?.toLowerCase();
  if (kind === "document" || kind === "image" || kind === "video" || kind === "audio" || kind === "file") {
    return kind;
  }
  return null;
}

function normalizeFile(rawValue: unknown): SessionContentFile | null {
  if (!isObject(rawValue)) return null;

  const materialId = toStringOrNull(rawValue.materialId ?? rawValue.material_id);
  const id = materialId ?? toStringOrNull(rawValue.id ?? rawValue.fileId ?? rawValue.file_id);
  const title = toStringOrNull(rawValue.title ?? rawValue.name ?? rawValue.fileName ?? rawValue.file_name);

  if (!id || !title) return null;

  return {
    id,
    materialId: materialId ?? id,
    title,
    description: toStringOrNull(rawValue.description),
    kind: toMaterialKind(rawValue.kind),
    fileName: toStringOrNull(rawValue.fileName ?? rawValue.file_name),
    url: toStringOrNull(rawValue.url),
    mimeType: toStringOrNull(rawValue.mimeType ?? rawValue.mime_type),
    size: typeof rawValue.size === "number" && Number.isFinite(rawValue.size) ? rawValue.size : null,
    createdAt: toStringOrNull(rawValue.createdAt ?? rawValue.created_at ?? rawValue.assignedAt ?? rawValue.assigned_at),
    groupId: toStringOrNull(rawValue.groupId ?? rawValue.group_id),
    groupName: toStringOrNull(rawValue.groupName ?? rawValue.group_name),
  };
}

export async function getSessionContent(sessionId: string): Promise<SessionContent | null> {
  if (!getApiBaseUrl() || !hasAuth() || !sessionId) return null;

  try {
    const raw = await api.get<unknown>(`sessions/${sessionId}/content`);
    if (!isObject(raw)) return null;

    const keyPointsRaw = Array.isArray(raw.keyPoints)
        ? raw.keyPoints
        : Array.isArray(raw.highlights)
            ? raw.highlights
            : [];

    const filesRaw = Array.isArray(raw.files)
        ? raw.files
        : Array.isArray(raw.materials)
            ? raw.materials
            : [];

    return {
      sessionId: toStringOrNull(raw.sessionId) ?? sessionId,
      lessonPlan:
          typeof raw.lessonPlan === "string"
              ? raw.lessonPlan
              : typeof raw.plan === "string"
                  ? raw.plan
                  : null,
      keyPoints: keyPointsRaw
          .map((item: unknown) => (typeof item === "string" ? item.trim() : ""))
          .filter(Boolean),
      files: filesRaw.map(normalizeFile).filter((item): item is SessionContentFile => Boolean(item)),
    };
  } catch {
    return null;
  }
}

export async function getSessionMaterials(sessionId: string): Promise<SessionContentFile[] | null> {
  if (!getApiBaseUrl() || !hasAuth() || !sessionId) return null;

  try {
    const raw = await getSessionMaterialsApi(sessionId);
    if (!Array.isArray(raw)) return [];

    return raw
        .map((item) =>
            normalizeFile({
              id: item.materialId,
              materialId: item.materialId,
              title: item.title,
              description: item.description,
              kind: item.kind,
              fileName: item.fileName,
              mimeType: item.mimeType,
              size: item.size,
              createdAt: item.createdAt ?? item.assignedAt,
              groupId: item.groupId,
              groupName: item.groupName,
              url: null,
            })
        )
        .filter((f): f is SessionContentFile => Boolean(f));
  } catch {
    return null;
  }
}

export async function updateSessionContent(
    sessionId: string,
    input: { lessonPlan: string; keyPoints: string[] }
): Promise<SessionContent | null> {
  if (!getApiBaseUrl() || !hasAuth() || !sessionId) return null;

  const raw = await api.put<unknown>(`sessions/${sessionId}/content`, input);
  if (!isObject(raw)) return null;

  const keyPointsRaw = Array.isArray(raw.keyPoints) ? raw.keyPoints : [];

  return {
    sessionId: toStringOrNull(raw.sessionId) ?? sessionId,
    lessonPlan: typeof raw.lessonPlan === "string" ? raw.lessonPlan : "",
    keyPoints: keyPointsRaw
        .map((item: unknown) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean),
    files: [],
  };
}
