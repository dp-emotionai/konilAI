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
  Search,
  LayoutGrid,
  List,
  UserCircle2,
  BarChart2,
  CalendarDays,
} from "lucide-react";

const getIconForGroup = (name: string) => {
  const title = name.toLowerCase();
  if (title.includes("web") || title.includes("cs")) {
    return { icon: Code2, bg: "bg-purple-50", text: "text-purple-600" };
  }
  if (title.includes("db") || title.includes("sql") || title.includes("баз")) {
    return { icon: Database, bg: "bg-sky-50", text: "text-sky-500" };
  }
  if (title.includes("sec") || title.includes("безопасно")) {
    return { icon: ShieldCheck, bg: "bg-emerald-50", text: "text-emerald-500" };
  }
  if (title.includes("ai") || title.includes("анализ")) {
    return { icon: BarChart2, bg: "bg-amber-50", text: "text-amber-500" };
  }
  return { icon: Code2, bg: "bg-rose-50", text: "text-rose-500" };
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
    const search = q.trim().toLowerCase();
    return apiGroups.filter(
      (group) =>
        !search ||
        group.name.toLowerCase().includes(search) ||
        (group.teacherFullName ?? group.teacher).toLowerCase().includes(search)
    );
  }, [apiGroups, q]);

  return (
    <div className="min-h-screen bg-[#FAFAFB]">
      <div className="mx-auto max-w-[1440px] space-y-8 px-4 py-8 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Группы</h1>
            <p className="mt-1.5 text-[15px] text-slate-500">
              Все ваши учебные группы
            </p>
          </div>
          <div>
            <button className="rounded-xl bg-[#7448FF] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#623ce6]">
              Все группы
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="relative w-full flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по группам..."
              value={q}
              onChange={(event) => setQ(event.target.value)}
              className="w-full rounded-2xl border border-slate-100 bg-white py-3 pl-11 pr-4 text-sm outline-none transition-shadow focus:ring-2 focus:ring-purple-500/20 shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
            />
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-2xl border border-slate-100 bg-white p-1 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors">
              <LayoutGrid size={18} />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600">
              <List size={18} />
            </button>
          </div>
        </div>

        <div>
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#7448FF]" />
            </div>
          ) : list.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {list.map((group) => {
                const iconData = getIconForGroup(group.name);
                const Icon = iconData.icon;

                return (
                  <div
                    key={group.id}
                    className="flex h-full flex-col rounded-[24px] border border-slate-100 bg-white p-6 text-sm shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-shadow hover:shadow-[0_8px_32px_rgba(0,0,0,0.05)]"
                  >
                    <div
                      className={cn(
                        "mb-4 flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px]",
                        iconData.bg,
                        iconData.text
                      )}
                    >
                      <Icon size={32} strokeWidth={2.5} />
                    </div>

                    <div className="mb-6 min-w-0 flex-1">
                      <h3 className="mb-1 truncate text-xl font-bold tracking-tight text-slate-900">
                        {group.name}
                      </h3>
                      <div className="mb-4 truncate text-[13px] text-slate-500">
                        Учебная группа ({group.sessionCount}{" "}
                        {group.sessionCount === 1
                          ? "сессия"
                          : group.sessionCount >= 2 && group.sessionCount <= 4
                          ? "сессии"
                          : "сессий"}
                        )
                      </div>

                      <div className="mb-5 flex flex-col gap-2 text-[12px] font-medium text-slate-500">
                        <div className="flex items-center gap-1.5 truncate">
                          <UserCircle2 size={14} className="text-slate-400" />
                          <span className="truncate">
                            {group.teacherFullName || group.teacher || "Преподаватель"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                          <CalendarDays size={14} className="text-slate-400" />
                          <span className="truncate">
                            {group.createdAt
                              ? `Добавлена ${new Date(group.createdAt).toLocaleDateString("ru-RU", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}`
                              : "Дата присоединения недоступна"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Link href={`/student/group/${group.id}`} className="block">
                      <button className="w-full shrink-0 rounded-xl bg-slate-50 py-3 text-[13px] font-medium text-[#7448FF] transition-colors hover:bg-slate-100">
                        Открыть
                      </button>
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-20 text-center text-[15px] text-slate-500">
              {q.trim()
                ? "Не найдено групп по этому запросу."
                : "У вас нет активных групп. Попросите преподавателя прислать приглашение."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
