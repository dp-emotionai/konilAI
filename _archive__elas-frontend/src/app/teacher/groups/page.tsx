"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { getTeacherGroups, createGroup, type TeacherGroup } from "@/lib/api/teacher";
import { hasAuth, getApiBaseUrl } from "@/lib/api/client";
import { Users, Plus, Search, LayoutGrid, List, CalendarDays } from "lucide-react";
import Modal from "@/components/ui/Modal";

export default function TeacherGroupsPage() {
  const [q, setQ] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [apiGroups, setApiGroups] = useState<TeacherGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creating, setCreating] = useState(false);

  const apiAvailable = getApiBaseUrl() && hasAuth();

  useEffect(() => {
    let mounted = true;
    async function refresh() {
      if (!apiAvailable) {
        setLoading(false);
        return;
      }
      try {
        const list = await getTeacherGroups();
        if (mounted) setApiGroups(list);
      } catch {
        if (mounted) setApiGroups([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    refresh();
    return () => {
      mounted = false;
    };
  }, [apiAvailable, showCreate]);

  const handleCreateGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await createGroup(name);
      setNewGroupName("");
      setShowCreate(false);
    } finally {
      setCreating(false);
    }
  };

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    return apiGroups.filter((group) => !search || group.name.toLowerCase().includes(search));
  }, [apiGroups, q]);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#FAFAFB] pb-16 pt-8 md:pt-12">
      <div className="mx-auto max-w-[1240px] px-4 md:px-8">
        <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="mb-6 text-[32px] font-bold tracking-tight text-slate-900">Группы</h1>
          </div>

          <button
            onClick={() => setShowCreate(true)}
            className="mb-1 inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-[#7448FF] px-5 py-2.5 text-[14px] font-bold text-white shadow-sm transition-colors hover:bg-[#623ce6] md:self-auto"
          >
            <Plus size={18} /> Добавить группу
          </button>
        </div>

        <div className="mb-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="relative w-full max-w-xl flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по группам..."
              value={q}
              onChange={(event) => setQ(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-[14px] outline-none transition-colors hover:border-slate-300 focus:border-[#7448FF] shadow-sm"
            />
          </div>

          <div className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "rounded-lg p-1.5 transition-colors",
                viewMode === "grid"
                  ? "bg-purple-50 text-[#7448FF]"
                  : "text-slate-400 hover:text-slate-700"
              )}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "rounded-lg p-1.5 transition-colors",
                viewMode === "list"
                  ? "bg-purple-50 text-[#7448FF]"
                  : "text-slate-400 hover:text-slate-700"
              )}
            >
              <List size={18} />
            </button>
          </div>
        </div>

        <div
          className={cn(
            "grid gap-5",
            viewMode === "grid"
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
          )}
        >
          {loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-[180px] rounded-[24px] bg-surface-subtle/50 animate-pulse"
              />
            ))
          ) : (
            filtered.map((group) => (
              <Link
                key={group.id}
                href={`/teacher/group/${group.id}`}
                className="block h-full cursor-pointer focus-visible:outline-none"
              >
                <div className="flex h-full flex-col justify-between rounded-[24px] border border-slate-100 bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all hover:border-slate-200 hover:shadow-md">
                  <div>
                    <h3 className="text-[17px] font-bold leading-tight text-slate-900">
                      {group.name}
                    </h3>
                    <div className="mt-1 text-[13px] font-medium text-slate-500">
                      Программа не указана в backend
                    </div>
                  </div>

                  <div className="mt-8 space-y-4">
                    <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-500">
                      <Users size={16} className="text-slate-400" />
                      {group.sessionCount ?? 0}{" "}
                      {(group.sessionCount ?? 0) === 1
                        ? "сессия"
                        : (group.sessionCount ?? 0) >= 2 && (group.sessionCount ?? 0) <= 4
                        ? "сессии"
                        : "сессий"}
                    </div>

                    <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-500">
                      <CalendarDays size={16} className="text-slate-400" />
                      {group.createdAt
                        ? `Создана ${new Date(group.createdAt).toLocaleDateString("ru-RU", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}`
                        : "Дата создания недоступна"}
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}

          <button
            onClick={() => setShowCreate(true)}
            className="group flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-[#d1c4ff] bg-[#F4F1FF] text-[#7448FF] transition-colors hover:border-solid hover:bg-[#ebe6ff]"
          >
            <Plus size={40} className="mb-2 transition-transform group-hover:scale-110" />
            <span className="text-[15px] font-bold">Новая группа</span>
          </button>
        </div>

        {filtered.length > 0 && (
          <div className="mt-8 flex max-w-[1240px] items-center justify-between text-[13px] font-medium text-slate-500">
            <div>
              Показывать:{" "}
              <select className="cursor-pointer bg-transparent font-bold text-slate-900 outline-none">
                <option>10</option>
              </select>
            </div>
            <div>
              1–{filtered.length} из {filtered.length} групп
            </div>
          </div>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Создать новую группу">
        <div className="p-1">
          <p className="mb-4 text-[14px] text-slate-500">
            Введите название для новой группы. Затем вы сможете добавить в нее студентов.
          </p>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-[13px] font-semibold text-slate-700">
                Название группы
              </label>
              <input
                autoFocus
                type="text"
                value={newGroupName}
                onChange={(event) => setNewGroupName(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleCreateGroup()}
                placeholder="Например: CS-705"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-[14px] outline-none focus:border-[#7448FF]"
              />
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-50 pt-4">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-xl bg-slate-50 px-5 py-2.5 text-[14px] font-bold text-slate-600 transition-colors hover:bg-slate-100"
              >
                Отмена
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={creating || !newGroupName.trim()}
                className="rounded-xl bg-[#7448FF] px-5 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-[#623ce6] disabled:opacity-50"
              >
                {creating ? "Создание..." : "Добавить"}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
