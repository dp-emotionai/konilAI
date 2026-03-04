import type { Role } from "./roles";

export const ROLE_HOME: Record<Role, string> = {
  student: "/student/dashboard",
  teacher: "/teacher/dashboard",
  admin: "/admin/dashboard",
};

export const NAV_BY_ROLE: Record<Role, { label: string; href: string }[]> = {
  student: [
    { label: "Дашборд", href: "/student/dashboard" },
    { label: "Сессии", href: "/student/sessions" },
    { label: "Итоги", href: "/student/summary" },
    { label: "Согласие", href: "/consent" },
  ],
  teacher: [
    { label: "Дашборд", href: "/teacher/dashboard" },
    { label: "Группы", href: "/teacher/groups" },
    { label: "Сессии", href: "/teacher/sessions" },
    { label: "Отчёты", href: "/teacher/reports" },
    { label: "Сравнение", href: "/teacher/compare" },
  ],
  admin: [
    { label: "Дашборд", href: "/admin/dashboard" },
    { label: "Пользователи", href: "/admin/users" },
    { label: "Группы", href: "/admin/groups" },
    { label: "Модель", href: "/admin/model" },
    { label: "Хранилище", href: "/admin/storage" },
    { label: "Аудит", href: "/admin/audit" },
  ],
};

export const NAV_PUBLIC = [
  { label: "Конфиденциальность", href: "/privacy" },
  { label: "Этика", href: "/ethics" },
  { label: "FAQ", href: "/faq" },
];
