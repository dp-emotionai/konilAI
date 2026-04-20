"use client";

import { cn } from "@/lib/cn";

type StudentSessionTab = "prepare" | "live";

export function StudentSessionTabs({
  tab,
  onChange,
}: {
  tab: StudentSessionTab;
  onChange: (next: StudentSessionTab) => void;
}) {
  const items: { id: StudentSessionTab; label: string }[] = [
    { id: "prepare", label: "Подготовка (согласие и камера)" },
    { id: "live", label: "Эфир" },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="inline-flex items-center gap-1 rounded-2xl bg-slate-100 px-1 py-1 dark:bg-surface-subtle">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-2xl transition border",
              tab === item.id
                ? "bg-slate-900 text-white border-slate-900 shadow-sm dark:bg-white/20 dark:text-white dark:border-white/20"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-white dark:text-muted dark:hover:text-white dark:hover:bg-surface-subtle"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <span className="text-xs text-slate-500 dark:text-muted">
        Шаг 1: согласие и камера • Шаг 2: подключение к эфиру.
      </span>
    </div>
  );
}

