"use client";

import {
  useEffect,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ChevronRight,
  Eye,
  EyeOff,
  GraduationCap,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  BarChart3,
  Users,
  BookOpen,
} from "lucide-react";

import Button from "@/components/ui/Button";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { useUI } from "@/components/layout/Providers";
import { ROLE_HOME } from "@/lib/nav";
import { api, getStoredAuth, setAuth } from "@/lib/api/client";
import {
  extractAuthSession,
  type AuthApiResponse,
  type AuthSession,
} from "@/lib/auth/authSession";
import { cn } from "@/lib/cn";

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
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-gradient-to-br from-white via-slate-50 to-purple-50/60">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <LoaderCircle size={30} className="animate-spin text-[#7448FF]" />
          <p className="text-sm font-medium">Проверяем сессию...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-[calc(100vh-80px)] bg-gradient-to-br from-white via-slate-50 to-purple-50/60 px-4 py-10 text-slate-950 md:px-8 md:py-14">
      <div className="mx-auto grid w-full max-w-[1500px] overflow-hidden rounded-[32px] bg-white shadow-[0_28px_90px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 lg:grid-cols-[0.86fr_1.14fr]">
        <section className="flex flex-col justify-center px-8 py-10 md:px-14 lg:px-16">
          <div className="mb-7 inline-flex w-fit items-center gap-2 rounded-full bg-purple-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#7448FF]">
            <ShieldCheck size={16} />
            Безопасный вход
          </div>

          <h1 className="max-w-md text-4xl font-semibold leading-tight tracking-[-0.035em] text-slate-950 md:text-[44px]">
            Добро пожаловать
            <br />в KoniAI
          </h1>

          <p className="mt-5 max-w-md text-[15px] font-normal leading-7 text-slate-500">
            Используйте свои учётные данные для доступа к платформе, учебным
            сессиям и аналитике.
          </p>

          <div className="mt-9 space-y-5">
            <div>
              <label
                htmlFor="login-email"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Email
              </label>
              <AuthInput
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                disabled={loading}
                icon={<Mail size={18} />}
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
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  htmlFor="login-password"
                  className="text-sm font-semibold text-slate-800"
                >
                  Пароль
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm font-semibold text-[#7448FF] transition hover:text-[#5B21F6] hover:underline"
                >
                  Забыли пароль?
                </Link>
              </div>

              <AuthInput
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Введите пароль"
                value={password}
                disabled={loading}
                icon={<LockKeyhole size={18} />}
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
                    aria-label={
                      showPassword ? "Скрыть пароль" : "Показать пароль"
                    }
                    className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                }
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-5 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3.5 text-sm font-medium leading-6 text-red-600"
            >
              <AlertCircle size={19} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="button"
            onClick={() => void handleLogin()}
            disabled={loading || !email.trim() || !password}
            className="mt-7 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(90deg,#5F2CFF,#7C3AED,#6D28D9)] text-[15px] font-semibold text-white shadow-[0_16px_32px_rgba(116,72,255,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(116,72,255,0.34)] disabled:translate-y-0 disabled:shadow-none"
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
            <span className="text-xs font-medium text-slate-400">
              или продолжить через
            </span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <SocialAuthButtons
            mode="login"
            onSuccess={finishLogin}
            onError={(message) => setError(formatLoginError(message))}
          />

          <div className="mt-7 text-center text-sm font-normal text-slate-500">
            Нет аккаунта?{" "}
            <Link
              href="/auth/register"
              className="font-semibold text-[#7448FF] hover:underline"
            >
              Зарегистрироваться
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <InfoChip
              icon={<LockKeyhole size={16} />}
              text="Защищённая авторизация"
            />
            <InfoChip
              icon={<ShieldCheck size={16} />}
              text="Контроль согласия"
            />
          </div>
        </section>

        <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[#F8F4FF] via-white to-[#EFE8FF] p-10 lg:block">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-purple-200/35 blur-3xl" />
          <div className="absolute -bottom-20 left-12 h-72 w-72 rounded-full bg-indigo-200/30 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-full w-full bg-[radial-gradient(circle_at_80%_20%,rgba(116,72,255,0.12),transparent_28%),radial-gradient(circle_at_25%_70%,rgba(167,139,250,0.14),transparent_30%)]" />

          <div className="relative z-10 flex h-full flex-col justify-center">
            <div className="mb-7 inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#7448FF] shadow-sm">
              <GraduationCap size={16} />
              Платформа современного обучения
            </div>

            <div className="relative mx-auto mb-8 h-[300px] w-full max-w-[620px]">
              <div className="absolute left-8 top-24 h-24 w-28 rotate-[-8deg] rounded-[26px] bg-white p-5 shadow-[0_20px_55px_rgba(116,72,255,0.18)]">
                <BookOpen
                  className="h-full w-full text-[#7448FF]"
                  strokeWidth={1.6}
                />
              </div>

              <div className="absolute left-[150px] top-6 h-52 w-80 rounded-[30px] border border-white/80 bg-white/90 p-5 shadow-[0_28px_80px_rgba(116,72,255,0.2)]">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Прогресс
                  </span>
                  <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-[#7448FF]">
                    84%
                  </span>
                </div>

                <div className="mb-4 h-20 rounded-2xl bg-gradient-to-br from-purple-50 to-white p-3">
                  <div className="flex h-full items-end gap-2">
                    {[32, 48, 42, 68, 57, 86, 78].map((height, index) => (
                      <div
                        key={index}
                        className="w-full rounded-full bg-gradient-to-t from-[#7448FF] to-[#A78BFA]"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="h-12 rounded-xl bg-slate-50" />
                  <div className="h-12 rounded-xl bg-slate-50" />
                  <div className="h-12 rounded-xl bg-slate-50" />
                </div>
              </div>

              <div className="absolute right-10 top-16 flex h-32 w-28 items-center justify-center rounded-[30px] bg-white shadow-[0_20px_55px_rgba(116,72,255,0.18)]">
                <Users size={46} className="text-[#7448FF]" />
              </div>

              <div className="absolute bottom-6 right-20 flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-[#7448FF] to-[#5B21F6] text-white shadow-[0_20px_45px_rgba(116,72,255,0.32)]">
                <ShieldCheck size={42} />
              </div>
            </div>

            <h2 className="mx-auto max-w-2xl text-center text-4xl font-semibold leading-tight tracking-[-0.035em] text-slate-950">
              Учитесь, взаимодействуйте
              <br />и отслеживайте прогресс
            </h2>

            <p className="mx-auto mt-5 max-w-xl text-center text-[15px] font-normal leading-7 text-slate-600">
              Инструменты для интерактивных занятий, материалов, аналитики и
              эффективного взаимодействия между преподавателями и студентами.
            </p>

            <div className="mt-9 grid grid-cols-3 gap-5">
              <FeatureCard
                icon={<BarChart3 size={24} />}
                title="AI-аналитика"
                text="Понятные метрики и персональные рекомендации"
              />
              <FeatureCard
                icon={<Users size={24} />}
                title="Live-сессии"
                text="Обучение в реальном времени с интерактивом"
              />
              <FeatureCard
                icon={<ShieldCheck size={24} />}
                title="Приватность"
                text="Consent-first подход и защита ваших данных"
              />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function AuthInput({
  icon,
  suffix,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  icon: ReactNode;
  suffix?: ReactNode;
}) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400">
        {icon}
      </div>

      <input
        {...props}
        className={cn(
          "h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-12 text-[15px] font-normal text-slate-900 shadow-[0_6px_20px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 focus:border-[#7448FF] focus:ring-4 focus:ring-purple-100 disabled:cursor-not-allowed disabled:bg-slate-50",
          className,
        )}
      />

      {suffix && (
        <div className="absolute right-3 top-1/2 z-10 -translate-y-1/2">
          {suffix}
        </div>
      )}
    </div>
  );
}

function InfoChip({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500">
      <span className="text-[#7448FF]">{icon}</span>
      <span className="truncate">{text}</span>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article className="rounded-[24px] bg-white/78 p-5 shadow-[0_16px_45px_rgba(76,29,149,0.08)] ring-1 ring-white/80 backdrop-blur">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-[#7448FF]">
        {icon}
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-xs font-normal leading-5 text-slate-500">
        {text}
      </p>
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
