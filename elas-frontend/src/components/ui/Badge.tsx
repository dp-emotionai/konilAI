import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "default" | "success" | "warning" | "danger" | "primary" | "secondary";

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
    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium " +
    "ring-1 ring-inset";

  const styles: Record<Variant, string> = {
    default: "bg-surface-subtle/80 text-fg ring-[color:var(--border)]/35",
    secondary: "bg-surface-subtle text-muted ring-[color:var(--border)]/35",
    primary: "bg-primary/10 text-[rgb(var(--primary))] ring-[rgb(var(--primary))]/18",
    success: "bg-[rgb(var(--success))]/10 text-[rgb(var(--success))] ring-[rgb(var(--success))]/18",
    warning: "bg-[rgb(var(--warning))]/12 text-[rgb(var(--warning))] ring-[rgb(var(--warning))]/20",
    danger: "bg-[rgb(var(--error))]/10 text-[rgb(var(--error))] ring-[rgb(var(--error))]/18",
  };

  return <span className={cn(base, styles[variant], className)}>{children}</span>;
}