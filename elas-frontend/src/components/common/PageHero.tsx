import { cn } from "@/lib/cn";

export default function PageHero({
  title,
  subtitle,
  overline,
  right,
  className,
}: {
  title: string;
  subtitle?: string;
  overline?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-elas-page px-4", className)}>
      <div className="pt-6 sm:pt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            {overline ? (
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                {overline}
              </div>
            ) : null}

            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl text-fg">
              {title}
            </h1>

            {subtitle ? (
              <p className="text-sm leading-relaxed sm:text-base text-muted">
                {subtitle}
              </p>
            ) : null}
          </div>

          {right ? <div className="shrink-0">{right}</div> : null}
        </div>

        {/* softer divider (avoid harsh 1px lines in dark) */}
        <div className="mt-6 h-px w-full bg-[color:var(--border)] opacity-70 dark:opacity-50" />
      </div>
    </div>
  );
}