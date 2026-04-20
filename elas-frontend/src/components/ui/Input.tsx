import * as React from "react";
import { cn } from "@/lib/cn";

export default function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full px-4 rounded-elas text-sm",
        "bg-surface text-fg placeholder:text-muted whitespace-nowrap",
        "border border-[color:var(--border)]",
        "transition-all duration-200 ease-out",
        "hover:border-[color:var(--border-strong)]",
        "focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)] focus:border-transparent",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-subtle",
        className
      )}
      {...props}
    />
  );
}