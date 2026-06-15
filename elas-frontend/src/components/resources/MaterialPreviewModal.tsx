"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  CalendarDays,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  Music2,
  UsersRound,
  Video,
  X,
} from "lucide-react";

import Button from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  getMaterialDownload,
  resolveDownloadUrl,
  type AssignedMaterialRow,
  type MaterialKind,
  type MaterialRow,
} from "@/lib/api/materials";

type PreviewMaterial = MaterialRow | AssignedMaterialRow | {
  id?: string;
  materialId?: string;
  title: string;
  description?: string | null;
  kind?: MaterialKind | null;
  fileName?: string | null;
  mimeType?: string | null;
  size?: number | null;
  createdAt?: string | null;
  groupId?: string | null;
  groupName?: string | null;
  group?: { name?: string | null } | null;
};

type PreviewKind = MaterialKind;

type Props = {
  material: PreviewMaterial | null;
  open: boolean;
  onClose: () => void;
};

type PreviewInfo = {
  url: string;
  downloadUrl: string;
  fileName: string;
};

const EMPTY_PREVIEW: PreviewInfo | null = null;

function getMaterialId(material: PreviewMaterial): string {
  const row = material as { id?: string | null; materialId?: string | null };
  return String(row.materialId || row.id || "").trim();
}

function getKind(material: PreviewMaterial): PreviewKind {
  const explicitKind = "kind" in material ? String(material.kind || "").toLowerCase() : "";
  const mime = String(material.mimeType || "").toLowerCase();
  const name = String(material.fileName || "").toLowerCase();

  if (explicitKind === "image" || mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name)) return "image";
  if (explicitKind === "video" || mime.startsWith("video/") || /\.(mp4|mov|avi|mkv|webm|m4v)$/i.test(name)) return "video";
  if (explicitKind === "audio" || mime.startsWith("audio/") || /\.(mp3|wav|ogg|m4a|aac|flac|wma|opus)$/i.test(name)) return "audio";
  if (
      explicitKind === "document" ||
      mime.includes("pdf") ||
      mime.includes("document") ||
      mime.includes("text") ||
      mime.includes("sheet") ||
      mime.includes("presentation") ||
      /\.(pdf|docx?|xlsx?|pptx?|txt|rtf|csv)$/i.test(name)
  ) {
    return "document";
  }

  return "file";
}

function getLabel(kind: PreviewKind): string {
  if (kind === "image") return "Изображение";
  if (kind === "video") return "Видеоурок";
  if (kind === "audio") return "Аудиозапись";
  if (kind === "document") return "Документ";
  return "Файл";
}

function getIconClass(kind: PreviewKind): string {
  if (kind === "image") return "bg-emerald-50 text-emerald-600 ring-emerald-100";
  if (kind === "video") return "bg-rose-50 text-rose-600 ring-rose-100";
  if (kind === "audio") return "bg-violet-50 text-violet-600 ring-violet-100";
  if (kind === "document") return "bg-[#7448FF]/10 text-[#7448FF] ring-[#7448FF]/15";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function getBadgeClass(kind: PreviewKind): string {
  if (kind === "image") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (kind === "video") return "bg-rose-50 text-rose-700 ring-rose-100";
  if (kind === "audio") return "bg-violet-50 text-violet-700 ring-violet-100";
  if (kind === "document") return "bg-[#7448FF]/10 text-[#7448FF] ring-[#7448FF]/15";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function getMaterialGroupName(material: PreviewMaterial): string {
  const row = material as {
    group?: { name?: string | null } | null;
    groupName?: string | null;
    groupId?: string | null;
  };
  return String(row.group?.name || row.groupName || row.groupId || "—").trim();
}

function getFileExtension(fileName: string | null | undefined, mimeType?: string | null): string {
  const name = String(fileName || "").trim();
  const ext = name.includes(".") ? name.split(".").pop()?.toLowerCase() : "";
  if (ext) return `.${ext}`;
  const mime = String(mimeType || "").toLowerCase();
  if (mime.includes("pdf")) return ".pdf";
  if (mime.includes("word")) return ".docx";
  if (mime.includes("presentation")) return ".pptx";
  if (mime.includes("sheet") || mime.includes("excel")) return ".xlsx";
  if (mime.startsWith("audio/")) return mime.replace("audio/", ".");
  if (mime.startsWith("video/")) return mime.replace("video/", ".");
  if (mime.startsWith("image/")) return mime.replace("image/", ".");
  return "—";
}

function isPdf(material: PreviewMaterial, fileName: string): boolean {
  const mime = String(material.mimeType || "").toLowerCase();
  const name = String(fileName || material.fileName || "").toLowerCase();
  return mime.includes("pdf") || name.endsWith(".pdf");
}

function needsOfficeViewer(fileName: string): boolean {
  return /\.(docx?|xlsx?|pptx?)$/i.test(fileName || "");
}

function formatBytes(value: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return "—";
  if (value < 1024) return `${value} Б`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} КБ`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} МБ`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} ГБ`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function PreviewIcon({ kind, size = 35 }: { kind: PreviewKind; size?: number }) {
  if (kind === "image") return <ImageIcon size={size} />;
  if (kind === "video") return <Video size={size} />;
  if (kind === "audio") return <Music2 size={size} />;
  return <FileText size={size} />;
}

export default function MaterialPreviewModal({ material, open, onClose }: Props) {
  const [preview, setPreview] = useState<PreviewInfo | null>(EMPTY_PREVIEW);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kind = material ? getKind(material) : "file";

  useEffect(() => {
    if (!open || !material) return;

    const controller = new AbortController();
    const materialId = getMaterialId(material);

    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setPreview(null);
      setError(materialId ? null : "ID материала не найден.");
      setLoading(Boolean(materialId));
    });

    if (!materialId) {
      return () => controller.abort();
    }

    getMaterialDownload(materialId, { signal: controller.signal, mode: "inline" })
        .then((info) => {
          const inlineUrl = resolveDownloadUrl(info?.url || info?.downloadUrl || "");
          if (!inlineUrl) throw new Error("Ссылка для предпросмотра не получена.");
          setPreview({
            url: inlineUrl,
            downloadUrl: inlineUrl,
            fileName: info?.fileName || material.fileName || material.title || "file",
          });
        })
        .catch((err: unknown) => {
          if (!controller.signal.aborted) {
            setError(err instanceof Error ? err.message : "Не удалось открыть предпросмотр.");
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });

    return () => controller.abort();
  }, [material, open]);

  const viewerUrl = useMemo(() => {
    if (!preview?.url || !material) return "";
    if (kind !== "document") return preview.url;
    if (isPdf(material, preview.fileName)) return preview.url;
    if (needsOfficeViewer(preview.fileName)) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(preview.url)}`;
    }
    return preview.url;
  }, [kind, material, preview]);

  const handleDownload = async () => {
    if (!material) return;
    const info = await getMaterialDownload(getMaterialId(material), { mode: "download" });
    const url = resolveDownloadUrl(info?.url || info?.downloadUrl || "");
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open || !material) return null;

  const fileName = preview?.fileName || material.fileName || material.title || "Файл материала";
  const fileType = getFileExtension(fileName, material.mimeType);

  return (
      <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/35 backdrop-blur-lg">
        <button
            type="button"
            aria-label="Закрыть предпросмотр"
            className="absolute inset-0 cursor-default"
            onClick={onClose}
        />

        <div className="relative z-[10000] mx-auto flex min-h-full w-full max-w-5xl items-start justify-center px-3 py-6 sm:px-5 sm:py-10">
          <section
              role="dialog"
              aria-modal="true"
              aria-label="Предпросмотр материала"
              onClick={(event) => event.stopPropagation()}
              className="flex w-full flex-col overflow-hidden rounded-[28px] border border-slate-200/70 bg-white shadow-2xl shadow-slate-950/15"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-8">
              <h2 className="text-lg font-black text-slate-900">Предпросмотр материала</h2>
              <button
                  type="button"
                  onClick={onClose}
                  className="grid h-9 w-9 place-items-center rounded-full text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                  aria-label="Закрыть"
              >
                <X size={19} />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className={cn("grid h-20 w-20 shrink-0 place-items-center rounded-3xl ring-1", getIconClass(kind))}>
                  <PreviewIcon kind={kind} size={35} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="max-w-full truncate text-xl font-black text-slate-950">{material.title}</h3>
                    <span className={cn("rounded-full px-3 py-1 text-xs font-black ring-1", getBadgeClass(kind))}>{getLabel(kind)}</span>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-5">
                    <div className="min-w-0 sm:col-span-2">
                      <div className="text-xs font-black text-slate-400">Имя файла</div>
                      <div className="mt-1 truncate text-sm font-bold text-slate-700" title={fileName}>{fileName}</div>
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-400">Тип</div>
                      <div className="mt-1 text-sm font-bold text-slate-700">{fileType}</div>
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-400">Размер</div>
                      <div className="mt-1 text-sm font-bold text-slate-700">{formatBytes(material.size ?? null)}</div>
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-400">Группа</div>
                      <div className="mt-1 truncate text-sm font-bold text-slate-700" title={getMaterialGroupName(material)}>
                        {getMaterialGroupName(material)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-400">Дата добавления</div>
                      <div className="mt-1 text-sm font-bold text-slate-700">{formatDate(material.createdAt)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-7">
                <div className="mb-2 text-sm font-black text-slate-800">Описание</div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-600">
                  {material.description || "Описание не добавлено."}
                </div>
              </div>

              <div className="mt-7">
                <div className="mb-3 text-sm font-black text-slate-800">Предпросмотр</div>
                <div className="overflow-hidden rounded-3xl border border-[#7448FF]/15 bg-slate-50 shadow-inner shadow-[#7448FF]/5">
                  {loading ? (
                      <div className="grid min-h-[430px] place-items-center text-sm font-semibold text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 size={24} className="animate-spin" />
                          Загружаем предпросмотр...
                        </div>
                      </div>
                  ) : error ? (
                      <div className="grid min-h-[430px] place-items-center px-6 text-center text-sm font-semibold text-rose-500">
                        {error}
                      </div>
                  ) : !preview?.url ? (
                      <div className="grid min-h-[430px] place-items-center text-sm font-semibold text-slate-400">
                        Предпросмотр недоступен
                      </div>
                  ) : kind === "image" ? (
                      <img src={preview.url} alt={material.title} className="max-h-[640px] w-full object-contain" />
                  ) : kind === "video" ? (
                      <video src={preview.url} controls className="max-h-[640px] w-full bg-black" />
                  ) : kind === "audio" ? (
                      <div className="flex min-h-[360px] items-center justify-center p-6">
                        <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-sm">
                          <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-violet-50 text-violet-600">
                              <Music2 size={27} />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-black text-slate-900">{material.title}</div>
                              <div className="truncate text-xs font-semibold text-slate-400">{preview.fileName}</div>
                            </div>
                          </div>
                          <audio src={preview.url} controls className="w-full" />
                        </div>
                      </div>
                  ) : kind === "document" ? (
                      <iframe title={material.title} src={viewerUrl} className="h-[520px] w-full bg-white sm:h-[620px]" />
                  ) : (
                      <div className="grid min-h-[360px] place-items-center px-6 text-center">
                        <div>
                          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-slate-400 shadow-sm">
                            <FileText size={26} />
                          </div>
                          <div className="text-sm font-bold text-slate-700">Этот файл нельзя показать внутри страницы</div>
                          <div className="mt-1 text-xs font-semibold text-slate-400">Откройте файл в новой вкладке или скачайте его.</div>
                        </div>
                      </div>
                  )}
                </div>
              </div>

              <div className="mt-5 grid gap-3 text-sm sm:grid-cols-4">
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-400"><FileText size={15} /> Размер</div>
                  <div className="mt-2 font-black text-slate-700">{formatBytes(material.size ?? null)}</div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-400"><PreviewIcon kind={kind} size={15} /> Тип</div>
                  <div className="mt-2 font-black text-slate-700">{getLabel(kind)} ({fileType})</div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-400"><UsersRound size={15} /> Группа</div>
                  <div className="mt-2 truncate font-black text-slate-700" title={getMaterialGroupName(material)}>{getMaterialGroupName(material)}</div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-black text-slate-400"><CalendarDays size={15} /> Дата добавления</div>
                  <div className="mt-2 font-black text-slate-700">{formatDate(material.createdAt)}</div>
                </div>
              </div>
            </div>

            <footer className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-100 bg-white/95 px-5 py-4 sm:flex-row sm:justify-end sm:px-8">
              {preview?.url && (
                  <Button type="button" variant="outline" onClick={() => window.open(preview.url, "_blank", "noopener,noreferrer")}>
                    <ExternalLink size={15} />
                    Открыть в новой вкладке
                  </Button>
              )}
              <Button type="button" onClick={() => void handleDownload()}>
                <ArrowDownToLine size={15} />
                Скачать
              </Button>
            </footer>
          </section>
        </div>
      </div>
  );
}
