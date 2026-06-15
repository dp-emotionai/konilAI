"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  Edit3,
  FileText,
  Image as ImageIcon,
  Loader2,
  Music,
  PlayCircle,
  RefreshCw,
  Save,
  Video,
  X,
} from "lucide-react";

import Button from "@/components/ui/Button";
import MaterialPreviewModal from "@/components/resources/MaterialPreviewModal";
import { useUI } from "@/components/layout/Providers";
import {
  getMaterialDownload,
  getSessionMaterials,
  updateMaterial,
  resolveDownloadUrl,
  type AssignedMaterialRow,
} from "@/lib/api/materials";
import { ChatClient } from "@/lib/ws/chatClient";
import { cn } from "@/lib/cn";

type Props = {
  sessionId: string;
  className?: string;
};

type PreviewState = {
  url: string;
  loading: boolean;
  error: string | null;
};

function formatSize(size: number | null) {
  if (typeof size !== "number" || !Number.isFinite(size)) return "Размер не указан";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Дата не указана";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Дата не указана";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getKind(material: AssignedMaterialRow) {
  const kind = String(material.kind || "").toLowerCase();
  const mime = String(material.mimeType || "").toLowerCase();
  const fileName = String(material.fileName || "").toLowerCase();

  if (kind === "video" || mime.startsWith("video/")) return "video";
  if (kind === "audio" || mime.startsWith("audio/")) return "audio";
  if (kind === "image" || mime.startsWith("image/")) return "image";
  if (kind === "document" || mime.includes("pdf") || /\.(pdf|doc|docx|ppt|pptx|xls|xlsx|txt)$/i.test(fileName)) return "document";
  return "file";
}

function getFileExt(material: AssignedMaterialRow) {
  const fileName = String(material.fileName || "");
  const ext = fileName.includes(".") ? fileName.split(".").pop() : "file";
  return String(ext || "file").slice(0, 5).toUpperCase();
}

function isOfficeDocument(material: AssignedMaterialRow) {
  const fileName = String(material.fileName || "").toLowerCase();
  const mime = String(material.mimeType || "").toLowerCase();
  return (
      /\.(doc|docx|ppt|pptx|xls|xlsx)$/i.test(fileName) ||
      mime.includes("word") ||
      mime.includes("presentation") ||
      mime.includes("powerpoint") ||
      mime.includes("spreadsheet") ||
      mime.includes("excel")
  );
}

function isPdf(material: AssignedMaterialRow) {
  const fileName = String(material.fileName || "").toLowerCase();
  const mime = String(material.mimeType || "").toLowerCase();
  return mime.includes("pdf") || fileName.endsWith(".pdf");
}

function kindLabel(material: AssignedMaterialRow) {
  const kind = getKind(material);
  if (kind === "video") return "Видеоурок";
  if (kind === "audio") return "Аудиозапись";
  if (kind === "image") return "Изображение";
  if (kind === "document") return "Документ";
  return "Файл";
}

function MaterialIcon({ material }: { material: AssignedMaterialRow }) {
  const kind = getKind(material);
  const base = "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm";

  if (kind === "video") {
    return <div className={`${base} bg-rose-50 text-rose-500`}><Video size={20} /></div>;
  }
  if (kind === "audio") {
    return <div className={`${base} bg-violet-50 text-[#7448FF]`}><Music size={20} /></div>;
  }
  if (kind === "image") {
    return <div className={`${base} bg-emerald-50 text-emerald-500`}><ImageIcon size={20} /></div>;
  }
  return (
      <div className={`${base} bg-blue-50 text-blue-500`}>
        <div className="text-[10px] font-black leading-none">{getFileExt(material)}</div>
      </div>
  );
}

function PreviewContent({ material, preview }: { material: AssignedMaterialRow; preview: PreviewState }) {
  const kind = getKind(material);
  const url = preview.url;

  if (preview.loading) {
    return (
        <div className="grid min-h-[240px] place-items-center rounded-3xl border border-slate-100 bg-slate-50 text-sm font-semibold text-slate-400">
          <Loader2 className="mr-2 inline animate-spin" size={18} /> Предпросмотр загружается...
        </div>
    );
  }

  if (preview.error) {
    return (
        <div className="rounded-3xl border border-rose-100 bg-rose-50 p-5 text-sm font-semibold text-rose-600">
          {preview.error}
        </div>
    );
  }

  if (!url) {
    return (
        <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5 text-sm font-semibold text-slate-400">
          Нажмите на материал, чтобы открыть предпросмотр.
        </div>
    );
  }

  if (kind === "video") {
    return <video src={url} controls className="max-h-[440px] w-full rounded-3xl border border-slate-100 bg-black" />;
  }

  if (kind === "audio") {
    return (
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-violet-100 text-[#7448FF]">
              <PlayCircle size={30} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold text-slate-900">{material.title}</div>
              <div className="mt-1 text-xs font-semibold text-violet-500">{material.fileName || "Аудиофайл"}</div>
            </div>
          </div>
          <audio src={url} controls className="w-full" />
        </div>
    );
  }

  if (kind === "image") {
    return (
        <div className="rounded-3xl border border-slate-100 bg-slate-50 p-3">
          <img src={url} alt={material.title} className="max-h-[520px] w-full rounded-2xl object-contain" />
        </div>
    );
  }

  if (isOfficeDocument(material)) {
    const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    return <iframe src={officeUrl} title={material.title} className="h-[520px] w-full rounded-3xl border border-slate-100 bg-white" />;
  }

  if (isPdf(material) || kind === "document") {
    return <iframe src={url} title={material.title} className="h-[520px] w-full rounded-3xl border border-slate-100 bg-white" />;
  }

  return (
      <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5 text-sm font-semibold text-slate-500">
        Предпросмотр для этого типа файла недоступен. Используйте кнопку скачивания.
      </div>
  );
}

export function SessionMaterialsPanel({ sessionId, className }: Props) {
  const [materials, setMaterials] = useState<AssignedMaterialRow[]>([]);
  const [selected, setSelected] = useState<AssignedMaterialRow | null>(null);
  const [previewMaterial, setPreviewMaterial] = useState<AssignedMaterialRow | null>(null);
  const [preview, setPreview] = useState<PreviewState>({ url: "", loading: false, error: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const { state } = useUI();
  const canEditMaterial = state.role === "teacher" || state.role === "admin";

  const load = useCallback(
      async (signal?: AbortSignal) => {
        if (!sessionId) return;
        setLoading(true);
        setError(null);
        try {
          const list = await getSessionMaterials(sessionId, { signal });
          const normalized = Array.isArray(list) ? list : [];
          setMaterials(normalized);
          setSelected((current) => current ?? normalized[0] ?? null);
        } catch (err) {
          if (!signal?.aborted) {
            setMaterials([]);
            setSelected(null);
            setError(err instanceof Error ? err.message : "Не удалось загрузить материалы");
          }
        } finally {
          if (!signal?.aborted) setLoading(false);
        }
      },
      [sessionId]
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    const client = new ChatClient((packet) => {
      if (!packet || typeof packet !== "object") return;
      const type = (packet as { type?: string }).type;
      if (type === "material.assigned" || type === "material.unassigned") void load();
    });

    client.connect();
    client.joinUser();
    client.joinSession(sessionId);
    return () => client.disconnect();
  }, [load, sessionId]);

  useEffect(() => {
    if (!selected?.materialId) {
      setPreview({ url: "", loading: false, error: null });
      return;
    }

    const controller = new AbortController();
    setPreview({ url: "", loading: true, error: null });

    getMaterialDownload(selected.materialId, { signal: controller.signal, mode: "inline" })
        .then((info) => {
          const url = info?.url || info?.downloadUrl || "";
          setPreview({ url: resolveDownloadUrl(url), loading: false, error: null });
        })
        .catch((err) => {
          if (!controller.signal.aborted) {
            setPreview({
              url: "",
              loading: false,
              error: err instanceof Error ? err.message : "Не удалось открыть предпросмотр",
            });
          }
        });

    return () => controller.abort();
  }, [selected]);

  useEffect(() => {
    setEditing(false);
    setEditError(null);
    setEditTitle(selected?.title || "");
    setEditDescription(selected?.description || "");
  }, [selected?.materialId, selected?.title, selected?.description]);

  const counts = useMemo(() => {
    return materials.reduce(
        (acc, material) => {
          const kind = getKind(material);
          acc.all += 1;
          acc[kind] = (acc[kind] || 0) + 1;
          return acc;
        },
        { all: 0 } as Record<string, number>
    );
  }, [materials]);

  const download = useCallback(async (materialId: string) => {
    const info = await getMaterialDownload(materialId, { mode: "download" });
    const url = info?.downloadUrl ? resolveDownloadUrl(info.downloadUrl) : "";
    if (url) window.open(url, "_blank", "noreferrer");
  }, []);

  const cancelEdit = useCallback(() => {
    setEditTitle(selected?.title || "");
    setEditDescription(selected?.description || "");
    setEditError(null);
    setEditing(false);
  }, [selected?.description, selected?.title]);

  const saveEdit = useCallback(async () => {
    if (!selected?.materialId || editSaving) return;

    const title = editTitle.trim();
    const description = editDescription.trim();

    if (!title) {
      setEditError("Название обязательно");
      return;
    }

    setEditSaving(true);
    setEditError(null);

    try {
      const updated = await updateMaterial(selected.materialId, {
        title,
        description: description || null,
      });

      setMaterials((current) =>
          current.map((item) =>
              item.materialId === selected.materialId
                  ? {
                    ...item,
                    title: updated.title,
                    description: updated.description,
                  }
                  : item
          )
      );

      setSelected((current) =>
          current?.materialId === selected.materialId
              ? {
                ...current,
                title: updated.title,
                description: updated.description,
              }
              : current
      );

      setEditing(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Не удалось сохранить материал");
    } finally {
      setEditSaving(false);
    }
  }, [editDescription, editSaving, editTitle, selected?.materialId]);

  return (
      <>
        <div className={cn("flex h-full min-h-[520px] flex-col rounded-[24px] border border-slate-100 bg-white", className)}>
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <div className="text-sm font-bold text-slate-900">Материалы</div>
              <div className="text-xs font-medium text-slate-400">
                {loading ? "Загружаем..." : `${materials.length} файлов`}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Обновить
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-3 text-xs font-bold">
            <span className="rounded-full bg-violet-50 px-3 py-1.5 text-[#7448FF]">Все {counts.all || 0}</span>
            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-500">Документы {counts.document || 0}</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-500">Изображения {counts.image || 0}</span>
            <span className="rounded-full bg-rose-50 px-3 py-1.5 text-rose-500">Видео {counts.video || 0}</span>
            <span className="rounded-full bg-violet-50 px-3 py-1.5 text-violet-500">Аудио {counts.audio || 0}</span>
          </div>

          <div className="grid flex-1 min-h-0 gap-0 lg:grid-cols-[minmax(280px,0.9fr)_minmax(360px,1.3fr)]">
            <div className="min-h-0 overflow-y-auto border-r border-slate-100 p-4">
              {loading ? (
                  <div className="grid h-full min-h-[260px] place-items-center text-sm font-semibold text-slate-400">
                    Загружаем материалы...
                  </div>
              ) : error ? (
                  <div className="grid h-full min-h-[260px] place-items-center text-center text-sm font-semibold text-rose-500">
                    {error}
                  </div>
              ) : materials.length === 0 ? (
                  <div className="grid h-full min-h-[260px] place-items-center text-center">
                    <div>
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                        <FileText size={24} />
                      </div>
                      <div className="text-sm font-bold text-slate-700">Материалов пока нет</div>
                      <div className="mt-1 text-xs font-medium text-slate-400">
                        Когда преподаватель назначит файлы, они появятся здесь.
                      </div>
                    </div>
                  </div>
              ) : (
                  <div className="grid gap-3">
                    {materials.map((material) => {
                      const active = selected?.assignmentId === material.assignmentId;
                      return (
                          <button
                              key={material.assignmentId}
                              type="button"
                              onClick={() => {
                                setSelected(material);
                                setPreviewMaterial(material);
                              }}
                              className={cn(
                                  "group rounded-2xl border px-4 py-4 text-left transition hover:border-[#7448FF]/20 hover:bg-white hover:shadow-sm",
                                  active ? "border-[#7448FF]/25 bg-violet-50/80 shadow-sm" : "border-slate-100 bg-slate-50/70"
                              )}
                          >
                            <div className="flex items-start gap-3">
                              <MaterialIcon material={material} />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-bold text-slate-900">{material.title}</div>
                                <div className="mt-1 truncate text-xs font-medium text-slate-500">
                                  {material.fileName || "Файл"} · {formatSize(material.size)}
                                </div>
                                {material.description && (
                                    <div className="mt-2 line-clamp-2 text-xs font-medium leading-5 text-slate-500">
                                      {material.description}
                                    </div>
                                )}
                              </div>
                            </div>
                          </button>
                      );
                    })}
                  </div>
              )}
            </div>

            <div className="min-h-0 overflow-y-auto p-5">
              {selected ? (
                  <div className="space-y-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <MaterialIcon material={selected} />
                        <div className="min-w-0">
                          {editing ? (
                              <input
                                  value={editTitle}
                                  onChange={(event) => setEditTitle(event.target.value)}
                                  className="h-10 w-full min-w-[220px] rounded-2xl border border-slate-200 bg-white px-3 text-sm font-extrabold text-slate-900 outline-none transition focus:border-[#7448FF]/40 focus:ring-4 focus:ring-[#7448FF]/10"
                                  placeholder="Название материала"
                              />
                          ) : (
                              <div className="truncate text-base font-extrabold text-slate-900">{selected.title}</div>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
                            <span>{kindLabel(selected)}</span>
                            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[#7448FF]">{getFileExt(selected)}</span>
                          </div>
                        </div>
                      </div>
                      <button
                          type="button"
                          onClick={() => setSelected(null)}
                          className="rounded-full p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700 lg:hidden"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {canEditMaterial && (
                        <div className="flex flex-wrap gap-2">
                          {editing ? (
                              <>
                                <Button size="sm" onClick={() => void saveEdit()} disabled={editSaving}>
                                  {editSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                  Сохранить
                                </Button>
                                <Button size="sm" variant="outline" onClick={cancelEdit} disabled={editSaving}>
                                  Отмена
                                </Button>
                              </>
                          ) : (
                              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                                <Edit3 size={14} />
                                Редактировать
                              </Button>
                          )}
                        </div>
                    )}

                    {editing ? (
                        <div>
                          <div className="mb-2 text-sm font-extrabold text-slate-900">Описание</div>
                          <textarea
                              value={editDescription}
                              onChange={(event) => setEditDescription(event.target.value)}
                              rows={4}
                              className="w-full resize-none rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#7448FF]/40 focus:ring-4 focus:ring-[#7448FF]/10"
                              placeholder="Описание материала"
                          />
                          {editError && <div className="mt-2 text-xs font-bold text-rose-500">{editError}</div>}
                        </div>
                    ) : selected.description ? (
                        <div>
                          <div className="mb-2 text-sm font-extrabold text-slate-900">Описание</div>
                          <div className="text-sm font-medium leading-6 text-slate-500">{selected.description}</div>
                        </div>
                    ) : null}

                    <div>
                      <div className="mb-3 text-sm font-extrabold text-slate-900">Предпросмотр</div>
                      <PreviewContent material={selected} preview={preview} />
                    </div>

                    <div className="grid gap-3 rounded-3xl border border-slate-100 bg-slate-50/70 p-4 text-sm sm:grid-cols-3">
                      <div>
                        <div className="text-xs font-bold text-slate-400">Размер</div>
                        <div className="mt-1 font-extrabold text-slate-700">{formatSize(selected.size)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-400">Тип</div>
                        <div className="mt-1 font-extrabold text-slate-700">{kindLabel(selected)}</div>
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-400">Дата добавления</div>
                        <div className="mt-1 font-extrabold text-slate-700">{formatDate(selected.createdAt)}</div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button onClick={() => setPreviewMaterial(selected)} className="w-full sm:w-auto">
                        <PlayCircle size={16} />
                        Открыть материал
                      </Button>
                      <Button variant="outline" onClick={() => void download(selected.materialId)} className="w-full sm:w-auto">
                        <Download size={16} />
                        Скачать файл
                      </Button>
                    </div>
                  </div>
              ) : (
                  <div className="grid h-full min-h-[320px] place-items-center text-center">
                    <div>
                      <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-3xl bg-slate-50 text-slate-300">
                        <FileText size={26} />
                      </div>
                      <div className="text-sm font-bold text-slate-700">Выберите материал</div>
                      <div className="mt-1 text-xs font-medium text-slate-400">Файл откроется справа без скачивания.</div>
                    </div>
                  </div>
              )}
            </div>
          </div>
        </div>

        <MaterialPreviewModal
            open={Boolean(previewMaterial)}
            material={previewMaterial}
            onClose={() => setPreviewMaterial(null)}
        />
      </>
  );
}
