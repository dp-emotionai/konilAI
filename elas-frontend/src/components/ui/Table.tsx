"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  type: ToastType;
  title: string;
  text?: string;
};

type ToastContextValue = {
  push: (t: Omit<ToastItem, "id">) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

function iconFor(type: ToastType) {
  if (type === "success") return <CheckCircle2 size={16} className="text-[rgb(var(--success))]" />;
  if (type === "error") return <AlertTriangle size={16} className="text-[rgb(var(--error))]" />;
  return <Info size={16} className="text-[rgb(var(--primary))]" />;
}

function ringFor(type: ToastType) {
  if (type === "success") return "ring-[rgb(var(--success))]/20";
  if (type === "error") return "ring-[rgb(var(--error))]/20";
  return "ring-[rgb(var(--primary))]/18";
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const push = React.useCallback((t: Omit<ToastItem, "id">) => {
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const item: ToastItem = { id, ...t };
    setItems((prev) => [item, ...prev].slice(0, 3));

    window.setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed right-4 top-4 z-[120] space-y-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "w-[320px] rounded-2xl bg-surface text-fg shadow-card",
              "ring-1 ring-[color:var(--border)]/25",
              ringFor(t.type),
              "px-4 py-3"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{iconFor(t.type)}</div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{t.title}</div>
                {t.text ? <div className="mt-0.5 text-sm text-muted">{t.text}</div> : null}
              </div>
              <button
                type="button"
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-full",
                  "bg-surface-subtle/80 hover:bg-surface-subtle transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]/35"
                )}
                onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}