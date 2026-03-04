import { cn } from "@/lib/cn";

export default function Glow({ className }: { className?: string }) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0", className)}
      aria-hidden
    >
      {/* LIGHT: почти незаметный, просто “дорогой воздух” */}
      <div className="absolute -top-28 left-1/2 -translate-x-1/2 h-130 w-230 rounded-full blur-3xl opacity-70 dark:opacity-0"
           style={{ background: "radial-gradient(circle, rgba(142,91,255,.08), transparent 62%)" }} />
      <div className="absolute top-40 left-8 h-85 w-85 rounded-full blur-3xl opacity-60 dark:opacity-0"
           style={{ background: "radial-gradient(circle, rgba(142,91,255,.06), transparent 62%)" }} />

      {/* DARK: мягко, без белых пятен */}
      <div className="absolute -top-28 left-1/2 -translate-x-1/2 h-130 w-230 rounded-full blur-3xl opacity-0 dark:opacity-90"
           style={{ background: "radial-gradient(circle, rgba(142,91,255,.12), transparent 62%)" }} />
      <div className="absolute top-44 left-10 h-80 w-[320px] rounded-full blur-3xl opacity-0 dark:opacity-80"
           style={{ background: "radial-gradient(circle, rgba(99,102,241,.08), transparent 64%)" }} />
      <div className="absolute top-80 right-8 h-90 w-90 rounded-full blur-3xl opacity-0 dark:opacity-60"
           style={{ background: "radial-gradient(circle, rgba(0,0,0,.18), transparent 65%)" }} />
    </div>
  );
}