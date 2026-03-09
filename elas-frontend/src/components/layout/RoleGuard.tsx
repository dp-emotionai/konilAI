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

const publicPrefixes = [
  "/",
  "/privacy",
  "/ethics",
  "/faq",
  "/auth",
  "/consent",
  "/settings",
  "/403",
];

export default function RoleGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useUI();

  const safePathname = typeof pathname === "string" ? pathname : "";

  const isPublic = useMemo(() => {
    if (!safePathname) return true;

    return publicPrefixes.some((p) => {
      if (p === "/") return safePathname === "/";
      return safePathname === p || safePathname.startsWith(`${p}/`);
    });
  }, [safePathname]);

  const matchedRule = useMemo(() => {
    if (!safePathname) return null;
    return rules.find((r) => safePathname.startsWith(r.prefix)) ?? null;
  }, [safePathname]);

  useEffect(() => {
    if (!safePathname) return;
    if (isPublic) return;
    if (!matchedRule) return;

    if (!state.loggedIn) {
      router.replace("/auth/login");
      return;
    }

    if (state.status === "blocked") {
      router.replace("/403");
      return;
    }

    if (!state.role || !matchedRule.roles.includes(state.role)) {
      router.replace("/403");
    }
  }, [safePathname, isPublic, matchedRule, state.loggedIn, state.role, router]);

  if (!safePathname) return null;

  if (!isPublic && matchedRule) {
    if (!state.loggedIn) return null;
    if (state.status === "blocked") return null;
    if (!state.role || !matchedRule.roles.includes(state.role)) return null;
  }

  return <>{children}</>;
}