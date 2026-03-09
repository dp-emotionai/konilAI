/**
 * Information Architecture: Public + role-based nav with dropdowns.
 * Top-level max 4–6 items; rest in dropdowns. Tokens-only UI.
 */

import type { Role } from "./roles";

export type NavLinkItem = { type: "link"; label: string; href: string };
export type NavDropdownChild = NavLinkItem & {
  accent?: boolean;
  badge?: "live";
  /** Optional subtitle (muted) below title — for card-style dropdown */
  subtitle?: string;
  /** Lucide icon name for dropdown item (e.g. "LayoutDashboard") */
  icon?: string;
};
export type NavDropdownItem = {
  type: "dropdown";
  label: string;
  children: NavDropdownChild[];
};
export type NavItem = NavLinkItem | NavDropdownItem;

/** Public TopBar (logged out): краткое меню без лишних разделов; right: Sign in, Get started */
export const NAV_PUBLIC_LEFT: NavItem[] = [
  {
    type: "link",
    label: "Продукт",
    href: "/",
  },
  {
    type: "link",
    label: "Документация",
    href: "/docs",
  },
  {
    type: "dropdown",
    label: "Политики",
    children: [
      { type: "link", label: "Privacy", href: "/privacy", subtitle: "Политика конфиденциальности", icon: "Lock" },
      { type: "link", label: "Ethics", href: "/ethics", subtitle: "Этичное использование AI", icon: "Heart" },
      { type: "link", label: "Privacy", href: "/privacy", subtitle: "Privacy policy", icon: "Lock" },
      { type: "link", label: "FAQ", href: "/faq", subtitle: "Частые вопросы", icon: "HelpCircle" },
    ],
  },
];

export const NAV_PUBLIC_RIGHT = {
  signIn: { label: "Sign in", href: "/auth/login" },
  getStarted: { label: "Get started", href: "/auth/register" },
  demo: { label: "Request demo", href: "/demo" },
};

/** App TopBar (logged in): role-based. Max 3–6 top-level; rest in dropdowns. */
export type AppNavItem = NavLinkItem | NavDropdownItem;

export const NAV_APP_BY_ROLE: Record<Role, AppNavItem[]> = {
  student: [
    { type: "link", label: "Dashboard", href: "/student/dashboard" },
    { type: "link", label: "Sessions", href: "/student/sessions" },
    { type: "link", label: "Groups", href: "/student/groups" },
    { type: "link", label: "Summary", href: "/student/summary" },
    {
      type: "dropdown",
      label: "Resources",
      children: [
        { type: "link", label: "Docs", href: "/docs" },
        { type: "link", label: "Consent & privacy", href: "/privacy" },
        { type: "link", label: "Ethics", href: "/ethics" },
      ],
    },
  ],
  teacher: [
    { type: "link", label: "Dashboard", href: "/teacher/dashboard" },
    {
      type: "dropdown",
      label: "Sessions",
      children: [
        { type: "link", label: "Live now", href: "/teacher/sessions?filter=live", badge: "live" },
        { type: "link", label: "Upcoming", href: "/teacher/sessions?filter=upcoming" },
        { type: "link", label: "Ended", href: "/teacher/sessions?filter=ended" },
        { type: "link", label: "Create session", href: "/teacher/sessions/new", accent: true },
      ],
    },
    { type: "link", label: "Groups", href: "/teacher/groups" },
    { type: "link", label: "Reports", href: "/teacher/reports" },
    { type: "link", label: "Compare", href: "/teacher/compare" },
    {
      type: "dropdown",
      label: "Resources",
      children: [
        { type: "link", label: "Docs", href: "/docs" },
        { type: "link", label: "Consent & privacy", href: "/privacy" },
        { type: "link", label: "Ethics", href: "/ethics" },
        { type: "link", label: "Status", href: "/status" },
      ],
    },
  ],
  admin: [
    { type: "link", label: "Dashboard", href: "/admin/dashboard" },
    { type: "link", label: "Users", href: "/admin/users" },
    { type: "link", label: "Groups", href: "/admin/groups" },
    { type: "link", label: "Audit", href: "/admin/audit" },
    { type: "link", label: "Model", href: "/admin/model" },
    { type: "link", label: "Storage", href: "/admin/storage" },
  ],
};

export const ROLE_LABELS: Record<Role, string> = {
  student: "Student",
  teacher: "Teacher",
  admin: "Admin",
};

export const ROLE_HOME: Record<Role, string> = {
  student: "/student/dashboard",
  teacher: "/teacher/dashboard",
  admin: "/admin/dashboard",
};
