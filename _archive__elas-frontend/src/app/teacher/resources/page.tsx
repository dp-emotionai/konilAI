"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Table, { TBody, TCell, THead, TH, TRow, TMuted } from "@/components/ui/Table";

import { getTeacherAllSessions, getTeacherGroups, type GroupSession, type TeacherGroup } from "@/lib/api/teacher";
import {
  assignMaterial,
  createMaterial,
  deleteMaterial,
  getMaterialDownload,
  getMyMaterials,
  resolveDownloadUrl,
  type MaterialRow,
} from "@/lib/api/materials";

export default function TeacherResourcesPage() {
  const [groups, setGroups] = useState<TeacherGroup[]>([]);
  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [activeMaterial, setActiveMaterial] = useState<MaterialRow | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    fileName: "",
    mimeType: "",
    storageKey: "",
    size: "",
  });

  const [assignForm, setAssignForm] = useState({
    groupId: "",
    sessionId: "",
    visibleFrom: "",
    visibleTo: "",
  });

  useEffect(() => {
    getTeacherGroups().then(setGroups).catch(() => setGroups([]));
    getTeacherAllSessions().then(setSessions).catch(() => setSessions([]));
  }, []);

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getMyMaterials();
      setMaterials(Array.isArray(list) ? list : []);
    } catch {
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMaterials();
  }, [loadMaterials]);

  const groupOptions = useMemo(() => groups, [groups]);
  const sessionOptions = useMemo(() => sessions, [sessions]);

  const openAssign = useCallback((material: MaterialRow) => {
    setActiveMaterial(material);
    setAssignForm({ groupId: "", sessionId: "", visibleFrom: "", visibleTo: "" });
    setAssignOpen(true);
  }, []);

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
              Реальный backend подключен: список, создание, удаление, назначение и download.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadMaterials} disabled={loading}>
              Обновить
            </Button>
            <Button onClick={() => setCreateOpen(true)}>Создать материал</Button>
          </div>
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="rounded-[24px] border border-slate-100 bg-white p-6 text-sm text-slate-500 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
              Загружаем материалы...
            </div>
          ) : materials.length === 0 ? (
            <div className="rounded-[24px] border border-slate-100 bg-white p-6 text-sm text-slate-500 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
              Материалов пока нет.
            </div>
          ) : (
            <Table>
              <THead>
                <TRow>
                  <TH>Название</TH>
                  <TH>Файл</TH>
                  <TH className="w-[140px]">Размер</TH>
                  <TH className="w-[240px]">Действия</TH>
                </TRow>
              </THead>
              <TBody>
                {materials.map((m) => (
                  <TRow key={m.id}>
                    <TCell>
                      <div className="font-semibold">{m.title}</div>
                      {m.description ? <TMuted className="block mt-1">{m.description}</TMuted> : null}
                    </TCell>
                    <TCell>
                      <div className="font-medium text-slate-700">{m.fileName}</div>
                      <TMuted className="block mt-1">{m.mimeType || "—"}</TMuted>
                    </TCell>
                    <TCell>
                      <div className="font-medium text-slate-700">
                        {typeof m.size === "number" ? `${Math.round(m.size / 1024)} KB` : "—"}
                      </div>
                    </TCell>
                    <TCell>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => void handleDownload(m.id)}>
                          Скачать
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openAssign(m)}>
                          Назначить
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={async () => {
                            if (!confirm("Удалить материал?")) return;
                            await deleteMaterial(m.id);
                            await loadMaterials();
                          }}
                        >
                          Удалить
                        </Button>
                      </div>
                    </TCell>
                  </TRow>
                ))}
              </TBody>
            </Table>
          )}
        </div>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Создать материал"
        description="Backend ожидает метаданные + storageKey (upload пока вне этого контракта)."
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={async () => {
                const size = form.size.trim() ? Number(form.size) : null;
                await createMaterial({
                  title: form.title,
                  description: form.description.trim() ? form.description : null,
                  fileName: form.fileName,
                  mimeType: form.mimeType.trim() ? form.mimeType : null,
                  storageKey: form.storageKey,
                  size: typeof size === "number" && Number.isFinite(size) ? size : null,
                });
                setCreateOpen(false);
                setForm({ title: "", description: "", fileName: "", mimeType: "", storageKey: "", size: "" });
                await loadMaterials();
              }}
              disabled={!form.title.trim() || !form.fileName.trim() || !form.storageKey.trim()}
            >
              Создать
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <Input
            placeholder="Название"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
          />
          <Input
            placeholder="Описание (опционально)"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
          <Input
            placeholder="fileName (например: lesson.pdf)"
            value={form.fileName}
            onChange={(e) => setForm((p) => ({ ...p, fileName: e.target.value }))}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              placeholder="mimeType (опц.)"
              value={form.mimeType}
              onChange={(e) => setForm((p) => ({ ...p, mimeType: e.target.value }))}
            />
            <Input
              placeholder="size (bytes, опц.)"
              value={form.size}
              onChange={(e) => setForm((p) => ({ ...p, size: e.target.value }))}
            />
          </div>
          <Input
            placeholder="storageKey (например: abc123.pdf)"
            value={form.storageKey}
            onChange={(e) => setForm((p) => ({ ...p, storageKey: e.target.value }))}
          />
        </div>
      </Modal>

      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Назначить материал"
        description={activeMaterial ? `Материал: ${activeMaterial.title}` : undefined}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={async () => {
                if (!activeMaterial) return;
                await assignMaterial(activeMaterial.id, {
                  groupId: assignForm.groupId || undefined,
                  sessionId: assignForm.sessionId || undefined,
                  visibleFrom: assignForm.visibleFrom ? new Date(assignForm.visibleFrom).toISOString() : null,
                  visibleTo: assignForm.visibleTo ? new Date(assignForm.visibleTo).toISOString() : null,
                });
                setAssignOpen(false);
              }}
              disabled={!activeMaterial || (!assignForm.groupId && !assignForm.sessionId)}
            >
              Назначить
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-500">Группа (опционально)</div>
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm"
              value={assignForm.groupId}
              onChange={(e) => setAssignForm((p) => ({ ...p, groupId: e.target.value }))}
            >
              <option value="">—</option>
              {groupOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-500">Сессия (опционально)</div>
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm"
              value={assignForm.sessionId}
              onChange={(e) => setAssignForm((p) => ({ ...p, sessionId: e.target.value }))}
            >
              <option value="">—</option>
              {sessionOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-500">visibleFrom (опц.)</div>
              <Input
                type="datetime-local"
                value={assignForm.visibleFrom}
                onChange={(e) => setAssignForm((p) => ({ ...p, visibleFrom: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-500">visibleTo (опц.)</div>
              <Input
                type="datetime-local"
                value={assignForm.visibleTo}
                onChange={(e) => setAssignForm((p) => ({ ...p, visibleTo: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

