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
    "rounded-2xl text-fg transition-[box-shadow,border-color,background-color] duration-200";

  const variants: Record<NonNullable<CardProps["variant"]>, string> = {
    default:
      "bg-surface border border-[color:var(--border)]/30 shadow-sm",
    outline:
      "bg-transparent border border-[color:var(--border)]/40",
    subtle:
      "bg-surface-subtle/70 border border-[color:var(--border)]/20",
    elevated:
      "bg-surface border border-[color:var(--border)]/28 shadow-md dark:bg-[rgba(24,24,36,0.88)]",
  };

  const hover = interactive
    ? cn(
        "cursor-pointer",
        variant === "elevated"
          ? "hover:border-[rgb(var(--primary))]/28 hover:shadow-lg"
          : variant === "outline"
            ? "hover:border-[color:var(--border-strong)] hover:bg-surface-subtle/35"
            : "hover:border-[color:var(--border)]/45 hover:shadow-md"
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