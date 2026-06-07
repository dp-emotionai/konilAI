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
        "rounded-elas border px-4 py-3 flex items-start gap-3 shadow-sm",
        variant === "info" && "bg-surface-subtle border-[color:var(--border)]",
        variant === "success" && "bg-success/5 border-success/20",
        variant === "warning" && "bg-warning/5 border-warning/20",
        variant === "error" && "bg-error/5 border-error/20",
        className
      )}
    >
      <span
        className={cn(
          "shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-elas scale-90",
          variant === "info" && "bg-surface text-[color:var(--text)] border border-[color:var(--border)]",
          variant === "success" && "bg-success/10 text-success",
          variant === "warning" && "bg-warning/10 text-warning",
          variant === "error" && "bg-error/10 text-error"
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
          className="shrink-0 rounded-elas p-1.5 text-muted hover:text-fg hover:bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]/30"
          aria-label="Закрыть"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
