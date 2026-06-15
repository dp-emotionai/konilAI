"use client";

import useSWR from "swr";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { AnalyticsStates } from "@/components/analytics/AnalyticsStates";
import { fetchGroupAnalytics, exportGroupReport } from "@/lib/api/analytics";
import {
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  FileDown,
  Layers3,
  Users,
  Video,
} from "lucide-react";

const groupAnalyticsKey = (id: string) => `analytics-group-${id}`;

const chartColors = [
  "rgb(var(--primary))",
  "#22c55e",
  "#f97316",
  "#8b5cf6",
  "#06b6d4",
  "#ef4444",
];

type KpiCardProps = {
  label: string;
  value: string | number;
  hint: string;
  icon: ReactNode;
};

function KpiCard({ label, value, hint, icon }: KpiCardProps) {
  return (
      <div className="group relative overflow-hidden rounded-3xl border border-[color:var(--border)]/25 bg-gradient-to-br from-surface via-surface to-surface-subtle/40 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[rgb(var(--primary))]/10 blur-2xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{label}</div>
            <div className="mt-3 text-3xl font-bold text-fg">{value}</div>
            <div className="mt-1 text-xs text-muted">{hint}</div>
          </div>
          <div className="rounded-2xl bg-[rgb(var(--primary))]/10 p-3 text-[rgb(var(--primary))]">
            {icon}
          </div>
        </div>
      </div>
  );
}

export function GroupAnalyticsSection({ groupId }: { groupId: string }) {
  const { data, error, isLoading, mutate } = useSWR(
      groupId ? groupAnalyticsKey(groupId) : null,
      () => fetchGroupAnalytics(groupId),
      { revalidateOnFocus: false }
  );
  const [exporting, setExporting] = useState(false);
  const [chartReady, setChartReady] = useState(false);

  useEffect(() => {
    setChartReady(true);
  }, []);

  const overviewData = useMemo(
      () =>
          data
              ? [
                { name: "Вовлечённость", value: data.averageEngagement },
                { name: "Посещаемость", value: data.averageAttendance },
                { name: "Выполнение заданий", value: data.taskCompletionRate },
                { name: "Средний балл", value: data.averageScore },
              ]
              : [],
      [data]
  );

  const engagementData = useMemo(
      () =>
          data?.engagementTrend.map((p, index) => ({
            name: p.date ?? `S${index + 1}`,
            engagement: p.engagement,
          })) ?? [],
      [data]
  );

  const attendanceData = useMemo(
      () =>
          data?.attendanceTrend.map((p, index) => ({
            name: p.date ?? `S${index + 1}`,
            attendance: p.rate,
            joined: p.joined,
            total: p.total,
          })) ?? [],
      [data]
  );

  const topStudentsData = useMemo(
      () =>
          data?.topStudents.map((student) => ({
            name: student.fullName,
            score: Math.round(
                (student.averageScore + student.attendanceRate + student.taskCompletionRate) / 3
            ),
          })) ?? [],
      [data]
  );

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
        <CardContent className="p-0">
          <div className="relative overflow-hidden border-b border-[color:var(--border)]/20 bg-gradient-to-br from-[rgb(var(--primary))]/15 via-surface to-surface p-6 md:p-8">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[rgb(var(--primary))]/20 blur-3xl" />
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[rgb(var(--primary))]/10 p-3 text-[rgb(var(--primary))]">
                  <BarChart3 size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-fg">Аналитика группы</h2>

                  <p className="mt-1 text-sm text-muted">
                    Реальная статистика: посещаемость, занятия, материалы, задания и прогресс студентов.
                  </p>
                </div>
              </div>
              {data && (
                  <Button
                      size="sm"
                      variant="primary"
                      disabled={exporting}
                      onClick={handleExport}
                      className="gap-2 shadow-lg shadow-[rgb(var(--primary))]/20"
                      aria-label="Экспорт отчёта группы в PDF"
                  >
                    <FileDown size={14} />
                    {exporting ? "Подготовка PDF..." : "Экспорт PDF"}
                  </Button>
              )}
            </div>
          </div>

          <div className="p-6 md:p-8">
            <AnalyticsStates
                loading={loading}
                error={hasError}
                empty={empty}
                onRetry={() => mutate()}
                emptyTitle="Нет данных аналитики"
                emptyDescription="Проведите сессии, добавьте материалы или задания — здесь появятся диаграммы и PDF-отчёт."
            >
              {data && (
                  <div className="space-y-7">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <KpiCard label="Студенты" value={data.studentCount} hint="active members" icon={<Users size={22} />} />
                      <KpiCard label="Сессии" value={data.totalSessions} hint="group sessions" icon={<Video size={22} />} />
                      <KpiCard label="Материалы" value={data.materialCount} hint="assigned files" icon={<BookOpen size={22} />} />
                      <KpiCard label="Задания" value={data.taskCount + data.testCount} hint="tasks + tests" icon={<Layers3 size={22} />} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <KpiCard label="Вовлечённость" value={`${data.averageEngagement}%`} hint="avg session engagement" icon={<BarChart3 size={22} />} />
                      <KpiCard label="Посещаемость" value={`${data.averageAttendance}%`} hint="attendance rate" icon={<CheckCircle2 size={22} />} />
                      <KpiCard label="Выполнение" value={`${data.taskCompletionRate}%`} hint="submitted tasks" icon={<FileDown size={22} />} />
                      <KpiCard label="Средний  балл" value={`${data.averageScore}%`} hint="tests/tasks score" icon={<Award size={22} />} />
                    </div>

                    {chartReady ? (
                        <div className="grid gap-5 xl:grid-cols-2">
                          <div className="rounded-3xl border border-[color:var(--border)]/25 bg-surface-subtle/20 p-5">
                            <div className="mb-4">
                              <h3 className="font-semibold text-fg">Общие показатели</h3>
                              <p className="text-xs text-muted">Основные метрики в процентах.</p>
                            </div>
                            <div className="h-72">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={overviewData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} />
                                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                                  <Tooltip
                                      formatter={(value) => [`${value}%`, "Показатель"]}
                                      contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px" }}
                                  />
                                  <Bar dataKey="value" radius={[12, 12, 4, 4]}>
                                    {overviewData.map((entry, index) => (
                                        <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          <div className="rounded-3xl border border-[color:var(--border)]/25 bg-surface-subtle/20 p-5">
                            <div className="mb-4">
                              <h3 className="font-semibold text-fg">Динамика посещаемости</h3>
                              <p className="text-xs text-muted">Процент посещаемости последних занятий.</p>
                            </div>
                            <div className="h-72">
                              {attendanceData.length > 0 ? (
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={attendanceData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} />
                                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                                      <Tooltip
                                          formatter={(value) => [`${value}%`, "Қатысу"]}
                                          contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px" }}
                                      />
                                      <Line type="monotone" dataKey="attendance" stroke="rgb(var(--primary))" strokeWidth={3} dot={{ r: 4 }} />
                                    </LineChart>
                                  </ResponsiveContainer>
                              ) : (
                                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[color:var(--border)]/30 text-sm text-muted">
                                    Нет данных по посещаемости.
                                  </div>
                              )}
                            </div>
                          </div>

                          <div className="rounded-3xl border border-[color:var(--border)]/25 bg-surface-subtle/20 p-5">
                            <div className="mb-4">
                              <h3 className="font-semibold text-fg">Вовлечённость</h3>
                              <p className="text-xs text-muted">На основе аналитики проведённых занятий.</p>
                            </div>
                            <div className="h-72">
                              {engagementData.length > 0 ? (
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={engagementData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} />
                                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                                      <Tooltip
                                          formatter={(value) => [`${value}%`, "Вовлечённость"]}
                                          contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px" }}
                                      />
                                      <Line type="monotone" dataKey="engagement" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} />
                                    </LineChart>
                                  </ResponsiveContainer>
                              ) : (
                                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[color:var(--border)]/30 text-sm text-muted">
                                    Если отсутствуют данные аналитики, график не отображается.
                                  </div>
                              )}
                            </div>
                          </div>

                          <div className="rounded-3xl border border-[color:var(--border)]/25 bg-surface-subtle/20 p-5">
                            <div className="mb-4">
                              <h3 className="font-semibold text-fg">Типы материалы</h3>
                              <p className="text-xs text-muted">Материалы, закреплённые за группой.</p>
                            </div>
                            <div className="h-72">
                              {data.materialBreakdown.length > 0 ? (
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                      <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px" }} />
                                      <Pie data={data.materialBreakdown} dataKey="count" nameKey="kind" innerRadius={58} outerRadius={94} paddingAngle={4}>
                                        {data.materialBreakdown.map((entry, index) => (
                                            <Cell key={entry.kind} fill={chartColors[index % chartColors.length]} />
                                        ))}
                                      </Pie>
                                    </PieChart>
                                  </ResponsiveContainer>
                              ) : (
                                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[color:var(--border)]/30 text-sm text-muted">
                                    Материалы ещё не добавлены.
                                  </div>
                              )}
                            </div>
                          </div>
                        </div>
                    ) : null}

                    <div className="rounded-3xl border border-[color:var(--border)]/25 bg-surface-subtle/20 p-5">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-fg">Лучшие студенты</h3>
                          <p className="text-xs text-muted">Рейтинг на основе среднего балла,
                            посещаемости и выполнения заданий.</p>
                        </div>
                      </div>
                      {topStudentsData.length > 0 ? (
                          <div className="h-72">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={topStudentsData} layout="vertical" margin={{ top: 8, right: 16, left: 24, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.25} />
                                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                                <Tooltip
                                    formatter={(value) => [`${value}%`, "Рейтинг"]}
                                    contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "14px" }}
                                />
                                <Bar dataKey="score" fill="rgb(var(--primary))" radius={[0, 12, 12, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                      ) : (
                          <div className="rounded-2xl border border-dashed border-[color:var(--border)]/30 py-8 text-center text-sm text-muted">
                            Для формирования рейтинга в группе должны быть активные студенты.
                          </div>
                      )}
                    </div>
                  </div>
              )}
            </AnalyticsStates>
          </div>
        </CardContent>
      </Card>
  );
}
