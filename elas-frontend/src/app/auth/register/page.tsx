"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { api, isApiAvailable, setAuth } from "@/lib/api/client";
import type { Role } from "@/lib/roles";
import { useUI } from "@/components/layout/Providers";
import { ROLE_HOME } from "@/lib/nav";

type RegisterStartRes = {
  message?: string;
};

type VerifyRes = {
  user?: { id?: string; email?: string; role?: string; name?: string | null; status?: string | null };
  token?: string;
};

type Step = "form" | "verify";

export default function RegisterPage() {
  const router = useRouter();
  const { setLoggedIn, setRole } = useUI();

  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRoleInput] = useState<Role>("student");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStartRegister = async () => {
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
      const data = await api.post<RegisterStartRes>("auth/register", {
        email: e,
        password: p,
        name: name.trim() || undefined,
        role: role === "admin" ? "student" : role,
      });

      console.log("REGISTER START RESPONSE:", data);

      setStep("verify");
      setInfo(
        "Мы отправили 6-значный код на ваш email. Введите его ниже, чтобы завершить регистрацию."
      );
    } catch (err) {
      setInfo("");
      setError(err instanceof Error ? err.message : "Ошибка регистрации.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    const e = email.trim();
    const c = code.trim();
    if (!e || !c) {
      setError("Укажите email и 6-значный код из письма.");
      return;
    }
    if (!/^[0-9]{6}$/.test(c)) {
      setError("Код должен состоять из 6 цифр.");
      return;
    }
    if (!isApiAvailable()) {
      setError("Сервер недоступен. Попробуйте позже или обратитесь к администратору.");
      return;
    }
    setLoading(true);
    try {
      const data = await api.post<VerifyRes>("auth/verify-email", {
        email: e,
        code: c,
      });

      console.log("VERIFY EMAIL RESPONSE:", data);

      const user = data.user;
      const rawRole = user?.role;
      const normalizedRole =
        typeof rawRole === "string" ? rawRole.trim().toLowerCase() : "";
      const token = data.token;

      if (!user || !user.email) {
        throw new Error("Сервер не вернул данные пользователя.");
      }
      if (!token) {
        throw new Error("Сервер не вернул токен авторизации.");
      }
      if (!normalizedRole || !(normalizedRole in ROLE_HOME)) {
        throw new Error(`Сервер вернул неизвестную роль пользователя: ${String(rawRole)}`);
      }

      const r = normalizedRole as Role;
      const home =
        typeof ROLE_HOME[r] === "string" && ROLE_HOME[r].length > 0 ? ROLE_HOME[r] : "/";

      setAuth({
        token,
        role: r,
        email: user.email,
        name: user.name ?? undefined,
        status: null,
      });
      setRole(r);
      setLoggedIn(true);

      router.push(home);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка подтверждения email.");
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

          {step === "form" ? (
            <>
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
              <Button className="w-full" onClick={handleStartRegister} disabled={loading}>
                {loading ? "Отправка кода…" : "Получить код на email"}
              </Button>
            </>
          ) : (
            <>
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
                  placeholder="6-значный код из письма"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={loading}
                  maxLength={6}
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              {info && !error && <p className="text-sm text-emerald-400">{info}</p>}
              <Button className="w-full" onClick={handleVerify} disabled={loading}>
                {loading ? "Подтверждение…" : "Завершить регистрацию"}
              </Button>
            </>
          )}

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
