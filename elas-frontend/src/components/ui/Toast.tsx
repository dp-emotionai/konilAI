"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";
type ToastItem = { id: string; type: ToastType; title: string; text?: string };

type ToastAPI = {
  push: (t: Omit<ToastItem, "id">) => void;
};

const ToastCtx = createContext<ToastAPI | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const api = useMemo<ToastAPI>(() => ({
    push: (t) => {
      const id = crypto.randomUUID();
      const item: ToastItem = { id, ...t };
      setToasts((p) => [item, ...p].slice(0, 4));
      setTimeout(() => {
        setToasts((p) => p.filter((x) => x.id !== id));
      }, 2800);
    },
  }), []);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed right-4 top-16 z-[200] flex flex-col gap-2 w-[340px] max-w-[90vw]">
        {toasts.map((t) => (
          <ToastCard
            key={t.id}
            item={t}
            onClose={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
          />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const Icon = item.type === "success" ? CheckCircle2 : item.type === "error" ? AlertTriangle : Info;
  const border =
    item.type === "success"
      ? "border-emerald-400/20"
      : item.type === "error"
      ? "border-red-400/20"
      : "border-white/10";

  return (
    <div className={cn("rounded-2xl bg-[#0b0b12] border shadow-[0_20px_60px_rgba(0,0,0,0.55)] p-4", border)}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-white/80">
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{item.title}</div>
          {item.text && <div className="text-sm text-white/60 mt-1">{item.text}</div>}
        </div>
        <button onClick={onClose} className="text-white/50 hover:text-white/80">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
