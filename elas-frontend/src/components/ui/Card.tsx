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
  const base = cn(
    "rounded-elas-lg text-fg",
    "transition-[box-shadow,border-color,background-color,transform] duration-200"
  );

  const variants: Record<NonNullable<CardProps["variant"]>, string> = {
    default:  "bg-surface border border-border shadow-card",
    outline:  "bg-transparent border border-border",
    subtle:   "bg-surface-subtle border border-transparent",
    elevated: "bg-surface border border-border shadow-elevated",
  };

  const hover = interactive
    ? cn(
        "cursor-pointer",
        variant === "elevated"
          ? "hover:border-primary/30 hover:shadow-glow hover:-translate-y-1"
          : variant === "outline"
            ? "hover:border-border-strong hover:bg-surface-subtle"
            : "hover:border-border-strong hover:shadow-card-rich hover:-translate-y-0.5"
      )
    : "";

  return (
    <div className={cn(base, variants[variant], hover, className)}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: Props) {
  return (
    <div className={cn("p-5 md:p-6 pb-0 flex flex-col gap-1.5", className)}>
      {children}
    </div>
  );
}

export function CardContent({ className, children }: Props) {
  return (
    <div className={cn("p-5 md:p-6", className)}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children }: Props) {
  return (
    <div className={cn(
      "p-5 md:p-6 pt-0 flex items-center gap-3",
      className
    )}>
      {children}
    </div>
  );
}
