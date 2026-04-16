"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { api, isApiAvailable } from "@/lib/api/client";
import type { Role } from "@/lib/roles";

type RegisterRes = {
  success?: boolean;
  message?: string;
};

const PENDING_REGISTER_KEY = "elas_pending_register_v1";

function savePendingRegister(data: {
  email: string;
  password: string;
  name?: string;
  role: "student" | "teacher";
}) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PENDING_REGISTER_KEY, JSON.stringify(data));
}

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRoleInput] = useState<"student" | "teacher">("student");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError("");
    setInfo("");

    const e = email.trim().toLowerCase();
    const p = password;
    const n = name.trim();

    if (!e || !p) {
      setError("Email и пароль обязательны.");
      return;
    }

    if (n && n.length < 2) {
      setError("Имя должно быть не короче 2 символов.");
      return;
    }

    if (p.length < 6) {
      setError("Пароль не менее 6 символов.");
      return;
    }

    if (!isApiAvailable()) {
      setError("Сервер недоступен. Обратитесь к администратору для регистрации.");
      return;
    }

    setLoading(true);

    try {
      const data = await api.post<RegisterRes>("auth/register", {
        email: e,
        password: p,
        name: n || undefined,
        role,
      });

      savePendingRegister({
        email: e,
        password: p,
        name: n || undefined,
        role,
      });

      setInfo(
        data?.message ||
          "Код подтверждения отправлен на вашу почту. Введите его на следующем шаге."
      );

      router.push(`/auth/verify-email?email=${encodeURIComponent(e)}&mode=register`);
    } catch (err) {
      const raw =
        err instanceof Error ? err.message : err != null ? String(err) : "";
      const normalized = raw.toLowerCase();

      if (
        normalized.includes("already exists") ||
        normalized.includes("уже существует") ||
        normalized.includes("already registered")
      ) {
        setError("Пользователь с таким email уже существует.");
      } else {
        setError(raw || "Ошибка регистрации.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-96px)] items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="relative hidden flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-b from-purple-500 via-purple-700 to-slate-950 px-8 py-9 text-white md:flex">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 text-xs font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-200" />
              Создайте ELAS-аккаунт
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">
                Начните работу с ELAS
              </h1>
              <p className="max-w-md text-sm text-white/70">
                Зарегистрируйтесь как студент или преподаватель, чтобы подключаться
                к сессиям и просматривать аналитику вовлечённости.
              </p>
            </div>
          </div>
        </div>

        <Card className="space-y-6 rounded-3xl p-6 sm:p-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--text)]">
              Создать аккаунт
            </h2>
            <p className="text-sm text-[color:var(--muted)]">
              Заполните форму. После этого мы отправим код подтверждения на вашу почту.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center rounded-2xl border-slate-200/70 bg-slate-50 text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white"
                onClick={() =>
                  setError(
                    "Регистрация через Google пока не настроена. Используйте email и пароль."
                  )
                }
              >
                Регистрация через Google
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full justify-center rounded-2xl border-slate-200/70 bg-slate-50 text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white"
                onClick={() =>
                  setError(
                    "Регистрация через Apple пока не настроена. Используйте email и пароль."
                  )
                }
              >
                Регистрация через Apple
              </Button>
            </div>

            <div className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
              <span className="h-px flex-1 bg-slate-200/60 dark:bg-white/10" />
              <span>или по email</span>
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
              placeholder="Пароль (не менее 6 символов)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
            />

            <Input
              placeholder="Имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              autoComplete="name"
            />

            <div className="flex items-center gap-2">
              <label className="shrink-0 text-sm text-[var(--muted)]">Роль:</label>
              <select
                className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                value={role}
                onChange={(e) => setRoleInput(e.target.value as "student" | "teacher")}
                disabled={loading}
              >
                <option value="student">Студент</option>
                <option value="teacher">Преподаватель</option>
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {info && <p className="text-sm text-emerald-400">{info}</p>}

          <Button className="w-full" onClick={handleRegister} disabled={loading}>
            {loading ? "Отправка кода…" : "Зарегистрироваться"}
          </Button>

          <p className="pt-2 text-center text-sm text-[var(--muted)]">
            Уже есть аккаунт?{" "}
            <Link
              href="/auth/login"
              className="font-medium text-purple-300 hover:text-purple-200"
            >
              Войти
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}