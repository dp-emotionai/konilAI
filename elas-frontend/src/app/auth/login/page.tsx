"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Eye,
  EyeOff,
  GraduationCap,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { useUI } from "@/components/layout/Providers";
import { ROLE_HOME } from "@/lib/nav";
import { api, getStoredAuth, setAuth } from "@/lib/api/client";
import {
  extractAuthSession,
  type AuthApiResponse,
  type AuthSession,
} from "@/lib/auth/authSession";

export default function LoginPage() {
  const router = useRouter();
  const { state, setLoggedIn, setRole, setStatus, setUserInfo } = useUI();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const stored = getStoredAuth();
    const isAuthenticated = state.loggedIn || Boolean(stored?.token);
    const role = state.role ?? stored?.role ?? null;

    if (isAuthenticated && role) {
      router.replace(ROLE_HOME[role] || "/");
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

    router.replace(ROLE_HOME[role] || "/");
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

      finishLogin(extractAuthSession(data));
    } catch (reason: unknown) {
      console.error("Login failed:", reason);
      setError(formatLoginError(reason));
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#faf9ff]">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <LoaderCircle size={30} className="animate-spin text-[#7448ff]" />
          <p className="text-sm font-semibold">Проверяем сессию...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[46%_54%]">
        <section className="relative flex min-h-screen flex-col px-5 py-6 sm:px-8 md:px-12 lg:px-14 xl:px-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-violet-100/70 blur-3xl"
          />

          <div className="relative z-10 flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#5b2cff,#8b5cf6)] text-sm font-black text-white shadow-lg shadow-violet-300/40">
                K
              </span>
              <span className="text-xl font-black tracking-[-0.03em]">KonilAI</span>
            </Link>

            <Link
              href="/"
              className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-500 transition hover:border-violet-200 hover:text-violet-700 sm:inline-flex"
            >
              <ArrowLeft size={16} />
              На главную
            </Link>
          </div>

          <div className="relative z-10 mx-auto flex w-full max-w-[470px] flex-1 flex-col justify-center py-12">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.13em] text-violet-600">
              <ShieldCheck size={14} />
              Безопасный вход
            </div>

            <h1 className="mt-5 text-3xl font-black tracking-[-0.045em] text-slate-950 sm:text-4xl">
              Добро пожаловать в KonilAI
            </h1>

            <p className="mt-3 max-w-md text-[15px] leading-7 text-slate-500">
              Используйте свои учётные данные для доступа к платформе, учебным сессиям и аналитике.
            </p>

            <div className="mt-9 space-y-5">
              <div>
                <label htmlFor="login-email" className="mb-2 block text-sm font-bold text-slate-700">
                  Email
                </label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  disabled={loading}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (error) setError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleLogin();
                    }
                  }}
                  className="h-14 rounded-2xl border-slate-200 bg-white px-4 text-[15px] shadow-[0_6px_20px_rgba(15,23,42,0.04)] transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor="login-password" className="text-sm font-bold text-slate-700">
                    Пароль
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm font-bold text-violet-600 transition hover:text-violet-700 hover:underline"
                  >
                    Забыли пароль?
                  </Link>
                </div>

                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Введите пароль"
                  value={password}
                  disabled={loading}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (error) setError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleLogin();
                    }
                  }}
                  suffix={
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      disabled={loading}
                      aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                      className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  }
                  className="h-14 rounded-2xl border-slate-200 bg-white px-4 text-[15px] shadow-[0_6px_20px_rgba(15,23,42,0.04)] transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-5 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3.5 text-sm font-semibold leading-6 text-red-600"
              >
                <AlertCircle size={19} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="button"
              onClick={() => void handleLogin()}
              disabled={loading || !email.trim() || !password}
              className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(90deg,#5f2cff,#7c3aed,#6d28d9)] text-[15px] font-black text-white shadow-xl shadow-violet-300/40 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-violet-300/50 disabled:translate-y-0 disabled:shadow-none"
            >
              {loading ? (
                <>
                  <LoaderCircle size={19} className="animate-spin" />
                  Выполняем вход...
                </>
              ) : (
                <>
                  Войти
                  <ChevronRight size={19} />
                </>
              )}
            </Button>

            <div className="my-7 flex items-center gap-4">
              <span className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-semibold text-slate-400">или продолжить через</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <SocialAuthButtons
              mode="login"
              onSuccess={finishLogin}
              onError={(message) => setError(formatLoginError(message))}
            />

            <div className="mt-7 text-center text-sm font-medium text-slate-500">
              Нет аккаунта?{" "}
              <Link href="/auth/register" className="font-black text-violet-600 hover:underline">
                Зарегистрироваться
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <InfoChip icon={<LockKeyhole size={16} />} text="Защищённая авторизация" />
              <InfoChip icon={<ShieldCheck size={16} />} text="Контроль согласия" />
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between border-t border-slate-100 pt-5 text-[11px] font-medium text-slate-400">
            <span>© 2026 KonilAI</span>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="hover:text-violet-600">Конфиденциальность</Link>
              <Link href="/ethics" className="hover:text-violet-600">Этика</Link>
            </div>
          </div>
        </section>

        <aside className="relative hidden min-h-screen overflow-hidden border-l border-violet-100 bg-[radial-gradient(circle_at_70%_18%,rgba(139,92,246,0.18),transparent_26%),linear-gradient(145deg,#fbfaff_0%,#f6f1ff_58%,#ffffff_100%)] lg:flex lg:flex-col lg:justify-center">
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[10%] h-[440px] w-[440px] -translate-x-1/2 rounded-full bg-white/70 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 bottom-10 h-52 w-52 rounded-full bg-violet-200/60 blur-3xl" />

          <div className="relative z-10 mx-auto flex w-full max-w-[720px] flex-col items-center px-10 py-12 text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/80 px-4 py-2 text-xs font-bold text-violet-600 shadow-sm backdrop-blur">
              <GraduationCap size={16} />
              Платформа современного обучения
            </div>

            <div className="relative aspect-[1.18/1] w-full max-w-[610px]">
              <Image
                src="/auth_login_illustration_1776719102544.png"
                alt="Учебная платформа KonilAI"
                fill
                priority
                sizes="(min-width: 1024px) 54vw, 0px"
                className="object-contain drop-shadow-[0_28px_45px_rgba(76,29,149,0.16)]"
              />
            </div>

            <h2 className="mt-2 max-w-xl text-3xl font-black tracking-[-0.035em] text-slate-950">
              Учитесь, взаимодействуйте и отслеживайте прогресс
            </h2>

            <p className="mt-4 max-w-xl text-[15px] leading-7 text-slate-600">
              Инструменты для интерактивных занятий, материалов, аналитики и эффективного взаимодействия между преподавателями и студентами.
            </p>

            <div className="mt-8 grid w-full max-w-[560px] grid-cols-3 gap-3">
              <FeatureCard icon={<Sparkles size={20} />} title="AI-аналитика" text="Понятные метрики" />
              <FeatureCard icon={<GraduationCap size={20} />} title="Live-сессии" text="Обучение в реальном времени" />
              <FeatureCard icon={<ShieldCheck size={20} />} title="Приватность" text="Consent-first подход" />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function InfoChip({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] font-semibold text-slate-500">
      <span className="text-violet-500">{icon}</span>
      <span className="truncate">{text}</span>
    </div>
  );
}

function FeatureCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-[0_12px_35px_rgba(76,29,149,0.08)] backdrop-blur">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
        {icon}
      </div>
      <div className="mt-3 text-sm font-black text-slate-900">{title}</div>
      <div className="mt-1 text-[11px] leading-4 text-slate-500">{text}</div>
    </article>
  );
}

function formatLoginError(reason: unknown): string {
  const message =
    typeof reason === "string"
      ? reason
      : reason instanceof Error
        ? reason.message
        : "";

  if (!message) {
    return "Не удалось выполнить вход. Попробуйте ещё раз.";
  }

  if (/failed to fetch|networkerror|network request failed/i.test(message)) {
    return "Не удалось связаться с сервером. Проверьте подключение и доступность API.";
  }

  if (/401|unauthorized|invalid credentials|неверн/i.test(message)) {
    return "Неверный email или пароль.";
  }

  if (/403|forbidden|blocked/i.test(message)) {
    return "Доступ к аккаунту ограничен. Обратитесь к администратору.";
  }

  return message;
}
