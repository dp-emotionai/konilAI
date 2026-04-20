"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import { useUI } from "@/components/layout/Providers";
import { cn } from "@/lib/cn";
import {
  getStudentSessionsList,
  getInvitations,
  acceptInvitation,
  declineInvitation,
  getStudentGroups,
  type StudentSessionRow,
  type InvitationRow,
  type StudentGroupRow,
} from "@/lib/api/student";
import { getApiBaseUrl, getStoredAuth, hasAuth } from "@/lib/api/client";
import {
  VideoIcon,
  Users2,
  CalendarDays,
  MenuSquare,
  MessageSquare,
  ArrowRight,
  Lock,
  ChevronRight,
  Bell,
  Clock,
  LogOut
} from "lucide-react";

export default function StudentDashboardPage() {
  const { state } = useUI();
  const [sessions, setSessions] = useState<StudentSessionRow[]>([]);
  const [groups, setGroups] = useState<StudentGroupRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(true);
  
  const apiAvailable = getApiBaseUrl() && hasAuth();
  const [displayName, setDisplayName] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sData, gData, iData] = await Promise.all([
        getStudentSessionsList(),
        getStudentGroups(),
        getInvitations()
      ]);
      setSessions(sData);
      setGroups(gData);
      setInvitations(iData);
    } catch {
      // Keep empty logic if err
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (apiAvailable) {
      fetchAll();
    } else {
      setLoading(false);
    }
  }, [apiAvailable, fetchAll]);

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth?.name) setDisplayName(auth.name);
    else if (auth?.email) setDisplayName(auth.email.split("@")[0] || auth.email);
  }, []);

  const upcoming = useMemo(() => sessions.filter((s) => s.status === "upcoming").slice(0, 3), [sessions]);
  const live = useMemo(() => sessions.filter((s) => s.status === "live"), [sessions]);
  const ended = useMemo(() => sessions.filter((s) => s.status === "ended").slice(0, 4), [sessions]);

  // Calendar simplified mock for layout
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDayIndex = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const dayOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Mon to Sun

  return (
    <div className="min-h-screen bg-[#FAFAFB]">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8 py-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Привет, {displayName ?? "Алишер"}! <span className="animate-[wave_2.5s_ease-in-out_2]">👋</span>
            </h1>
            <p className="mt-1.5 text-[15px] text-slate-500">
              Продолжай учиться и достигай новых целей!
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8 items-start">
          
          {/* Main Column */}
          <div className="space-y-8 min-w-0">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-3xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col justify-between h-[120px]">
                <div className="flex items-start gap-3 text-slate-600">
                  <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                    <VideoIcon size={20} strokeWidth={2.5} />
                  </div>
                  <span className="font-medium text-[13px] my-auto">Мои сессии</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-slate-900">{sessions.length}</span>
                  <span className="text-xs font-medium text-purple-600 px-2 py-0.5 rounded-full bg-purple-50">
                    {live.length} активные
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col justify-between h-[120px]">
                <div className="flex items-start gap-3 text-slate-600">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <Users2 size={20} strokeWidth={2.5} />
                  </div>
                  <span className="font-medium text-[13px] my-auto">Мои группы</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-slate-900">{groups.length}</span>
                </div>
              </div>

              {/* Graceful empty placeholders matching design */}
              <div className="bg-white rounded-3xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col justify-between h-[120px] opacity-70">
                <div className="flex items-start gap-3 text-slate-400">
                  <div className="p-2 rounded-xl bg-slate-50 text-slate-500">
                    <MenuSquare size={20} strokeWidth={2.5} />
                  </div>
                  <span className="font-medium text-[13px] my-auto">Задания</span>
                </div>
                <div className="text-xs text-slate-400 mb-1">
                  Нет данных API
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col justify-between h-[120px] opacity-70">
                <div className="flex items-start gap-3 text-slate-400">
                  <div className="p-2 rounded-xl bg-slate-50 text-slate-500">
                    <CalendarDays size={20} strokeWidth={2.5} />
                  </div>
                  <span className="font-medium text-[13px] my-auto">Расписание</span>
                </div>
                <div className="text-xs text-slate-400 mb-1">
                  В разработке
                </div>
              </div>
            </div>

            {/* Quick Access Grids */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[15px] text-slate-900">Ближайшие занятия</h3>
                  <Link href="/student/sessions" className="text-xs font-medium text-purple-600 hover:opacity-80">
                    Смотреть все
                  </Link>
                </div>
                <div className="bg-white border text-sm border-slate-100 rounded-3xl p-2 space-y-1 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                  {upcoming.length > 0 || live.length > 0 ? (
                    [...live, ...upcoming].slice(0, 2).map((s, idx) => (
                      <div key={s.id} className={cn("flex items-center justify-between p-3 rounded-2xl", idx === 0 && "bg-slate-50/50")}>
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-xl", s.status === 'live' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500')}>
                            <VideoIcon size={16} />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 truncate max-w-[150px]">{s.title}</div>
                            <div className="text-xs text-slate-400 truncate max-w-[150px]">{s.teacher}</div>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <span className="text-xs text-slate-500">{s.date || 'Сегодня'}</span>
                          {s.status === 'live' ? <span className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wide mt-0.5">Сейчас</span> : <span className="text-[10px] font-medium text-amber-500 mt-0.5">Запланировано</span>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 py-8 text-center text-slate-400 text-xs">Нет предстоящих занятий</div>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-[15px] text-slate-900">Приглашения <span className="ml-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px]">{invitations.length}</span></h3>
                </div>
                <div className="bg-white border text-sm border-slate-100 rounded-3xl p-2 space-y-1 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                  {invitations.length > 0 ? (
                    invitations.slice(0, 2).map((inv, idx) => (
                      <div key={inv.id} className={cn("flex items-center justify-between p-3 rounded-2xl", idx === 0 && "bg-slate-50/50")}>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-blue-50 text-blue-500">
                            <Users2 size={16} />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 truncate max-w-[120px]">{inv.groupName || 'Группа'}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">Требуется реакция</div>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                           <button onClick={() => declineInvitation(inv.id).then(fetchAll)} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-medium transition">Отклонить</button>
                           <button onClick={() => acceptInvitation(inv.id).then(fetchAll)} className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium transition">Принять</button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 py-8 text-center text-slate-400 text-xs">Нет активных приглашений</div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Access Buttons */}
            <div>
              <h3 className="font-semibold text-[15px] text-slate-900 mb-4">Быстрый доступ</h3>
              <div className="grid grid-cols-3 gap-3">
                 <Link href="/student/resources" className="bg-gradient-to-br from-[#7448FF] to-[#8c67fd] text-white p-4 rounded-3xl flex flex-col justify-between h-[90px] hover:shadow-lg transition-shadow relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                      <MenuSquare size={40} />
                   </div>
                   <div className="flex items-center gap-2 font-medium text-sm">
                     <span className="p-1.5 bg-white/20 rounded-lg"><MenuSquare size={14} /></span>
                     Мои материалы
                   </div>
                   <div className="flex items-center justify-between text-xs text-white/80">
                     Перейти к материалам
                     <ArrowRight size={14} />
                   </div>
                 </Link>
                 
                 <Link href="/student/calendar" className="bg-[#EBF2FF] text-[#1D4ED8] p-4 rounded-3xl flex flex-col justify-between h-[90px] border border-blue-50 hover:shadow-md transition-shadow relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                      <CalendarDays size={40} />
                   </div>
                   <div className="flex items-center gap-2 font-medium text-sm text-slate-900">
                     <span className="p-1.5 bg-blue-500 text-white rounded-lg"><CalendarDays size={14} /></span>
                     Календарь
                   </div>
                   <div className="flex items-center justify-between text-xs text-slate-500">
                     Посмотреть расписание
                     <ArrowRight size={14} />
                   </div>
                 </Link>

                 <Link href="/student/messages" className="bg-[#FFF4ED] text-[#C2410C] p-4 rounded-3xl flex flex-col justify-between h-[90px] border border-orange-50 hover:shadow-md transition-shadow relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                      <MessageSquare size={40} />
                   </div>
                   <div className="flex items-center gap-2 font-medium text-sm text-slate-900">
                     <span className="p-1.5 bg-orange-500 text-white rounded-lg"><MessageSquare size={14} /></span>
                     Сообщения
                   </div>
                   <div className="flex items-center justify-between text-xs text-slate-500">
                     Написать преподавателю
                     <ArrowRight size={14} />
                   </div>
                 </Link>
              </div>
            </div>

            {/* Sessions Table block */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[15px] text-slate-900">Мои сессии</h3>
                <Link href="/student/sessions" className="text-xs font-medium text-purple-600 hover:opacity-80">
                  Смотреть все
                </Link>
              </div>

              <div className="bg-white border text-sm border-slate-100 rounded-3xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
                <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-50 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  <div className="col-span-4">Сессия</div>
                  <div className="col-span-2">Тип</div>
                  <div className="col-span-3">Время</div>
                  <div className="col-span-2">Статус</div>
                  <div className="col-span-1 min-w-[50px] text-right"></div>
                </div>

                <div className="divide-y divide-slate-50">
                  {sessions.length > 0 ? (
                    sessions.slice(0, 5).map(s => (
                      <div key={s.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center group hover:bg-slate-50/50 transition-colors">
                        <div className="col-span-4 flex items-center gap-3">
                          <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", s.status === 'live' ? 'bg-emerald-500' : s.status === 'upcoming' ? 'bg-amber-400' : 'bg-slate-300')} />
                          <div className="font-medium text-slate-900 truncate">{s.title}</div>
                        </div>
                        <div className="col-span-2 text-slate-500 text-xs truncate">
                          {s.type === 'exam' ? 'Экзамен' : 'Лекция'}
                        </div>
                        <div className="col-span-3 text-slate-500 text-xs">
                          {s.date || "Не указано"}
                        </div>
                        <div className="col-span-2">
                           <span className={cn("px-2.5 py-1 text-[10px] font-medium rounded-full", s.status === 'live' ? 'bg-emerald-50 text-emerald-600' : s.status === 'upcoming' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500')}>
                             {s.status === 'live' ? 'Активная' : s.status === 'upcoming' ? 'Предстоит' : 'Завершена'}
                           </span>
                        </div>
                        <div className="col-span-1 text-right flex justify-end">
                           <Link href={`/student/session/${s.id}`} className="text-xs font-medium text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
                             Перейти
                           </Link>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-slate-400 text-sm">
                      Вы пока не прикреплены к активным сессиям
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Right Column */}
          <div className="space-y-6">
            
            {/* Calendar Widget */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
               <div className="flex items-center justify-between mb-4">
                 <button className="text-slate-400 hover:text-slate-900"><ChevronRight size={16} className="rotate-180" /></button>
                 <span className="text-[13px] font-semibold text-slate-900 uppercase">
                   {today.toLocaleString('ru', { month: 'long' }).replace("ь", "я")} <span className="font-medium text-slate-500">{today.getFullYear()}</span>
                 </span>
                 <button className="text-slate-400 hover:text-slate-900"><ChevronRight size={16} /></button>
               </div>
               
               <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase font-medium text-slate-400 mb-2">
                 <span>Пн</span><span>Вт</span><span>Ср</span><span>Чт</span><span>Пт</span><span>Сб</span><span>Вс</span>
               </div>
               
               <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-600">
                 {Array.from({ length: dayOffset }).map((_, i) => (
                   <span key={`prev-${i}`} className="p-1.5 opacity-30"></span>
                 ))}
                 {Array.from({ length: daysInMonth }).map((_, i) => (
                   <span key={i} className={cn("p-1.5 rounded-lg flex items-center justify-center cursor-default hover:bg-slate-100", (i+1) === today.getDate() && "bg-[#7448FF] text-white")}>
                     {i + 1}
                   </span>
                 ))}
               </div>
               
               <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-purple-600">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={14} />
                    <span>Сегодня: {today.getDate()} {today.toLocaleString('ru', { month: 'long' }).replace("ь", "я")}</span>
                  </div>
                  <ChevronRight size={14} />
               </div>
            </div>

            {/* Notifications / Activity */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
               <div className="flex items-center justify-between mb-5">
                 <h3 className="font-semibold text-[14px] text-slate-900">Уведомления</h3>
               </div>

               <div className="py-6 flex flex-col items-center justify-center text-slate-400">
                 <Bell size={24} className="mb-3 text-slate-300" strokeWidth={1.5} />
                 <div className="text-xs font-medium text-center">Нет новых уведомлений</div>
                 <div className="text-[10px] text-slate-300 mt-1">Ожидайте новых сообщений системы</div>
               </div>
            </div>

            <div className="text-[11px] text-slate-400 px-2 flex flex-col gap-1.5 items-center text-center">
              <div>© 2026 KonilAI. Все права защищены.</div>
              <div className="flex items-center justify-center gap-4">
                <Link href="#" className="hover:text-slate-600">Поддержка</Link>
                <Link href="#" className="hover:text-slate-600">Документация</Link>
                <Link href="#" className="hover:text-slate-600">Политика</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
