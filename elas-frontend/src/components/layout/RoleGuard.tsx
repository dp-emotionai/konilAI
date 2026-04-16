"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useUI } from "@/components/layout/Providers";
import type { Role } from "@/lib/roles";
import { getStoredAuth, type UserStatus } from "@/lib/api/client";

type Rule = { prefix: string; roles: Role[] };

const rules: Rule[] = [
  { prefix: "/student", roles: ["student"] },
  { prefix: "/teacher", roles: ["teacher", "admin"] },
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

function normalizeRole(value: unknown): Role | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "student" || v === "teacher" || v === "admin") return v;
  return null;
}

function normalizeStatus(value: unknown): UserStatus | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (v === "pending" || v === "approved" || v === "limited" || v === "blocked") {
    return v as UserStatus;
  }
  return null;
}

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

  const storedAuth = useMemo(() => getStoredAuth(), []);
  const effectiveLoggedIn = state.loggedIn || Boolean(storedAuth?.token);
  const effectiveRole = normalizeRole(state.role) ?? normalizeRole(storedAuth?.role);
  const effectiveStatus =
    normalizeStatus(state.status) ?? normalizeStatus(storedAuth?.status);

  const isHydratingProtectedRoute =
    !isPublic &&
    !!matchedRule &&
    !state.loggedIn &&
    Boolean(storedAuth?.token) &&
    !effectiveRole;

  useEffect(() => {
    if (!safePathname) return;
    if (isPublic) return;
    if (!matchedRule) return;

    if (isHydratingProtectedRoute) return;

    if (!effectiveLoggedIn) {
      router.replace("/auth/login");
      return;
    }

    if (effectiveStatus === "blocked") {
      router.replace("/403");
      return;
    }

    if (!effectiveRole || !matchedRule.roles.includes(effectiveRole)) {
      router.replace("/403");
    }
  }, [
    safePathname,
    isPublic,
    matchedRule,
    isHydratingProtectedRoute,
    effectiveLoggedIn,
    effectiveRole,
    effectiveStatus,
    router,
  ]);

  if (!safePathname) return null;

  if (!isPublic && matchedRule) {
    if (isHydratingProtectedRoute) return null;
    if (!effectiveLoggedIn) return null;
    if (effectiveStatus === "blocked") return null;
    if (!effectiveRole || !matchedRule.roles.includes(effectiveRole)) return null;
  }

  return <>{children}</>;
}