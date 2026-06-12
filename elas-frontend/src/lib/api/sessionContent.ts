import { api, getApiBaseUrl, hasAuth } from "@/lib/api/client";
import { getSessionMaterials as getSessionMaterialsApi } from "@/lib/api/materials";

export type SessionContentFile = {
  id: string;
  title: string;
  fileName?: string | null;
  url?: string | null;
  mimeType?: string | null;
  size?: number | null;
};

export type SessionContent = {
  sessionId: string;
  lessonPlan: string | null;
  keyPoints: string[];
  files: SessionContentFile[];
};

function normalizeFile(raw: any): SessionContentFile | null {
  const id = raw?.id ?? raw?.materialId ?? raw?.fileId;
  const title = raw?.title ?? raw?.name ?? raw?.fileName;
  if (!id || !title) return null;

  return {
    id: String(id),
    title: String(title),
    fileName: raw?.fileName ? String(raw.fileName) : null,
    url: raw?.url ? String(raw.url) : null,
    mimeType: raw?.mimeType ? String(raw.mimeType) : null,
    size: typeof raw?.size === "number" ? raw.size : null,
  };
}

export async function getSessionContent(sessionId: string): Promise<SessionContent | null> {
  if (!getApiBaseUrl() || !hasAuth() || !sessionId) return null;

  try {
    const raw = await api.get<any>(`sessions/${sessionId}/content`);
    const keyPointsRaw = Array.isArray(raw?.keyPoints)
      ? raw.keyPoints
      : Array.isArray(raw?.highlights)
        ? raw.highlights
        : [];

    const filesRaw = Array.isArray(raw?.files)
      ? raw.files
      : Array.isArray(raw?.materials)
        ? raw.materials
        : [];

    return {
      sessionId: String(raw?.sessionId ?? sessionId),
      lessonPlan:
        typeof raw?.lessonPlan === "string"
          ? raw.lessonPlan
          : typeof raw?.plan === "string"
            ? raw.plan
            : null,
      keyPoints: keyPointsRaw
        .map((item: unknown) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean),
      files: filesRaw.map(normalizeFile).filter((item: SessionContentFile | null): item is SessionContentFile => Boolean(item)),
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
          title: item.title,
          fileName: item.fileName,
          mimeType: item.mimeType,
          size: item.size,
          url: null,
        })
      )
      .filter((f: SessionContentFile | null): f is SessionContentFile => Boolean(f));
  } catch {
    return null;
  }
}

export async function updateSessionContent(
  sessionId: string,
  input: { lessonPlan: string; keyPoints: string[] }
): Promise<SessionContent | null> {
  if (!getApiBaseUrl() || !hasAuth() || !sessionId) return null;

  const raw = await api.put<any>(`sessions/${sessionId}/content`, input);
  const keyPointsRaw = Array.isArray(raw?.keyPoints) ? raw.keyPoints : [];

  return {
    sessionId: String(raw?.sessionId ?? sessionId),
    lessonPlan: typeof raw?.lessonPlan === "string" ? raw.lessonPlan : "",
    keyPoints: keyPointsRaw
      .map((item: unknown) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean),
    files: [],
  };
}
