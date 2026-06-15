"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  Music,
  RefreshCw,
  Search,
  Video,
  X,
} from "lucide-react";

import Button from "@/components/ui/Button";
import {
  getMaterialDownload,
  getSessionMaterials,
  resolveDownloadUrl,
  type AssignedMaterialRow,
} from "@/lib/api/materials";
import { ChatClient } from "@/lib/ws/chatClient";
import { cn } from "@/lib/cn";

type Props = {
  sessionId: string;
  className?: string;
};

type MaterialKind = "document" | "image" | "video" | "audio" | "file";

type PreviewState = {
  materialId: string;
  url: string;
  fileName: string;
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

function getMaterialKind(material: AssignedMaterialRow): MaterialKind {
  const kind = "kind" in material ? String(material.kind || "").toLowerCase() : "";
  const mimeType = String(material.mimeType || "").toLowerCase();
  const fileName = String(material.fileName || "").toLowerCase();

  if (kind === "video" || mimeType.startsWith("video/")) return "video";
  if (kind === "audio" || mimeType.startsWith("audio/")) return "audio";
  if (kind === "image" || mimeType.startsWith("image/")) return "image";

  if (
      kind === "document" ||
      mimeType.includes("pdf") ||
      mimeType.includes("word") ||
      mimeType.includes("document") ||
      mimeType.includes("presentation") ||
      mimeType.includes("spreadsheet") ||
      fileName.endsWith(".pdf") ||
      fileName.endsWith(".doc") ||
      fileName.endsWith(".docx") ||
      fileName.endsWith(".ppt") ||
      fileName.endsWith(".pptx") ||
      fileName.endsWith(".xls") ||
      fileName.endsWith(".xlsx") ||
      fileName.endsWith(".txt")
  ) {
    return "document";
  }

  return "file";
}

function getKindLabel(kind: MaterialKind) {
  if (kind === "video") return "Видеоурок";
  if (kind === "audio") return "Аудиозапись";
  if (kind === "image") return "Изображение";
  if (kind === "document") return "Документ";
  return "Файл";
}

function getKindIcon(kind: MaterialKind) {
  if (kind === "video") return <Video size={18} />;
  if (kind === "audio") return <Music size={18} />;
  if (kind === "image") return <ImageIcon size={18} />;
  return <FileText size={18} />;
}

function getKindClassName(kind: MaterialKind) {
  if (kind === "video") return "bg-rose-50 text-rose-600 ring-rose-100";
  if (kind === "audio") return "bg-violet-50 text-violet-600 ring-violet-100";
  if (kind === "image") return "bg-emerald-50 text-emerald-600 ring-emerald-100";
  if (kind === "document") return "bg-blue-50 text-blue-600 ring-blue-100";
  return "bg-slate-50 text-slate-600 ring-slate-100";
}

function filterByKind(materials: AssignedMaterialRow[], filter: "all" | MaterialKind) {
  if (filter === "all") return materials;
  return materials.filter((material) => getMaterialKind(material) === filter);
}

export function SessionMaterialsPanel({ sessionId, className }: Props) {
  const [materials, setMaterials] = useState<AssignedMaterialRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | MaterialKind>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
      async (signal?: AbortSignal) => {
        if (!sessionId) return;
        setLoading(true);
        setError(null);
        try {
          const list = await getSessionMaterials(sessionId, { signal });
          const nextMaterials = Array.isArray(list) ? list : [];
          setMaterials(nextMaterials);
          setSelectedId((current) => current || nextMaterials[0]?.materialId || null);
        } catch (err) {
          if (!signal?.aborted) {
            setMaterials([]);
            setSelectedId(null);
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

  const counters = useMemo(() => {
    return {
      all: materials.length,
      document: materials.filter((material) => getMaterialKind(material) === "document").length,
      image: materials.filter((material) => getMaterialKind(material) === "image").length,
      video: materials.filter((material) => getMaterialKind(material) === "video").length,
      audio: materials.filter((material) => getMaterialKind(material) === "audio").length,
    };
  }, [materials]);

  const filteredMaterials = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const list = filterByKind(materials, filter);

    if (!normalizedQuery) return list;

    return list.filter((material) => {
      const title = String(material.title || "").toLowerCase();
      const fileName = String(material.fileName || "").toLowerCase();
      const description = String(material.description || "").toLowerCase();
      return title.includes(normalizedQuery) || fileName.includes(normalizedQuery) || description.includes(normalizedQuery);
    });
  }, [filter, materials, query]);

  const selectedMaterial = useMemo(() => {
    if (!selectedId) return null;
    return materials.find((material) => material.materialId === selectedId) || null;
  }, [materials, selectedId]);

  useEffect(() => {
    if (!selectedMaterial) {
      setPreview(null);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);

    getMaterialDownload(selectedMaterial.materialId)
        .then((info) => {
          if (cancelled) return;
          const url = info?.downloadUrl ? resolveDownloadUrl(info.downloadUrl) : "";
          setPreview(
              url
                  ? {
                    materialId: selectedMaterial.materialId,
                    url,
                    fileName: info?.fileName || selectedMaterial.fileName || selectedMaterial.title,
                  }
                  : null
          );
        })
        .catch(() => {
          if (!cancelled) setPreview(null);
        })
        .finally(() => {
          if (!cancelled) setPreviewLoading(false);
        });

    return () => {
      cancelled = true;
    };
  }, [selectedMaterial]);

  const download = useCallback(async (materialId: string) => {
    const info = await getMaterialDownload(materialId);
    const url = info?.downloadUrl ? resolveDownloadUrl(info.downloadUrl) : "";
    if (url) window.open(url, "_blank", "noreferrer");
  }, []);

  const tabs: Array<{ value: "all" | MaterialKind; label: string; count: number }> = [
    { value: "all", label: "Все материалы", count: counters.all },
    { value: "document", label: "Документы", count: counters.document },
    { value: "image", label: "Изображения", count: counters.image },
    { value: "video", label: "Видеоуроки", count: counters.video },
    { value: "audio", label: "Аудиозаписи", count: counters.audio },
  ];

  const selectedKind = selectedMaterial ? getMaterialKind(selectedMaterial) : "file";

  return (
      <div className={cn("flex h-full min-h-[620px] flex-col rounded-[28px] border border-slate-100 bg-white p-4 shadow-sm", className)}>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xl font-black text-slate-950">Материалы</div>
            <div className="mt-1 text-xs font-semibold text-slate-400">
              Здесь показываются материалы, назначенные вашей группе или сессии.
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Поиск материалов..."
                  className="h-10 w-full rounded-2xl border border-slate-100 bg-white pl-9 pr-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#7448FF]/40 focus:ring-4 focus:ring-[#7448FF]/10 sm:w-64"
              />
            </div>
            <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Обновить
            </Button>
          </div>
        </div>

        {loading ? (
            <div className="grid flex-1 place-items-center text-sm font-semibold text-slate-400">Загружаем материалы...</div>
        ) : error ? (
            <div className="grid flex-1 place-items-center text-center text-sm font-semibold text-rose-500">{error}</div>
        ) : materials.length === 0 ? (
            <div className="grid flex-1 place-items-center text-center">
              <div>
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-50 text-slate-300">
                  <FileText size={26} />
                </div>
                <div className="text-sm font-bold text-slate-700">Материалов пока нет</div>
                <div className="mt-1 text-xs font-medium text-slate-400">Когда преподаватель назначит файлы, они появятся здесь.</div>
              </div>
            </div>
        ) : (
            <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(360px,0.9fr)_minmax(440px,1.1fr)]">
              <div className="min-h-0 rounded-[24px] border border-slate-100 bg-white p-3">
                <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                  {tabs.map((tab) => (
                      <button
                          key={tab.value}
                          type="button"
                          onClick={() => setFilter(tab.value)}
                          className={cn(
                              "flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-extrabold transition",
                              filter === tab.value
                                  ? "border-[#7448FF]/30 bg-[#7448FF]/10 text-[#7448FF]"
                                  : "border-slate-100 bg-white text-slate-500 hover:bg-slate-50"
                          )}
                      >
                        {tab.label}
                        <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] shadow-sm">{tab.count}</span>
                      </button>
                  ))}
                </div>

                <div className="grid grid-cols-[1fr_110px_120px] border-b border-slate-100 px-4 py-3 text-xs font-black text-slate-400">
                  <div>Название</div>
                  <div>Тип</div>
                  <div>Дата</div>
                </div>

                <div className="max-h-[470px] overflow-y-auto">
                  {filteredMaterials.length === 0 ? (
                      <div className="grid min-h-[240px] place-items-center text-center text-sm font-semibold text-slate-400">
                        Ничего не найдено
                      </div>
                  ) : (
                      filteredMaterials.map((material) => {
                        const kind = getMaterialKind(material);
                        const active = selectedMaterial?.materialId === material.materialId;

                        return (
                            <button
                                key={material.assignmentId}
                                type="button"
                                onClick={() => setSelectedId(material.materialId)}
                                className={cn(
                                    "grid w-full grid-cols-[1fr_110px_120px] items-center gap-3 rounded-2xl px-4 py-3 text-left transition",
                                    active ? "bg-[#7448FF]/10" : "hover:bg-slate-50"
                                )}
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1", getKindClassName(kind))}>
                                  {getKindIcon(kind)}
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-black text-slate-900">{material.title}</div>
                                  <div className="mt-1 truncate text-xs font-semibold text-slate-400">{material.description || material.fileName || "Учебный материал"}</div>
                                </div>
                              </div>
                              <div>
                        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-black ring-1", getKindClassName(kind))}>
                          {getKindLabel(kind)}
                        </span>
                              </div>
                              <div className="text-xs font-bold leading-5 text-slate-500">{formatDate(material.createdAt)}</div>
                            </button>
                        );
                      })
                  )}
                </div>
              </div>

              <div className="min-h-0 rounded-[24px] border border-slate-100 bg-white p-5">
                {!selectedMaterial ? (
                    <div className="grid h-full min-h-[420px] place-items-center text-sm font-semibold text-slate-400">Выберите материал</div>
                ) : (
                    <div className="flex h-full min-h-0 flex-col">
                      <div className="mb-5 flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1", getKindClassName(selectedKind))}>
                            {getKindIcon(selectedKind)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-lg font-black text-slate-950">{selectedMaterial.title}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
                              <span>{selectedMaterial.fileName || "Учебный материал"}</span>
                              <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-black ring-1", getKindClassName(selectedKind))}>
                          {getKindLabel(selectedKind)}
                        </span>
                            </div>
                          </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setSelectedId(null)}
                            className="rounded-full p-2 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                            aria-label="Закрыть просмотр"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div className="mb-5">
                        <div className="mb-2 text-sm font-black text-slate-800">Описание</div>
                        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-600">
                          {selectedMaterial.description || "Описание не добавлено."}
                        </div>
                      </div>

                      <div className="mb-5 min-h-0 flex-1">
                        <div className="mb-2 text-sm font-black text-slate-800">Файл</div>
                        <div className="min-h-[260px] overflow-hidden rounded-3xl border border-slate-100 bg-slate-50">
                          {previewLoading ? (
                              <div className="grid min-h-[260px] place-items-center text-sm font-semibold text-slate-400">
                                <Loader2 size={22} className="mb-2 animate-spin" />
                                Загружаем предпросмотр...
                              </div>
                          ) : !preview?.url ? (
                              <div className="grid min-h-[260px] place-items-center text-center text-sm font-semibold text-slate-400">
                                Предпросмотр недоступен
                              </div>
                          ) : selectedKind === "image" ? (
                              <img src={preview.url} alt={selectedMaterial.title} className="max-h-[430px] w-full object-contain" />
                          ) : selectedKind === "video" ? (
                              <video src={preview.url} controls className="max-h-[430px] w-full bg-black" />
                          ) : selectedKind === "audio" ? (
                              <div className="flex min-h-[260px] items-center justify-center p-6">
                                <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-sm">
                                  <div className="mb-4 flex items-center gap-3">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-violet-50 text-violet-600">
                                      <Music size={26} />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-black text-slate-900">{selectedMaterial.title}</div>
                                      <div className="truncate text-xs font-semibold text-slate-400">{preview.fileName}</div>
                                    </div>
                                  </div>
                                  <audio src={preview.url} controls className="w-full" />
                                </div>
                              </div>
                          ) : selectedKind === "document" ? (
                              <iframe title={selectedMaterial.title} src={preview.url} className="h-[430px] w-full bg-white" />
                          ) : (
                              <div className="grid min-h-[260px] place-items-center p-6 text-center">
                                <div>
                                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-slate-400 shadow-sm">
                                    <FileText size={26} />
                                  </div>
                                  <div className="text-sm font-black text-slate-700">Этот файл нельзя показать внутри страницы</div>
                                  <div className="mt-1 text-xs font-semibold text-slate-400">Откройте файл в новой вкладке.</div>
                                </div>
                              </div>
                          )}
                        </div>
                      </div>

                      <div className="grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
                        <div>
                          <div className="text-xs font-black text-slate-400">Размер</div>
                          <div className="mt-1 font-bold text-slate-700">{formatSize(selectedMaterial.size)}</div>
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-400">Дата добавления</div>
                          <div className="mt-1 font-bold text-slate-700">{formatDate(selectedMaterial.createdAt)}</div>
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-400">Тип</div>
                          <div className="mt-1 font-bold text-slate-700">{getKindLabel(selectedKind)}</div>
                        </div>
                        <div className="flex items-end sm:justify-end">
                          <Button size="sm" variant="outline" onClick={() => void download(selectedMaterial.materialId)}>
                            <Download size={14} />
                            Открыть файл
                          </Button>
                        </div>
                      </div>
                    </div>
                )}
              </div>
            </div>
        )}
      </div>
  );
}
