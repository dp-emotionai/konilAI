import { cn } from "@/lib/cn";

export default function GlassCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-elas-lg backdrop-blur-xl transition-colors",
        // ✅ Light: clean premium surface (no border)
        "bg-surface/80 shadow-card",
        // ✅ Dark: мягкое стекло без белой рамки
        "dark:bg-white/6 dark:shadow-soft-dark",
        className
      )}
    >
      {children}
    </div>
  );
}
