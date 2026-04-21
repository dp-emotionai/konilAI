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

type MeRes = { id: string; email: string; role: string; fullName?: string | null; firstName?: string | null; lastName?: string | null };

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
        if (auth && mounted) setMe({ 
          id: "local", 
          email: auth.email, 
          role: auth.role, 
          fullName: auth.fullName,
          firstName: auth.firstName,
          lastName: auth.lastName
        });
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
  
  const firstName = me?.firstName || (me?.fullName ? me.fullName.split(" ")[0] : "Преподаватель");

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
              
              <div className="py-10 text-center bg-slate-50/50 border border-slate-100 rounded-2xl">
                 <CalendarIcon size={24} className="mx-auto text-slate-300 mb-3" />
                 <div className="text-[13px] font-medium text-slate-500">Полный календарь пока недоступен</div>
                 <div className="text-[11px] text-slate-400 mt-1">Отображаются только ближайшие сессии</div>
              </div>

              <div className="mt-6 flex items-center justify-between p-4 bg-purple-50 rounded-[14px]">
                 <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm text-[#7448FF] flex items-center justify-center shrink-0">
                      <CalendarIcon size={18} />
                    </div>
                    <div>
                      <div className="text-[14px] font-bold text-[#7448FF]">Запланировано</div>
                      <div className="text-[12px] font-medium text-purple-400 mt-0.5">{scheduledCount} сессии ожидают начала</div>
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
                 <div className="text-[13px] text-slate-500 p-4 border border-slate-100 rounded-[16px] text-center bg-white">
                    Нет недавно сформированных отчетов
                 </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}