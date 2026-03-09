"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  NAV_PUBLIC_LEFT,
  NAV_PUBLIC_RIGHT,
  NAV_APP_BY_ROLE,
  ROLE_HOME,
} from "@/lib/nav";
import type { NavItem, NavDropdownItem } from "@/lib/nav";
import type { Role } from "@/lib/roles";
import { clearAuth } from "@/lib/api/client";
import Button from "@/components/ui/Button";
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
} from "lucide-react";
import { useUI } from "./Providers";
import { useTheme } from "./ThemeProvider";
import QuickSearch, { QuickSearchTrigger } from "./QuickSearch";
import { useTeacherLiveSession } from "@/hooks/useTeacherLiveSession";
import { cn } from "@/lib/cn";

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

function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 shrink-0">
      <div className="relative h-9 w-9 rounded-elas-lg bg-primary-muted grid place-items-center overflow-hidden ring-1 ring-[color:var(--border)]/25">
        <div
          className="absolute inset-0 opacity-95"
          style={{
            background:
              "radial-gradient(circle at 30% 20%, rgba(142,91,255,.34) 0%, rgba(142,91,255,.16) 38%, rgba(142,91,255,0) 62%)",
          }}
        />
        <div className="h-2.5 w-2.5 rounded-full bg-[rgb(var(--primary))] shadow-soft" />
      </div>
      <span className="font-semibold tracking-wide text-fg">ELAS</span>
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
  return (
    <Link
      href={href}
      className={cn(
        "px-3 py-2 rounded-full text-sm font-medium transition-[background-color,color] duration-150",
        active
          ? "bg-surface-subtle/80 text-fg"
          : "text-muted hover:text-fg hover:bg-surface-subtle/60",
        className
      )}
    >
      {label}
    </Link>
  );
}

function PublicNavItem({ item }: { item: NavItem }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  if (item.type === "link") {
    return <NavLink href={item.href} label={item.label} active={path === item.href} />;
  }

  const dropdown = item as NavDropdownItem;
  const hasCardStyle = dropdown.children.some((c) => c.subtitle ?? c.icon);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors",
          open
            ? "text-fg bg-surface-subtle/80"
            : "text-muted hover:text-fg hover:bg-surface-subtle/60"
        )}
      >
        {dropdown.label}
        <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className={cn(
            "absolute left-0 top-full mt-2 z-50",
            hasCardStyle
              ? "min-w-[280px] rounded-2xl bg-surface shadow-card ring-1 ring-[color:var(--border)]/25 py-2"
              : "min-w-[200px] rounded-xl bg-surface shadow-card ring-1 ring-[color:var(--border)]/25 py-1"
          )}
        >
          {dropdown.children.map((child) => {
            const IconComp = child.icon ? PUBLIC_ICONS[child.icon] : null;
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 transition-colors",
                  hasCardStyle
                    ? "px-4 py-3 hover:bg-surface-subtle/80"
                    : "px-4 py-2.5 text-sm text-fg hover:bg-surface-subtle"
                )}
              >
                {IconComp && (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-muted/60 text-[rgb(var(--primary))]">
                    <IconComp size={18} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-fg truncate">{child.label}</div>
                  {child.subtitle && (
                    <div className="text-xs text-muted truncate mt-0.5">
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
  role,
  liveSessionId,
}: {
  item: import("@/lib/nav").AppNavItem;
  role: Role;
  liveSessionId: string | null;
}) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  if (item.type === "link") {
    const href = item.href;
    const active =
      !!path &&
      (path === href ||
        path.startsWith(href + "/") ||
        (path.startsWith("/teacher/session/") && href.includes("filter=live")));
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
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors",
          open
            ? "text-fg bg-surface-subtle/80"
            : "text-muted hover:text-fg hover:bg-surface-subtle/60"
        )}
      >
        {dropdown.label}
        <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 min-w-[220px] rounded-2xl bg-surface shadow-card ring-1 ring-[color:var(--border)]/25 py-2 z-50">
          {dropdown.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center justify-between gap-2 px-4 py-2.5 text-sm transition-colors rounded-xl mx-1",
                child.accent
                  ? "bg-primary-muted/50 text-[rgb(var(--primary))] font-medium hover:bg-primary-muted"
                  : "text-fg hover:bg-surface-subtle/80"
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
          ))}
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
        "bg-surface-subtle/80 hover:bg-surface-subtle shadow-soft",
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
  const { state, setLoggedIn, setConsent } = useUI();
  const { theme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const liveSession = useTeacherLiveSession(state.role);

  const nextTheme = theme === "dark" ? "light" : "dark";

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

  const handleLogout = useCallback(() => {
    clearAuth();
    setLoggedIn(false);
    setConsent(false);
    setProfileOpen(false);
    setMobileOpen(false);
    router.push("/");
  }, [router, setLoggedIn, setConsent]);

  const consentRequired = state.loggedIn && !state.consent;
  const appNavItems = NAV_APP_BY_ROLE[state.role];

  return (
    <>
      <header className="sticky top-0 z-50 pt-3 pb-1 px-3 sm:px-4">
        <div className="mx-auto max-w-6xl rounded-full bg-surface/80 backdrop-blur-xl shadow-card ring-1 ring-[color:var(--border)]/25">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              <Logo href={state.loggedIn ? ROLE_HOME[state.role] : "/"} />
            </div>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center max-w-2xl">
              {!state.loggedIn &&
                NAV_PUBLIC_LEFT.map((item) => (
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
                    role={state.role}
                    liveSessionId={liveSession?.id ?? null}
                  />
                ))}
            </nav>

            {/* Center: Quick Search bar (logged in) */}
            {state.loggedIn && (
              <div className="hidden md:flex flex-1 max-w-md justify-center min-w-0">
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className={cn(
                    "w-full max-w-sm flex items-center gap-2.5 h-10 pl-4 pr-3 rounded-full",
                    "bg-surface-subtle/80 hover:bg-surface-subtle text-muted hover:text-fg",
                    "ring-1 ring-[color:var(--border)]/30 shadow-soft",
                    "transition-colors duration-150 text-left"
                  )}
                >
                  <Search size={18} className="shrink-0 text-muted" />
                  <span className="flex-1 truncate text-sm">Quick search...</span>
                  <kbd className="hidden sm:inline-flex h-6 items-center px-1.5 rounded bg-surface text-[10px] font-medium text-muted border border-[color:var(--border)]/40">
                    ⌘K
                  </kbd>
                </button>
              </div>
            )}

            {/* Right */}
            <div className="flex items-center gap-2 shrink-0">
              {state.loggedIn && state.role === "student" && (
                <Link
                  href="/student/sessions?join=1"
                  onClick={() => setMobileOpen(false)}
                >
                  <Button variant="outline" size="sm">
                    Join by code
                  </Button>
                </Link>
              )}

              {state.loggedIn && state.role === "teacher" && liveSession && (
                <Link
                  href={`/teacher/session/${liveSession.id}`}
                  className="text-xs font-medium text-[rgb(var(--primary))] bg-primary/10 px-2.5 py-1.5 rounded-full ring-1 ring-[rgb(var(--primary))]/20 hover:bg-primary/15 transition-colors"
                >
                  LIVE •{" "}
                  {liveSession.title.length > 18
                    ? liveSession.title.slice(0, 18) + "…"
                    : liveSession.title}
                </Link>
              )}

              <ThemeToggle theme={theme} onToggle={() => setTheme(nextTheme)} />

              {state.loggedIn && (
                <>
                  <Link
                    href="/settings"
                    aria-label="Настройки"
                    className="md:inline-flex hidden"
                  >
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-subtle/80 text-fg hover:bg-surface-subtle shadow-soft transition-colors"
                    >
                      <Settings size={18} />
                    </button>
                  </Link>

                  <div className="relative" ref={profileRef}>
                    <button
                      type="button"
                      onClick={() => setProfileOpen((o) => !o)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-subtle/80 text-fg hover:bg-surface-subtle shadow-soft transition-colors"
                      aria-label="Account menu"
                    >
                      <User size={18} />
                    </button>

                    {profileOpen && (
                      <div className="absolute right-0 top-full mt-2 min-w-[200px] rounded-2xl bg-surface shadow-card ring-1 ring-[color:var(--border)]/25 py-2 z-50">
                        {/* ✅ PROFILE */}
                        <Link
                          href="/profile"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-fg hover:bg-surface-subtle/80 rounded-xl mx-1"
                        >
                          <User size={16} />
                          Profile
                        </Link>

                        <Link
                          href="/settings"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-fg hover:bg-surface-subtle/80 rounded-xl mx-1 md:hidden"
                        >
                          <Settings size={16} />
                          Settings
                        </Link>

                        <Link
                          href="/docs"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-fg hover:bg-surface-subtle/80 rounded-xl mx-1"
                        >
                          <HelpCircle size={16} />
                          Help
                        </Link>

                        {consentRequired && (
                          <Link
                            href={`/consent?next=${encodeURIComponent(
                              pathname || "/"
                            )}`}
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-warning hover:bg-surface-subtle/80 rounded-xl mx-1"
                          >
                            <ShieldCheck size={16} />
                            Consent required
                          </Link>
                        )}

                        <div className="my-1 h-px bg-[color:var(--border)]/60" />

                        <button
                          type="button"
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-fg hover:bg-surface-subtle/80 rounded-xl mx-1 text-left"
                        >
                          <LogOut size={16} />
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {!state.loggedIn && (
                <div className="flex items-center gap-2">
                  <Link href={NAV_PUBLIC_RIGHT.signIn.href}>
                    <Button variant="outline" size="sm">
                      {NAV_PUBLIC_RIGHT.signIn.label}
                    </Button>
                  </Link>
                  <Link href={NAV_PUBLIC_RIGHT.getStarted.href}>
                    <Button size="sm">
                      {NAV_PUBLIC_RIGHT.getStarted.label}
                    </Button>
                  </Link>
                </div>
              )}

              {/* Mobile menu trigger */}
              <button
                type="button"
                aria-label="Menu"
                onClick={() => setMobileOpen((o) => !o)}
                className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-subtle/80 text-fg shadow-soft"
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="lg:hidden border-b border-border/40 bg-surface/95 backdrop-blur-xl">
            <div className="mx-auto max-w-elas-page px-4 py-4 space-y-3">
              {!state.loggedIn &&
                NAV_PUBLIC_LEFT.map((item) => (
                  <div key={item.type === "dropdown" ? item.label : item.href}>
                    {item.type === "link" ? (
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className="block py-2 text-fg"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <div className="py-2">
                        <div className="text-muted font-medium text-sm">
                          {(item as NavDropdownItem).label}
                        </div>
                        <div className="pl-3 mt-1 space-y-1">
                          {(item as NavDropdownItem).children.map((c) => (
                            <Link
                              key={c.href}
                              href={c.href}
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
                    <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted px-1">
                      Navigation
                    </div>
                    <div className="mt-2 space-y-1">
                      {appNavItems.map((item) => (
                        <div key={item.type === "dropdown" ? item.label : item.href}>
                          {item.type === "link" ? (
                            <Link
                              href={item.href}
                              onClick={() => setMobileOpen(false)}
                              className="block py-2 text-fg"
                            >
                              {item.label}
                            </Link>
                          ) : (
                            <div className="py-2">
                              <div className="text-muted font-medium text-sm">
                                {(item as NavDropdownItem).label}
                              </div>
                              <div className="pl-3 mt-1 space-y-1">
                                {(item as NavDropdownItem).children.map((c) => (
                                  <Link
                                    key={c.href}
                                    href={c.href}
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

                  <div className="pt-2 border-t border-border/40">
                    <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted px-1">
                      Account
                    </div>
                    <div className="mt-2 space-y-1">
                      <Link
                        href="/profile"
                        onClick={() => setMobileOpen(false)}
                        className="block py-2 text-fg"
                      >
                        Profile
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setMobileOpen(false)}
                        className="block py-2 text-fg"
                      >
                        Settings
                      </Link>

                      {consentRequired && (
                        <Link
                          href={`/consent?next=${encodeURIComponent(pathname || "/")}`}
                          onClick={() => setMobileOpen(false)}
                          className="block py-2 text-warning"
                        >
                          Consent required
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full text-left block py-2 text-fg"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <QuickSearch open={searchOpen} onClose={() => setSearchOpen(false)} role={state.role} />
    </>
  );
}