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
    "inline-flex items-center gap-1.5 rounded-elas-sm px-2 py-0.5 text-xs font-medium border";

  const styles: Record<Variant, string> = {
    default: "bg-surface text-fg border-[color:var(--border-strong)]",
    outline: "bg-transparent text-fg border-[color:var(--border-strong)]",
    secondary: "bg-surface-subtle text-muted border-transparent",
    primary: "bg-[rgb(var(--primary))]/10 text-[rgb(var(--primary))] border-transparent",
    success: "bg-success/10 text-success border-transparent",
    warning: "bg-warning/10 text-[rgb(var(--warning))] border-transparent",
    danger: "bg-[rgb(var(--error))]/10 text-error border-transparent",
  };

  return <span className={cn(base, styles[variant], className)}>{children}</span>;
}
