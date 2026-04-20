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
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)] " +
    "disabled:opacity-50 disabled:pointer-events-none";

  const sizes =
    size === "sm"
      ? "h-9 px-4 text-sm"
      : size === "lg"
        ? "h-12 px-7 text-base"
        : "h-10 px-5 text-sm";

  const variants =
    variant === "primary"
      ? cn(
          "bg-[rgb(var(--primary))] text-white shadow-sm",
          "hover:bg-[rgb(var(--primary-hover))] hover:shadow",
          "active:scale-[0.98]"
        )
      : variant === "danger"
        ? cn(
            "bg-danger text-white shadow-sm",
            "hover:bg-red-700 hover:shadow",
            "active:scale-[0.98]"
          )
        : variant === "outline"
          ? cn(
              "bg-surface text-fg border border-[color:var(--border)] shadow-sm",
              "hover:bg-surface-subtle hover:border-[color:var(--border-strong)]",
              "active:scale-[0.98]"
            )
          : cn(
              "bg-transparent text-muted hover:text-fg",
              "hover:bg-surface-subtle",
              "active:bg-surface-hover"
            );

  return <button className={cn(base, sizes, variants, className)} {...props} />;
}