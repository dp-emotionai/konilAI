"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, Trash2, StickyNote } from "lucide-react";

import { cn } from "@/lib/cn";
import {
  createSessionNote,
  deleteSessionNote,
  getSessionNotes,
  updateSessionNote,
  type SessionNote,
} from "@/lib/api/sessionNotes";

function formatNoteTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString([], {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

function getNotePreview(note: SessionNote) {
  const compact = note.text.replace(/\s+/g, " ").trim();
  return compact || "Пустая заметка";
}

function isRouteMissingError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("notes_api_unavailable") ||
    message.includes("cannot get") ||
    message.includes("cannot post") ||
    message.includes("http 404") ||
    message.includes("not found")
  );
}

export function SessionNotesPanel({
  sessionId,
  role,
}: {
  sessionId: string;
  role: "teacher" | "student";
}) {
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [selectedId, setSelectedId] = useState<string>("new");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendUnavailable, setBackendUnavailable] = useState(false);

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedId) ?? null,
    [notes, selectedId]
  );

  const loadNotes = useCallback(async () => {
    if (!sessionId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getSessionNotes(sessionId);
      setBackendUnavailable(false);
      setNotes(data);
      setSelectedId((current) => {
        if (current === "new") return current;
        return data.some((note) => note.id === current) ? current : data[0]?.id ?? "new";
      });
    } catch (err) {
      setNotes([]);
      setBackendUnavailable(isRouteMissingError(err));
      setError(err instanceof Error ? err.message : "Не удалось загрузить заметки.");
      setSelectedId("new");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  useEffect(() => {
    if (selectedNote) {
      setDraft(selectedNote.text);
      return;
    }

    if (selectedId === "new") {
      setDraft("");
    }
  }, [selectedId, selectedNote]);

  const handleCreateNew = useCallback(() => {
    setSelectedId("new");
    setDraft("");
    setError(null);
  }, []);

  const handleSave = useCallback(async () => {
    const text = draft.trim();
    if (!text || saving) return;

    setSaving(true);
    setError(null);

    try {
      if (selectedNote) {
        const updated = await updateSessionNote(sessionId, selectedNote.id, text);
        if (updated) {
          setNotes((prev) =>
            [updated, ...prev.filter((note) => note.id !== updated.id)].sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            )
          );
          setSelectedId(updated.id);
        } else {
          await loadNotes();
        }
      } else {
        const created = await createSessionNote(sessionId, text);
        if (created) {
          setNotes((prev) => [created, ...prev.filter((note) => note.id !== created.id)]);
          setSelectedId(created.id);
        } else {
          await loadNotes();
        }
      }
    } catch (err) {
      setBackendUnavailable(isRouteMissingError(err));
      setError(err instanceof Error ? err.message : "Не удалось сохранить заметку.");
    } finally {
      setSaving(false);
    }
  }, [draft, loadNotes, saving, selectedNote, sessionId]);

  const handleDelete = useCallback(async () => {
    if (!selectedNote || deleting) return;

    setDeleting(true);
    setError(null);

    try {
      await deleteSessionNote(sessionId, selectedNote.id);
      setNotes((prev) => prev.filter((note) => note.id !== selectedNote.id));
      setSelectedId("new");
      setDraft("");
    } catch (err) {
      setBackendUnavailable(isRouteMissingError(err));
      setError(err instanceof Error ? err.message : "Не удалось удалить заметку.");
    } finally {
      setDeleting(false);
    }
  }, [deleting, selectedNote, sessionId]);

  if (loading) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-[24px] border border-slate-100 bg-slate-50/50 text-sm font-medium text-slate-400">
        Загрузка заметок...
      </div>
    );
  }

  if (backendUnavailable) {
    return (
      <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[24px] border border-slate-100 bg-slate-50/50 px-6 text-center">
        <div className="mb-3 rounded-[18px] bg-white p-4 text-slate-300 shadow-sm">
          <StickyNote size={28} strokeWidth={1.5} />
        </div>
        <div className="text-sm font-semibold text-slate-700">Заметки недоступны</div>
        <div className="mt-2 max-w-md text-sm text-slate-400">
          В этом окружении API заметок не отвечает по контракту `/sessions/:id/notes`. Фронтенд не
          подменяет его локальным хранилищем.
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-[320px] gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="flex min-h-0 flex-col rounded-[24px] border border-slate-100 bg-slate-50/60">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <div className="text-sm font-bold text-slate-900">Заметки сессии</div>
            <div className="text-xs text-slate-400">
              {notes.length > 0 ? `${notes.length} шт.` : "Пока без заметок"}
            </div>
          </div>
          <button
            type="button"
            onClick={handleCreateNew}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            aria-label="Создать заметку"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 custom-scrollbar">
          {notes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">
              У этой сессии пока нет сохранённых заметок.
            </div>
          ) : (
            notes.map((note) => {
              const active = selectedId === note.id;

              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => setSelectedId(note.id)}
                  className={cn(
                    "w-full rounded-2xl border px-4 py-3 text-left transition",
                    active
                      ? "border-[#7448FF]/40 bg-white shadow-sm"
                      : "border-transparent bg-white/80 hover:border-slate-200"
                  )}
                >
                  <div className="line-clamp-2 text-sm font-semibold text-slate-800">
                    {getNotePreview(note)}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                    <span className="truncate">{note.authorName || (role === "teacher" ? "Преподаватель" : "Студент")}</span>
                    <span className="shrink-0">{formatNoteTime(note.updatedAt)}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-col rounded-[24px] border border-slate-100 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <div className="text-sm font-bold text-slate-900">
              {selectedNote ? "Редактирование заметки" : "Новая заметка"}
            </div>
            <div className="text-xs text-slate-400">
              {selectedNote
                ? `Обновлено ${formatNoteTime(selectedNote.updatedAt)}`
                : "Сохранение идёт через backend API"}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedNote && (
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting || saving}
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Удалить
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!draft.trim() || saving || deleting}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#7448FF] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#6737ff] disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {selectedNote ? "Сохранить" : "Создать"}
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col p-5">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="min-h-[220px] flex-1 resize-none rounded-[24px] border border-slate-100 bg-slate-50/50 p-5 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-300 focus:ring-2 focus:ring-[#7448FF]/10"
            placeholder="Напишите заметку по сессии. Она будет сохранена на сервере и останется доступной после перезагрузки."
          />

          {error && (
            <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
