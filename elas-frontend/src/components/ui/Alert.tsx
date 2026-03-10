"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type AlertVariant = "info" | "success" | "warning" | "error";

const iconMap: Record<AlertVariant, React.ComponentType<{ size?: number; className?: string }>> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertTriangle,
};

type AlertProps = {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
  onDismiss?: () => void;
  action?: React.ReactNode;
};

export default function Alert({
  variant = "info",
  title,
  children,
  className,
  onDismiss,
  action,
}: AlertProps) {
  const Icon = iconMap[variant];

  return (
    <div
      role="alert"
      className={cn(
        "rounded-elas-lg ring-1 px-4 py-3 flex items-start gap-3",
        variant === "info" && "bg-primary-muted/50 ring-[color:var(--border)]/30",
        variant === "success" && "bg-[rgb(var(--success))]/10 ring-[rgb(var(--success))]/20",
        variant === "warning" && "bg-[rgb(var(--warning))]/10 ring-[rgb(var(--warning))]/20",
        variant === "error" && "bg-[rgb(var(--error))]/10 ring-[rgb(var(--error))]/20",
        className
      )}
    >
      <span
        className={cn(
          "shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-elas",
          variant === "info" && "bg-[rgb(var(--primary))]/15 text-[rgb(var(--primary))]",
          variant === "success" && "bg-[rgb(var(--success))]/15 text-[rgb(var(--success))]",
          variant === "warning" && "bg-[rgb(var(--warning))]/15 text-[rgb(var(--warning))]",
          variant === "error" && "bg-[rgb(var(--error))]/15 text-[rgb(var(--error))]"
        )}
      >
        <Icon size={18} aria-hidden />
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        {title && (
          <div className="font-semibold text-fg text-sm">{title}</div>
        )}
        <div className={cn("text-sm text-muted", title && "mt-0.5")}>
          {children}
        </div>
        {action && <div className="mt-3">{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-elas p-1.5 text-muted hover:text-fg hover:bg-surface-subtle transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]/30"
          aria-label="Закрыть"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
