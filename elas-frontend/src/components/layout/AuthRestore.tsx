"use client";

import { useEffect, useRef } from "react";
import { useUI } from "./Providers";
import {
  api,
  isApiAvailable,
  getStoredAuth,
  setAuth,
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

  const normalized = value.trim().toLowerCase();

  if (
    normalized === "student" ||
    normalized === "teacher" ||
    normalized === "admin"
  ) {
    return normalized;
  }

  return null;
}

function normalizeStatus(value: unknown): UserStatus | null {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();

  if (
    normalized === "pending" ||
    normalized === "approved" ||
    normalized === "limited" ||
    normalized === "blocked"
  ) {
    return normalized as UserStatus;
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
      setRole(null);
      setStatus(null);
      return;
    }

    const storedRole = normalizeRole(stored.role);
    const storedStatus = normalizeStatus(stored.status);

    // Сразу восстанавливаем пользователя из localStorage.
    setLoggedIn(true);
    setRole(storedRole);
    setStatus(storedStatus);

    setUserInfo({
      firstName: stored.firstName ?? undefined,
      lastName: stored.lastName ?? undefined,
      fullName: stored.fullName ?? undefined,
      avatarUrl: stored.avatarUrl ?? undefined,
    });

    if (!isApiAvailable()) return;

    const controller = new AbortController();

    api
      .get<MeRes>("auth/me", {
        signal: controller.signal,
        cache: "no-store",
      })
      .then((me) => {
        const role = normalizeRole(me.role) ?? storedRole;
        const status =
          normalizeStatus(me.status) ?? storedStatus ?? "approved";

        setLoggedIn(true);
        setRole(role);
        setStatus(status);

        setUserInfo({
          firstName: me.firstName ?? undefined,
          lastName: me.lastName ?? undefined,
          fullName: me.fullName ?? undefined,
          avatarUrl: me.avatarUrl ?? undefined,
        });

        // Обновляем сохранённые данные, но сохраняем существующий token.
        setAuth({
          token: stored.token,
          email: me.email || stored.email,
          id: me.id || stored.id,
          role: role ?? stored.role,
          firstName: me.firstName ?? stored.firstName,
          lastName: me.lastName ?? stored.lastName,
          fullName: me.fullName ?? stored.fullName,
          avatarUrl: me.avatarUrl ?? stored.avatarUrl,
          status,
        });
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        // Временная ошибка backend не должна разлогинивать пользователя.
        console.warn(
          "Не удалось обновить данные пользователя. Используем сохранённую сессию.",
          error
        );

        setLoggedIn(true);
        setRole(storedRole);
        setStatus(storedStatus);

        setUserInfo({
          firstName: stored.firstName ?? undefined,
          lastName: stored.lastName ?? undefined,
          fullName: stored.fullName ?? undefined,
          avatarUrl: stored.avatarUrl ?? undefined,
        });
      });

    return () => {
      controller.abort();
    };
  }, [setLoggedIn, setRole, setStatus, setUserInfo]);

  return null;
}