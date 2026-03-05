import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 bg-surface/60">
      <div className="border-t border-border/60 dark:border-border/40">
        <div className="mx-auto max-w-elas-page px-4 py-8 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="text-sm text-muted">
            © {new Date().getFullYear()} ELAS — live-аналитика обучения (consent-first)
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/privacy" className="text-muted hover:text-fg transition-colors">
              Конфиденциальность
            </Link>
            <Link href="/ethics" className="text-muted hover:text-fg transition-colors">
              Этика
            </Link>

            <span className="text-muted-2">•</span>
            <span className="text-muted">Без хранения raw-видео</span>
            <span className="text-muted-2">•</span>
            <span className="text-muted">Не для оценивания личности</span>
          </div>
        </div>
      </div>
    </footer>
  );
}