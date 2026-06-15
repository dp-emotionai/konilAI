"use client";

import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ShieldCheck,
  BarChart3,
  Users,
  BookOpen,
  Sparkles,
  ArrowRight,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import StepHeading from "@/components/auth/StepHeading";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { useUI } from "@/components/layout/Providers";
import { api, isApiAvailable, setAuth } from "@/lib/api/client";
import { ROLE_HOME } from "@/lib/nav";
import { cn } from "@/lib/cn";
import type { AuthSession } from "@/lib/auth/authSession";

type RegisterRes = {
  success?: boolean;
  message?: string;
};

const PENDING_REGISTER_KEY = "elas_pending_register_v1";

function savePendingRegister(data: {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role: "student" | "teacher";
}) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PENDING_REGISTER_KEY, JSON.stringify(data));
}

export default function RegisterWizardPage() {
  const router = useRouter();
  const { setLoggedIn, setRole, setStatus, setUserInfo } = useUI();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRoleValue] = useState<"student" | "teacher" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;
  const isPasswordValid =
    hasMinLength && hasUppercase && hasNumber && passwordsMatch;

  const nextStep = () => {
    setError("");
    setStep((value) => value + 1);
  };

  const prevStep = () => {
    setError("");
    setStep((value) => value - 1);
  };

  const finishSocialRegister = ({
    token,
    email,
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
      email,
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

    router.push(safeHome);
  };

  const handleRegister = async () => {
    setError("");

    if (!isPasswordValid) return;

    const normalizedEmail = email.trim().toLowerCase();

    if (!isApiAvailable()) {
      setError("Сервер недоступен. Обратитесь к администратору.");
      return;
    }

    setLoading(true);

    try {
      await api.post<RegisterRes>("auth/register", {
        email: normalizedEmail,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: role || "student",
      });

      savePendingRegister({
        email: normalizedEmail,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: role || "student",
      });

      router.push(
        `/auth/verify-email?email=${encodeURIComponent(normalizedEmail)}&mode=register`,
      );
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setError(raw || "Ошибка регистрации.");
    } finally {
      setLoading(false);
    }
  };

  const FeatureCard = ({
    icon,
    title,
    text,
  }: {
    icon: ReactNode;
    title: string;
    text: string;
  }) => (
    <div className="flex items-start gap-4 rounded-[22px] bg-white/75 p-4 shadow-[0_14px_35px_rgba(116,72,255,0.08)] ring-1 ring-white/70 backdrop-blur">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#7448FF] shadow-sm">
        {icon}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
          {text}
        </p>
      </div>
    </div>
  );

  const MarketingPanel = () => (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-[#F8F4FF] via-white to-[#EFE8FF] p-10 lg:block">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-purple-200/35 blur-3xl" />
      <div className="absolute -bottom-20 left-12 h-72 w-72 rounded-full bg-indigo-200/30 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-full w-full bg-[radial-gradient(circle_at_80%_20%,rgba(116,72,255,0.12),transparent_28%),radial-gradient(circle_at_25%_70%,rgba(167,139,250,0.14),transparent_30%)]" />

      <div className="relative z-10 flex h-full flex-col justify-center">
        <div className="mb-8 inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#7448FF] shadow-sm">
          <GraduationCap size={16} />
          Платформа современного обучения
        </div>

        <div className="relative mb-10 flex justify-center">
          <div className="relative h-64 w-full max-w-md">
            <div className="absolute left-10 top-20 h-24 w-24 rotate-[-8deg] rounded-[26px] bg-white p-4 shadow-[0_18px_50px_rgba(116,72,255,0.18)]">
              <BookOpen
                className="h-full w-full text-[#7448FF]"
                strokeWidth={1.5}
              />
            </div>

            <div className="absolute left-28 top-6 h-44 w-64 rounded-[28px] border border-white/80 bg-white/85 p-5 shadow-[0_24px_70px_rgba(116,72,255,0.18)] backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">
                  Прогресс
                </span>
                <span className="rounded-full bg-purple-50 px-2 py-1 text-xs font-medium text-[#7448FF]">
                  84%
                </span>
              </div>
              <div className="mb-4 h-16 rounded-2xl bg-gradient-to-br from-purple-50 to-white p-3">
                <div className="flex h-full items-end gap-2">
                  {[30, 45, 38, 70, 58, 82, 76].map((height, index) => (
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

            <div className="absolute bottom-4 right-8 flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-[#7448FF] to-[#5B21F6] text-white shadow-[0_20px_45px_rgba(116,72,255,0.32)]">
              <ShieldCheck size={44} />
            </div>

            <div className="absolute right-2 top-12 flex h-20 w-20 items-center justify-center rounded-full bg-white/80 shadow-xl">
              <Sparkles size={32} className="text-[#7448FF]" />
            </div>
          </div>
        </div>

        <h2 className="max-w-xl text-center text-[30px] font-semibold leading-tight tracking-tight text-slate-900">
          Учитесь, взаимодействуйте
          <br />и отслеживайте прогресс
        </h2>

        <p className="mx-auto mt-5 max-w-xl text-center text-[15px] font-medium leading-7 text-slate-600">
          Инструменты для интерактивных занятий, материалов, аналитики и
          эффективного взаимодействия между преподавателями и студентами.
        </p>

        <div className="mt-10 grid grid-cols-3 gap-5">
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
    </div>
  );

  const renderWelcome = () => (
    <div className="grid min-h-[680px] overflow-hidden rounded-[32px] bg-white shadow-[0_28px_90px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="flex flex-col justify-center px-8 py-10 md:px-14 lg:px-16">
        <div className="mb-7 inline-flex w-fit items-center gap-2 rounded-full bg-purple-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#7448FF]">
          <ShieldCheck size={16} />
          Безопасная регистрация
        </div>

        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-slate-900 md:text-4xl">
          Добро пожаловать
          <br />в KoniAI
        </h1>

        <p className="mt-5 max-w-md text-[15px] font-medium leading-7 text-slate-500">
          Создайте аккаунт для доступа к платформе, учебным сессиям и аналитике
          обучения.
        </p>

        <div className="mt-10 space-y-4">
          <Button
            onClick={nextStep}
            className="h-14 w-full rounded-2xl text-[15px] font-semibold shadow-[0_14px_30px_rgba(116,72,255,0.28)]"
          >
            Зарегистрироваться
            <ArrowRight size={18} />
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push("/auth/login")}
            className="h-14 w-full rounded-2xl border-slate-200 bg-white text-[15px] font-semibold"
          >
            Уже есть аккаунт? Войти
          </Button>
        </div>

        <div className="mt-8 rounded-[24px] border border-slate-100 bg-slate-50/70 p-5">
          <SocialAuthButtons
            mode="register"
            role={role}
            onSuccess={finishSocialRegister}
            onError={setError}
          />
        </div>

        {error && (
          <div className="mt-6 flex items-center gap-2.5 rounded-2xl border border-red-100 bg-red-50 p-4 text-[13px] font-medium text-red-600">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <div className="mt-10 grid grid-cols-2 gap-3">
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500">
            <Lock size={16} className="text-[#7448FF]" />
            Защищённый вход
          </div>
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500">
            <ShieldCheck size={16} className="text-[#7448FF]" />
            Контроль согласия
          </div>
        </div>
      </div>

      <MarketingPanel />
    </div>
  );

  const renderRoleSelection = () => (
    <div className="mx-auto max-w-xl animate-in fade-in slide-in-from-right-4 py-8 duration-500">
      <button
        onClick={prevStep}
        className="mb-8 flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-slate-600"
      >
        <ChevronLeft size={16} /> Назад
      </button>

      <StepHeading
        step={2}
        title="Выбор роли"
        subtitle="Выберите свою роль в системе"
      />

      <div className="mt-10 space-y-4">
        {[
          {
            value: "student" as const,
            title: "Студент",
            description: "Хочу учиться, проходить курсы и развиваться",
            icon: <GraduationCap size={28} />,
          },
          {
            value: "teacher" as const,
            title: "Преподаватель",
            description: "Хочу создавать курсы и обучать студентов",
            icon: <Briefcase size={28} />,
          },
        ].map((item) => {
          const active = role === item.value;

          return (
            <div
              key={item.value}
              onClick={() => setRoleValue(item.value)}
              className={cn(
                "group relative flex cursor-pointer items-center gap-5 rounded-[28px] border-2 p-5 transition-all",
                active
                  ? "border-[#7448FF] bg-purple-50/40 shadow-[0_18px_45px_rgba(116,72,255,0.12)]"
                  : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-sm",
              )}
            >
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-2xl transition-colors",
                  active
                    ? "bg-[#7448FF] text-white"
                    : "bg-slate-100 text-slate-400 group-hover:bg-slate-200",
                )}
              >
                {item.icon}
              </div>

              <div className="flex-1">
                <h3 className="font-medium text-slate-900">{item.title}</h3>
                <p className="text-sm text-slate-500">{item.description}</p>
              </div>

              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all",
                  active ? "border-[#7448FF]" : "border-slate-200",
                )}
              >
                {active && (
                  <div className="h-3 w-3 rounded-full bg-[#7448FF]" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
        <SocialAuthButtons
          mode="register"
          role={role}
          onSuccess={finishSocialRegister}
          onError={setError}
        />
      </div>

      {error && (
        <div className="mt-6 flex items-center gap-2.5 rounded-2xl border border-red-100 bg-red-50 p-4 text-[13px] font-medium text-red-600">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <Button
        onClick={nextStep}
        disabled={!role}
        className="mt-12 h-14 w-full rounded-2xl text-[15px] font-medium"
      >
        Продолжить
      </Button>
    </div>
  );

  const renderBasicInfo = () => (
    <div className="mx-auto max-w-xl animate-in fade-in slide-in-from-right-4 py-8 duration-500">
      <button
        onClick={prevStep}
        className="mb-8 flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-slate-600"
      >
        <ChevronLeft size={16} /> Назад
      </button>

      <StepHeading
        step={3}
        title="Расскажите о себе"
        subtitle="Заполните основную информацию для аккаунта"
      />

      <div className="mt-10 space-y-6">
        <div>
          <label className="ml-1 mb-2.5 block text-[13px] font-medium text-slate-500">
            Имя
          </label>
          <Input
            placeholder="Введите имя"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="h-12 bg-white"
          />
        </div>

        <div>
          <label className="ml-1 mb-2.5 block text-[13px] font-medium text-slate-500">
            Фамилия
          </label>
          <Input
            placeholder="Введите фамилию"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="h-12 bg-white"
          />
        </div>

        <div>
          <label className="ml-1 mb-2.5 block text-[13px] font-medium text-slate-500">
            Email
          </label>
          <AuthInput
            placeholder="example@mail.ru"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail size={18} />}
          />
        </div>
      </div>

      <Button
        onClick={nextStep}
        disabled={!firstName || !lastName || !email}
        className="mt-12 h-14 w-full rounded-2xl text-[15px] font-medium"
      >
        Продолжить
      </Button>
    </div>
  );

  const renderPasswordSetup = () => (
    <div className="mx-auto max-w-xl animate-in fade-in slide-in-from-right-4 py-8 duration-500">
      <button
        onClick={prevStep}
        className="mb-8 flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-slate-600"
      >
        <ChevronLeft size={16} /> Назад
      </button>

      <StepHeading
        step={4}
        title="Создайте пароль"
        subtitle="Придумайте надежный пароль для защиты аккаунта"
      />

      <div className="mt-10 space-y-6">
        <div>
          <label className="ml-1 mb-2.5 block text-[13px] font-medium text-slate-500">
            Пароль
          </label>
          <AuthInput
            placeholder="Введите пароль"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            icon={<Lock size={18} />}
            suffix={
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />
        </div>

        <div className="space-y-2.5 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
          {[
            { ok: hasMinLength, text: "Минимум 8 символов" },
            { ok: hasUppercase, text: "Хотя бы одна заглавная буква" },
            { ok: hasNumber, text: "Хотя бы одна цифра" },
          ].map((item) => (
            <div
              key={item.text}
              className="flex items-center gap-2.5 transition-colors"
            >
              {item.ok ? (
                <CheckCircle2 size={16} className="text-emerald-500" />
              ) : (
                <div className="h-4 w-4 rounded-full border border-slate-200" />
              )}
              <span
                className={cn(
                  "text-[13px] font-medium",
                  item.ok ? "text-emerald-600" : "text-slate-400",
                )}
              >
                {item.text}
              </span>
            </div>
          ))}
        </div>

        <div>
          <label className="ml-1 mb-2.5 block text-[13px] font-medium text-slate-500">
            Подтвердите пароль
          </label>
          <AuthInput
            placeholder="Повторите пароль"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            icon={<Lock size={18} />}
          />

          {confirmPassword && !passwordsMatch && (
            <p className="ml-1 mt-1.5 flex items-center gap-1 text-xs font-medium text-red-500">
              <AlertCircle size={12} /> Пароли не совпадают
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-6 flex items-center gap-2.5 rounded-2xl border border-red-100 bg-red-50 p-4 text-[13px] font-medium text-red-600">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <Button
        onClick={handleRegister}
        disabled={!isPasswordValid || loading}
        className="mt-12 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-medium"
      >
        {loading ? "Обработка..." : "Завершить регистрацию"}
        {!loading && <ChevronRight size={18} />}
      </Button>
    </div>
  );

  return (
    <main className="min-h-[calc(100vh-80px)] bg-gradient-to-br from-white via-slate-50 to-purple-50/60 px-4 py-10 md:px-8 md:py-14">
      <div className="mx-auto w-full max-w-[1500px]">
        {step === 1 ? (
          renderWelcome()
        ) : (
          <Card className="mx-auto w-full max-w-[760px] overflow-hidden rounded-[32px] border-white/70 bg-white/90 shadow-[0_28px_90px_rgba(15,23,42,0.08)] backdrop-blur">
            <CardContent className="p-8 md:p-12">
              {step === 2 && renderRoleSelection()}
              {step === 3 && renderBasicInfo()}
              {step === 4 && renderPasswordSetup()}
            </CardContent>
          </Card>
        )}
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
          "h-[52px] w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-12 text-[15px] font-normal text-slate-900 shadow-[0_6px_20px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 focus:border-[#7448FF] focus:ring-4 focus:ring-purple-100 disabled:cursor-not-allowed disabled:bg-slate-50",
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
