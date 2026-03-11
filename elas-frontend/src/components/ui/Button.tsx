import * as React from "react";
import { cn } from "@/lib/cn";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

export default function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: Props) {
  const base =
    "inline-flex items-center justify-center gap-2 select-none whitespace-nowrap " +
    "rounded-elas font-medium " +
    "transition-all duration-200 ease-out " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] " +
    "disabled:opacity-50 disabled:pointer-events-none disabled:transform-none";

  const sizes =
    size === "sm"
      ? "h-9 px-4 text-sm"
      : size === "lg"
        ? "h-12 px-7 text-base"
        : "h-11 px-6 text-sm";

  const variants =
    variant === "primary"
      ? cn(
          "bg-gradient-to-b from-[rgb(var(--primary))] to-[rgb(var(--primary-hover))] text-white",
          "shadow-soft shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset]",
          "hover:shadow-glow hover:-translate-y-0.5 hover:brightness-105",
          "active:translate-y-0 active:shadow-soft"
        )
      : variant === "danger"
        ? cn(
            "bg-[rgb(var(--error))] text-white shadow-soft",
            "hover:brightness-105 hover:shadow-card hover:-translate-y-0.5",
            "active:translate-y-0"
          )
        : variant === "outline"
          ? cn(
              "bg-surface text-fg ring-1 ring-[color:var(--border)]/40",
              "hover:bg-surface-subtle hover:ring-[color:var(--border-strong)] hover:-translate-y-0.5 hover:shadow-soft",
              "active:translate-y-0"
            )
          : cn(
              "bg-transparent text-fg/90",
              "hover:bg-surface-subtle hover:text-fg",
              "active:bg-[color:var(--surface-hover)]"
            );

  return <button className={cn(base, sizes, variants, className)} {...props} />;
}