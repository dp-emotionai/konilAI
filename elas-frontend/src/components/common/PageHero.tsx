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
      <div className="rounded-elas-lg bg-surface/70 shadow-soft px-5 sm:px-6 py-5 sm:py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl space-y-2.5">
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
      </div>
    </div>
  );
}