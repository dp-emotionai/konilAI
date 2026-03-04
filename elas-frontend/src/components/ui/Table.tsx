import { cn } from "@/lib/cn";

export default function Table({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-elas-lg overflow-hidden bg-surface shadow-card",
        className
      )}
      {...props}
    />
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-2 px-4 py-3 bg-surface-subtle">
      <div className="text-[12px] font-medium tracking-wide text-muted">
        {children}
      </div>
    </div>
  );
}

export function TRow({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "grid gap-2 px-4 py-3 transition",
        "hover:bg-surface-subtle",
        // мягкий разделитель не рамкой, а легкой линией снизу
        "relative",
        className
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-x-4 bottom-0 h-px bg-[rgba(15,18,34,0.06)]" />
    </div>
  );
}

export function TCell({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-sm text-fg", className)} {...props} />;
}

export function TMuted({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("text-sm text-muted", className)} {...props} />;
}