"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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

type VerifyEmailRes = {
  user?: {
    id?: string;
    email?: string;
    role?: string;
    name?: string | null;
    status?: string | null;
  };
  token?: string;
  accessToken?: string;
  message?: string;
};

type PendingRegister = {
  email: string;
  password: string;
  name?: string;
  role: "student" | "teacher";
};

const PENDING_REGISTER_KEY = "elas_pending_register_v1";

function getPendingRegister(): PendingRegister | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PENDING_REGISTER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingRegister;
  } catch {
    return null;
  }
}

function clearPendingRegister() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PENDING_REGISTER_KEY);
}

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

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setLoggedIn, setRole, setStatus } = useUI();

  const mode = useMemo(
    () => (searchParams.get("mode")?.trim().toLowerCase() === "register" ? "register" : "generic"),
    [searchParams]
  );
  const emailFromQuery = useMemo(
    () => searchParams.get("email")?.trim().toLowerCase() ?? "",
    [searchParams]
  );

  const [email, setEmail] = useState(emailFromQuery);
  const [code, setCode] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!email && emailFromQuery) {
      setEmail(emailFromQuery);
    }
  }, [email, emailFromQuery]);

  const finishLogin = ({
    token,
    role,
    email,
    name,
    status,
  }: {
    token: string;
    role: Role;
    email: string;
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

    clearPendingRegister();
    router.push(safeHome);
  };

  const handleVerify = async () => {
    setError("");
    setInfo("");

    const safeEmail = email.trim().toLowerCase();
    const safeCode = code.trim();

    if (!safeEmail) {
      setError("Введите email.");
      return;
    }

    if (!safeCode) {
      setError("Введите код подтверждения.");
      return;
    }

    if (!isApiAvailable()) {
      setError("Сервер временно недоступен. Попробуйте позже.");
      return;
    }

    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        email: safeEmail,
        code: safeCode,
      };

      if (mode === "register") {
        const pending = getPendingRegister();

        if (!pending) {
          throw new Error(
            "Не найдены данные регистрации. Вернитесь к шагу регистрации и попробуйте снова."
          );
        }

        body.password = pending.password;
        body.name = pending.name ?? "";
        body.role = pending.role;
      }

      const data = await api.post<VerifyEmailRes>("auth/verify-email", body);

      const user = data?.user;
      const token = data?.token ?? data?.accessToken;
      const role = normalizeRole(user?.role);
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
      console.error("VERIFY EMAIL ERROR:", err);
      const raw =
        err instanceof Error ? err.message : err != null ? String(err) : "";
      const normalized = raw.toLowerCase();

      if (
        normalized.includes("invalid") ||
        normalized.includes("невер") ||
        normalized.includes("incorrect")
      ) {
        setError("Неверный код подтверждения.");
      } else if (
        normalized.includes("expired") ||
        normalized.includes("истек")
      ) {
        setError("Срок действия кода истёк. Запросите новый код.");
      } else if (
        normalized.includes("имя обязательно") ||
        normalized.includes("name")
      ) {
        setError(
          "Не удалось завершить регистрацию: отсутствуют данные профиля. Вернитесь на страницу регистрации и попробуйте снова."
        );
      } else {
        setError(raw || "Не удалось подтвердить email.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setInfo("");

    const safeEmail = email.trim().toLowerCase();
    if (!safeEmail) {
      setError("Сначала укажите email.");
      return;
    }

    if (!isApiAvailable()) {
      setError("Сервер временно недоступен. Попробуйте позже.");
      return;
    }

    setResending(true);

    try {
      if (mode === "register") {
        const pending = getPendingRegister();

        if (!pending) {
          throw new Error(
            "Не найдены данные регистрации. Вернитесь к шагу регистрации и попробуйте снова."
          );
        }

        await api.post("auth/register", {
          email: pending.email,
          password: pending.password,
          name: pending.name ?? undefined,
          role: pending.role,
        });

        setInfo("Новый код подтверждения отправлен на вашу почту.");
      } else {
        // Если у вас есть отдельный resend endpoint, потом можно заменить сюда.
        setInfo("Повторная отправка кода для этого режима пока не настроена.");
      }
    } catch (err) {
      const raw =
        err instanceof Error ? err.message : err != null ? String(err) : "";
      setError(raw || "Не удалось отправить код повторно.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-96px)] items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="relative hidden flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-b from-purple-500 via-purple-700 to-slate-950 px-8 py-9 text-white md:flex">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-black/30 px-3 py-1 text-xs font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Подтверждение email
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">
                Введите код подтверждения
              </h1>
              <p className="max-w-md text-sm text-white/70">
                Мы отправили код на вашу почту. После подтверждения вы сможете
                завершить вход в систему.
              </p>
            </div>
          </div>
        </div>

        <Card className="space-y-6 rounded-3xl p-6 sm:p-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-[color:var(--text)]">
              Подтвердите email
            </h2>
            <p className="text-sm text-[color:var(--muted)]">
              Введите код, который пришёл на почту.
            </p>
          </div>

          <div className="space-y-4">
            <Input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || resending}
              autoComplete="email"
            />

            <Input
              placeholder="Код подтверждения"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={loading || resending}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void handleVerify();
                }
              }}
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {info && <p className="text-sm text-emerald-400">{info}</p>}

          <div className="space-y-3">
            <Button className="w-full" onClick={handleVerify} disabled={loading || resending}>
              {loading ? "Проверка…" : "Подтвердить email"}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={loading || resending}
            >
              {resending ? "Отправка…" : "Отправить код ещё раз"}
            </Button>
          </div>

          <div className="border-t border-white/10 pt-2 text-center">
            <Link
              href="/auth/register"
              className="text-sm text-[var(--muted)] transition hover:text-[var(--text)]"
              onClick={() => {
                clearAuth();
              }}
            >
              ← Вернуться к регистрации
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}