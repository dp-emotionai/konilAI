import { cn } from "@/lib/cn";

/**
 * Мягкий фоновый акцент (один glow), не перегружающий экран.
 * Light: едва заметный. Dark: один объёмный градиент с несколькими стопами (без полос).
 */
export default function Glow({ className }: { className?: string }) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden
    >
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[140%] max-w-[800px] aspect-[2/1] opacity-100 dark:opacity-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 100% at 50% 0%, rgba(142,91,255,0.04) 0%, rgba(142,91,255,0.015) 40%, transparent 70%)",
        }}
      />
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 w-[140%] max-w-[900px] aspect-[2/1] opacity-0 dark:opacity-100"
        style={{
          background:
            "radial-gradient(ellipse 75% 100% at 50% 0%, rgba(142,91,255,0.09) 0%, rgba(142,91,255,0.045) 30%, rgba(142,91,255,0.018) 55%, rgba(142,91,255,0.004) 78%, transparent 100%)",
        }}
      />
    </div>
  );
}
