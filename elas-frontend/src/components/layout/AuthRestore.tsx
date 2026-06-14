
"use client";

import {
  useEffect,
  useRef,
} from "react";

import { useUI } from "./Providers";

import {
  api,
  getStoredAuth,
  isApiAvailable,
  setAuth,
  type UserStatus,
} from "@/lib/api/client";

import {
  getConsentStatus,
} from "@/lib/api/consent";

import {
  writeConsent,
} from "@/lib/consent";

import type { Role } from "@/lib/roles";

type MeRes = {
  id: string;
  email: string;
  role: Role | string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  status?:
    | UserStatus
    | string
    | null;
};

function normalizeRole(
  value: unknown
): Role | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase();

  if (
    normalized === "student" ||
    normalized === "teacher" ||
    normalized === "admin"
  ) {
    return normalized;
  }

  return null;
}

function normalizeStatus(
  value: unknown
): UserStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase();

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
  const {
    authReady,
    setLoggedIn,
    setRole,
    setStatus,
    setUserInfo,
    setConsent
  } = useUI();

  const done = useRef(false);

  useEffect(() => {

    if (
      !authReady ||
      done.current
    ) {
      return;
    }

    done.current = true;

    const stored =
      getStoredAuth();

    if (!stored?.token) {
      setLoggedIn(false);
      setRole(null);
      setStatus(null);
      setConsent(false);
      writeConsent(false);

      setUserInfo({
        firstName: null,
        lastName: null,
        fullName: null,
        avatarUrl: null,
      });

      return;
    }

    const storedRole =
      normalizeRole(stored.role);

    const storedStatus =
      normalizeStatus(
        stored.status
      );

    if (!isApiAvailable()) {
      return;
    }

    const controller =
      new AbortController();

    getConsentStatus(controller.signal)
        .then((consentStatus) => {
          setConsent(consentStatus.hasConsent);
          writeConsent(consentStatus.hasConsent);
        })
        .catch((error) => {
          if (
              error instanceof DOMException &&
              error.name === "AbortError"
          ) {
            return;
          }

          console.warn(
              "Не удалось получить статус согласия",
              error
          );

          setConsent(false);
          writeConsent(false);
        });

    api
      .get<MeRes>("auth/me", {
        signal: controller.signal,
        cache: "no-store",
      })
      .then((me) => {
        const role =
          normalizeRole(me.role) ??
          storedRole;

        const status =
          normalizeStatus(
            me.status
          ) ??
          storedStatus ??
          "approved";

        setLoggedIn(true);
        setRole(role);
        setStatus(status);

        setUserInfo({
          firstName:
            me.firstName ?? null,
          lastName:
            me.lastName ?? null,
          fullName:
            me.fullName ?? null,
          avatarUrl:
            me.avatarUrl ?? null,
        });

        setAuth({
          token: stored.token,

          email:
            me.email ||
            stored.email,

          id:
            me.id ||
            stored.id,

          role:
            role ??
            stored.role,

          firstName:
            me.firstName ??
            stored.firstName,

          lastName:
            me.lastName ??
            stored.lastName,

          fullName:
            me.fullName ??
            stored.fullName,

          avatarUrl:
            me.avatarUrl ??
            stored.avatarUrl,

          status,
        });
      })
      .catch((error: unknown) => {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        const currentAuth =
          getStoredAuth();

        if (!currentAuth?.token) {
          setLoggedIn(false);
          setRole(null);
          setStatus(null);

          setUserInfo({
            firstName: null,
            lastName: null,
            fullName: null,
            avatarUrl: null,
          });

          return;
        }

        console.warn(
          "Не удалось обновить данные пользователя. Используем сохранённую сессию.",
          error
        );

        setLoggedIn(true);
        setRole(storedRole);
        setStatus(storedStatus);

        setUserInfo({
          firstName:
            stored.firstName ?? null,
          lastName:
            stored.lastName ?? null,
          fullName:
            stored.fullName ?? null,
          avatarUrl:
            stored.avatarUrl ?? null,
        });
      });

    return () => {
      controller.abort();
    };
  }, [
    authReady,
    setLoggedIn,
    setRole,
    setStatus,
    setConsent,
    setUserInfo,
  ]);

  return null;
}
