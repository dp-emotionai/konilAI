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
    "rounded-[28px] text-slate-900 transition-[box-shadow,border-color,background-color,transform] duration-300";

  const variants: Record<NonNullable<CardProps["variant"]>, string> = {
    default:
      "bg-white border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)]",
    outline:
      "bg-transparent border border-slate-200",
    subtle:
      "bg-slate-50 border border-transparent",
    elevated:
      "bg-white border border-slate-100 shadow-xl shadow-slate-200/40",
  };

  const hover = interactive
    ? cn(
        "cursor-pointer",
        variant === "elevated"
          ? "hover:border-[#7448FF] hover:shadow-2xl hover:-translate-y-1"
          : variant === "outline"
            ? "hover:border-slate-300 hover:bg-slate-50"
            : "hover:border-slate-200 hover:shadow-lg hover:-translate-y-0.5"
      )
    : "";

  return <div className={cn(base, variants[variant], hover, className)}>{children}</div>;
}

export function CardHeader({ className, children }: Props) {
  return <div className={cn("p-6 md:p-8 pb-0 flex flex-col gap-1.5", className)}>{children}</div>;
}

export function CardContent({ className, children }: Props) {
  return <div className={cn("p-6 md:p-8", className)}>{children}</div>;
}