"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useUI } from "@/components/layout/Providers";
import type { Role } from "@/lib/roles";

type Rule = { prefix: string; roles: Role[] };

const rules: Rule[] = [
  { prefix: "/student", roles: ["student"] },
  { prefix: "/teacher", roles: ["teacher"] },
  { prefix: "/admin", roles: ["admin"] },
];

const publicPrefixes = ["/", "/privacy", "/ethics", "/faq", "/auth", "/consent", "/settings", "/403"];

export default function RoleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useUI();

  const isPublic = useMemo(() => publicPrefixes.some((p) => pathname === p || pathname.startsWith(p + "/")), [pathname]);

  useEffect(() => {
    if (isPublic) return;

    const rule = rules.find((r) => pathname.startsWith(r.prefix));
    if (!rule) return;

    // must be logged in + correct role
    if (!state.loggedIn) {
      router.replace("/auth/login");
      return;
    }
    if (!rule.roles.includes(state.role)) {
      router.replace("/403");
    }
  }, [pathname, router, isPublic, state.loggedIn, state.role]);

  // Важно: чтобы не мигало — можно показать пусто, пока редирект
  if (!isPublic) {
    const rule = rules.find((r) => pathname.startsWith(r.prefix));
    if (rule) {
      if (!state.loggedIn) return null;
      if (!rule.roles.includes(state.role)) return null;
    }
  }

  return <>{children}</>;
}
