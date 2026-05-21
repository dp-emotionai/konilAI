"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, FileText, Loader2, RefreshCw } from "lucide-react";

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

function formatSize(size: number | null) {
  if (typeof size !== "number" || !Number.isFinite(size)) return "Размер не указан";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function SessionMaterialsPanel({ sessionId, className }: Props) {
  const [materials, setMaterials] = useState<AssignedMaterialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!sessionId) return;
      setLoading(true);
      setError(null);
      try {
        const list = await getSessionMaterials(sessionId, { signal });
        setMaterials(Array.isArray(list) ? list : []);
      } catch (err) {
        if (!signal?.aborted) {
          setMaterials([]);
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

  const download = useCallback(async (materialId: string) => {
    const info = await getMaterialDownload(materialId);
    const url = info?.downloadUrl ? resolveDownloadUrl(info.downloadUrl) : "";
    if (url) window.open(url, "_blank", "noreferrer");
  }, []);

  return (
    <div className={cn("flex h-full min-h-[300px] flex-col rounded-[24px] border border-slate-100 bg-white", className)}>
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

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="grid h-full min-h-[220px] place-items-center text-sm font-semibold text-slate-400">
            Загружаем материалы...
          </div>
        ) : error ? (
          <div className="grid h-full min-h-[220px] place-items-center text-center text-sm font-semibold text-rose-500">
            {error}
          </div>
        ) : materials.length === 0 ? (
          <div className="grid h-full min-h-[220px] place-items-center text-center">
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
            {materials.map((material) => (
              <button
                key={material.assignmentId}
                type="button"
                onClick={() => void download(material.materialId)}
                className="group rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-4 text-left transition hover:border-[#7448FF]/20 hover:bg-white hover:shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#7448FF] shadow-sm">
                    <FileText size={18} />
                  </div>
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
                  <Download size={16} className="mt-1 shrink-0 text-slate-300 transition group-hover:text-[#7448FF]" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
