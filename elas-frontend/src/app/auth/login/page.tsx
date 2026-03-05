"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {Card} from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useUI } from "@/components/layout/Providers";
import { ROLE_HOME } from "@/lib/nav";
import { api, setAuth, clearAuth, isApiAvailable } from "@/lib/api/client";
import type { Role } from "@/lib/roles";

type LoginRes = { user: { id: string; email: string; role: Role; name?: string | null }; token: string };

export default function LoginPage() {
  const router = useRouter();
  const { setLoggedIn, setRole } = useUI();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleLogin = async () => {
    setError("");
    const e = email.trim();
    const p = password;
    if (!e || !p) {
      setError("Введите email и пароль.");
      return;
    }
    if (!isApiAvailable()) {
      setError("Сервер недоступен. Проверьте подключение или используйте демо-режим ниже.");
      return;
    }
    setLoading(true);
    try {
      const data = await api.post<LoginRes>("auth/login", { email: e, password: p });
      setAuth({
        token: data.token,
        role: data.user.role,
        email: data.user.email,
        name: data.user.name ?? undefined,
      });
      setRole(data.user.role);
      setLoggedIn(true);
      router.push(ROLE_HOME[data.user.role]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка входа. Проверьте данные.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = (role: Role) => {
    // Demo role should not reuse a previously stored real token (it may be for another role).
    clearAuth();
    setRole(role);
    setLoggedIn(true);
    router.push(ROLE_HOME[role]);
  };

  return (
    <div className="min-h-[calc(100vh-96px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Левая панель с градиентом */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-purple-500 via-purple-700 to-slate-950 text-white px-8 py-9 hidden md:flex flex-col justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 text-xs font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              ELAS · Emotion‑Aware Learning
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">
                Добро пожаловать в ELAS
              </h1>
              <p className="text-sm text-white/70 max-w-md">
                Войдите как преподаватель, студент или администратор, чтобы управлять сессиями и
                смотреть аналитику вовлечённости.
              </p>
            </div>
          </div>
        </div>

        {/* Правая панель с формой логина */}
        <Card className="rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--text)]">
              Вход в аккаунт
            </h2>
            <p className="text-sm text-[color:var(--muted)]">
              Используйте email и пароль, выданные вашей организацией.
            </p>
          </div>

          {/* Соц‑вход */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center rounded-2xl border-slate-200/70 bg-slate-50 text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white"
                onClick={() => setError("Вход через Google пока не настроен. Используйте email и пароль.")}
              >
                Войти через Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center rounded-2xl border-slate-200/70 bg-slate-50 text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white"
                onClick={() => setError("Вход через Apple пока не настроен. Используйте email и пароль.")}
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
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button className="w-full" onClick={handleLogin} disabled={loading}>
            {loading ? "Вход…" : "Войти"}
          </Button>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
            <Link
              href="/auth/forgot-password"
              className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition"
            >
              Забыли пароль?
            </Link>
            <Link
              href="/auth/register"
              className="text-sm font-medium text-purple-300 hover:text-purple-200 transition"
            >
              Создать аккаунт
            </Link>
          </div>

          {mounted && !isApiAvailable() && (
            <div className="pt-4 border-t border-white/10 space-y-2">
              <button
                type="button"
                onClick={() => setShowDemo((s) => !s)}
                className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition"
              >
                {showDemo ? "Скрыть демо-режим" : "Нет доступа к серверу? Попробовать демо"}
              </button>
              {showDemo && (
                <div className="mt-1 grid grid-cols-3 gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleDemo("teacher")}>
                    Преподаватель
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDemo("student")}>
                    Студент
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDemo("admin")}>
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
