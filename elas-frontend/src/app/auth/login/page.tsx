"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Eye,
  EyeOff,
  ChevronRight,
  AlertCircle,
  ArrowLeft,
  LoaderCircle,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { useUI } from "@/components/layout/Providers";
import { ROLE_HOME } from "@/lib/nav";
import {
  api,
  getStoredAuth,
  setAuth,
} from "@/lib/api/client";
import {
  extractAuthSession,
  type AuthApiResponse,
  type AuthSession,
} from "@/lib/auth/authSession";

export default function LoginPage() {
  const router = useRouter();

  const {
    state,
    setLoggedIn,
    setRole,
    setStatus,
    setUserInfo,
  } = useUI();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  /*
   * Если пользователь уже авторизован, страницу входа не показываем.
   *
   * Проверяем одновременно:
   * 1. состояние UI, восстановленное AuthRestore;
   * 2. данные в localStorage, потому что UI может ещё не успеть восстановиться.
   */
  useEffect(() => {
    const stored = getStoredAuth();

    const isAuthenticated =
      state.loggedIn || Boolean(stored?.token);

    const role = state.role ?? stored?.role ?? null;

    if (isAuthenticated && role) {
      const home = ROLE_HOME[role] || "/";
      router.replace(home);
      return;
    }

    setCheckingSession(false);
  }, [router, state.loggedIn, state.role]);

  const finishLogin = ({
    token,
    email: sessionEmail,
    role,
    id,
    firstName,
    lastName,
    fullName,
    avatarUrl,
    status,
  }: AuthSession) => {
    const safeHome = ROLE_HOME[role] || "/";

    setAuth({
      token,
      role,
      email: sessionEmail,
      id: id ?? null,
      firstName: firstName ?? undefined,
      lastName: lastName ?? undefined,
      fullName: fullName ?? undefined,
      avatarUrl: avatarUrl ?? undefined,
      status: status ?? null,
    });

    setRole(role);
    setStatus(status ?? null);
    setLoggedIn(true);

    setUserInfo({
      firstName: firstName ?? undefined,
      lastName: lastName ?? undefined,
      fullName: fullName ?? undefined,
      avatarUrl: avatarUrl ?? undefined,
    });

    /*
     * replace не оставляет страницу login в истории браузера.
     * После входа кнопка «Назад» не вернёт пользователя на форму.
     */
    router.replace(safeHome);
  };

  const handleLogin = async () => {
    if (loading) return;

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError("Введите email и пароль.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const data = await api.post<AuthApiResponse>("auth/login", {
        email: normalizedEmail,
        password,
      });

      const session = extractAuthSession(data);
      finishLogin(session);
    } catch (err) {
      console.error("Login failed:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Не удалось выполнить вход. Попробуйте ещё раз."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Пока проверяется localStorage/AuthRestore, форму не показываем.
   * Это устраняет мигание страницы входа после обновления сайта.
   */
  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50/30">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <LoaderCircle
            size={28}
            className="animate-spin text-[#7448FF]"
          />
          <p className="text-sm font-medium">
            Проверяем сессию...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/30 px-4 py-12 font-sans">
      <Card className="w-full max-w-[1000px] overflow-hidden border-white/50 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.04)]">
        <CardContent className="p-0">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col p-8 md:p-12">
              <div className="mb-10 flex items-center gap-2">
                <Link
                  href="/"
                  className="flex items-center gap-2"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7448FF] text-sm font-bold text-white">
                    K
                  </div>

                  <span className="text-lg font-bold text-slate-900">
                    KonilAI
                  </span>
                </Link>
              </div>

              <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center lg:mx-0">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  Добро пожаловать в KonilAI
                </h1>

                <p className="mb-10 mt-1 text-sm font-medium text-slate-500">
                  Используйте свои учетные данные для доступа к платформе
                </p>

                <div className="space-y-6">
                  <div>
                    <label
                      htmlFor="login-email"
                      className="mb-2.5 ml-1 block text-[13px] font-bold text-slate-500"
                    >
                      Email
                    </label>

                    <Input
                      id="login-email"
                      placeholder="example@mail.ru"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => {
                        setEmail(event.target.value);
                        if (error) setError("");
                      }}
                      className="h-12 bg-white"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="login-password"
                      className="mb-2.5 ml-1 flex items-center justify-between text-[13px] font-bold text-slate-500"
                    >
                      <span>Пароль</span>

                      <Link
                        href="/auth/forgot-password"
                        className="text-[12px] font-semibold text-[#7448FF] hover:underline"
                      >
                        Забыли?
                      </Link>
                    </label>

                    <Input
                      id="login-password"
                      placeholder="••••••••••"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        if (error) setError("");
                      }}
                      className="h-12 bg-white"
                      disabled={loading}
                      suffix={
                        <button
                          type="button"
                          onClick={() =>
                            setShowPassword((value) => !value)
                          }
                          className="transition-colors hover:text-slate-600"
                          aria-label={
                            showPassword
                              ? "Скрыть пароль"
                              : "Показать пароль"
                          }
                        >
                          {showPassword ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void handleLogin();
                        }
                      }}
                    />
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="mt-6 flex items-center gap-2.5 rounded-2xl border border-red-100 bg-red-50 p-4 text-[13px] font-medium text-red-600"
                  >
                    <AlertCircle
                      size={18}
                      className="shrink-0"
                    />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="button"
                  onClick={() => void handleLogin()}
                  disabled={
                    loading ||
                    !email.trim() ||
                    !password
                  }
                  className="mt-10 flex h-14 w-full items-center justify-center gap-2 text-[15px] font-bold"
                >
                  {loading ? (
                    <>
                      <LoaderCircle
                        size={18}
                        className="animate-spin"
                      />
                      Вход...
                    </>
                  ) : (
                    <>
                      Войти
                      <ChevronRight size={18} />
                    </>
                  )}
                </Button>

                <div className="mt-8 border-t border-slate-100 pt-8">
                  <SocialAuthButtons
                    mode="login"
                    onSuccess={finishLogin}
                    onError={setError}
                  />
                </div>

                <div className="mt-10 border-t border-slate-100 pt-8 text-center lg:text-left">
                  <p className="text-[13px] font-medium text-slate-500">
                    Нет аккаунта?{" "}
                    <Link
                      href="/auth/register"
                      className="font-bold text-[#7448FF] hover:underline"
                    >
                      Зарегистрироваться
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            <div className="relative hidden items-center justify-center border-l border-slate-100 bg-slate-50/50 p-12 lg:flex">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-8 aspect-square w-full max-w-[320px] animate-in zoom-in duration-700">
                  <Image
                    src="/auth_login_illustration_1776719102544.png"
                    alt="Безопасный вход в KonilAI"
                    fill
                    priority
                    sizes="320px"
                    className="object-contain"
                  />
                </div>

                <h2 className="mb-3 text-xl font-bold text-slate-800">
                  Безопасный доступ
                </h2>

                <p className="max-w-xs text-sm font-medium leading-relaxed text-slate-500">
                  Мы используем современные стандарты безопасности для
                  защиты ваших данных и учебной активности.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Link
        href="/"
        className="fixed bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2 text-sm font-semibold text-slate-400 transition-colors hover:text-slate-600"
      >
        <ArrowLeft size={16} />
        Вернуться на главную
      </Link>
    </div>
  );
}
