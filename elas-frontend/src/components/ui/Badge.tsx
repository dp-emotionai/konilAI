import * as React from "react";
import { cn } from "@/lib/cn";

export default function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none",
        "bg-primary/10 text-fg border-border dark:bg-white/5",
        className
      )}
      {...props}
    />
  );
}