
"use client";

import { useEffect, useState } from "react";
import type { Role } from "../roles";
import {
  getStoredAuth,
  type UserStatus,
} from "../api/client";

type UIState = {
  loggedIn: boolean;
  role: Role | null;
  consent: boolean;
  status: UserStatus | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  avatarVersion: number;
};

const KEY = "elas_ui_state_v1";

const defaultState: UIState = {
  loggedIn: false,
  role: null,
  consent: false,
  status: null,
  firstName: null,
  lastName: null,
  fullName: null,
  avatarUrl: null,
  avatarVersion: 0,
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

function readString(
  value: unknown
): string | null {
  return typeof value === "string"
    ? value
    : null;
}

export function useUIStore() {
  const [state, setState] =
    useState<UIState>(defaultState);

  /**
   * false:
   * localStorage ещё не прочитан.
   *
   * true:
   * мы уже точно знаем, есть сессия или нет.
   */
  const [authReady, setAuthReady] =
    useState(false);

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem(KEY);

      const parsed =
        raw
          ? (JSON.parse(
              raw
            ) as Partial<UIState>)
          : null;

      const auth = getStoredAuth();
      const hasToken =
        Boolean(auth?.token);

      const restoredState: UIState = {
        /**
         * loggedIn нельзя брать из старого UI-state.
         * Источник истины — наличие auth token.
         */
        loggedIn: hasToken,

        role: hasToken
          ? normalizeRole(auth?.role)
          : null,

        consent:
          Boolean(parsed?.consent),

        status: hasToken
          ? normalizeStatus(
              auth?.status
            ) ??
            normalizeStatus(
              parsed?.status
            )
          : null,

        firstName:
          auth?.firstName ??
          readString(
            parsed?.firstName
          ),

        lastName:
          auth?.lastName ??
          readString(
            parsed?.lastName
          ),

        fullName:
          auth?.fullName ??
          readString(
            parsed?.fullName
          ),

        avatarUrl:
          auth?.avatarUrl ??
          readString(
            parsed?.avatarUrl
          ),

        avatarVersion:
          typeof parsed?.avatarVersion ===
          "number"
            ? parsed.avatarVersion
            : 0,
      };

      setState(restoredState);
    } catch {
      /**
       * Даже если UI-state повреждён,
       * пытаемся восстановить сессию
       * из основного auth storage.
       */
      const auth = getStoredAuth();

      if (auth?.token) {
        setState({
          ...defaultState,
          loggedIn: true,
          role: normalizeRole(
            auth.role
          ),
          status: normalizeStatus(
            auth.status
          ),
          firstName:
            auth.firstName ?? null,
          lastName:
            auth.lastName ?? null,
          fullName:
            auth.fullName ?? null,
          avatarUrl:
            auth.avatarUrl ?? null,
        });
      } else {
        setState(defaultState);
      }
    } finally {
      /**
       * Устанавливается всегда,
       * даже если localStorage повреждён.
       */
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    /**
     * Важно:
     * не записываем defaultState до того,
     * как завершилось восстановление.
     */
    if (!authReady) {
      return;
    }

    try {
      localStorage.setItem(
        KEY,
        JSON.stringify(state)
      );
    } catch {
      // Игнорируем ошибки storage.
    }
  }, [authReady, state]);

  return {
    state,
    authReady,

    setAuthReady,

    setLoggedIn: (
      value: boolean
    ) =>
      setState((current) => ({
        ...current,
        loggedIn: value,
        role: value
          ? current.role
          : null,
        status: value
          ? current.status
          : null,
      })),

    setRole: (
      role: Role | null
    ) =>
      setState((current) => ({
        ...current,
        role,
      })),

    setConsent: (
      consent: boolean
    ) =>
      setState((current) => ({
        ...current,
        consent,
      })),

    setStatus: (
      status: UserStatus | null
    ) =>
      setState((current) => ({
        ...current,
        status,
      })),

    setUserInfo: (info: {
      firstName?: string | null;
      lastName?: string | null;
      fullName?: string | null;
      avatarUrl?: string | null;
      avatarVersion?: number;
    }) =>
      setState((current) => ({
        ...current,

        firstName:
          info.firstName !== undefined
            ? info.firstName
            : current.firstName,

        lastName:
          info.lastName !== undefined
            ? info.lastName
            : current.lastName,

        fullName:
          info.fullName !== undefined
            ? info.fullName
            : current.fullName,

        avatarUrl:
          info.avatarUrl !== undefined
            ? info.avatarUrl
            : current.avatarUrl,

        avatarVersion:
          info.avatarVersion !==
          undefined
            ? info.avatarVersion
            : current.avatarVersion,
      })),

    reset: () =>
      setState(defaultState),
  };
}
