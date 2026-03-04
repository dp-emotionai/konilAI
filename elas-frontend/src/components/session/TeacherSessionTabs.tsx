"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function TeacherSessionTabs({ sessionId }: { sessionId: string }) {
  const pathname = usePathname();

  const items = [
    { id: "live", label: "Live monitor", href: `/teacher/session/${sessionId}` },
    { id: "analytics", label: "Lecture analytics", href: `/teacher/session/${sessionId}/analytics` },
    { id: "exam", label: "Exam analytics", href: `/teacher/session/${sessionId}/exam-analytics` },
    { id: "reports", label: "Reports", href: "/teacher/reports" },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="inline-flex items-center gap-1 rounded-2xl bg-slate-100 px-1 py-1 dark:bg-white/5">
        {items.map((item) => {
          const active =
            item.href === pathname ||
            (item.id === "live" &&
              (pathname === `/teacher/session/${sessionId}` ||
                pathname === `/teacher/session/${sessionId}/`));
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-2xl transition border",
                active
                  ? "bg-slate-900 text-white border-slate-900 shadow-sm dark:bg-white/20 dark:text-white dark:border-white/20"
                  : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-white dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
      <span className="text-xs text-slate-500 dark:text-white/45">
        Same session • switch between live view, analytics and reports.
      </span>
    </div>
  );
}

