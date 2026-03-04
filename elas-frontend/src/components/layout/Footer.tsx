import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-white/10 py-8 text-sm text-white/50">
      <div className="mx-auto max-w-6xl px-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div>
          © {new Date().getFullYear()} ELAS — система аналитики эмоций в обучении
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/privacy" className="hover:text-white/70 transition">
            Конфиденциальность
          </Link>
          <Link href="/ethics" className="hover:text-white/70 transition">
            Этика
          </Link>
          <span className="text-white/30">•</span>
          <span>Без записи видео</span>
          <span className="text-white/30">•</span>
          <span>Не для оценивания</span>
        </div>
      </div>
    </footer>
  );
}
