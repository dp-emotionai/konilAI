"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function TeacherSessionTabs({ sessionId }: { sessionId: string }) {
  const pathname = usePathname() ?? "";

  if (!sessionId) return null;

  const liveHref = `/teacher/session/${sessionId}`;
  const analyticsHref = `/teacher/session/${sessionId}/analytics`;
  const examAnalyticsHref = `/teacher/session/${sessionId}/exam-analytics`;

  const items = [
    { id: "live", label: "Live monitor", href: liveHref },
    { id: "analytics", label: "Lecture analytics", href: analyticsHref },
    { id: "exam", label: "Exam analytics", href: examAnalyticsHref },
    // Пока оставляем общий reports, раз отдельного session-report route ты не присылал
    { id: "reports", label: "Reports", href: "/teacher/reports" },
  ];

  const isActive = (itemId: string, href: string) => {
    if (itemId === "live") {
      return pathname === liveHref || pathname === `${liveHref}/`;
    }

    if (itemId === "analytics") {
      return pathname === analyticsHref || pathname.startsWith(`${analyticsHref}/`);
    }

    if (itemId === "exam") {
      return (
        pathname === examAnalyticsHref ||
        pathname.startsWith(`${examAnalyticsHref}/`)
      );
    }

    if (itemId === "reports") {
      return pathname === "/teacher/reports" || pathname.startsWith("/teacher/reports/");
    }

    return pathname === href;
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="inline-flex items-center gap-1 rounded-2xl bg-slate-100 px-1 py-1 dark:bg-white/5">
        {items.map((item) => {
          const active = isActive(item.id, item.href);

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "rounded-2xl border px-3 py-1.5 text-xs font-medium transition",
                active
                  ? "border-slate-900 bg-slate-900 text-white shadow-sm dark:border-white/20 dark:bg-white/20 dark:text-white"
                  : "border-transparent text-slate-600 hover:bg-white hover:text-slate-900 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
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