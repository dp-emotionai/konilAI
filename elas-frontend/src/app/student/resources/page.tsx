"use client";

import { useState } from "react";
import { 
  FileText, 
  Search, 
  ListFilter,
  Download,
  FolderOpen
} from "lucide-react";
import { cn } from "@/lib/cn";

export default function StudentResourcesPage() {
  const [activeTab, setActiveTab] = useState<"all" | "materials" | "homework">("all");
  const [search, setSearch] = useState("");

  return (
    <div className="min-h-screen bg-[#FAFAFB]">
      <div className="mx-auto max-w-[1440px] px-4 md:px-8 py-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Материалы
            </h1>
            <p className="mt-1.5 text-[15px] text-slate-500">
              Учебные файлы, презентации и полезные ресурсы
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 flex gap-6 overflow-x-auto no-scrollbar">
          {(
            [
              { id: "all", label: "Все файлы" },
              { id: "materials", label: "Лекции и презентации" },
              { id: "homework", label: "Задания" },
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
              placeholder="Поиск по названию файла..." 
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

        {/* Empty State Container */}
        <div className="bg-white border text-sm border-slate-100 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden min-h-[400px] flex flex-col items-center justify-center p-8 text-center text-slate-400">
           <FolderOpen size={64} strokeWidth={1} className="mb-6 text-slate-200" />
           <h3 className="text-xl font-bold text-slate-900 mb-2">Здесь пока пусто</h3>
           <p className="text-[15px] font-medium text-slate-500 mb-6 max-w-sm">
             Здесь будут отображаться презентации, конспекты и дополнительные файлы от ваших преподавателей.
           </p>
           <button className="px-6 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium rounded-xl transition-colors select-none pointer-events-none opacity-50 flex items-center gap-2">
             <Download size={16} />
             Скачать архивом
           </button>
        </div>

      </div>
    </div>
  );
}
