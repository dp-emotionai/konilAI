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
        "rounded-elas-lg",
        "border border-border",
        "bg-[rgba(255,255,255,0.72)] shadow-card",
        "backdrop-blur-xl",
        "transition-shadow transition-colors",
        "hover:shadow-elevated hover:border-[color:var(--border-strong)]",
        // dark mode glass
        "dark:bg-[rgba(20,24,41,0.72)]",
        className
      )}
    >
      {children}
    </div>
  );
}