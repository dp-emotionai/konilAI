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
    "transition-[background-color,box-shadow,transform,color] duration-150 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]/35 " +
    "disabled:opacity-50 disabled:pointer-events-none";

  const sizes =
    size === "sm"
      ? "h-9 px-4 text-sm"
      : size === "lg"
      ? "h-12 px-6 text-base"
      : "h-11 px-5 text-sm";

  const variants =
    variant === "primary"
      ? cn(
          "bg-[rgb(var(--primary))] text-white shadow-soft",
          "hover:bg-[rgb(var(--primary-hover))]",
          "active:shadow-none active:translate-y-[0.5px]"
        )
      : variant === "danger"
      ? cn(
          "bg-[rgb(var(--error))] text-white shadow-soft",
          "hover:brightness-[0.98]",
          "active:shadow-none active:translate-y-[0.5px]"
        )
      : variant === "outline"
      ? cn(
          "bg-surface text-fg shadow-soft",
          "ring-1 ring-[color:var(--border)]/40",
          "hover:bg-surface-subtle hover:ring-[color:var(--border)]/55",
          "active:shadow-none active:translate-y-[0.5px]"
        )
      : cn(
          "bg-transparent text-fg",
          "hover:bg-surface-subtle",
          "active:bg-[color:var(--surface-hover)]"
        );

  return <button className={cn(base, sizes, variants, className)} {...props} />;
}