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
    "rounded-elas-lg text-fg transition-[box-shadow,border-color,background-color] duration-200";

  const variants: Record<NonNullable<CardProps["variant"]>, string> = {
    default:
      "bg-surface border border-[color:var(--border)] shadow-sm",
    outline:
      "bg-transparent border border-[color:var(--border)]",
    subtle:
      "bg-surface-subtle border border-transparent",
    elevated:
      "bg-surface border border-[color:var(--border)] shadow-elevated",
  };

  const hover = interactive
    ? cn(
        "cursor-pointer",
        variant === "elevated"
          ? "hover:border-[color:var(--primary-muted)] hover:shadow-lg hover:-translate-y-0.5"
          : variant === "outline"
            ? "hover:border-[color:var(--border-strong)] hover:bg-surface-subtle"
            : "hover:border-[color:var(--border-strong)] hover:shadow-md hover:-translate-y-0.5"
      )
    : "";

  return <div className={cn(base, variants[variant], hover, className)}>{children}</div>;
}

export function CardHeader({ className, children }: Props) {
  return <div className={cn("p-6 pb-0 flex flex-col gap-1.5", className)}>{children}</div>;
}

export function CardContent({ className, children }: Props) {
  return <div className={cn("p-6", className)}>{children}</div>;
}