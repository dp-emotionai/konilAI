"use client";

import Link from "next/link";
import { BookOpen, CalendarClock, FolderOpen, GraduationCap, Video } from "lucide-react";

type ResourceGroupItem = {
  id: string;
  name: string;
  subtitle?: string | null;
  href: string;
};

type ResourceSessionItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  statusLabel: string;
  href: string;
};

type MaterialsStatusPageProps = {
  title: string;
  description: string;
  roleLabel: string;
  backendNotice: string;
  groups: ResourceGroupItem[];
  sessions: ResourceSessionItem[];
};

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <div className="text-[#7448FF]">{icon}</div>
      </div>
      <div className="mt-3 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

export function MaterialsStatusPage({
  title,
  description,
  roleLabel,
  backendNotice,
  groups,
  sessions,
}: MaterialsStatusPageProps) {
  return (
    <div className="min-h-screen bg-[#FAFAFB]">
      <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-8">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="max-w-3xl text-[15px] text-slate-500">{description}</p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <StatCard label={`${roleLabel} группы`} value={groups.length} icon={<GraduationCap size={18} />} />
          <StatCard label="Сессии" value={sessions.length} icon={<Video size={18} />} />
          <StatCard label="Материалы" value="0" icon={<BookOpen size={18} />} />
        </div>

        <div className="mt-8 rounded-[28px] border border-slate-100 bg-white p-8 text-center shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
          <FolderOpen size={60} strokeWidth={1.4} className="mx-auto text-slate-200" />
          <h2 className="mt-5 text-2xl font-bold text-slate-900">Материалы backend пока не подключены</h2>
          <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-500">
            {backendNotice}
          </p>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 text-slate-900">
              <GraduationCap size={18} className="text-[#7448FF]" />
              <h3 className="text-lg font-bold">Группы</h3>
            </div>
            <div className="mt-4 space-y-3">
              {groups.length > 0 ? (
                groups.map((group) => (
                  <Link
                    key={group.id}
                    href={group.href}
                    className="block rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-4 transition-colors hover:bg-slate-50"
                  >
                    <div className="font-semibold text-slate-900">{group.name}</div>
                    {group.subtitle && <div className="mt-1 text-sm text-slate-500">{group.subtitle}</div>}
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center text-sm text-slate-500">
                  Пока нет групп, к которым можно привязать материалы.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 text-slate-900">
              <CalendarClock size={18} className="text-[#7448FF]" />
              <h3 className="text-lg font-bold">Сессии</h3>
            </div>
            <div className="mt-4 space-y-3">
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <Link
                    key={session.id}
                    href={session.href}
                    className="block rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-4 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900">{session.title}</div>
                        {session.subtitle && <div className="mt-1 text-sm text-slate-500">{session.subtitle}</div>}
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-500 shadow-sm">
                        {session.statusLabel}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center text-sm text-slate-500">
                  Сессий пока нет. Как только backend материалов появится, привязка пойдёт через эти занятия.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
