import * as React from "react";
import { cn } from "@/lib/cn";

type Variant =
  | "default"
  | "outline"
  | "secondary"
  | "primary"
  | "success"
  | "warning"
  | "danger";

export default function Badge({
  className,
  variant = "default",
  children,
}: {
  className?: string;
  variant?: Variant;
  children: React.ReactNode;
}) {
  const base = "inline-flex items-center gap-1.5 rounded-elas-pill px-2.5 py-0.5 text-xs font-medium border";

  const styles: Record<Variant, string> = {
    default:   "bg-surface      text-fg     border-border        shadow-soft",
    outline:   "bg-transparent  text-muted  border-border-strong",
    secondary: "bg-surface-subtle text-muted border-border",
    primary:   "bg-primary-muted  text-primary border-primary/20",
    success:   "bg-success/8     text-success  border-success/20",
    warning:   "bg-warning/8     text-warning  border-warning/20",
    danger:    "bg-error/8       text-error    border-error/20",
  };

  return (
    <span className={cn(base, styles[variant], className)}>
      {children}
    </span>
  );
}
