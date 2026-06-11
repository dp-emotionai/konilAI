"use client";

import { useEffect, useState } from "react";
import type { Role } from "../roles";
import { getStoredAuth, type UserStatus } from "../api/client";

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

export function useUIStore() {
  const [state, setState] = useState<UIState>(defaultState);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      const auth = getStoredAuth();

      if (parsed && typeof parsed === "object") {
        let next: UIState = {
          loggedIn: !!parsed.loggedIn,
          role: normalizeRole(parsed.role),
          consent: !!parsed.consent,
          status: normalizeStatus(parsed.status),
          firstName: typeof parsed.firstName === "string" ? parsed.firstName : null,
          lastName: typeof parsed.lastName === "string" ? parsed.lastName : null,
          fullName: typeof parsed.fullName === "string" ? parsed.fullName : null,
          avatarUrl: typeof parsed.avatarUrl === "string" ? parsed.avatarUrl : null,
          avatarVersion: typeof parsed.avatarVersion === "number" ? parsed.avatarVersion : 0,
        };

        if (auth?.token) {
          next = {
            ...next,
            loggedIn: true,
            role: normalizeRole(auth.role),
            status: normalizeStatus(auth.status) ?? next.status ?? null,
            firstName: auth.firstName ?? next.firstName,
            lastName: auth.lastName ?? next.lastName,
            fullName: auth.fullName ?? next.fullName,
            avatarUrl: auth.avatarUrl ?? next.avatarUrl,
          };
        }

        setState(next);
        return;
      }

      if (auth?.token) {
        setState({
          ...defaultState,
          loggedIn: true,
          role: normalizeRole(auth.role),
          status: normalizeStatus(auth.status),
          firstName: auth.firstName ?? null,
          lastName: auth.lastName ?? null,
          fullName: auth.fullName ?? null,
          avatarUrl: auth.avatarUrl ?? null,
          avatarVersion: 0,
        });
      }
    } catch {
      // ignore corrupted localStorage
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // ignore storage errors
    }
  }, [state]);

  return {
    state,
    setLoggedIn: (v: boolean) =>
      setState((s) => ({
        ...s,
        loggedIn: v,
        role: v ? s.role : null,
        status: v ? s.status : null,
      })),
    setRole: (role: Role | null) =>
      setState((s) => ({
        ...s,
        role,
      })),
    setConsent: (consent: boolean) =>
      setState((s) => ({
        ...s,
        consent,
      })),
    setStatus: (status: UserStatus | null) =>
      setState((s) => ({
        ...s,
        status,
      })),
    setUserInfo: (info: { firstName?: string; lastName?: string; fullName?: string; avatarUrl?: string; avatarVersion?: number }) =>
      setState((s) => ({
        ...s,
        ...info
      })),
    reset: () => setState(defaultState),
  };
}