"use client";

import { useCallback, useEffect, useState } from "react";

import Button from "@/components/ui/Button";
import Table, { TBody, TCell, THead, TH, TRow, TMuted } from "@/components/ui/Table";

import {
  getMaterialDownload,
  getStudentMaterials,
  resolveDownloadUrl,
  type AssignedMaterialRow,
} from "@/lib/api/materials";

export default function StudentResourcesPage() {
  const [materials, setMaterials] = useState<AssignedMaterialRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getStudentMaterials();
      setMaterials(Array.isArray(list) ? list : []);
    } catch {
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDownload = useCallback(async (materialId: string) => {
    const info = await getMaterialDownload(materialId);
    if (!info?.downloadUrl) return;
    const url = resolveDownloadUrl(info.downloadUrl);
    if (!url) return;
    window.open(url, "_blank", "noreferrer");
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFB]">
      <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Материалы</h1>
            <p className="mt-1.5 max-w-3xl text-[15px] text-slate-500">
              Здесь показываются материалы, назначенные вашей группе или сессии.
            </p>
          </div>

          <Button variant="outline" onClick={load} disabled={loading}>
            Обновить
          </Button>
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="rounded-[24px] border border-slate-100 bg-white p-6 text-sm text-slate-500 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
              Загружаем материалы...
            </div>
          ) : materials.length === 0 ? (
            <div className="rounded-[24px] border border-slate-100 bg-white p-6 text-sm text-slate-500 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
              Пока нет назначенных материалов.
            </div>
          ) : (
            <Table>
              <THead>
                <TRow>
                  <TH>Название</TH>
                  <TH>Файл</TH>
                  <TH className="w-[140px]">Размер</TH>
                  <TH className="w-[160px]">Действия</TH>
                </TRow>
              </THead>
              <TBody>
                {materials.map((m) => (
                  <TRow key={m.assignmentId}>
                    <TCell>
                      <div className="font-semibold">{m.title}</div>
                      {m.description ? <TMuted className="block mt-1">{m.description}</TMuted> : null}
                    </TCell>
                    <TCell>
                      <div className="font-medium text-slate-700">{m.fileName || "—"}</div>
                      <TMuted className="block mt-1">{m.mimeType || "—"}</TMuted>
                    </TCell>
                    <TCell>
                      <div className="font-medium text-slate-700">
                        {typeof m.size === "number" ? `${Math.round(m.size / 1024)} KB` : "—"}
                      </div>
                    </TCell>
                    <TCell>
                      <Button size="sm" variant="outline" onClick={() => void handleDownload(m.materialId)}>
                        Скачать
                      </Button>
                    </TCell>
                  </TRow>
                ))}
              </TBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}

