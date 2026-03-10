import { cn } from "@/lib/cn";

export default function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-elas-lg bg-surface-subtle",
        "dark:opacity-80",
        className
      )}
      aria-hidden
    />
  );
}
