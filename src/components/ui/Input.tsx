import * as React from "react";
import { cn } from "@/lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  suffix?: React.ReactNode;
  prefix?: React.ReactNode;
  error?: string;
  label?: string;
  containerClassName?: string;
}

export default function Input({
  className,
  suffix,
  prefix,
  error,
  label,
  containerClassName,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? React.useId();

  const inputEl = (
    <input
      id={inputId}
      className={cn(
        "h-10 w-full text-sm",
        "bg-surface text-fg placeholder:text-muted-2",
        "border rounded-elas shadow-soft",
        "transition-all duration-150 ease-out",
        // border states
        error
          ? "border-error focus:ring-error/30 focus:border-error"
          : "border-border hover:border-border-strong focus:border-primary/50 focus:ring-primary/20",
        // focus ring
        "focus:outline-none focus:ring-2",
        // disabled
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-subtle",
        // padding учитывает prefix/suffix
        prefix ? "pl-10 pr-4" : "px-4",
        suffix && "pr-10",
        className
      )}
      {...props}
    />
  );

  const wrapped = (
    <div className={cn("relative w-full", containerClassName)}>
      {prefix && (
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-2 flex items-center">
          {prefix}
        </div>
      )}
      {inputEl}
      {suffix && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-2 flex items-center">
          {suffix}
        </div>
      )}
    </div>
  );

  if (!label && !error) return suffix || prefix ? wrapped : inputEl;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="label-sm text-fg">
          {label}
        </label>
      )}
      {suffix || prefix ? wrapped : (
        <div className={cn("relative w-full", containerClassName)}>
          {inputEl}
        </div>
      )}
      {error && (
        <p className="text-xs text-error">{error}</p>
      )}
    </div>
  );
}
