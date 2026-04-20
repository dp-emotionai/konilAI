import * as React from "react";
import { cn } from "@/lib/cn";

export default function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full px-4 rounded-xl text-sm",
        "bg-white text-slate-900 placeholder:text-slate-400 whitespace-nowrap",
        "border border-slate-200 shadow-sm",
        "transition-all duration-200 ease-out",
        "hover:border-slate-300",
        "focus:outline-none focus:ring-2 focus:ring-[#7448FF] focus:border-transparent",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
        className
      )}
      {...props}
    />
  );
}