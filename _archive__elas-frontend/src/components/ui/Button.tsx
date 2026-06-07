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
    "font-medium transition-all duration-200 ease-out " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7448FF]/50 focus-visible:ring-offset-2 " +
    "disabled:opacity-50 disabled:pointer-events-none";

  const sizes =
    size === "sm"
      ? "h-9 px-4 text-xs rounded-xl"
      : size === "lg"
        ? "h-12 px-7 text-base rounded-[14px]"
        : "h-10 px-5 text-sm rounded-xl";

  const variants =
    variant === "primary"
      ? cn(
          "bg-[#7448FF] text-white shadow-sm ring-1 ring-black/5",
          "hover:bg-[#623ce6] hover:shadow-md",
          "active:scale-[0.98]"
        )
      : variant === "danger"
        ? cn(
            "bg-red-500 text-white shadow-sm ring-1 ring-black/5",
            "hover:bg-red-600 hover:shadow-md",
            "active:scale-[0.98]"
          )
        : variant === "outline"
          ? cn(
              "bg-white text-slate-700 border border-slate-200 shadow-sm",
              "hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900",
              "active:scale-[0.98]"
            )
          : cn(
              "bg-transparent text-slate-500 hover:text-slate-900",
              "hover:bg-slate-100",
              "active:bg-slate-200"
            );

  return <button className={cn(base, sizes, variants, className)} {...props} />;
}