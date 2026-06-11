import * as React from "react";
import { cn } from "@/lib/cn";

export default function StepHeading({
  step,
  title,
  subtitle,
  className,
}: {
  step: number;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1 mb-8", className)}>
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7448FF] text-white text-sm font-bold">
          {step}
        </div>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      </div>
      {subtitle && (
        <p className="ml-11 text-sm text-slate-500 font-medium">{subtitle}</p>
      )}
    </div>
  );
}
