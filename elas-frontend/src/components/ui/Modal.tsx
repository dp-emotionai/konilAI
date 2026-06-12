"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { X } from "lucide-react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  /** sm=384px | md=512px (default) | lg=640px | xl=768px */
  size?: "sm" | "md" | "lg" | "xl";
};

const sizes = {
  sm:  "max-w-sm",
  md:  "max-w-lg",
  lg:  "max-w-2xl",
  xl:  "max-w-3xl",
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  size = "md",
}: ModalProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const previousActiveRef = React.useRef<HTMLElement | null>(null);
  const onCloseRef = React.useRef(onClose);

  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  React.useEffect(() => {
    if (!open) return;
    previousActiveRef.current = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    const t = requestAnimationFrame(() => dialogRef.current?.focus());

    return () => {
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(t);
      previousActiveRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-fg/20 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Dialog */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descriptionId : undefined}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "relative w-full outline-none",
            "rounded-elas-xl bg-surface text-fg",
            "border border-border shadow-elevated",
            "animate-slide-up",
            sizes[size],
            className
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4 bg-surface-subtle/40 rounded-t-elas-xl">
            <div className="min-w-0">
              {title && (
                <h2 id={titleId} className="truncate text-base font-semibold text-fg">
                  {title}
                </h2>
              )}
              {description && (
                <p id={descriptionId} className="mt-0.5 text-sm text-muted leading-relaxed">
                  {description}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
              className={cn(
                "inline-flex h-8 w-8 shrink-0 items-center justify-center",
                "rounded-elas-sm text-muted",
                "transition-colors hover:bg-surface hover:text-fg",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              )}
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-5">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="border-t border-border bg-surface-subtle/40 px-5 py-4 rounded-b-elas-xl">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
