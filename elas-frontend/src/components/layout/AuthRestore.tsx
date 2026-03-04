"use client";

import { useEffect, useRef } from "react";
import { useUI } from "./Providers";
import { api, hasAuth, isApiAvailable, clearAuth } from "@/lib/api/client";
import type { Role } from "@/lib/roles";

type MeRes = { id: string; email: string; role: Role; name?: string | null; status?: string };

/**
 * On mount: if we have token and API, call GET /auth/me to validate and sync role.
 * On 401 or error, clear token and log out.
 */
export function AuthRestore() {
  const { setLoggedIn, setRole } = useUI();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    if (!hasAuth() || !isApiAvailable()) return;
    done.current = true;
    api
      .get<MeRes>("auth/me")
      .then((me) => {
        setRole(me.role);
        setLoggedIn(true);
      })
      .catch(() => {
        clearAuth();
        setLoggedIn(false);
      });
  }, [setLoggedIn, setRole]);

  return null;
}
