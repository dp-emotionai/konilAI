"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from "lucide-react";

type AlertVariant = "info" | "success" | "warning" | "error";

const iconMap: Record<AlertVariant, React.ComponentType<{ size?: number; className?: string }>> = {
  info:    Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error:   XCircle,
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

  const styles: Record<AlertVariant, { wrap: string; icon: string }> = {
    info: {
      wrap: "bg-surface-subtle border-border",
      icon: "bg-surface text-muted border border-border",
    },
    success: {
      wrap: "bg-success/6 border-success/20",
      icon: "bg-success/10 text-success",
    },
    warning: {
      wrap: "bg-warning/6 border-warning/20",
      icon: "bg-warning/10 text-warning",
    },
    error: {
      wrap: "bg-error/6 border-error/20",
      icon: "bg-error/10 text-error",
    },
  };

  return (
    <div
      role="alert"
      className={cn(
        "rounded-elas border px-4 py-3 flex items-start gap-3 shadow-soft",
        styles[variant].wrap,
        className
      )}
    >
      <span className={cn(
        "shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-elas-sm",
        styles[variant].icon
      )}>
        <Icon size={17} aria-hidden />
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        {title && (
          <p className="font-semibold text-fg text-sm">{title}</p>
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
          aria-label="Закрыть"
          className="shrink-0 rounded-elas-sm p-1.5 text-muted hover:text-fg hover:bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
