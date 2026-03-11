"use client";

import useSWR from "swr";
import { useState } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { AnalyticsStates } from "@/components/analytics/AnalyticsStates";
import { fetchGroupAnalytics, exportGroupReport } from "@/lib/api/analytics";
import { BarChart3, FileDown } from "lucide-react";

const groupAnalyticsKey = (id: string) => `analytics-group-${id}`;

export function GroupAnalyticsSection({ groupId }: { groupId: string }) {
  const { data, error, isLoading, mutate } = useSWR(
    groupId ? groupAnalyticsKey(groupId) : null,
    () => fetchGroupAnalytics(groupId),
    { revalidateOnFocus: false }
  );
  const [exporting, setExporting] = useState(false);

  const loading = isLoading;
  const hasError = Boolean(error);
  const empty = !loading && !hasError && !data;

  const handleExport = async () => {
    if (!groupId || exporting) return;
    setExporting(true);
    try {
      await exportGroupReport(groupId);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardContent className="p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <BarChart3 size={20} className="text-[rgb(var(--primary))]" />
            <h2 className="text-lg font-semibold text-fg">Аналитика группы</h2>
          </div>
          {data && (
            <Button
              size="sm"
              variant="outline"
              disabled={exporting}
              onClick={handleExport}
              className="gap-2"
              aria-label="Экспорт отчёта группы"
            >
              <FileDown size={14} />
              {exporting ? "Скачивание…" : "Экспорт"}
            </Button>
          )}
        </div>

        <AnalyticsStates
          loading={loading}
          error={hasError}
          empty={empty}
          onRetry={() => mutate()}
          emptyTitle="Нет данных аналитики"
          emptyDescription="Проведите сессии в группе — здесь появятся сводки и график вовлечённости."
        >
          {data && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-[color:var(--border)]/20 bg-surface-subtle/30 px-4 py-4">
                  <div className="text-xs uppercase tracking-wide text-muted">Всего сессий</div>
                  <div className="mt-2 text-2xl font-bold text-fg">{data.totalSessions}</div>
                </div>
                <div className="rounded-2xl border border-[color:var(--border)]/20 bg-surface-subtle/30 px-4 py-4">
                  <div className="text-xs uppercase tracking-wide text-muted">Средняя вовлечённость</div>
                  <div className="mt-2 text-2xl font-bold text-fg">{data.averageEngagement}%</div>
                </div>
              </div>

              {data.engagementTrend && data.engagementTrend.length > 0 ? (
                <div className="rounded-2xl border border-[color:var(--border)]/20 dark:border-white/10 bg-surface-subtle/20 dark:bg-white/5 p-4 md:p-6">
                  <div className="text-sm font-medium uppercase tracking-wider text-muted mb-4">Динамика вовлечённости</div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={data.engagementTrend.map((p) => ({
                          name: `${Math.floor(p.timeSec / 60)} мин`,
                          engagement: p.engagement,
                        }))}
                        margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip
                          contentStyle={{
                            background: "var(--surface)",
                            border: "1px solid var(--border)",
                            borderRadius: "12px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="engagement"
                          stroke="rgb(var(--primary))"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[color:var(--border)]/30 bg-surface-subtle/20 py-8 text-center text-sm text-muted">
                  Недостаточно данных для графика динамики.
                </div>
              )}
            </div>
          )}
        </AnalyticsStates>
      </CardContent>
    </Card>
  );
}
