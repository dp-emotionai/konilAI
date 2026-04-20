"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  NAV_PUBLIC_LEFT,
  NAV_PUBLIC_RIGHT,
  NAV_APP_BY_ROLE,
} from "@/lib/nav";
import type { NavItem, NavDropdownItem } from "@/lib/nav";
import type { Role } from "@/lib/roles";
import { clearAuth, resolveAvatarUrl } from "@/lib/api/client";
import Button from "@/components/ui/Button";
import Image from "next/image";
import {
  Settings,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  LogOut,
  HelpCircle,
  User,
  Search,
  LayoutDashboard,
  Video,
  BarChart3,
  ShieldCheck,
  Code,
  GraduationCap,
  Users,
  BookOpen,
  Briefcase,
  FileText,
  Newspaper,
  Shield,
  Lock,
  Heart,
  Activity,
  Bell,
} from "lucide-react";
import { useUI } from "./Providers";
import { useTheme } from "./ThemeProvider";
import QuickSearch, { QuickSearchTrigger } from "./QuickSearch";
import { useTeacherLiveSession } from "@/hooks/useTeacherLiveSession";
import { cn } from "@/lib/cn";

const DROPDOWN_PANEL =
  "rounded-xl overflow-hidden shadow-elevated border border-[color:var(--border)] " +
  "bg-surface backdrop-blur-xl " +
  "p-2 animate-dropdown-in " +
  "ring-1 ring-black/[0.04]";

const DROPDOWN_ITEM =
  "rounded-lg px-3 py-2 transition-all duration-150 text-fg " +
  "hover:bg-surface-subtle";

const PUBLIC_ICONS: Record<
  string,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  LayoutDashboard,
  Video,
  BarChart3,
  ShieldCheck,
  Code,
  GraduationCap,
  Users,
  BookOpen,
  Briefcase,
  FileText,
  Newspaper,
  Shield,
  Lock,
  Heart,
  Activity,
  HelpCircle,
};

function KonilAILogoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M6 4v16h2.5V12l5.5 8h2.5l-5.5-7.5 5.5-8h-2.5L8.5 12V4H6z"
        fill="currentColor"
        className="text-[rgb(var(--primary))]"
      />
    </svg>
  );
}

function Logo({ href = "/" }: { href?: string }) {
  const safeHref = typeof href === "string" && href.length > 0 ? href : "/";

  return (
    <Link
      href={safeHref}
      className="flex shrink-0 items-center gap-2.5 rounded-elas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-elas-lg bg-primary-muted ring-1 ring-[color:var(--border)]/25">
        <KonilAILogoIcon className="h-5 w-5" />
      </span>
      <span className="font-semibold tracking-wide text-fg">KonilAI</span>
    </Link>
  );
}

function NavLink({
  href,
  label,
  active,
  className,
}: {
  href: string;
  label: string;
  active?: boolean;
  className?: string;
}) {
  const safeHref = typeof href === "string" && href.length > 0 ? href : "/";

  return (
    <Link
      href={safeHref}
      className={cn(
        "rounded-full px-3 py-2 text-sm font-medium transition-[background-color,color] duration-150",
        active
          ? "bg-surface-subtle/80 text-fg"
          : "text-muted hover:bg-surface-subtle/60 hover:text-fg",
        className
      )}
    >
      {label}
    </Link>
  );
}

function PublicNavItem({ item }: { item: NavItem }) {
  const path = usePathname();
  const safePath = typeof path === "string" ? path : "";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    if (open) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  useEffect(() => {
    if (item.type === "link") return;
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, item.type]);

  if (item.type === "link") {
    return (
      <NavLink
        href={item.href}
        label={item.label}
        active={safePath === item.href}
      />
    );
  }

  const dropdown = item as NavDropdownItem;
  const children = Array.isArray(dropdown.children) ? dropdown.children : [];
  const hasCardStyle = children.some((c) => Boolean(c.subtitle ?? c.icon));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]",
          open
            ? "bg-surface-subtle/80 text-fg"
            : "text-muted hover:bg-surface-subtle/60 hover:text-fg"
        )}
      >
        {dropdown.label}
        <ChevronDown
          size={14}
          className={cn("transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute left-0 top-full z-50 mt-2 py-2",
            hasCardStyle ? "min-w-[280px]" : "min-w-[200px]",
            DROPDOWN_PANEL
          )}
        >
          {children.map((child) => {
            const IconComp = child.icon ? PUBLIC_ICONS[child.icon] : null;
            const childHref =
              typeof child.href === "string" && child.href.length > 0
                ? child.href
                : "/";

            return (
              <Link
                key={childHref}
                href={childHref}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-fg transition-all hover:bg-black/[0.04] dark:hover:bg-surface-subtle",
                  hasCardStyle ? "px-4 py-3" : "px-3 py-2"
                )}
              >
                {IconComp && (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-muted/60 text-[rgb(var(--primary))]">
                    <IconComp size={18} />
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-fg">{child.label}</div>
                  {child.subtitle && (
                    <div className="mt-0.5 truncate text-xs text-muted">
                      {child.subtitle}
                    </div>
                  )}
                </div>

                <ChevronRight size={16} className="shrink-0 text-muted" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AppNavItem({
  item,
  liveSessionId,
}: {
  item: import("@/lib/nav").AppNavItem;
  role: Role;
  liveSessionId: string | null;
}) {
  const path = usePathname();
  const safePath = typeof path === "string" ? path : "";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    if (open) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (item.type === "link") {
    const href =
      typeof item.href === "string" && item.href.length > 0 ? item.href : "/";
    const active =
      !!safePath &&
      (safePath === href ||
        safePath.startsWith(`${href}/`) ||
        (safePath.startsWith("/teacher/session/") && href.includes("filter=live")));

    return (
      <NavLink
        href={href}
        label={item.label}
        active={active}
        className={
          "badge" in item && item.badge === "live" && liveSessionId
            ? "text-[rgb(var(--primary))]"
            : undefined
        }
      />
    );
  }

  const dropdown = item as NavDropdownItem;
  const children = Array.isArray(dropdown.children) ? dropdown.children : [];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors",
          open
            ? "bg-surface-subtle/80 text-fg"
            : "text-muted hover:bg-surface-subtle/60 hover:text-fg"
        )}
      >
        {dropdown.label}
        <ChevronDown
          size={14}
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          className={cn(
            "absolute left-0 top-full z-50 mt-2 min-w-[220px]",
            DROPDOWN_PANEL
          )}
        >
          {children.map((child) => {
            const childHref =
              typeof child.href === "string" && child.href.length > 0
                ? child.href
                : "/";

            return (
              <Link
                key={childHref}
                href={childHref}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-fg transition-all hover:bg-black/[0.04] dark:hover:bg-surface-subtle",
                  child.accent
                    ? "bg-primary-muted/50 font-medium text-[rgb(var(--primary))] hover:bg-primary-muted/70"
                    : ""
                )}
              >
                <span className="truncate">{child.label}</span>

                {child.badge === "live" && liveSessionId && (
                  <span className="text-[10px] uppercase text-[rgb(var(--primary))]">
                    Live
                  </span>
                )}

                {!child.accent && !(child.badge === "live" && liveSessionId) && (
                  <ChevronRight size={14} className="shrink-0 text-muted" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: "light" | "dark";
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-label="Переключить тему"
      onClick={onToggle}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full text-fg",
        "bg-surface-subtle/80 shadow-soft hover:bg-surface-subtle",
        "transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)]/35"
      )}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

export default function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const safePathname = typeof pathname === "string" ? pathname : "/";

  const { state, setLoggedIn, setConsent, setRole, setStatus } = useUI();
  const { theme, setTheme } = useTheme();

  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);

  const safeRole: Role | null = state.role ?? null;
  const liveSession = useTeacherLiveSession(safeRole ?? "teacher");

  const statusLabel = useMemo(() => {
    const s = state.status;
    if (!s) return null;
    if (s === "approved") return "Подтверждённый доступ";
    if (s === "pending") return "Ожидает одобрения";
    if (s === "limited") return "Ограниченный доступ";
    if (s === "blocked") return "Аккаунт заблокирован";
    return null;
  }, [state.status]);

  const nextTheme = theme === "dark" ? "light" : "dark";

  const appNavItems = useMemo(() => {
    if (!safeRole) return [];
    return NAV_APP_BY_ROLE[safeRole] ?? [];
  }, [safeRole]);

  const homeHref = "/";
  const consentRequired = Boolean(state.loggedIn && !state.consent);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };

    if (profileOpen) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [profileOpen]);

  useEffect(() => {
    if (!profileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProfileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [profileOpen]);

  const handleLogout = useCallback(() => {
    clearAuth();
    setLoggedIn(false);
    setConsent(false);
    setRole(null);
    setStatus(null);
    setProfileOpen(false);
    setMobileOpen(false);
    router.push("/");
  }, [router, setLoggedIn, setConsent, setRole, setStatus]);

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-[color:var(--border)] bg-surface/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3 flex-1 lg:flex-none">
            <div className="flex shrink-0 items-center gap-3 sm:gap-4">
              <Logo href={homeHref} />
            </div>

            <nav className="hidden max-w-2xl flex-1 items-center justify-center gap-0.5 lg:flex">
              {!state.loggedIn &&
                (Array.isArray(NAV_PUBLIC_LEFT) ? NAV_PUBLIC_LEFT : []).map((item) => (
                  <PublicNavItem
                    key={item.type === "dropdown" ? item.label : item.href}
                    item={item}
                  />
                ))}

              {state.loggedIn &&
                appNavItems.map((item) => (
                  <AppNavItem
                    key={item.type === "dropdown" ? item.label : item.href}
                    item={item}
                    role={safeRole ?? "student"}
                    liveSessionId={liveSession?.id ?? null}
                  />
                ))}
            </nav>

            {state.loggedIn && (
              <div className="hidden min-w-0 max-w-md flex-1 justify-center md:flex">
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  aria-label="Открыть поиск (⌘K)"
                  className={cn(
                    "h-10 w-full max-w-sm rounded-full pl-4 pr-3 text-left",
                    "flex items-center gap-2.5",
                    "bg-surface-subtle/80 text-muted shadow-soft ring-1 ring-[color:var(--border)]/30",
                    "transition-colors duration-150 hover:bg-surface-subtle hover:text-fg",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
                  )}
                >
                  <Search size={18} className="shrink-0 text-muted" />
                  <span className="flex-1 truncate text-sm">Поиск…</span>
                  <kbd className="hidden h-6 items-center rounded border border-[color:var(--border)]/40 bg-surface px-1.5 text-[10px] font-medium text-muted sm:inline-flex">
                    ⌘K
                  </kbd>
                </button>
              </div>
            )}

            <div className="flex shrink-0 items-center gap-2">
              {state.loggedIn && safeRole === "student" && (
                <Link
                  href="/student/sessions?join=1"
                  onClick={() => setMobileOpen(false)}
                  className="hidden sm:inline-block"
                >
                  <Button variant="outline" size="sm">
                    Войти по коду
                  </Button>
                </Link>
              )}

              {state.loggedIn && safeRole === "teacher" && liveSession && (
                <Link
                  href={`/teacher/session/${liveSession.id}`}
                  className="rounded-full bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-[rgb(var(--primary))] ring-1 ring-[rgb(var(--primary))]/20 transition-colors hover:bg-primary/15"
                >
                  LIVE •{" "}
                  {typeof liveSession.title === "string" && liveSession.title.length > 18
                    ? `${liveSession.title.slice(0, 18)}…`
                    : liveSession.title}
                </Link>
              )}

              <ThemeToggle theme={theme} onToggle={() => setTheme(nextTheme)} />

              {state.loggedIn && statusLabel && (
                <div className="hidden max-w-xs items-center sm:inline-flex">
                  <span className="truncate rounded-full bg-surface-subtle/80 px-3 py-1 text-xs text-muted ring-1 ring-[color:var(--border)]/40">
                    {statusLabel}
                  </span>
                </div>
              )}

              {state.loggedIn && (
                <>
                  <Link
                    href="/settings"
                    aria-label="Уведомления"
                    className="hidden md:inline-flex relative"
                  >
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-subtle/80 text-fg shadow-soft transition-colors hover:bg-surface-subtle"
                    >
                      <Bell size={18} />
                      <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-red-400"></span>
                    </button>
                  </Link>

                  <div className="relative" ref={profileRef}>
                    <button
                      type="button"
                      onClick={() => setProfileOpen((o) => !o)}
                      aria-expanded={profileOpen}
                      aria-haspopup="true"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-subtle/80 text-fg shadow-soft transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] overflow-hidden border border-[color:var(--border)]/10"
                      aria-label="Меню аккаунта"
                    >
                      {state.avatarUrl ? (
                         <Image 
                           src={resolveAvatarUrl(state.avatarUrl)!} 
                           alt={state.fullName || "User"} 
                           width={36} 
                           height={36} 
                           className="h-full w-full object-cover"
                         />
                      ) : (
                         <User size={18} />
                      )}
                    </button>

                    {profileOpen && (
                      <div
                        className={cn(
                          "absolute right-0 top-full z-50 mt-2 min-w-[200px] p-2",
                          DROPDOWN_PANEL
                        )}
                      >
                        {statusLabel && (
                          <div className="px-3 pb-1 pt-0.5 text-[10px] uppercase font-bold tracking-wider text-muted/60">
                            {statusLabel}
                          </div>
                        )}
                        {state.fullName && (
                          <div className="px-3 py-1 text-[13px] font-bold text-fg truncate">
                            {state.fullName}
                          </div>
                        )}

                        <Link
                          href="/profile"
                          onClick={() => setProfileOpen(false)}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg transition-all",
                            DROPDOWN_ITEM
                          )}
                        >
                          <User size={16} />
                          Профиль
                        </Link>

                        <Link
                          href="/settings"
                          onClick={() => setProfileOpen(false)}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg transition-all md:hidden",
                            DROPDOWN_ITEM
                          )}
                        >
                          <Settings size={16} />
                          Настройки
                        </Link>

                        <Link
                          href="/docs"
                          onClick={() => setProfileOpen(false)}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg transition-all",
                            DROPDOWN_ITEM
                          )}
                        >
                          <HelpCircle size={16} />
                          Помощь
                        </Link>

                        {consentRequired && (
                          <Link
                            href={`/consent?next=${encodeURIComponent(
                              safePathname || "/"
                            )}`}
                            onClick={() => setProfileOpen(false)}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-warning transition-all",
                              DROPDOWN_ITEM
                            )}
                          >
                            <ShieldCheck size={16} />
                            Нужно согласие
                          </Link>
                        )}

                        <div className="mx-2 my-1 h-px bg-[color:var(--border)]/60" />

                        <button
                          type="button"
                          onClick={handleLogout}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-fg transition-all",
                            DROPDOWN_ITEM
                          )}
                        >
                          <LogOut size={16} />
                          Выйти
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {!state.loggedIn && (
                <div className="flex items-center gap-2">
                  {NAV_PUBLIC_RIGHT?.signIn?.href && (
                    <Link href={NAV_PUBLIC_RIGHT.signIn.href}>
                      <Button variant="outline" size="sm">
                        {NAV_PUBLIC_RIGHT.signIn.label}
                      </Button>
                    </Link>
                  )}

                  {NAV_PUBLIC_RIGHT?.getStarted?.href && (
                    <Link href={NAV_PUBLIC_RIGHT.getStarted.href}>
                      <Button size="sm">
                        {NAV_PUBLIC_RIGHT.getStarted.label}
                      </Button>
                    </Link>
                  )}
                </div>
              )}

              <button
                type="button"
                aria-label="Открыть меню"
                onClick={() => setMobileOpen((o) => !o)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-subtle/80 text-fg shadow-soft lg:hidden"
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-b border-[color:var(--border)] bg-white/[0.97] shadow-elevated backdrop-blur-xl dark:bg-[rgba(16,18,26,0.98)] lg:hidden">
            <div className="mx-auto max-w-elas-page space-y-3 px-4 py-4">
              {!state.loggedIn &&
                (Array.isArray(NAV_PUBLIC_LEFT) ? NAV_PUBLIC_LEFT : []).map((item) => (
                  <div key={item.type === "dropdown" ? item.label : item.href}>
                    {item.type === "link" ? (
                      <Link
                        href={typeof item.href === "string" ? item.href : "/"}
                        onClick={() => setMobileOpen(false)}
                        className="block py-2 text-fg"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <div className="py-2">
                        <div className="text-sm font-medium text-muted">
                          {(item as NavDropdownItem).label}
                        </div>
                        <div className="mt-1 space-y-1 pl-3">
                          {((item as NavDropdownItem).children ?? []).map((c) => (
                            <Link
                              key={c.href}
                              href={typeof c.href === "string" ? c.href : "/"}
                              onClick={() => setMobileOpen(false)}
                              className="block py-1.5 text-sm text-fg"
                            >
                              {c.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

              {state.loggedIn && (
                <>
                  <QuickSearchTrigger
                    onClick={() => {
                      setSearchOpen(true);
                      setMobileOpen(false);
                    }}
                    className="w-full justify-center"
                  />

                  <div className="pt-1">
                    <div className="px-1 text-xs font-medium uppercase tracking-[0.16em] text-muted">
                      Навигация
                    </div>
                    <div className="mt-2 space-y-1">
                      {appNavItems.map((item) => (
                        <div key={item.type === "dropdown" ? item.label : item.href}>
                          {item.type === "link" ? (
                            <Link
                              href={typeof item.href === "string" ? item.href : "/"}
                              onClick={() => setMobileOpen(false)}
                              className="block py-2 text-fg"
                            >
                              {item.label}
                            </Link>
                          ) : (
                            <div className="py-2">
                              <div className="text-sm font-medium text-muted">
                                {(item as NavDropdownItem).label}
                              </div>
                              <div className="mt-1 space-y-1 pl-3">
                                {((item as NavDropdownItem).children ?? []).map((c) => (
                                  <Link
                                    key={c.href}
                                    href={typeof c.href === "string" ? c.href : "/"}
                                    onClick={() => setMobileOpen(false)}
                                    className="block py-1.5 text-sm text-fg"
                                  >
                                    {c.label}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-border/40 pt-2">
                    <div className="px-1 text-xs font-medium uppercase tracking-[0.16em] text-muted">
                      Аккаунт
                    </div>
                    <div className="mt-2 space-y-1">
                      <Link
                        href="/profile"
                        onClick={() => setMobileOpen(false)}
                        className="block py-2 text-fg"
                      >
                        Профиль
                      </Link>

                      <Link
                        href="/settings"
                        onClick={() => setMobileOpen(false)}
                        className="block py-2 text-fg"
                      >
                        Настройки
                      </Link>

                      {consentRequired && (
                        <Link
                          href={`/consent?next=${encodeURIComponent(
                            safePathname || "/"
                          )}`}
                          onClick={() => setMobileOpen(false)}
                          className="block py-2 text-warning"
                        >
                          Нужно согласие
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="block w-full py-2 text-left text-fg"
                      >
                        Выйти
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <QuickSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        role={safeRole ?? "student"}
      />
    </>
  );
}