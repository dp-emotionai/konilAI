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
  description,
}: ModalProps) {
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const previousActiveRef = React.useRef<HTMLElement | null>(null);
  const onCloseRef = React.useRef(onClose);

  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    if (!open) return;

    previousActiveRef.current = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseRef.current();
      }
    };

    window.addEventListener("keydown", onKey);

    const t = requestAnimationFrame(() => {
      dialogRef.current?.focus();
    });

    return () => {
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(t);

      if (previousActiveRef.current?.focus) {
        previousActiveRef.current.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={description ? descriptionId : undefined}
          className={cn(
            "w-full max-w-lg overflow-hidden rounded-elas-xl bg-surface text-fg",
            "border border-[color:var(--border)] shadow-xl",
            "outline-none",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 border-b border-[color:var(--border)] px-5 py-4 bg-surface-subtle/30">
            <div className="min-w-0">
              {title ? (
                <h2 id={titleId} className="truncate text-lg font-semibold">
                  {title}
                </h2>
              ) : null}

              {description ? (
                <p id={descriptionId} className="mt-1 text-sm leading-relaxed text-muted">
                  {description}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className={cn(
                "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-elas-sm",
                "text-muted transition-colors hover:bg-surface hover:text-fg",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
              )}
              aria-label="Закрыть"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-5 py-4">{children}</div>

          {footer ? (
            <div className="border-t border-[color:var(--border)] bg-surface-subtle/50 px-5 py-4">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}