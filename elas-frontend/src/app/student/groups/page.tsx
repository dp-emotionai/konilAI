"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { getApiBaseUrl, hasAuth } from "@/lib/api/client";
import { getStudentGroups, type StudentGroupRow } from "@/lib/api/student";
import { 
  Code2, 
  Database, 
  ShieldCheck,
  VideoIcon,
  Search,
  LayoutGrid,
  List,
  Users2,
  UserCircle2,
  BarChart2
} from "lucide-react";

const getIconForGroup = (name: string) => {
  const t = name.toLowerCase();
  if (t.includes("web") || t.includes("cs")) {
    return { icon: Code2, bg: "bg-purple-50", text: "text-purple-600", fill: "bg-purple-500" };
  }
  if (t.includes("db") || t.includes("sql") || t.includes("баз")) {
    return { icon: Database, bg: "bg-sky-50", text: "text-sky-500", fill: "bg-sky-500" };
  }
  if (t.includes("sec") || t.includes("безопасно")) {
    return { icon: ShieldCheck, bg: "bg-emerald-50", text: "text-emerald-500", fill: "bg-emerald-500" };
  }
  if (t.includes("ai") || t.includes("анализ")) {
    return { icon: BarChart2, bg: "bg-amber-50", text: "text-amber-500", fill: "bg-amber-500" };
  }
  return { icon: Code2, bg: "bg-rose-50", text: "text-rose-500", fill: "bg-rose-500" };
};

export default function StudentGroupsPage() {
  const [q, setQ] = useState("");
  const apiAvailable = getApiBaseUrl() && hasAuth();
  const [apiGroups, setApiGroups] = useState<StudentGroupRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!apiAvailable) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getStudentGroups()
      .then((data) => setApiGroups(data))
      .catch(() => setApiGroups([]))
      .finally(() => setLoading(false));
  }, [apiAvailable]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return apiGroups.filter((g) => !s || g.name.toLowerCase().includes(s) || (g.teacherFullName ?? g.teacher).toLowerCase().includes(s));
  }, [apiGroups, q]);

  return (
    <div className="min-h-screen bg-[#FAFAFB]">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8 py-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Группы
            </h1>
            <p className="mt-1.5 text-[15px] text-slate-500">
              Все ваши учебные группы
            </p>
          </div>
          <div>
             <button className="px-6 py-2.5 rounded-xl font-medium text-sm transition-colors bg-[#7448FF] hover:bg-[#623ce6] text-white">
               Все группы
             </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Поиск по группам..." 
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-purple-500/20 shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-shadow"
            />
          </div>
          <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-2xl p-1 shadow-[0_2px_12px_rgba(0,0,0,0.02)] shrink-0">
             <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors">
               <LayoutGrid size={18} />
             </button>
             <button className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
               <List size={18} />
             </button>
          </div>
        </div>

        {/* Groups Grid */}
        <div>
           {loading ? (
             <div className="py-20 flex justify-center"><div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-[#7448FF] animate-spin"></div></div>
           ) : list.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {list.map((g) => {
                  const IconData = getIconForGroup(g.name);
                  const Icon = IconData.icon;
                  // Fake progress for UX representation since backend doesn't provide
                  const randProgress = Math.floor(Math.random() * 40) + 40; 
                  
                  return (
                    <div key={g.id} className="bg-white border text-sm border-slate-100 rounded-[24px] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.05)] transition-shadow flex flex-col h-full">
                       <div className={cn("w-16 h-16 rounded-[20px] flex items-center justify-center shrink-0 mb-4", IconData.bg, IconData.text)}>
                          <Icon size={32} strokeWidth={2.5} />
                       </div>
                       
                       <div className="flex-1 min-w-0 mb-6">
                         <h3 className="text-xl font-bold tracking-tight text-slate-900 truncate mb-1">{g.name}</h3>
                         <div className="text-[13px] text-slate-500 truncate mb-4">Учебная группа ({g.sessionCount} сессий)</div>
                         
                         <div className="flex flex-row items-center gap-4 text-[12px] font-medium text-slate-500 mb-5">
                            <div className="flex items-center gap-1.5 truncate">
                              <Users2 size={14} className="text-slate-400" />
                              <span>20-30 студентов</span>
                            </div>
                            <div className="flex items-center gap-1.5 truncate">
                              <UserCircle2 size={14} className="text-slate-400" />
                              <span className="truncate">{g.teacherFullName || g.teacher || "Преподаватель"}</span>
                            </div>
                         </div>

                         {/* Progress bar mock representation */}
                         <div className="space-y-2 select-none pointer-events-none">
                            <div className="flex items-center justify-end">
                              <span className="text-[11px] font-semibold text-slate-400">{randProgress}% прогресс</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                               <div className={cn("h-full rounded-full", IconData.fill)} style={{ width: `${randProgress}%` }}></div>
                            </div>
                         </div>
                       </div>
                       
                       <Link href={`/student/group/${g.id}`} className="block">
                         <button className="w-full py-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-[#7448FF] font-medium text-[13px] transition-colors shrink-0">
                           Открыть
                         </button>
                       </Link>
                    </div>
                  );
                })}
             </div>
           ) : (
             <div className="py-20 text-center text-slate-500 text-[15px]">
                {q.trim() ? "Не найдено групп по этому запросу." : "У вас нет активных групп. Попросите преподавателя прислать приглашение."}
             </div>
           )}
        </div>

      </div>
    </div>
  );
}