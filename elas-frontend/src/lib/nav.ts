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

/** Public TopBar (logged out): Product, Solutions, Pricing, Resources, Demo/Contact; right: Sign in, Get started */
export const NAV_PUBLIC_LEFT: NavItem[] = [
  {
    type: "dropdown",
    label: "Product",
    children: [
      { type: "link", label: "Overview", href: "/", subtitle: "Platform overview and features", icon: "LayoutDashboard" },
      { type: "link", label: "Live Classroom", href: "/product/live", subtitle: "WebRTC lessons and sessions", icon: "Video" },
      { type: "link", label: "Live Analytics", href: "/product/analytics", subtitle: "Engagement and consent-first metrics", icon: "BarChart3" },
      { type: "link", label: "Consent & Privacy", href: "/product/consent", subtitle: "Ethical data handling", icon: "ShieldCheck" },
      { type: "link", label: "Integrations / API", href: "/product/integrations", subtitle: "Connect your tools", icon: "Code" },
    ],
  },
  {
    type: "dropdown",
    label: "Solutions",
    children: [
      { type: "link", label: "Schools / K-12", href: "/solutions/schools", subtitle: "For schools and K-12", icon: "GraduationCap" },
      { type: "link", label: "Tutoring centers", href: "/solutions/tutoring", subtitle: "Tutoring and coaching", icon: "Users" },
      { type: "link", label: "Higher Ed", href: "/solutions/higher-ed", subtitle: "Universities and colleges", icon: "BookOpen" },
      { type: "link", label: "Corporate training", href: "/solutions/corporate", subtitle: "Enterprise learning", icon: "Briefcase" },
    ],
  },
  { type: "link", label: "Pricing", href: "/pricing" },
  {
    type: "dropdown",
    label: "Resources",
    children: [
      { type: "link", label: "Docs / Help Center", href: "/docs", subtitle: "Documentation and guides", icon: "BookOpen" },
      { type: "link", label: "Case Studies", href: "/case-studies", subtitle: "Success stories", icon: "FileText" },
      { type: "link", label: "Blog", href: "/blog", subtitle: "Updates and articles", icon: "Newspaper" },
      { type: "link", label: "Security", href: "/security", subtitle: "Security practices", icon: "Shield" },
      { type: "link", label: "Privacy", href: "/privacy", subtitle: "Privacy policy", icon: "Lock" },
      { type: "link", label: "Ethics", href: "/ethics", subtitle: "Ethical AI use", icon: "Heart" },
      { type: "link", label: "Status", href: "/status", subtitle: "Service status", icon: "Activity" },
      { type: "link", label: "FAQ", href: "/faq", subtitle: "Frequently asked questions", icon: "HelpCircle" },
    ],
  },
  { type: "link", label: "Demo / Contact", href: "/demo" },
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
