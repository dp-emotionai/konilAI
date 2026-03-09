"use client";

import { useEffect, useState } from "react";
import type { Role } from "../roles";
import { getStoredAuth, type UserStatus } from "../api/client";

type UIState = {
  loggedIn: boolean;
  role: Role;
  consent: boolean;
  status: UserStatus | null;
};

const KEY = "elas_ui_state_v1";

const defaultState: UIState = {
  loggedIn: false,
  role: "student",
  consent: false,
  status: null,
};

export function useUIStore() {
  const [state, setState] = useState<UIState>(defaultState);

  // load:
  // - restore from UI state (demo mode etc.)
  // - BUT if we have a real auth token, it is the source of truth for role/loggedIn
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      const auth = getStoredAuth();
      if (parsed && typeof parsed === "object") {
        let next: UIState = {
          loggedIn: !!parsed.loggedIn,
          role: parsed.role === "teacher" || parsed.role === "admin" ? parsed.role : "student",
          consent: !!parsed.consent,
          status: parsed.status ?? null,
        };
        if (auth?.token && auth?.role) {
          next = {
            ...next,
            loggedIn: true,
            role: auth.role as Role,
            status: (auth.status as UserStatus | null) ?? next.status ?? null,
          };
        }
        setState(next);
      } else if (auth?.token && auth?.role) {
        setState({
          ...defaultState,
          loggedIn: true,
          role: auth.role as Role,
          status: (auth.status as UserStatus | null) ?? null,
        });
      }
    } catch {}
  }, []);

  // persist
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  return {
    state,
    setLoggedIn: (v: boolean) => setState((s) => ({ ...s, loggedIn: v })),
    setRole: (role: Role) => setState((s) => ({ ...s, role })),
    setConsent: (consent: boolean) => setState((s) => ({ ...s, consent })),
    setStatus: (status: UserStatus | null) => setState((s) => ({ ...s, status })),
    reset: () => setState(defaultState),
  };
}
