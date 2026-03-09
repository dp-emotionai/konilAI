"use client";

import { useState } from "react";
import Link from "next/link";
import {Card} from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { api, isApiAvailable } from "@/lib/api/client";
import type { Role } from "@/lib/roles";

type RegisterRes = {
  user?: { id: string; email: string; role: Role; name?: string | null };
  token?: string;
  message?: string;
};

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRoleInput] = useState<Role>("student");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError("");
    setInfo("");
    const e = email.trim();
    const p = password;
    if (!e || !p) {
      setError("Email и пароль обязательны.");
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
        name: name.trim() || undefined,
        role: role === "admin" ? "student" : role,
      });

      console.log("REGISTER RESPONSE:", data);

      setInfo(
        "Заявка на регистрацию отправлена. После одобрения администратором на ваш email придёт письмо, и вы сможете войти в систему."
      );
      setEmail("");
      setPassword("");
      setName("");
    } catch (err) {
      setInfo("");
      setError(err instanceof Error ? err.message : "Ошибка регистрации.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-96px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Левая градиентная панель */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-purple-500 via-purple-700 to-slate-950 text-white px-8 py-9 hidden md:flex flex-col justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 text-xs font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-200" />
              Создайте ELAS‑аккаунт
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">
                Начните работу с ELAS
              </h1>
              <p className="text-sm text-white/70 max-w-md">
                Зарегистрируйтесь как студент или преподаватель, чтобы подключаться к сессиям и
                просматривать аналитику вовлечённости.
              </p>
            </div>
          </div>
        </div>

        {/* Правая панель с формой регистрации */}
        <Card className="rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--text)]">
              Создать аккаунт
            </h2>
            <p className="text-sm text-[color:var(--muted)]">
              Заполните форму. После регистрации ваша заявка будет отправлена администратору
              на одобрение.
            </p>
          </div>

          {/* Соц‑регистрация */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center rounded-2xl border-slate-200/70 bg-slate-50 text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white"
                onClick={() => setError("Регистрация через Google пока не настроена. Используйте email и пароль.")}
              >
                Регистрация через Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center rounded-2xl border-slate-200/70 bg-slate-50 text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white"
                onClick={() => setError("Регистрация через Apple пока не настроена. Используйте email и пароль.")}
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
              placeholder="Имя (необязательно)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              autoComplete="name"
            />
            <div className="flex gap-2 items-center">
              <label className="text-sm text-[var(--muted)] shrink-0">Роль:</label>
              <select
                className="flex-1 rounded-2xl bg-black/30 border border-white/10 text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                value={role}
                onChange={(e) => setRoleInput(e.target.value as Role)}
                disabled={loading}
              >
                <option value="student">Студент</option>
                <option value="teacher">Преподаватель</option>
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {info && !error && <p className="text-sm text-emerald-400">{info}</p>}
          <Button className="w-full" onClick={handleRegister} disabled={loading}>
            {loading ? "Создание аккаунта…" : "Зарегистрироваться"}
          </Button>

          <p className="text-sm text-[var(--muted)] text-center pt-2">
            Уже есть аккаунт?{" "}
            <Link href="/auth/login" className="font-medium text-purple-300 hover:text-purple-200">
              Войти
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
