"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NAV_BY_ROLE, NAV_PUBLIC } from "@/lib/routes";
import { clearAuth } from "@/lib/api/client";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Settings, Sun, Moon } from "lucide-react";
import { useUI } from "./Providers";
import { useTheme } from "./ThemeProvider";

function NavLink({ href, label }: { href: string; label: string }) {
  const p = usePathname();
  const active = p === href || p.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={[
        "px-3 py-2 rounded-elas text-sm transition",
        active
          ? "bg-surface-subtle text-fg shadow-soft"
          : "text-muted hover:bg-surface-subtle hover:text-fg",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

const ROLE_LABELS: Record<string, string> = {
  student: "Студент",
  teacher: "Преподаватель",
  admin: "Администратор",
};

export default function TopNav() {
  const router = useRouter();
  const { state, setLoggedIn, setConsent } = useUI();
  const items = NAV_BY_ROLE[state.role];
  const { theme, setTheme } = useTheme();

  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <header className="sticky top-0 z-50 bg-surface/80 backdrop-blur-xl shadow-soft">
      <div className="mx-auto max-w-elas-page px-4 py-3 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="relative h-9 w-9 rounded-elas-lg bg-primary-muted grid place-items-center overflow-hidden shadow-soft">
            <div
              className="absolute inset-0 opacity-80"
              style={{
                background:
                  "radial-gradient(circle at 30% 20%, rgba(142,91,255,.35), transparent 60%)",
              }}
            />
            <div className="h-2.5 w-2.5 rounded-full bg-primary shadow-glow" />
          </div>
          <span className="font-semibold tracking-wide">ELAS</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 rounded-full bg-surface/70 px-2 py-1 shadow-soft">
          {state.loggedIn && items.map((x) => <NavLink key={x.href} href={x.href} label={x.label} />)}
          {NAV_PUBLIC.map((x) => <NavLink key={x.href} href={x.href} label={x.label} />)}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            aria-label="Переключить тему"
            onClick={() => setTheme(nextTheme)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-elas bg-surface-subtle text-fg hover:opacity-90 transition shadow-soft"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {state.loggedIn && (
            <Badge className="rounded-full px-2.5 py-1 text-xs font-medium bg-surface-subtle shadow-soft">
              {ROLE_LABELS[state.role] ?? state.role}
            </Badge>
          )}

          <Link href="/settings" aria-label="Настройки">
            <Button variant="ghost" size="sm" className="rounded-elas shadow-soft bg-surface-subtle">
              <Settings size={18} />
            </Button>
          </Link>

          {state.loggedIn ? (
            <Button
              variant="outline"
              size="sm"
              className="rounded-elas shadow-soft bg-surface-subtle border-0"
              onClick={() => {
                clearAuth();
                setLoggedIn(false);
                setConsent(false);
                router.push("/");
              }}
            >
              Выйти
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/auth/register">
                <Button variant="outline" size="sm" className="rounded-elas shadow-soft bg-surface-subtle border-0">
                  Регистрация
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button size="sm" className="rounded-elas shadow-soft">
                  Войти
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}