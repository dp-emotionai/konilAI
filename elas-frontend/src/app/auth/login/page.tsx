"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { Card } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useUI } from "@/components/layout/Providers";
import { ROLE_HOME } from "@/lib/nav";
import {
  api,
  setAuth,
  clearAuth,
  isApiAvailable,
  type UserStatus,
} from "@/lib/api/client";
import type { Role } from "@/lib/roles";

type LoginRes = {
  user?: {
    id?: string;
    email?: string;
    role?: string;
    name?: string | null;
    status?: string | null;
  };
  token?: string;
  accessToken?: string;
  device?: string;
  location?: string;
  isNewDevice?: boolean;
  message?: string;
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

export default function LoginPage() {
  const router = useRouter();
  const { setLoggedIn, setRole, setStatus } = useUI();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const finishLogin = ({
    token,
    email,
    role,
    name,
    status,
  }: {
    token: string;
    email: string;
    role: Role;
    name?: string | null;
    status?: UserStatus | null;
  }) => {
    const safeHome =
      typeof ROLE_HOME[role] === "string" && ROLE_HOME[role].length > 0
        ? ROLE_HOME[role]
        : "/";

    setAuth({
      token,
      role,
      email,
      name: name ?? undefined,
      status: status ?? null,
    });

    setRole(role);
    setStatus(status ?? null);
    setLoggedIn(true);

    router.push(safeHome);
  };

  const resetUiAuthState = () => {
    clearAuth();
    setLoggedIn(false);
    setRole(null);
    setStatus(null);
  };

  const handleLogin = async () => {
    setError("");

    const e = email.trim().toLowerCase();
    const p = password;

    if (!e || !p) {
      setError("Введите email и пароль.");
      return;
    }

    if (!isApiAvailable()) {
      setError(
        "Сервер недоступен. Проверьте подключение или используйте демо-режим ниже."
      );
      return;
    }

    setLoading(true);

    try {
      const data = await api.post<LoginRes>("auth/login", {
        email: e,
        password: p,
      });

      const user = data?.user;
      const role = normalizeRole(user?.role);
      const token = data?.token ?? data?.accessToken;
      const status = normalizeStatus(user?.status);

      if (!user) {
        throw new Error("Сервер не вернул данные пользователя.");
      }

      if (!user.email) {
        throw new Error("Сервер не вернул email пользователя.");
      }

      if (!token) {
        throw new Error("Сервер не вернул токен авторизации.");
      }

      if (!role || !(role in ROLE_HOME)) {
        throw new Error(
          `Сервер вернул неизвестную роль пользователя: ${String(user?.role)}`
        );
      }

      finishLogin({
        token,
        role,
        email: user.email,
        name: user.name ?? undefined,
        status,
      });
    } catch (err) {
      console.error("LOGIN PAGE ERROR:", err);

      let message = "Ошибка входа. Проверьте данные.";
      const raw =
        err instanceof Error ? err.message : err != null ? String(err) : "";
      const normalized = raw.toLowerCase();

      if (
        normalized.includes("awaiting admin approval") ||
        normalized.includes("pending approval") ||
        normalized.includes("ожидает одобрения")
      ) {
        message =
          "Ваш аккаунт ожидает одобрения администратором. После подтверждения вы получите письмо и сможете войти в систему.";
      } else if (
        normalized.includes("blocked") ||
        normalized.includes("заблокирован")
      ) {
        message =
          "Ваш аккаунт заблокирован. Обратитесь к администратору вашей организации.";
      } else if (raw) {
        message = raw;
      }

      resetUiAuthState();
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");

    if (!isApiAvailable()) {
      setError("Сервер недоступен. Попробуйте позже или используйте вход по email.");
      return;
    }

    const anyWindow = window as typeof window & {
      google?: {
        accounts?: {
          id?: {
            initialize: (config: {
              client_id: string;
              callback: (response: { credential: string }) => void;
            }) => void;
            prompt: () => void;
          };
        };
      };
    };

    const google = anyWindow.google;
    if (!google?.accounts?.id) {
      setError("Google auth недоступен. Обновите страницу и попробуйте снова.");
      return;
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError("Google client id не настроен на фронтенде.");
      return;
    }

    google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential: string }) => {
        try {
          const data = await api.post<LoginRes>("auth/google", {
            idToken: response.credential,
          });

          const user = data?.user;
          const role = normalizeRole(user?.role);
          const token = data?.token ?? data?.accessToken;
          const status = normalizeStatus(user?.status);

          if (!user || !user.email) {
            throw new Error("Сервер не вернул данные пользователя.");
          }

          if (!token) {
            throw new Error("Сервер не вернул токен авторизации.");
          }

          if (!role || !(role in ROLE_HOME)) {
            throw new Error(
              `Сервер вернул неизвестную роль пользователя: ${String(user?.role)}`
            );
          }

          finishLogin({
            token,
            role,
            email: user.email,
            name: user.name ?? undefined,
            status,
          });
        } catch (err) {
          console.error("GOOGLE LOGIN ERROR:", err);
          resetUiAuthState();
          setError(
            err instanceof Error
              ? err.message
              : "Ошибка входа через Google. Попробуйте снова."
          );
        }
      },
    });

    google.accounts.id.prompt();
  };

  const handleDemo = (role: Role) => {
    clearAuth();
    setRole(role);
    setStatus(null);
    setLoggedIn(true);

    const safeHome =
      typeof ROLE_HOME[role] === "string" && ROLE_HOME[role].length > 0
        ? ROLE_HOME[role]
        : "/";

    router.push(safeHome);
  };

  return (
    <div className="flex min-h-[calc(100vh-96px)] items-center justify-center px-4 py-10">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
      />

      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="relative hidden flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-b from-purple-500 via-purple-700 to-slate-950 px-8 py-9 text-white md:flex">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 text-xs font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Konilai · Emotion-Aware Learning
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">
                Добро пожаловать в Konilai
              </h1>
              <p className="max-w-md text-sm text-white/70">
                Войдите как преподаватель, студент или администратор, чтобы
                управлять сессиями и смотреть аналитику вовлечённости.
              </p>
            </div>
          </div>
        </div>

        <Card className="space-y-6 rounded-3xl p-6 sm:p-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--text)]">
              Вход в аккаунт
            </h2>
            <p className="text-sm text-[color:var(--muted)]">
              Используйте email и пароль, выданные вашей организацией.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center rounded-2xl border-slate-200/70 bg-slate-50 text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white"
                onClick={() => void handleGoogleLogin()}
              >
                Войти через Google
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full justify-center rounded-2xl border-slate-200/70 bg-slate-50 text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white"
                onClick={() =>
                  setError("Вход через Apple пока не настроен. Используйте email и пароль.")
                }
              >
                Войти через Apple
              </Button>
            </div>

            <div className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
              <span className="h-px flex-1 bg-slate-200/60 dark:bg-white/10" />
              <span>или войдите по email</span>
              <span className="h-px flex-1 bg-slate-200/60 dark:bg-white/10" />
            </div>
          </div>

          <div className="space-y-4">
            <Input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
            />
            <Input
              placeholder="Пароль"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void handleLogin();
                }
              }}
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button className="w-full" onClick={handleLogin} disabled={loading}>
            {loading ? "Вход…" : "Войти"}
          </Button>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-2">
            <Link
              href="/auth/forgot-password"
              className="text-sm text-[var(--muted)] transition hover:text-[var(--text)]"
            >
              Забыли пароль?
            </Link>

            <Link
              href="/auth/register"
              className="text-sm font-medium text-purple-300 transition hover:text-purple-200"
            >
              Создать аккаунт
            </Link>
          </div>

          {mounted && !isApiAvailable() && (
            <div className="space-y-2 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setShowDemo((s) => !s)}
                className="text-sm text-[var(--muted)] transition hover:text-[var(--text)]"
              >
                {showDemo ? "Скрыть демо-режим" : "Нет доступа к серверу? Попробовать демо"}
              </button>

              {showDemo && (
                <div className="mt-1 grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDemo("teacher")}
                  >
                    Преподаватель
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDemo("student")}
                  >
                    Студент
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDemo("admin")}
                  >
                    Админ
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}