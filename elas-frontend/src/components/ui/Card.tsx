import * as React from "react";
import { cn } from "@/lib/cn";

type Props = {
  className?: string;
  children: React.ReactNode;
};

type CardProps = Props & {
  variant?: "default" | "outline" | "subtle" | "elevated";
  interactive?: boolean;
};

export function Card({
  className,
  children,
  variant = "default",
  interactive = false,
}: CardProps) {
  const base =
    "rounded-elas-lg bg-surface text-fg transition-[box-shadow,transform,background-color,border-color] duration-200";

  const variants: Record<NonNullable<CardProps["variant"]>, string> = {
    default:
      "ring-1 ring-[color:var(--border)]/25 shadow-soft",
    outline:
      "border border-[color:var(--border)] bg-surface",
    subtle:
      "bg-surface-subtle ring-1 ring-[color:var(--border)]/18",
    elevated:
      "ring-1 ring-[color:var(--border)]/22 shadow-elevated",
  };

  const hover = interactive
    ? cn(
        "hover:-translate-y-[1px]",
        variant === "elevated"
          ? "hover:shadow-elevated hover:ring-[color:var(--border)]/35"
          : variant === "outline"
            ? "hover:bg-[color:var(--surface-hover)] hover:border-[color:var(--border-strong)]"
            : "hover:shadow-card hover:ring-[color:var(--border)]/35"
      )
    : "";

  return <div className={cn(base, variants[variant], hover, className)}>{children}</div>;
}

export function CardHeader({ className, children }: Props) {
  return <div className={cn("px-6 pt-6", className)}>{children}</div>;
}

export function CardContent({ className, children }: Props) {
  return <div className={cn("px-6 pb-6", className)}>{children}</div>;
}