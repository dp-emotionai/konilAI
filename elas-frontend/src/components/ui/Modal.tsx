"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { X } from "lucide-react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  description?: string;
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: ModalProps) {
  React.useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-black/40 dark:bg-black/65 backdrop-blur-sm"
        onMouseDown={onClose}
        aria-hidden
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={cn(
            "w-full max-w-lg rounded-2xl bg-surface text-fg",
            "shadow-elevated ring-1 ring-[color:var(--border)]/30",
            "overflow-hidden",
            className
          )}
          onMouseDown={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border/50">
            <div className="min-w-0">
              {title ? <div className="text-base font-semibold truncate">{title}</div> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-full",
                "bg-surface-subtle/80 hover:bg-surface-subtle transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]/35"
              )}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-5 py-4">{children}</div>

          {footer ? (
            <div className="px-5 py-4 border-t border-border/50 bg-surface/60">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}