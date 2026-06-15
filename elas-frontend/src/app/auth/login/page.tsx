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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(116,72,255,0.18),transparent_34%),linear-gradient(135deg,#fbfaff_0%,#f8fbff_48%,#ffffff_100%)] px-4 py-10 font-sans text-slate-900">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-[#7448FF]/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-8 h-80 w-80 rounded-full bg-sky-300/20 blur-3xl" />

      <Card className="relative z-10 w-full max-w-[1120px] overflow-hidden border border-white/70 bg-white/85 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-2xl">
        <CardContent className="p-0">
          <div className="grid min-h-[680px] gap-0 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="flex flex-col p-7 md:p-10 lg:p-12">
              <Link href="/" className="mb-10 flex w-fit items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7448FF] to-[#9B6DFF] text-sm font-black text-white shadow-lg shadow-[#7448FF]/25">
                  K
                </div>
                <div>
                  <span className="block text-base font-black tracking-tight text-slate-950">KonilAI</span>
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">learning analytics</span>
                </div>
              </Link>

              <div className="mx-auto flex w-full max-w-[410px] flex-1 flex-col justify-center lg:mx-0">
                <div className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-[#7448FF]/15 bg-[#7448FF]/8 px-3 py-1.5 text-xs font-bold text-[#7448FF]">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Безопасный вход в платформу
                </div>

                <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                  Добро пожаловать обратно
                </h1>

                <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
                  Войдите в KonilAI, чтобы открыть сессии, материалы и аналитику обучения.
                </p>

                <div className="mt-9 space-y-5">
                  <div>
                    <label htmlFor="login-email" className="mb-2 block text-[13px] font-bold text-slate-600">
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
                      className="h-13 rounded-2xl border-slate-200 bg-white/90 px-4 shadow-sm transition focus:ring-2 focus:ring-[#7448FF]/20"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label htmlFor="login-password" className="mb-2 flex items-center justify-between text-[13px] font-bold text-slate-600">
                      <span>Пароль</span>
                      <Link href="/auth/forgot-password" className="text-[12px] font-bold text-[#7448FF] hover:underline">
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
                      className="h-13 rounded-2xl border-slate-200 bg-white/90 px-4 shadow-sm transition focus:ring-2 focus:ring-[#7448FF]/20"
                      disabled={loading}
                      suffix={
                        <button
                          type="button"
                          onClick={() => setShowPassword((value) => !value)}
                          className="text-slate-400 transition-colors hover:text-slate-700"
                          aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
                  <div role="alert" className="mt-6 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50/90 p-4 text-[13px] font-semibold text-red-600 shadow-sm">
                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="button"
                  onClick={() => void handleLogin()}
                  disabled={loading || !email.trim() || !password}
                  className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#7448FF] to-[#925CFF] text-[15px] font-black text-white shadow-xl shadow-[#7448FF]/25 transition hover:translate-y-[-1px] hover:shadow-2xl hover:shadow-[#7448FF]/25"
                >
                  {loading ? (
                    <>
                      <LoaderCircle size={18} className="animate-spin" />
                      Входим...
                    </>
                  ) : (
                    <>
                      Войти в аккаунт
                      <ChevronRight size={18} />
                    </>
                  )}
                </Button>

                <div className="mt-8 border-t border-slate-100 pt-7">
                  <SocialAuthButtons mode="login" onSuccess={finishLogin} onError={setError} />
                </div>

                <div className="mt-8 rounded-2xl bg-slate-50 px-4 py-4 text-center text-[13px] font-medium text-slate-500">
                  Нет аккаунта?{" "}
                  <Link href="/auth/register" className="font-black text-[#7448FF] hover:underline">
                    Зарегистрироваться
                  </Link>
                </div>
              </div>
            </div>

            <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#7448FF] via-[#8760FF] to-[#B28CFF] p-12 text-white lg:flex lg:flex-col lg:justify-between">
              <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-28 left-10 h-72 w-72 rounded-full bg-indigo-950/20 blur-3xl" />

              <div className="relative z-10 flex items-center justify-between">
                <div className="rounded-full bg-white/15 px-4 py-2 text-xs font-bold ring-1 ring-white/25 backdrop-blur">
                  Consent-first analytics
                </div>
                <div className="rounded-full bg-emerald-400/20 px-4 py-2 text-xs font-bold ring-1 ring-emerald-200/30">
                  Secure
                </div>
              </div>

              <div className="relative z-10 mx-auto flex w-full max-w-[440px] flex-col items-center text-center">
                <div className="relative mb-8 aspect-square w-full max-w-[340px] drop-shadow-2xl">
                  <Image
                    src="/auth_login_illustration_1776719102544.png"
                    alt="Безопасный вход в KonilAI"
                    fill
                    priority
                    sizes="340px"
                    className="object-contain"
                  />
                </div>

                <h2 className="text-3xl font-black tracking-tight">Учебная аналитика без лишнего шума</h2>
                <p className="mt-4 max-w-sm text-sm font-medium leading-6 text-white/80">
                  KonilAI помогает преподавателям видеть динамику группы, а студентам — контролировать прогресс и согласие на обработку данных.
                </p>
              </div>

              <div className="relative z-10 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-3xl bg-white/12 p-4 ring-1 ring-white/15 backdrop-blur">
                  <div className="text-lg font-black">Live</div>
                  <div className="mt-1 text-[11px] text-white/70">сессии</div>
                </div>
                <div className="rounded-3xl bg-white/12 p-4 ring-1 ring-white/15 backdrop-blur">
                  <div className="text-lg font-black">AI</div>
                  <div className="mt-1 text-[11px] text-white/70">метрики</div>
                </div>
                <div className="rounded-3xl bg-white/12 p-4 ring-1 ring-white/15 backdrop-blur">
                  <div className="text-lg font-black">CSV</div>
                  <div className="mt-1 text-[11px] text-white/70">экспорт</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Link href="/" className="fixed bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-slate-500 shadow-lg ring-1 ring-slate-200/70 backdrop-blur transition-colors hover:text-slate-900">
        <ArrowLeft size={16} />
        Вернуться на главную
      </Link>
    </div>
  );
}
