export const ROUTES = {
  home: "/",
  privacy: "/privacy",
  ethics: "/ethics",
  faq: "/faq",

  login: "/auth/login",
  register: "/auth/register",
  forgotPassword: "/auth/forgot-password",

  consent: "/consent",
  profile: "/profile",

  studentDashboard: "/student/dashboard",
  studentSessions: "/student/sessions",
  studentGroups: "/student/groups",
  studentSummary: "/student/summary",

  teacherDashboard: "/teacher/dashboard",
  teacherGroups: "/teacher/groups",
  teacherSessions: "/teacher/sessions",
  teacherReports: "/teacher/reports",
  teacherCompare: "/teacher/compare",

  adminDashboard: "/admin/dashboard",
  adminUsers: "/admin/users",
  adminGroups: "/admin/groups",
  adminAudit: "/admin/audit",
  adminModel: "/admin/model",
  adminStorage: "/admin/storage",
} as const;

export const ROLE_HOME = {
  student: ROUTES.studentDashboard,
  teacher: ROUTES.teacherDashboard,
  admin: ROUTES.adminDashboard,
} as const;

export type AppRole = keyof typeof ROLE_HOME;

export function getRoleHome(role?: string | null) {
  if (!role) return ROUTES.home;
  if (role === "student") return ROLE_HOME.student;
  if (role === "teacher") return ROLE_HOME.teacher;
  if (role === "admin") return ROLE_HOME.admin;
  return ROUTES.home;
}