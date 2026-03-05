import * as React from "react";
import { cn } from "@/lib/cn";

export default function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-11 w-full px-4 rounded-elas",
        "bg-surface text-fg placeholder:text-[color:var(--muted-2)]",
        "ring-1 ring-[color:var(--border)]/40 shadow-soft",
        "transition-[background-color,box-shadow] duration-150",
        "hover:bg-[color:var(--surface-subtle)]",
        "focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)]/35",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  );
}