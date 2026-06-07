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
        "border border-[color:var(--border)]",
        "bg-surface/80 shadow-sm",
        "backdrop-blur-xl",
        "transition-shadow transition-colors",
        "hover:shadow-md hover:border-[color:var(--border-strong)]",
        className
      )}
    >
      {children}
    </div>
  );
}