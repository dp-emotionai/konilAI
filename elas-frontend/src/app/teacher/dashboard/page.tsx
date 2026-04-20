"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

import {
  getTeacherDashboardSessions,
  type TeacherDashboardSession,
} from "@/lib/api/teacher";

import { summarizeTeacherDashboard } from "@/lib/utils/metrics";
import {
  Video,
  Users,
  ClipboardList,
  Clock,
  Plus,
  ArrowRight,
  Download,
  Database,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useUI } from "@/components/layout/Providers";

function KPI({
  icon: Icon,
  title,
  value,
  subtitle,
  iconBg,
  iconColor,
  trend,
}: {
  icon: any;
  title: string;
  value: string;
  subtitle: string;
  iconBg: string;
  iconColor: string;
  trend?: { value: string; positive: boolean };
}) {
  return (
    <Card className="p-5" variant="elevated">
      <div className={cn("inline-flex h-10 w-10 items-center justify-center rounded-2xl mb-4", iconBg, iconColor)}>
        <Icon size={18} />
      </div>
      <div className="text-[13px] text-muted font-medium mb-1">{title}</div>
      <div className="text-3xl font-bold text-fg mb-2">{value}</div>
      <div className="text-[11px] text-muted font-medium flex items-center gap-1">
        {trend && (
          <span className={trend.positive ? "text-emerald-500" : "text-amber-500"}>
            {trend.value}
          </span>
        )}
        {subtitle}
      </div>
    </Card>
  );
}

function QuickAccessCard({
  icon: Icon,
  title,
  subtitle,
  bgClass,
  textClass,
  href,
}: {
  icon: any;
  title: string;
  subtitle: string;
  bgClass: string;
  textClass: string;
  href: string;
}) {
  return (
    <Link href={href} className="flex-1 block focus-visible:outline-none">
      <div className={cn("rounded-2xl p-5 transition-transform hover:-translate-y-0.5 relative group", bgClass, textClass)}>
        <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/40 mb-3 shadow-sm">
          <Icon size={16} />
        </div>
        <div className="font-semibold">{title}</div>
        <div className="text-xs opacity-75 mt-1 pr-6">{subtitle}</div>
        
        <div className="absolute right-4 bottom-5 h-6 w-6 rounded-full bg-white/40 flex items-center justify-center group-hover:bg-white/60 transition-colors">
          <ArrowRight size={12} />
        </div>
      </div>
    </Link>
  );
}

export default function TeacherDashboard() {
  const [sessions, setSessions] = useState<TeacherDashboardSession[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTeacherDashboardSessions();
      setSessions(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const summary = useMemo(() => summarizeTeacherDashboard(sessions), [sessions]);

  // Dummy Calendar logic for visual match
  const today = new Date();
  const currentMonth = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(today);
  const currentYear = today.getFullYear().toString();

  return (
    <div className="min-h-screen bg-bg relative">
      {/* Background soft blob */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-[rgb(var(--primary))]/20 to-pink-300/20 blur-3xl rounded-full opacity-30 pointer-events-none -translate-y-1/2" />

      <main className="mx-auto max-w-[1440px] px-6 pt-24 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          
          {/* LEFT COLUMN */}
          <div className="space-y-10 z-10">
            {/* Header */}
            <div>
              <h1 className="text-4xl font-bold text-fg tracking-tight mb-2">
                Добрый день, Алия! <span className="opacity-80">👋</span>
              </h1>
              <p className="text-muted">
                У вас {summary.activeGroups} активные группы и {summary.sessionsToday} запланированных занятия на сегодня.
              </p>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPI 
                icon={Video}
                title="Активные сессии"
                value={`${summary.activeGroups}`}
                trend={{ value: "+12%", positive: true }}
                subtitle="от вчера"
                iconBg="bg-primary/10"
                iconColor="text-primary"
              />
              <KPI 
                icon={Users}
                title="Группы"
                value="8"
                subtitle="Без изменений"
                iconBg="bg-blue-500/10"
                iconColor="text-blue-500"
              />
              <KPI 
                icon={ClipboardList}
                title="Отчёты за неделю"
                value="12"
                trend={{ value: "+4%", positive: true }}
                subtitle="от прошлой недели"
                iconBg="bg-pink-500/10"
                iconColor="text-pink-500"
              />
              <KPI 
                icon={Clock}
                title="Средняя активность"
                value={`${summary.avgEngagement}%`}
                subtitle="Хороший показатель"
                iconBg="bg-orange-500/10"
                iconColor="text-orange-500"
              />
            </div>

            {/* Quick Access */}
            <div>
              <h2 className="text-lg font-bold text-fg mb-4">Быстрый доступ</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <QuickAccessCard 
                  icon={Plus}
                  title="Новая сессия"
                  subtitle="Создать и запустить новую сессию"
                  bgClass="bg-[#F4F1FF]"
                  textClass="text-[#5925DC]"
                  href="/teacher/sessions/new"
                />
                <QuickAccessCard 
                  icon={Users}
                  title="Мои группы"
                  subtitle="Управление группами и студентами"
                  bgClass="bg-[#EBF5FF]"
                  textClass="text-[#1E40AF]"
                  href="/teacher/groups"
                />
                <QuickAccessCard 
                  icon={ClipboardList}
                  title="Создать отчёт"
                  subtitle="Сгенерировать новый отчёт"
                  bgClass="bg-[#FFF7ED]"
                  textClass="text-[#9A3412]"
                  href="/teacher/reports/new"
                />
              </div>
            </div>

            {/* Recent Sessions */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-fg">Недавние сессии</h2>
                <Link href="/teacher/sessions" className="text-sm font-medium text-[rgb(var(--primary))] hover:underline">
                  Смотреть все
                </Link>
              </div>
              <Card variant="elevated" className="overflow-hidden border-none shadow-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-surface-subtle text-muted">
                        <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px]">Сессия</th>
                        <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px]">Группа</th>
                        <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px]">Время</th>
                        <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px]">Участники</th>
                        <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px]">Статус</th>
                        <th className="px-6 py-4 font-medium uppercase tracking-wider text-[11px]">Действие</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-subtle">
                      <tr className="hover:bg-surface-subtle/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-fg flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Алгоритмы и структуры данных
                        </td>
                        <td className="px-6 py-4 text-muted">CS-201</td>
                        <td className="px-6 py-4 text-muted">Сегодня, 10:00</td>
                        <td className="px-6 py-4 text-muted">32</td>
                        <td className="px-6 py-4"><span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-xs font-semibold">Активная</span></td>
                        <td className="px-6 py-4 text-[rgb(var(--primary))] font-medium cursor-pointer">Открыть</td>
                      </tr>
                      <tr className="hover:bg-surface-subtle/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-fg flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500" /> Базы данных
                        </td>
                        <td className="px-6 py-4 text-muted">DB-101</td>
                        <td className="px-6 py-4 text-muted">Вчера, 14:30</td>
                        <td className="px-6 py-4 text-muted">28</td>
                        <td className="px-6 py-4"><span className="text-slate-500 bg-slate-50 px-2.5 py-1 rounded-full text-xs font-medium">Завершена</span></td>
                        <td className="px-6 py-4 text-[rgb(var(--primary))] font-medium cursor-pointer">Открыть</td>
                      </tr>
                      <tr className="hover:bg-surface-subtle/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-fg flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-orange-400" /> Веб-разработка
                        </td>
                        <td className="px-6 py-4 text-muted">WEB-301</td>
                        <td className="px-6 py-4 text-muted">12 марта, 09:00</td>
                        <td className="px-6 py-4 text-muted">24</td>
                        <td className="px-6 py-4"><span className="text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full text-xs font-medium">Запланирована</span></td>
                        <td className="px-6 py-4 text-[rgb(var(--primary))] font-medium cursor-pointer">Открыть</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-8 z-10 hidden lg:block">
            {/* Calendar */}
            <Card className="p-6" variant="elevated">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex gap-2">
                    <button className="text-muted hover:text-fg"><ChevronLeft size={16} /></button>
                    <span className="text-sm font-semibold capitalize bg-surface-subtle px-3 py-1.5 rounded-md">{currentMonth}</span>
                    <button className="text-muted hover:text-fg"><ChevronRight size={16} /></button>
                 </div>
                 <div className="flex gap-2">
                    <span className="text-sm font-semibold bg-surface-subtle px-3 py-1.5 rounded-md">{currentYear}</span>
                 </div>
              </div>
              <div className="grid grid-cols-7 text-center text-xs font-medium text-muted mb-3">
                 <div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div><div>Пт</div><div>Сб</div><div>Вс</div>
              </div>
              <div className="grid grid-cols-7 text-center text-sm gap-y-3 font-medium">
                 {/* Dummy calendar dates matching the image */}
                 <div className="text-muted/40">31</div><div>1</div><div>2</div><div>3</div><div>4</div><div>5</div><div>6</div>
                 <div>7</div><div>8</div>
                 <div className="bg-[rgb(var(--primary))] text-white rounded-lg h-7 w-7 mx-auto flex items-center justify-center shadow-md">9</div>
                 <div>10</div><div>11</div><div>12</div>
                 <div className="bg-primary/10 text-[rgb(var(--primary))] rounded-lg h-7 w-7 mx-auto flex items-center justify-center">13</div>
                 {/* more rows... */}
                 <div>14</div><div>15</div><div>16</div><div>17</div><div>18</div><div>19</div><div>20</div>
                 <div>21</div><div>22</div><div>23</div><div>24</div><div>25</div><div>26</div><div>27</div>
                 <div>28</div><div>29</div><div>30</div><div className="text-muted/40">1</div><div className="text-muted/40">2</div><div className="text-muted/40">3</div><div className="text-muted/40">4</div>
              </div>
              <div className="mt-6 flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10">
                 <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-[rgb(var(--primary))]">
                       <CalendarIcon size={14} />
                    </div>
                    <div>
                       <div className="text-xs font-bold text-[rgb(var(--primary))]">Сегодня, 9 сентября</div>
                       <div className="text-[10px] text-muted font-medium">2 занятия · 1 сессия</div>
                    </div>
                 </div>
                 <ChevronRight size={14} className="text-[rgb(var(--primary))]" />
              </div>
            </Card>

            {/* Upcoming Classes */}
            <div>
              <h3 className="text-base font-bold text-fg mb-4">Ближайшие занятия</h3>
              <div className="space-y-3">
                 <Card className="p-4 flex items-center gap-4" variant="elevated">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                       <Video size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="text-xs text-muted font-medium">10:00 - 11:30</div>
                       <div className="text-sm font-bold text-fg truncate">Алгоритмы и структуры данных</div>
                       <div className="text-xs text-muted truncate">Группа CS-201</div>
                    </div>
                    <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md text-[10px] font-bold">Активная</span>
                 </Card>
                 <Card className="p-4 flex items-center gap-4" variant="elevated">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                       <Database size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="text-xs text-muted font-medium">14:30 - 16:00</div>
                       <div className="text-sm font-bold text-fg truncate">Базы данных</div>
                       <div className="text-xs text-muted truncate">Группа DB-101</div>
                    </div>
                    <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded-md text-[10px] font-bold">Запланирована</span>
                 </Card>
              </div>
            </div>

            {/* Recent Reports */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-fg">Недавние отчёты</h3>
                <Link href="/teacher/reports" className="text-xs font-medium text-[rgb(var(--primary))] hover:underline">
                  Смотреть все
                </Link>
              </div>
              <div className="space-y-3">
                 {[
                    { title: "Еженедельный отчёт", date: "12 марта 2026", color: "bg-emerald-100 text-emerald-600" },
                    { title: "Отчёт по активности студентов", date: "11 марта 2026", color: "bg-purple-100 text-purple-600" },
                    { title: "Анализ успеваемости", date: "10 марта 2026", color: "bg-blue-100 text-blue-600" }
                 ].map((report, i) => (
                    <Card key={i} className="p-4 flex items-center gap-4 transition-colors hover:border-[color:var(--border-strong)] cursor-pointer" variant="elevated">
                       <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", report.color)}>
                          <Download size={18} />
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-fg truncate">{report.title}</div>
                          <div className="text-xs text-muted truncate">{report.date}</div>
                       </div>
                       <Download size={16} className="text-muted/50" />
                    </Card>
                 ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}