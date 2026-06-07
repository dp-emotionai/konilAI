import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "default" | "outline" | "success" | "warning" | "danger" | "primary" | "secondary";

export default function Badge({
  className,
  variant = "default",
  children,
}: {
  className?: string;
  variant?: Variant;
  children: React.ReactNode;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-0.5 text-xs font-medium border";

  const styles: Record<Variant, string> = {
    default: "bg-white text-slate-800 border-slate-200 shadow-sm",
    outline: "bg-transparent text-slate-700 border-slate-300",
    secondary: "bg-slate-50 text-slate-600 border-slate-100",
    primary: "bg-purple-50 text-[#7448FF] border-purple-100",
    success: "bg-emerald-50 text-emerald-600 border-emerald-100",
    warning: "bg-amber-50 text-amber-600 border-amber-100",
    danger: "bg-red-50 text-red-600 border-red-100",
  };

  return <span className={cn(base, styles[variant], className)}>{children}</span>;
}
