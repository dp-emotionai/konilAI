import * as React from "react";
import { cn } from "@/lib/cn";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md";
};

export default function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 select-none whitespace-nowrap " +
    "rounded-elas transition active:translate-y-[1px] " +
    "focus-visible:ring-2 focus-visible:ring-[rgba(142,91,255,0.55)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg " +
    "disabled:opacity-55 disabled:pointer-events-none";

  const sizes = size === "sm" ? "h-9 px-4 text-sm" : "h-11 px-5 text-sm";

  const variants =
    variant === "primary"
      ? "bg-primary text-white shadow-soft hover:opacity-[0.92] dark:shadow-soft-dark"
      : variant === "outline"
      ? "border border-border bg-transparent text-fg hover:bg-surface-subtle"
      : "bg-surface-subtle text-fg hover:bg-[rgba(15,18,34,0.06)] dark:hover:bg-white/10";

  return <button className={cn(base, sizes, variants, className)} {...props} />;
}