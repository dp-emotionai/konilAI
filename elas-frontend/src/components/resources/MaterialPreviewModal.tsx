"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ExternalLink, FileText, Image as ImageIcon, Loader2, Music2, Video } from "lucide-react";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  getMaterialDownload,
  resolveDownloadUrl,
  type AssignedMaterialRow,
  type MaterialRow,
} from "@/lib/api/materials";

type PreviewMaterial = MaterialRow | AssignedMaterialRow;
type PreviewKind = "document" | "image" | "video" | "audio" | "file";

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

function getMaterialId(material: PreviewMaterial): string {
  return "materialId" in material ? material.materialId : material.id;
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

function getIcon(kind: PreviewKind) {
  if (kind === "image") return ImageIcon;
  if (kind === "video") return Video;
  if (kind === "audio") return Music2;
  return FileText;
}

function getIconClass(kind: PreviewKind): string {
  if (kind === "image") return "bg-emerald-50 text-emerald-600";
  if (kind === "video") return "bg-rose-50 text-rose-600";
  if (kind === "audio") return "bg-violet-50 text-violet-600";
  if (kind === "document") return "bg-blue-50 text-blue-600";
  return "bg-slate-100 text-slate-600";
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

export default function MaterialPreviewModal({ material, open, onClose }: Props) {
  const [preview, setPreview] = useState<PreviewInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kind = material ? getKind(material) : "file";
  const Icon = getIcon(kind);

  useEffect(() => {
    if (!open || !material) {
      setPreview(null);
      setError(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const materialId = getMaterialId(material);

    setLoading(true);
    setError(null);
    setPreview(null);

    getMaterialDownload(materialId, { signal: controller.signal, mode: "inline" })
      .then((info) => {
        const inlineUrl = resolveDownloadUrl(info?.downloadUrl || "");
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
    const url = resolveDownloadUrl(info?.downloadUrl || "");
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!material) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Предпросмотр материала"
      description={material.title}
      size="xl"
      className="max-w-5xl"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
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
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl", getIconClass(kind))}>
            <Icon size={23} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-bold text-slate-950">{material.title}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{getLabel(kind)}</span>
              <span>{material.fileName || "Файл материала"}</span>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-2 text-sm font-bold text-slate-800">Описание</div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
            {material.description || "Описание не добавлено."}
          </div>
        </div>

        <div>
          <div className="mb-2 text-sm font-bold text-slate-800">Файл</div>
          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-slate-50">
            {loading ? (
              <div className="grid min-h-[360px] place-items-center text-sm font-semibold text-slate-400">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 size={24} className="animate-spin" />
                  Загружаем предпросмотр...
                </div>
              </div>
            ) : error ? (
              <div className="grid min-h-[360px] place-items-center px-6 text-center text-sm font-semibold text-rose-500">
                {error}
              </div>
            ) : !preview?.url ? (
              <div className="grid min-h-[360px] place-items-center text-sm font-semibold text-slate-400">
                Предпросмотр недоступен
              </div>
            ) : kind === "image" ? (
              <img src={preview.url} alt={material.title} className="max-h-[620px] w-full object-contain" />
            ) : kind === "video" ? (
              <video src={preview.url} controls className="max-h-[620px] w-full bg-black" />
            ) : kind === "audio" ? (
              <div className="flex min-h-[360px] items-center justify-center p-6">
                <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-violet-50 text-violet-600">
                      <Music2 size={27} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-slate-900">{material.title}</div>
                      <div className="truncate text-xs font-semibold text-slate-400">{preview.fileName}</div>
                    </div>
                  </div>
                  <audio src={preview.url} controls className="w-full" />
                </div>
              </div>
            ) : kind === "document" ? (
              <iframe title={material.title} src={viewerUrl} className="h-[620px] w-full bg-white" />
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

        <div className="grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Размер</div>
            <div className="mt-1 font-semibold text-slate-700">{formatBytes(material.size)}</div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Тип</div>
            <div className="mt-1 font-semibold text-slate-700">{getLabel(kind)}</div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Дата добавления</div>
            <div className="mt-1 font-semibold text-slate-700">{formatDate(material.createdAt)}</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
