"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { getTeacherGroups, createGroup, type TeacherGroup } from "@/lib/api/teacher";
import { hasAuth, getApiBaseUrl } from "@/lib/api/client";
import { Users, Plus, Search, LayoutGrid, List } from "lucide-react";
import Modal from "@/components/ui/Modal";

function StatusBadge({ status }: { status: "active" | "planned" | "ended" }) {
  if (status === "active") return <span className="inline-flex bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-[6px] text-[11px] font-bold uppercase tracking-wide">Активная</span>;
  if (status === "planned") return <span className="inline-flex bg-orange-50 text-orange-600 px-2.5 py-1 rounded-[6px] text-[11px] font-bold uppercase tracking-wide">Запланирована</span>;
  return <span className="inline-flex bg-[#F4F1FF] text-[#7448FF] px-2.5 py-1 rounded-[6px] text-[11px] font-bold uppercase tracking-wide">Завершена</span>;
}

export default function TeacherGroupsPage() {
  const [q, setQ] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  const [apiGroups, setApiGroups] = useState<TeacherGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Group creation modal state
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creating, setCreating] = useState(false);

  const apiAvailable = getApiBaseUrl() && hasAuth();

  useEffect(() => {
    let mounted = true;
    async function refresh() {
      if (!apiAvailable) { setLoading(false); return; }
      try {
        const list = await getTeacherGroups();
        if (mounted) setApiGroups(list);
      } catch (e) {
        if (mounted) setApiGroups([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    refresh();
    return () => { mounted = false; };
  }, [apiAvailable, showCreate]);

  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await createGroup(name);
      setNewGroupName("");
      setShowCreate(false);
    } catch (e) {} finally {
      setCreating(false);
    }
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return apiGroups.filter((g) => {
      if (!s) return true;
      return g.name.toLowerCase().includes(s);
    });
  }, [apiGroups, q]);

  // Derive stable dummy stats since backend doesn't return full details out of the box in this route
  function deriveMockStatus(name: string): "active"| "planned"| "ended" {
     const t = name.toLowerCase();
     if (t.includes("ai") || t.includes("web-301")) return "planned";
     if (t.includes("ds-") || t.includes("101")) return "ended";
     return "active";
  }

  function hashStudents(name: string) {
     return 16 + (name.length % 15);
  }

  function getProgramName(name: string) {
    const t = name.toLowerCase();
    if (t.includes('cs')) return "Компьютерные науки";
    if (t.includes('db')) return "Базы данных";
    if (t.includes('web')) return "Веб-разработка";
    if (t.includes('ai')) return "Искусственный интеллект";
    if (t.includes('net')) return "Компьютерные сети";
    if (t.includes('ds')) return "Структуры данных";
    return "Общий курс";
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#FAFAFB] pt-8 md:pt-12 pb-16">
      <div className="mx-auto max-w-[1240px] px-4 md:px-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-[32px] font-bold tracking-tight text-slate-900 mb-6">Группы</h1>
          </div>

          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7448FF] text-white text-[14px] font-bold rounded-xl hover:bg-[#623ce6] transition-colors shadow-sm self-start md:self-auto shrink-0 mb-1">
            <Plus size={18} /> Добавить группу
          </button>
        </div>

        {/* Search & View Toggle */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 w-full max-w-xl">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по группам..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[14px] outline-none hover:border-slate-300 focus:border-[#7448FF] transition-colors shadow-sm"
            />
          </div>
          
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm shrink-0">
             <button 
               onClick={() => setViewMode('grid')}
               className={cn("p-1.5 rounded-lg transition-colors", viewMode === 'grid' ? "bg-purple-50 text-[#7448FF]" : "text-slate-400 hover:text-slate-700")}
             >
               <LayoutGrid size={18} />
             </button>
             <button 
               onClick={() => setViewMode('list')}
               className={cn("p-1.5 rounded-lg transition-colors", viewMode === 'list' ? "bg-purple-50 text-[#7448FF]" : "text-slate-400 hover:text-slate-700")}
             >
               <List size={18} />
             </button>
          </div>
        </div>

        {/* Catalog */}
        <div className={cn("grid gap-5", viewMode === 'grid' ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3")}>
          
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-surface-subtle/50 h-[180px] rounded-[24px] animate-pulse" />
            ))
          ) : (
             filtered.map((g) => (
                <Link key={g.id} href={`/teacher/group/${g.id}`} className="block h-full cursor-pointer focus-visible:outline-none">
                  <div className="bg-white border border-slate-100 rounded-[24px] p-6 h-full shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-slate-200 hover:shadow-md transition-all flex flex-col justify-between">
                     <div>
                       <h3 className="text-[17px] font-bold text-slate-900 leading-tight">{g.name}</h3>
                       <div className="text-[13px] font-medium text-slate-500 mt-1">{getProgramName(g.name)}</div>
                     </div>
                     <div className="mt-8 space-y-4">
                       <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-500">
                          <Users size={16} className="text-slate-400" />
                          {hashStudents(g.name)} студента
                       </div>
                       <div>
                         <StatusBadge status={deriveMockStatus(g.name)} />
                       </div>
                     </div>
                  </div>
                </Link>
             ))
          )}

          {/* Create Group Card Trigger */}
          <button onClick={() => setShowCreate(true)} className="min-h-[180px] bg-[#F4F1FF] rounded-[24px] border-2 border-dashed border-[#d1c4ff] flex flex-col items-center justify-center text-[#7448FF] hover:bg-[#ebe6ff] transition-colors cursor-pointer group hover:border-solid">
             <Plus size={40} className="mb-2 group-hover:scale-110 transition-transform" />
             <span className="font-bold text-[15px]">Новая группа</span>
          </button>
          
        </div>

        {filtered.length > 0 && (
          <div className="flex items-center justify-between mt-8 text-[13px] font-medium text-slate-500 max-w-[1240px]">
             <div>Показывать: <select className="bg-transparent font-bold text-slate-900 cursor-pointer outline-none"><option>10</option></select></div>
             <div>1–{filtered.length} из {filtered.length} групп</div>
          </div>
        )}

      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Создать новую группу">
         <div className="p-1">
            <p className="text-[14px] text-slate-500 mb-4">
              Введите название для новой группы. Затем вы сможете добавить в нее студентов.
            </p>
            <div className="space-y-4">
               <div>
                 <label className="text-[13px] font-semibold text-slate-700 mb-1 block">Название группы</label>
                 <input 
                   autoFocus
                   type="text" 
                   value={newGroupName}
                   onChange={e => setNewGroupName(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && handleCreateGroup()}
                   placeholder="Например: CS-705"
                   className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-[#7448FF] text-[14px]"
                 />
               </div>
               <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                 <button onClick={() => setShowCreate(false)} className="px-5 py-2.5 rounded-xl font-bold text-[14px] text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors">
                   Отмена
                 </button>
                 <button onClick={handleCreateGroup} disabled={creating || !newGroupName.trim()} className="px-5 py-2.5 rounded-xl font-bold text-[14px] text-white bg-[#7448FF] hover:bg-[#623ce6] disabled:opacity-50 transition-colors">
                   {creating ? 'Создание...' : 'Добавить'}
                 </button>
               </div>
            </div>
         </div>
      </Modal>

    </div>
  );
}
