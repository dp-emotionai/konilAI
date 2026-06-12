"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { getStudentSessionsList, type StudentSessionRow } from "@/lib/api/student";
import { getApiBaseUrl, hasAuth } from "@/lib/api/client";
import { 
  VideoIcon, 
  Search, 
  ListFilter,
  MoreVertical,
  CalendarDays,
  ShieldCheck,
  Code2,
  Database
} from "lucide-react";

type TabOption = "all" | "live" | "upcoming" | "ended";

const getIconForTitle = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes("разработ") || t.includes("web") || t.includes("программир")) {
    return { icon: Code2, bg: "bg-rose-50", text: "text-rose-500" };
  }
  if (t.includes("баз") || t.includes("данн") || t.includes("sql") || t.includes("db")) {
    return { icon: Database, bg: "bg-sky-50", text: "text-sky-500" };
  }
  if (t.includes("безопасно") || t.includes("sec")) {
    return { icon: ShieldCheck, bg: "bg-emerald-50", text: "text-emerald-500" };
  }
  return { icon: VideoIcon, bg: "bg-purple-50", text: "text-purple-600" };
};

export default function StudentSessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<StudentSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabOption>("all");
  const apiAvailable = Boolean(getApiBaseUrl() && hasAuth());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getStudentSessionsList();
      setSessions(list);
    } catch (e) {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (apiAvailable) {
      void load();
    } else {
      setLoading(false);
    }
  }, [apiAvailable, load]);

  const filteredSessions = useMemo(() => {
    let filtered = sessions;
    if (activeTab !== "all") {
      filtered = filtered.filter(s => s.status === activeTab);
    }
    if (search.trim()) {
      const qs = search.toLowerCase();
      filtered = filtered.filter(s => 
        s.title.toLowerCase().includes(qs) || 
        s.teacher?.toLowerCase().includes(qs)
      );
    }
    return filtered;
  }, [sessions, activeTab, search]);

  return (
    <div className="min-h-screen bg-[#FAFAFB]">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8 py-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Сессии
            </h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 flex gap-6 overflow-x-auto no-scrollbar">
          {(
            [
              { id: "all", label: "Все сессии" },
              { id: "live", label: "Активные" },
              { id: "upcoming", label: "Запланированные" },
              { id: "ended", label: "Завершенные" },
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "pb-3 text-[14px] font-medium transition-colors border-b-2 whitespace-nowrap",
                activeTab === tab.id 
                  ? "border-[#7448FF] text-slate-900" 
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Поиск по сессиям, группам или преподавателям..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-purple-500/20 shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-shadow"
            />
          </div>
          <button className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-medium text-slate-600 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:bg-slate-50 transition-colors w-full sm:w-auto">
            <ListFilter size={16} />
            Фильтры
          </button>
        </div>

        {/* Session List */}
        <div className="space-y-3">
          {loading ? (
             <div className="py-20 flex justify-center"><div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-[#7448FF] animate-spin"></div></div>
          ) : filteredSessions.length > 0 ? (
            filteredSessions.map((s) => {
              const IconData = getIconForTitle(s.title);
              const SIcon = IconData.icon;
              return (
                <div key={s.id} className="bg-white border border-slate-100 rounded-[20px] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] transition-shadow">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", IconData.bg, IconData.text)}>
                      <SIcon size={24} strokeWidth={2} />
                    </div>
                    <div className="min-w-0 pr-4">
                      <h3 className="text-[15px] font-semibold text-slate-900 truncate">{s.title}</h3>
                      <div className="flex items-center gap-2 text-[13px] text-slate-500 mt-1 truncate">
                        <span>Преподаватель: {s.teacher || "Не указан"}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1.5"><CalendarDays size={12} className="text-slate-400"/> {s.date || "Дата не указана"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-center gap-6 shrink-0 border-t md:border-t-0 pt-4 md:pt-0 border-slate-50">
                    <div className="flex flex-col items-center justify-center min-w-[120px]">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider mb-2",
                        s.status === 'live' ? 'bg-emerald-50 text-emerald-600' : 
                        s.status === 'upcoming' ? 'bg-amber-50 text-amber-600' : 
                        'bg-slate-50 text-slate-500'
                      )}>
                        {s.status === 'live' ? 'Активная' : s.status === 'upcoming' ? 'Запланирована' : 'Завершена'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => router.push(`/student/session/${s.id}`)}
                        className={cn("px-6 py-2.5 rounded-xl font-medium text-sm transition-colors", 
                          s.status === 'live' ? "bg-[#7448FF] hover:bg-[#623ce6] text-white" : 
                          "bg-slate-50 text-slate-700 hover:bg-slate-100"
                        )}>
                        {s.status === 'live' ? 'Открыть' : s.status === 'ended' ? 'Отчёт' : 'Открыть'}
                      </button>
                      <button className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors shrink-0">
                        <MoreVertical size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-20 text-center text-slate-500 text-[15px]">
              Не найдено сессий, удовлетворяющих заданным критериям.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
