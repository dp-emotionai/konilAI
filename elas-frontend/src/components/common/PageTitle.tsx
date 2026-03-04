export default function PageTitle({ overline, title, subtitle }: { overline?: string; title: string; subtitle?: string }) {
  return (
    <header className="space-y-2">
      {overline && <div className="text-sm text-white/60">{overline}</div>}
      <h1 className="text-3xl md:text-4xl font-semibold">{title}</h1>
      {subtitle && <p className="text-white/60 max-w-3xl">{subtitle}</p>}
    </header>
  );
}
