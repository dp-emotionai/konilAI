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
      { type: "link", label: "Конфиденциальность", href: "/privacy", subtitle: "Политика конфиденциальности", icon: "Lock" },
      { type: "link", label: "Этика", href: "/ethics", subtitle: "Этичное использование AI", icon: "Heart" },
      { type: "link", label: "FAQ", href: "/faq", subtitle: "Частые вопросы", icon: "HelpCircle" },
    ],
  },
];

export const NAV_PUBLIC_RIGHT = {
  signIn: { label: "Войти", href: "/auth/login" },
  getStarted: { label: "Начать", href: "/auth/register" },
  demo: { label: "Демо", href: "/demo" },
};

/** App TopBar (logged in): role-based. Max 3–6 top-level; rest in dropdowns. */
export type AppNavItem = NavLinkItem | NavDropdownItem;

export const NAV_APP_BY_ROLE: Record<Role, AppNavItem[]> = {
  student: [
    { type: "link", label: "Дашборд", href: "/student/dashboard" },
    { type: "link", label: "Сессии", href: "/student/sessions" },
    { type: "link", label: "Группы", href: "/student/groups" },
    { type: "link", label: "Сводка", href: "/student/summary" },
    {
      type: "dropdown",
      label: "Ресурсы",
      children: [
        { type: "link", label: "Документация", href: "/docs" },
        { type: "link", label: "Конфиденциальность", href: "/privacy" },
        { type: "link", label: "Этика", href: "/ethics" },
      ],
    },
  ],
  teacher: [
    { type: "link", label: "Дашборд", href: "/teacher/dashboard" },
    {
      type: "dropdown",
      label: "Сессии",
      children: [
        { type: "link", label: "Сейчас в эфире", href: "/teacher/sessions?filter=live", badge: "live" },
        { type: "link", label: "Предстоящие", href: "/teacher/sessions?filter=upcoming" },
        { type: "link", label: "Завершённые", href: "/teacher/sessions?filter=ended" },
        { type: "link", label: "Создать сессию", href: "/teacher/sessions/new", accent: true },
      ],
    },
    { type: "link", label: "Группы", href: "/teacher/groups" },
    { type: "link", label: "Отчёты", href: "/teacher/reports" },
    { type: "link", label: "Сравнение", href: "/teacher/compare" },
    {
      type: "dropdown",
      label: "Ресурсы",
      children: [
        { type: "link", label: "Документация", href: "/docs" },
        { type: "link", label: "Конфиденциальность", href: "/privacy" },
        { type: "link", label: "Этика", href: "/ethics" },
        { type: "link", label: "Статус", href: "/status" },
      ],
    },
  ],
  admin: [
    { type: "link", label: "Дашборд", href: "/admin/dashboard" },
    { type: "link", label: "Пользователи", href: "/admin/users" },
    { type: "link", label: "Группы", href: "/admin/groups" },
    { type: "link", label: "Аудит", href: "/admin/audit" },
    { type: "link", label: "Модель", href: "/admin/model" },
    { type: "link", label: "Хранилище", href: "/admin/storage" },
  ],
};

export const ROLE_LABELS: Record<Role, string> = {
  student: "Студент",
  teacher: "Преподаватель",
  admin: "Админ",
};

export const ROLE_HOME: Record<Role, string> = {
  student: "/student/dashboard",
  teacher: "/teacher/dashboard",
  admin: "/admin/dashboard",
};
