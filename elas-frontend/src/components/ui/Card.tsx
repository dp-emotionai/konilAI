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
    "rounded-elas-lg bg-surface text-fg transition-[box-shadow,transform,background-color] duration-150";

  const variants: Record<NonNullable<CardProps["variant"]>, string> = {
    // Base card
    default: "ring-1 ring-[color:var(--border)]/30 shadow-card",
    // Rare: explicit border
    outline: "border border-border shadow-card",
    // Inner panels
    subtle: "bg-surface-subtle ring-1 ring-[color:var(--border)]/20",
    // Hero/landing “premium” card
    elevated: "ring-1 ring-[color:var(--border)]/25 shadow-elevated",
  };

  const hover = interactive
    ? cn(
        "hover:-translate-y-[1px]",
        variant === "elevated"
          ? "hover:shadow-elevated hover:ring-[color:var(--border)]/40"
          : "hover:shadow-elevated hover:ring-[color:var(--border)]/45"
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