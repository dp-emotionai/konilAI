"use client";

import { cn } from "@/lib/cn";
import Button from "@/components/ui/Button";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  children?: React.ReactNode;
  footer?: React.ReactNode;
};

export default function Modal({ open, title, description, onClose, children, footer }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl rounded-3xl bg-[#0b0b12] border border-white/10 shadow-[0_40px_120px_rgba(0,0,0,0.7)]">
          <div className="p-5 border-b border-white/10 flex items-start justify-between gap-4">
            <div className="min-w-0">
              {title && <div className="text-xl font-semibold">{title}</div>}
              {description && <div className="text-sm text-white/60 mt-1">{description}</div>}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className={cn("shrink-0")}>
              <X size={18} />
            </Button>
          </div>

          <div className="p-5">{children}</div>

          {footer && <div className="p-5 border-t border-white/10">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
