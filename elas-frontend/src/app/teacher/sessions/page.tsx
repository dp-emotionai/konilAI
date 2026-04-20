"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

import { getTeacherAllSessions, updateSessionStatus, type GroupSession } from "@/lib/api/teacher";
import { hasAuth, getApiBaseUrl } from "@/lib/api/client";

import {
  Search, Plus, Filter, MoreVertical, 
  Video, Code, Database, LayoutTemplate, ShieldCheck, PlayCircle, Users, Activity, BarChart, Calendar as CalendarIcon
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

type TabValue = "all" | "live" | "upcoming" | "ended";

const statusToBackend = (next: string): "active" | "finished" | "draft" =>
  next === "live" ? "active" : next === "ended" ? "finished" : "draft";

// Helper for dynamic coloring based on topic matching design mock
function getIconForTopic(title: string) {
  const t = title.toLowerCase();
  if (t.includes('алгоритм') || t.includes('код')) return { icon: Code, color: 'text-rose-500', bg: 'bg-rose-50' };
  if (t.includes('данных') || t.includes('баз')) return { icon: Database, color: 'text-emerald-500', bg: 'bg-emerald-50' };
  if (t.includes('безопасность')) return { icon: ShieldCheck, color: 'text-amber-500', bg: 'bg-amber-50' };
  if (t.includes('сеть')) return { icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' };
  if (t.includes('дизайн') || t.includes('веб')) return { icon: LayoutTemplate, color: 'text-[#7448FF]', bg: 'bg-indigo-50' };
  return { icon: PlayCircle, color: 'text-blue-500', bg: 'bg-blue-50' };
}

export default function TeacherSessionsPage() {
  const router = useRouter();
  const [tick, setTick] = useState(0);
  const [sessions, setSessions] = useState<GroupSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [confirmEndSession, setConfirmEndSession] = useState<GroupSession | null>(null);

  const [q, setQ] = useState("");
  const [activeTab, setActiveTab] = useState<TabValue>("all");

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTeacherAllSessions();
      setSessions(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions, tick]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return sessions.filter((it) => {
      if (activeTab !== "all") {
        if (activeTab === "live" && it.status !== "live") return false;
        if (activeTab === "ended" && it.status !== "ended") return false;
        if (activeTab === "upcoming" && it.status !== "upcoming") return false;
      }
      if (!s) return true;
      return `${it.title} ${it.groupId}`.toLowerCase().includes(s);
    });
  }, [sessions, q, activeTab]);

  const handleLifecycle = async (s: GroupSession) => {
    const action = s.status === "upcoming" ? { next: "live" as const } : s.status === "live" ? { next: "ended" as const } : { next: "upcoming" as const };
    setActioningId(s.id);
    setConfirmEndSession(null);
    try {
      await updateSessionStatus(s.id, statusToBackend(action.next));
      setTick((x) => x + 1);
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#FAFAFB] pt-8 md:pt-12 pb-16">
      <div className="mx-auto max-w-[1240px] px-4 md:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-[32px] font-bold tracking-tight text-slate-900 mb-6">Сессии</h1>
            <div className="flex items-center gap-6 border-b border-slate-200">
              {[
                { id: "all", label: "Все сессии" },
                { id: "live", label: "Активные" },
                { id: "upcoming", label: "Запланированные" },
                { id: "ended", label: "Завершённые" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabValue)}
                  className={cn(
                    "pb-3 text-[14px] font-bold transition-colors relative",
                    activeTab === tab.id ? "text-[#7448FF]" : "text-slate-400 hover:text-slate-700"
                  )}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 w-full h-[3px] bg-[#7448FF] rounded-t-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <Link href="/teacher/sessions/new" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7448FF] text-white text-[14px] font-bold rounded-xl hover:bg-[#623ce6] transition-colors shadow-sm self-start md:self-auto shrink-0 mb-1">
            <Plus size={18} /> Создать сессию
          </Link>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-xl">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по сессиям..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[14px] outline-none hover:border-slate-300 focus:border-[#7448FF] transition-colors shadow-sm"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[14px] font-bold text-[#7448FF] hover:bg-slate-50 transition-colors shadow-sm">
             <Filter size={16} /> Фильтры
          </button>
        </div>

        {/* List */}
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-surface-subtle/50 rounded-[16px] animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-[20px] border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
               <Video size={48} className="mx-auto text-slate-200 mb-4" />
               <h3 className="text-lg font-bold text-slate-900">Ничего не найдено</h3>
               <p className="text-slate-500 mt-1 max-w-sm mx-auto text-[14px]">
                 Вы пока не создали ни одной сессии в этой категории, либо поиск не дал результатов.
               </p>
            </div>
          ) : (
            filtered.map((s) => {
              const { icon: Icon, bg, color } = getIconForTopic(s.title);
              
              const isLive = s.status === 'live';
              const isUpcoming = s.status === 'upcoming';
              const isEnded = s.status === 'ended';

              const progressW = isEnded ? 100 : isLive ? '71' : 0;
              const participants = isUpcoming ? 24 : isLive ? 32 : 21; 

              return (
                <div key={s.id} className="group flex flex-col md:flex-row items-start md:items-center justify-between p-5 bg-white rounded-[16px] border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-slate-200 hover:shadow-md transition-all gap-4">
                  
                  {/* Left: Info */}
                  <div className="flex items-center gap-5 min-w-[280px]">
                    <div className={cn("w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0", bg, color)}>
                      <Icon size={24} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-slate-900 leading-tight">{s.title}</h3>
                      <div className="text-[13px] font-medium text-slate-500 mt-0.5">Группа {s.groupId}</div>
                      <div className="text-[12px] text-slate-400 mt-0.5">
                        {isLive ? 'Сегодня, 10:00 - 11:30' : isUpcoming ? 'Завтра, 09:00 - 10:30' : 'Вчера, 10:00 - 11:00'}
                      </div>
                    </div>
                  </div>

                  {/* Center: Status & Metrics */}
                  <div className="flex items-center justify-between flex-1 md:w-[30%] min-w-[200px] md:mx-8">
                     <div>
                       {isLive && <span className="inline-block bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-[6px] text-[11px] font-bold uppercase tracking-wide mb-1">Активная</span>}
                       {isUpcoming && <span className="inline-block bg-orange-50 text-orange-600 px-2.5 py-1 rounded-[6px] text-[11px] font-bold uppercase tracking-wide mb-1">Запланирована</span>}
                       {isEnded && <span className="inline-block bg-[#F4F1FF] text-[#7448FF] px-2.5 py-1 rounded-[6px] text-[11px] font-bold uppercase tracking-wide mb-1">Завершена</span>}
                       <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-500">
                         <Users size={14} /> {participants} {isEnded ? 'участник' : isLive ? 'участника' : 'участников'}
                       </div>
                     </div>

                     {!isUpcoming ? (
                       <div className="w-48 hidden lg:block">
                         <div className="flex justify-between text-[13px] font-bold text-slate-900 mb-1.5">
                           {progressW}% <span className="text-slate-400 font-medium">Прогресс</span>
                         </div>
                         <div className="w-full bg-slate-100 rounded-full h-1.5">
                           <div className="bg-[#7448FF] h-1.5 rounded-full" style={{ width: `${progressW}%` }} />
                         </div>
                       </div>
                     ) : (
                       <div className="w-48 hidden lg:flex items-center text-slate-400 font-medium gap-2 text-[13px]">
                         <CalendarIcon size={16} /> 10 мая 2026, 09:00 - 10:30
                       </div>
                     )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    {isLive ? (
                      <Link href={`/teacher/session/${s.id}`} className="px-5 py-2.5 bg-[#7448FF] text-white shadow-sm font-bold text-[13px] rounded-xl hover:bg-[#623ce6] transition-colors">
                        Открыть
                      </Link>
                    ) : isUpcoming ? (
                      <Link href={`/teacher/session/${s.id}`} className="px-5 py-2.5 bg-white border border-slate-200 text-[#7448FF] font-bold text-[13px] rounded-xl hover:bg-slate-50 shadow-sm transition-colors">
                        Продолжить
                      </Link>
                    ) : (
                      <Link href={`/teacher/session/${s.id}/analytics`} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold text-[13px] rounded-xl hover:bg-slate-50 shadow-sm transition-colors cursor-pointer">
                        Смотреть отчёт
                      </Link>
                    )}
                    <button className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                       <MoreVertical size={16} />
                    </button>
                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* Pagination mock */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between mt-8 text-[13px] font-medium text-slate-500">
             <div>
               Показывать: <select className="bg-transparent font-bold text-slate-900 cursor-pointer outline-none"><option>10</option></select>
             </div>
             <div>1–{filtered.length < 10 ? filtered.length : 10} из {filtered.length} сессий</div>
             <div className="flex items-center gap-1">
               <button className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-50">{"<"}</button>
               <button className="w-8 h-8 bg-[#7448FF] text-white rounded-lg flex items-center justify-center shadow-sm">1</button>
               <button className="w-8 h-8 bg-white text-slate-700 border border-transparent rounded-lg flex items-center justify-center shadow-none hover:bg-slate-100">2</button>
               <button className="w-8 h-8 bg-white text-slate-700 border border-transparent rounded-lg flex items-center justify-center shadow-none hover:bg-slate-100">3</button>
               <button className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-50">{">"}</button>
             </div>
          </div>
        )}

      </div>

      <Modal
        open={!!confirmEndSession}
        onClose={() => setConfirmEndSession(null)}
        title="Завершить сессию?"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmEndSession(null)}>Отмена</Button>
            <Button className="bg-red-500 hover:bg-red-600" onClick={() => confirmEndSession && void handleLifecycle(confirmEndSession)}>
              Завершить
            </Button>
          </div>
        }
      >
        {confirmEndSession && (
          <p className="text-sm text-slate-500">
            Сессия «{confirmEndSession.title}» будет завершена. Участники будут отключены. Отменить невозможно.
          </p>
        )}
      </Modal>

    </div>
  );
}
