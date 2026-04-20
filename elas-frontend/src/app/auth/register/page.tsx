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
        <div className="relative hidden flex-col justify-between overflow-hidden rounded-elas-xl bg-surface-subtle border border-[color:var(--border)] px-8 py-9 text-fg md:flex">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-surface shadow-sm px-3 py-1 text-xs font-medium border border-[color:var(--border)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--primary))]" />
              Создайте аккаунт платформы
            </div>

            <div className="space-y-2 mt-4">
              <h1 className="text-3xl font-bold tracking-tight">
                Начните работу с системой
              </h1>
              <p className="max-w-md text-sm text-muted leading-relaxed">
                Зарегистрируйтесь как студент или преподаватель, чтобы подключаться
                к сессиям и просматривать аналитику вовлечённости.
              </p>
            </div>
          </div>
        </div>

        <Card className="space-y-6 rounded-elas-xl p-6 sm:p-8 bg-surface shadow-md">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-fg">
              Создать аккаунт
            </h2>
            <p className="text-sm text-muted">
              Заполните форму. После этого мы отправим код подтверждения на вашу почту.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center bg-surface hover:bg-surface-subtle"
                onClick={() =>
                  setError(
                    "Регистрация через Google пока не настроена. Используйте email и пароль."
                  )
                }
              >
                Через Google
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full justify-center bg-surface hover:bg-surface-subtle"
                onClick={() =>
                  setError(
                    "Регистрация через Apple пока не настроена. Используйте email и пароль."
                  )
                }
              >
                Через Apple
              </Button>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="h-px flex-1 bg-[color:var(--border)]" />
              <span>или по email</span>
              <span className="h-px flex-1 bg-[color:var(--border)]" />
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

            <div className="flex items-center gap-3">
              <label className="shrink-0 text-sm text-muted">Роль:</label>
              <select
                className="flex-1 rounded-elas border border-[color:var(--border)] bg-surface px-4 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-[color:var(--ring)] focus:border-transparent transition-all"
                value={role}
                onChange={(e) => setRoleInput(e.target.value as "student" | "teacher")}
                disabled={loading}
              >
                <option value="student">Студент</option>
                <option value="teacher">Преподаватель</option>
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-[rgb(var(--error))]">{error}</p>}
          {info && <p className="text-sm text-[rgb(var(--success))]">{info}</p>}

          <Button className="w-full" onClick={handleRegister} disabled={loading}>
            {loading ? "Отправка кода…" : "Зарегистрироваться"}
          </Button>

          <p className="pt-4 mt-2 border-t border-[color:var(--border)] text-center text-sm text-muted">
            Уже есть аккаунт?{" "}
            <Link
              href="/auth/login"
              className="font-semibold text-[rgb(var(--primary))] hover:text-[rgb(var(--primary-hover))] hover:underline transition-colors"
            >
              Войти
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}