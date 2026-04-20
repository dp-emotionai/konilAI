import * as React from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  suffix?: React.ReactNode;
  containerClassName?: string;
}

export default function Input({
  className,
  suffix,
  containerClassName,
  ...props
}: InputProps) {
  const inputEl = (
    <input
      className={cn(
        "h-10 w-full px-4 rounded-xl text-sm",
        "bg-white text-slate-900 placeholder:text-slate-400 whitespace-nowrap",
        "border border-slate-200 shadow-sm",
        "transition-all duration-200 ease-out",
        "hover:border-slate-300",
        "focus:outline-none focus:ring-2 focus:ring-[#7448FF] focus:border-transparent",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
        suffix && "pr-10",
        className
      )}
      {...props}
    />
  );

  if (!suffix) return inputEl;

  return (
    <div className={cn("relative w-full", containerClassName)}>
      {inputEl}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 flex items-center">
        {suffix}
      </div>
    </div>
  );
}