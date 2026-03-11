"use client";

import useSWR from "swr";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { AnalyticsStates } from "@/components/analytics/AnalyticsStates";
import { fetchTeacherAnalytics, exportTeacherReport } from "@/lib/api/analytics";
import { BarChart3, FileDown, AlertTriangle, PlayCircle, TrendingUp } from "lucide-react";

const teacherAnalyticsKey = "analytics-teacher";

export function TeacherAnalyticsCard() {
  const { data, error, isLoading, mutate } = useSWR(teacherAnalyticsKey, () => fetchTeacherAnalytics(), {
    revalidateOnFocus: false,
  });
  const [exporting, setExporting] = useState(false);

  const loading = isLoading;
  const hasError = Boolean(error);
  const empty = !loading && !hasError && !data;

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportTeacherReport();
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card variant="elevated" interactive className="h-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-[rgb(var(--primary))]" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted">Аналитика</span>
          </div>
          {data && (
            <Button
              size="sm"
              variant="outline"
              disabled={exporting}
              onClick={handleExport}
              className="gap-1.5"
              aria-label="Экспорт отчёта преподавателя"
            >
              <FileDown size={14} />
              {exporting ? "…" : "Экспорт"}
            </Button>
          )}
        </div>

        <AnalyticsStates
          loading={loading}
          error={hasError}
          empty={empty}
          onRetry={() => mutate()}
          emptyTitle="Нет сводки"
          emptyDescription="Данные по сессиям появятся после проведения занятий."
        >
          {data && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-surface-subtle/50 px-3 py-3 text-center">
                  <PlayCircle size={16} className="mx-auto text-muted" />
                  <div className="mt-1 text-lg font-bold text-fg">{data.totalSessions}</div>
                  <div className="text-xs text-muted">Сессий</div>
                </div>
                <div className="rounded-xl bg-surface-subtle/50 px-3 py-3 text-center">
                  <TrendingUp size={16} className="mx-auto text-muted" />
                  <div className="mt-1 text-lg font-bold text-fg">{data.averageEngagement}%</div>
                  <div className="text-xs text-muted">Вовлечённость</div>
                </div>
                <div className="rounded-xl bg-surface-subtle/50 px-3 py-3 text-center">
                  <AlertTriangle size={16} className="mx-auto text-muted" />
                  <div className="mt-1 text-lg font-bold text-fg">{data.stressEvents}</div>
                  <div className="text-xs text-muted">Стресс</div>
                </div>
              </div>
            </div>
          )}
        </AnalyticsStates>
      </CardContent>
    </Card>
  );
}
