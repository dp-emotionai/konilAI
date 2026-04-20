"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { getTeacherDashboardSessions, type TeacherDashboardSession } from "@/lib/api/teacher";
import { getStoredAuth, hasAuth, api } from "@/lib/api/client";
import {
  Video, Users, ClipboardList, Clock, Plus, BarChart2,
  Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  Download, Database
} from "lucide-react";

type MeRes = { id: string; email: string; role: string; name?: string | null };

function KPI({
  icon: Icon, title, value, subtitle, trend, iconBg, iconColor
}: {
  icon: any; title: string; value: string; subtitle: string;
  trend?: string; iconBg: string; iconColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between">
      <div>
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", iconBg, iconColor)}>
          <Icon size={20} />
        </div>
        <div className="text-[13px] text-slate-500 font-medium mb-1">{title}</div>
        <div className="text-3xl font-bold text-slate-900 mb-2">{value}</div>
      </div>
      <div className="text-[11px] font-medium text-slate-500">
        {trend && <span className={trend.startsWith("+") ? "text-emerald-500" : "text-amber-500"}>{trend} </span>}
        {subtitle}
      </div>
    </div>
  );
}

function QuickAccessCard({
  icon: Icon, title, subtitle, bgClass, textClass, href
}: {
  icon: any; title: string; subtitle: string; bgClass: string; textClass: string; href: string;
}) {
  return (
    <Link href={href} className={cn("block rounded-2xl p-5 transition-transform hover:-translate-y-0.5", bgClass)}>
      <div className="flex justify-between items-start mb-3">
        <div className={cn("w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center", textClass)}>
          <Icon size={20} />
        </div>
        <div className="w-6 h-6 rounded-full bg-white/40 flex items-center justify-center text-slate-900 cursor-pointer hover:bg-white/60 transition-colors">
          <Plus size={14} />
        </div>
      </div>
      <div>
        <div className="font-bold text-slate-900 text-[15px]">{title}</div>
        <div className="text-[12px] text-slate-600 mt-0.5 leading-tight">{subtitle}</div>
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "active") return <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded text-[11px] font-bold tracking-wide uppercase">Активная</span>;
  if (status === "upcoming" || status === "draft") return <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded text-[11px] font-bold tracking-wide uppercase">Запланирована</span>;
  return <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[11px] font-bold tracking-wide uppercase">Завершена</span>;
}

export default function TeacherDashboard() {
  const [sessions, setSessions] = useState<TeacherDashboardSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeRes | null>(null);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const auth = getStoredAuth();
        if (auth && mounted) setMe({ id: "local", email: auth.email, role: auth.role, name: auth.name });
        if (hasAuth()) {
          api.get<MeRes>("auth/me").then(data => { if (mounted) setMe(data); }).catch(() => {});
        }
        const data = await getTeacherDashboardSessions();
        if (mounted) setSessions(data);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    init();
    return () => { mounted = false; };
  }, []);

  const activeCount = sessions.filter(s => s.status === 'active').length;
  const scheduledCount = sessions.filter(s => s.status === 'draft').length;
  
  const firstName = me?.name ? me.name.split(" ")[0] : "Преподаватель";

  const today = new Date();
  const currentMonth = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(today);
  const currentYear = today.getFullYear().toString();

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#FAFAFB] pt-8 md:pt-12 pb-16">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          
          {/* Main Left Column */}
          <div className="space-y-10">
            {/* Header Greeting */}
            <div>
              <h1 className="text-[32px] font-bold text-slate-900 tracking-tight flex items-center gap-3">
                Добрый день, {firstName}! <span>👋</span>
              </h1>
              <p className="text-[15px] text-slate-500 mt-2">
                У вас <span className="font-semibold text-slate-700">{activeCount} активных сессии</span> и <span className="font-semibold text-slate-700">{scheduledCount} запланированных занятия</span> на сегодня.
              </p>
            </div>

            {/* KPI Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPI 
                icon={Video} title="Активные сессии" value={String(activeCount)} subtitle="от вчера" trend="+25%"
                iconBg="bg-purple-50" iconColor="text-[#7448FF]"
              />
              <KPI 
                icon={Users} title="Группы" value="8" subtitle="Без изменений"
                iconBg="bg-blue-50" iconColor="text-blue-500"
              />
              <KPI 
                icon={ClipboardList} title="Отчёты за неделю" value="12" subtitle="от прошлой недели" trend="+18%"
                iconBg="bg-pink-50" iconColor="text-pink-500"
              />
              <KPI 
                icon={Clock} title="Удовлетворённость" value="78%" subtitle="Хороший показатель"
                iconBg="bg-orange-50" iconColor="text-orange-500"
              />
            </div>

            {/* Quick Access */}
            <div>
              <h2 className="text-[17px] font-bold text-slate-900 mb-5">Быстрый доступ</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <QuickAccessCard 
                  icon={Video} title="Новая сессия" subtitle="Создать новую сессию"
                  bgClass="bg-[#F0ECFF]" textClass="text-[#7448FF]" href="/teacher/sessions/new"
                />
                <QuickAccessCard 
                  icon={Users} title="Мои группы" subtitle="Управление группами и студентами"
                  bgClass="bg-[#EBF5FF]" textClass="text-blue-600" href="/teacher/groups"
                />
                <QuickAccessCard 
                  icon={BarChart2} title="Создать отчёт" subtitle="Сформировать новый отчёт"
                  bgClass="bg-[#FFF7ED]" textClass="text-orange-600" href="/teacher/reports"
                />
              </div>
            </div>

            {/* Recent Sessions Table */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-[17px] font-bold text-slate-900">Недавние сессии</h2>
              </div>
              <div className="bg-white border border-slate-100 rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="px-6 py-4 text-[12px] font-medium text-slate-400">Сессия</th>
                        <th className="px-6 py-4 text-[12px] font-medium text-slate-400">Группа</th>
                        <th className="px-6 py-4 text-[12px] font-medium text-slate-400">Время</th>
                        <th className="px-6 py-4 text-[12px] font-medium text-slate-400 text-center">Участники</th>
                        <th className="px-6 py-4 text-[12px] font-medium text-slate-400">Статус</th>
                        <th className="px-6 py-4 text-[12px] font-medium text-slate-400 text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500 text-sm">Загрузка сессий...</td></tr>
                      ) : sessions.length === 0 ? (
                        <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500 text-sm">Нет недавних сессий.</td></tr>
                      ) : (
                        sessions.slice(0, 5).map((s, i) => (
                          <tr key={s.id || i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <span className={cn("w-2 h-2 rounded-full", s.status === 'active' ? "bg-emerald-500" : s.status === 'finished' ? "bg-purple-500" : "bg-orange-500")} />
                                <span className="font-semibold text-[14px] text-slate-900">{s.title}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-[13px] font-medium text-slate-600">{s.group || "Без группы"}</td>
                            <td className="px-6 py-4 text-[13px] text-slate-500">
                               {s.date ? new Date(s.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' }) : "Неизвестно"}
                            </td>
                            <td className="px-6 py-4 text-[13px] font-medium text-slate-900 text-center">{s.participants || 0}</td>
                            <td className="px-6 py-4"><StatusBadge status={s.status} /></td>
                            <td className="px-6 py-4 text-right">
                              <Link href={`/teacher/session/${s.id}`} className="text-[13px] font-semibold text-[#7448FF] hover:text-[#623ce6] transition-colors">
                                Открыть
                              </Link>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            
          </div>

          {/* Right Sidebar Column */}
          <div className="space-y-8">
            
            {/* Calendar Widget */}
            <div className="bg-white border border-slate-100 rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6">
              <div className="flex items-center justify-between mb-6">
                 <button className="text-slate-400 hover:text-slate-700 transition-colors"><ChevronLeft size={18} /></button>
                 <div className="font-bold text-[15px] text-slate-900 capitalize">{currentMonth} <span className="text-slate-400 font-medium ml-1">{currentYear}</span></div>
                 <button className="text-slate-400 hover:text-slate-700 transition-colors"><ChevronRight size={18} /></button>
              </div>
              
              <div className="grid grid-cols-7 text-center text-[12px] font-semibold text-slate-400 mb-4">
                 <div>Пн</div><div>Вт</div><div>Ср</div><div>Чт</div><div>Пт</div><div className="text-slate-300">Сб</div><div className="text-slate-300">Вс</div>
              </div>
              <div className="grid grid-cols-7 text-center text-[14px] font-medium gap-y-4 text-slate-700">
                 {/* Visual static mock mapping to reference matching layout */}
                 <div className="text-slate-300">31</div><div>1</div><div>2</div><div>3</div><div>4</div><div>5</div><div>6</div>
                 <div>7</div><div>8</div>
                 <div className="relative flex justify-center">
                   <div className="w-8 h-8 bg-slate-900 text-white rounded-xl flex items-center justify-center font-bold shadow-md">9</div>
                 </div>
                 <div>10</div><div>11</div><div>12</div><div>13</div>
                 <div>14</div><div>15</div><div>16</div><div>17</div><div>18</div><div>19</div><div>20</div>
                 <div>21</div><div>22</div><div>23</div><div>24</div><div>25</div><div>26</div><div>27</div>
                 <div>28</div><div>29</div><div>30</div><div className="text-slate-300">1</div><div className="text-slate-300">2</div><div className="text-slate-300">3</div><div className="text-slate-300">4</div>
              </div>

              <div className="mt-6 flex items-center justify-between p-4 bg-purple-50 rounded-[14px]">
                 <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm text-[#7448FF] flex items-center justify-center shrink-0">
                      <CalendarIcon size={18} />
                    </div>
                    <div>
                      <div className="text-[14px] font-bold text-[#7448FF]">Сегодня, 9 сентября</div>
                      <div className="text-[12px] font-medium text-purple-400 mt-0.5">3 сессии · 1 отчет</div>
                    </div>
                 </div>
                 <ChevronRight size={18} className="text-purple-300" />
              </div>
            </div>

            {/* Upcoming Classes */}
            <div>
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-[16px] font-bold text-slate-900">Ближайшие занятия</h3>
                 <span className="text-[12px] font-semibold text-[#7448FF] cursor-pointer">Показать все</span>
              </div>
              
              <div className="space-y-3">
                 {sessions.filter(s => s.status === 'active' || s.status === 'draft').slice(0, 2).map((s, i) => (
                    <div key={s.id || i} className="bg-white border border-slate-100 rounded-[16px] p-4 flex items-start justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                       <div className="flex items-start gap-4">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", s.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600")}>
                             {s.status === 'active' ? <Video size={18} /> : <Database size={18} />}
                          </div>
                          <div>
                            <div className="text-[12px] font-semibold text-slate-500 mb-0.5">Сегодня, {new Date(s.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
                            <div className="text-[14px] font-bold text-slate-900 leading-tight">{s.title}</div>
                            <div className="text-[12px] text-slate-500 mt-0.5">Группа {s.group || "Без группы"}</div>
                          </div>
                       </div>
                       <StatusBadge status={s.status} />
                    </div>
                 ))}
                 
                 {/* Fallback if no real upcoming found */}
                 {sessions.filter(s => s.status === 'active' || s.status === 'draft').length === 0 && !loading && (
                    <div className="text-[13px] text-slate-500 p-4 border border-slate-100 rounded-[16px] text-center bg-white">
                      Нет запланированных занятий
                    </div>
                 )}
              </div>
            </div>

            {/* Recent Reports Widget */}
            <div>
              <div className="flex items-center justify-between mb-4">
                 <h3 className="text-[16px] font-bold text-slate-900">Недавние отчёты</h3>
                 <Link href="/teacher/reports" className="text-[12px] font-semibold text-[#7448FF]">Смотреть все</Link>
              </div>
              
              <div className="space-y-3">
                 <div className="bg-white border border-slate-100 rounded-[16px] p-4 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-slate-200 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><ClipboardList size={18} /></div>
                       <div>
                         <div className="text-[13px] font-bold text-slate-900 leading-tight">Еженедельный отчёт</div>
                         <div className="text-[11px] font-medium text-slate-400 mt-1">8 сентября 2026</div>
                       </div>
                    </div>
                    <Download size={16} className="text-slate-300 group-hover:text-[#7448FF] transition-colors" />
                 </div>
                 
                 <div className="bg-white border border-slate-100 rounded-[16px] p-4 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-slate-200 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0"><Users size={18} /></div>
                       <div>
                         <div className="text-[13px] font-bold text-slate-900 leading-tight">Отчёт по успеваемости</div>
                         <div className="text-[11px] font-medium text-slate-400 mt-1">7 сентября 2026</div>
                       </div>
                    </div>
                    <Download size={16} className="text-slate-300 group-hover:text-[#7448FF] transition-colors" />
                 </div>

                 <div className="bg-white border border-slate-100 rounded-[16px] p-4 flex items-center justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-slate-200 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><BarChart2 size={18} /></div>
                       <div>
                         <div className="text-[13px] font-bold text-slate-900 leading-tight">Анализ эффективности</div>
                         <div className="text-[11px] font-medium text-slate-400 mt-1">6 сентября 2026</div>
                       </div>
                    </div>
                    <Download size={16} className="text-slate-300 group-hover:text-[#7448FF] transition-colors" />
                 </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}