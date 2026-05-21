"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";

import Button from "@/components/ui/Button";
import { getSessionContent, updateSessionContent } from "@/lib/api/sessionContent";
import { cn } from "@/lib/cn";

type Props = {
  sessionId: string;
  className?: string;
};

export function SessionContentEditor({ sessionId, className }: Props) {
  const [lessonPlan, setLessonPlan] = useState("");
  const [keyPointsText, setKeyPointsText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setMessage(null);
    try {
      const content = await getSessionContent(sessionId);
      setLessonPlan(content?.lessonPlan ?? "");
      setKeyPointsText((content?.keyPoints ?? []).join("\n"));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Не удалось загрузить план");
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    try {
      const keyPoints = keyPointsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      await updateSessionContent(sessionId, { lessonPlan, keyPoints });
      setMessage("Сохранено");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Не удалось сохранить план");
    } finally {
      setSaving(false);
    }
  }, [keyPointsText, lessonPlan, sessionId]);

  return (
    <div className={cn("rounded-[24px] border border-slate-100 bg-white p-4", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-slate-900">План занятия</div>
          <div className="text-xs font-medium text-slate-400">Видно студентам в live session</div>
        </div>
        <Button size="sm" onClick={() => void save()} disabled={saving || loading}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Сохранить
        </Button>
      </div>

      {loading ? (
        <div className="grid min-h-[180px] place-items-center text-sm font-semibold text-slate-400">
          Загружаем план...
        </div>
      ) : (
        <div className="grid gap-3">
          <textarea
            value={lessonPlan}
            onChange={(event) => setLessonPlan(event.target.value)}
            className="min-h-[120px] resize-y rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#7448FF]/30 focus:bg-white focus:ring-2 focus:ring-[#7448FF]/10"
            placeholder="План, структура урока, задания на занятие..."
          />
          <textarea
            value={keyPointsText}
            onChange={(event) => setKeyPointsText(event.target.value)}
            className="min-h-[90px] resize-y rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#7448FF]/30 focus:bg-white focus:ring-2 focus:ring-[#7448FF]/10"
            placeholder="Один важный тезис на строку"
          />
        </div>
      )}

      {message && <div className="mt-3 text-xs font-bold text-slate-500">{message}</div>}
    </div>
  );
}

