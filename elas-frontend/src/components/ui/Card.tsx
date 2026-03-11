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
    "rounded-2xl text-fg transition-all duration-200 ease-out";

  const variants: Record<NonNullable<CardProps["variant"]>, string> = {
    default:
      "bg-surface ring-1 ring-[color:var(--border)]/30 shadow-soft",
    outline:
      "bg-surface ring-1 ring-[color:var(--border)]/40",
    subtle:
      "bg-surface-subtle/90 ring-1 ring-[color:var(--border)]/20 backdrop-blur-[2px]",
    elevated:
      "bg-surface dark:bg-[rgba(25,25,40,0.7)] backdrop-blur-lg ring-1 ring-[color:var(--border)] dark:ring-white/10 shadow-lg",
  };

  const hover = interactive
    ? cn(
        "hover:-translate-y-0.5",
        variant === "elevated"
          ? "hover:shadow-xl hover:ring-[rgb(var(--primary))]/40 dark:hover:border-[rgb(var(--primary))]/40"
          : variant === "outline"
            ? "hover:ring-[color:var(--border-strong)] hover:shadow-soft"
            : "hover:shadow-card hover:ring-[color:var(--border)]/35"
      )
    : "";

  return <div className={cn(base, variants[variant], hover, className)}>{children}</div>;
}

export function CardHeader({ className, children }: Props) {
  return <div className={cn("p-6 pb-0", className)}>{children}</div>;
}

export function CardContent({ className, children }: Props) {
  return <div className={cn("px-6 pb-6", className)}>{children}</div>;
}