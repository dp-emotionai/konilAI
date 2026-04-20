"use client";

import { useEffect, useRef } from "react";
import { useUI } from "./Providers";
import {
  api,
  isApiAvailable,
  clearAuth,
  getStoredAuth,
  type UserStatus,
} from "@/lib/api/client";
import type { Role } from "@/lib/roles";

type MeRes = {
  id: string;
  email: string;
  role: Role | string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  status?: UserStatus | string | null;
};

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

export function AuthRestore() {
  const { setLoggedIn, setRole, setStatus, setUserInfo } = useUI();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const stored = getStoredAuth();

    if (!stored?.token) {
      setLoggedIn(false);
      return;
    }

    const storedRole = normalizeRole(stored.role);
    const storedStatus = normalizeStatus(stored.status);

    setLoggedIn(true);
    if (storedRole) setRole(storedRole);
    if (storedStatus) setStatus(storedStatus);
    
    setUserInfo({
      firstName: stored.firstName ?? undefined,
      lastName: stored.lastName ?? undefined,
      fullName: stored.fullName ?? undefined,
      avatarUrl: stored.avatarUrl ?? undefined,
    });

    if (!isApiAvailable()) {
      return;
    }

    api
      .get<MeRes>("auth/me")
      .then((me) => {
        const role = normalizeRole(me.role) ?? storedRole;
        const status = normalizeStatus(me.status) ?? storedStatus ?? "approved";

        if (role) setRole(role);
        setStatus(status);
        setLoggedIn(true);
        setUserInfo({
          firstName: me.firstName ?? undefined,
          lastName: me.lastName ?? undefined,
          fullName: me.fullName ?? undefined,
          avatarUrl: me.avatarUrl ?? undefined,
        });
      })
      .catch(() => {
  clearAuth();
  setLoggedIn(false);
  setRole(null);
  setStatus(null);
});
  }, [setLoggedIn, setRole, setStatus]);

  return null;
}