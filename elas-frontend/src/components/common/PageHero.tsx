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
      <div className="pt-8 sm:pt-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            {overline ? (
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
                {overline}
              </div>
            ) : null}

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl text-fg leading-[1.15]">
              {title}
            </h1>

            {subtitle ? (
              <p className="text-sm leading-relaxed sm:text-base text-muted max-w-xl">
                {subtitle}
              </p>
            ) : null}
          </div>

          {right ? <div className="shrink-0">{right}</div> : null}
        </div>

        <div className="mt-8 h-px w-full bg-[color:var(--border)]/60" />
      </div>
    </div>
  );
}