"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
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
  const [phone, setPhone] = useState("");
  const [role, setRoleValue] = useState<"student" | "teacher" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;
  const isPasswordValid = hasMinLength && hasUppercase && hasNumber && passwordsMatch;

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

      router.push(`/auth/verify-email?email=${encodeURIComponent(normalizedEmail)}&mode=register`);
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setError(raw || "Ошибка регистрации.");
    } finally {
      setLoading(false);
    }
  };

  const renderWelcome = () => (
    <div className="grid w-full gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="flex flex-col justify-center py-8">
        <div className="mb-10 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7448FF] font-bold text-white">K</div>
          <span className="text-xl font-bold text-slate-900">KonilAI</span>
        </div>

        <h1 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight text-slate-900">
          Привет!
          <br />
          <span className="text-slate-400">Начните учиться и достигать новых целей.</span>
        </h1>

        <div className="mt-8 max-w-sm space-y-4">
          <Button onClick={() => router.push("/auth/login")} className="h-12 w-full text-base">
            Войти
          </Button>
          <Button variant="outline" onClick={nextStep} className="h-12 w-full text-base">
            Зарегистрироваться
          </Button>
        </div>

        <div className="mt-10 rounded-[24px] border border-slate-100 bg-white/70 p-5">
          <div className="text-[13px] font-medium text-slate-400">
            Google уже можно использовать для регистрации. GitHub появится здесь сразу после включения backend route.
          </div>
        </div>

        <p className="mt-12 max-w-xs text-[12px] leading-relaxed text-slate-400">
          Продолжая, вы соглашаетесь с{" "}
          <Link href="/terms" className="font-semibold text-[#7448FF] underline">
            условиями использования
          </Link>{" "}
          и{" "}
          <Link href="/privacy" className="font-semibold text-[#7448FF] underline">
            политикой конфиденциальности
          </Link>
          .
        </p>
      </div>

      <div className="relative hidden items-center justify-center overflow-hidden rounded-[40px] border border-slate-100 bg-slate-50/50 lg:flex">
        <Image src="/auth_onboarding_illustration_1776717858308.png" alt="Illustration" fill className="object-contain p-12" />
      </div>
    </div>
  );

  const renderRoleSelection = () => (
    <div className="mx-auto max-w-xl animate-in fade-in slide-in-from-right-4 py-8 duration-500">
      <button onClick={prevStep} className="mb-8 flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-slate-600">
        <ChevronLeft size={16} /> Назад
      </button>

      <StepHeading step={2} title="Выбор роли" subtitle="Выберите свою роль в системе" />

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
                active ? "border-[#7448FF] bg-purple-50/30" : "border-slate-100 bg-white hover:border-slate-200"
              )}
            >
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-2xl transition-colors",
                  active ? "bg-[#7448FF] text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                )}
              >
                {item.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900">{item.title}</h3>
                <p className="text-sm text-slate-500">{item.description}</p>
              </div>
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all",
                  active ? "border-[#7448FF]" : "border-slate-200"
                )}
              >
                {active && <div className="h-3 w-3 rounded-full bg-[#7448FF]" />}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm">
        <SocialAuthButtons mode="register" role={role} onSuccess={finishSocialRegister} onError={setError} />
      </div>

      {error && (
        <div className="mt-6 flex items-center gap-2.5 rounded-2xl border border-red-100 bg-red-50 p-4 text-[13px] font-medium text-red-600">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <Button onClick={nextStep} disabled={!role} className="mt-12 h-14 w-full text-[15px] font-bold">
        Продолжить
      </Button>
    </div>
  );

  const renderBasicInfo = () => (
    <div className="mx-auto max-w-xl animate-in fade-in slide-in-from-right-4 py-8 duration-500">
      <button onClick={prevStep} className="mb-8 flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-slate-600">
        <ChevronLeft size={16} /> Назад
      </button>

      <StepHeading step={3} title="Расскажите о себе" subtitle="Заполните основную информацию для аккаунта" />

      <div className="mt-10 space-y-6">
        <div>
          <label className="ml-1 mb-2.5 block text-[13px] font-bold text-slate-500">Имя</label>
          <Input placeholder="Введите имя" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-12 bg-white" />
        </div>
        <div>
          <label className="ml-1 mb-2.5 block text-[13px] font-bold text-slate-500">Фамилия</label>
          <Input placeholder="Введите фамилию" value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-12 bg-white" />
        </div>
        <div>
          <label className="ml-1 mb-2.5 block text-[13px] font-bold text-slate-500">Email</label>
          <Input placeholder="example@mail.ru" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 bg-white" />
        </div>
        <div>
          <label className="ml-1 mb-2.5 block text-[13px] font-bold text-slate-500">Телефон</label>
          <Input placeholder="+7 000 000 00 00" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12 bg-white" />
        </div>
      </div>

      <Button onClick={nextStep} disabled={!firstName || !lastName || !email} className="mt-12 h-14 w-full text-[15px] font-bold">
        Продолжить
      </Button>
    </div>
  );

  const renderPasswordSetup = () => (
    <div className="mx-auto max-w-xl animate-in fade-in slide-in-from-right-4 py-8 duration-500">
      <button onClick={prevStep} className="mb-8 flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-slate-600">
        <ChevronLeft size={16} /> Назад
      </button>

      <StepHeading step={4} title="Создайте пароль" subtitle="Придумайте надежный пароль для защиты аккаунта" />

      <div className="mt-10 space-y-6">
        <div>
          <label className="ml-1 mb-2.5 block text-[13px] font-bold text-slate-500">Пароль</label>
          <Input
            placeholder="••••••••••"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="h-12 bg-white"
            suffix={
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="transition-colors hover:text-slate-600">
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
            <div key={item.text} className="flex items-center gap-2.5 transition-colors">
              {item.ok ? (
                <CheckCircle2 size={16} className="text-emerald-500" />
              ) : (
                <div className="h-4 w-4 rounded-full border border-slate-200" />
              )}
              <span className={cn("text-[13px] font-medium", item.ok ? "text-emerald-600" : "text-slate-400")}>
                {item.text}
              </span>
            </div>
          ))}
        </div>

        <div>
          <label className="ml-1 mb-2.5 block text-[13px] font-bold text-slate-500">Подтвердите пароль</label>
          <Input
            placeholder="••••••••••"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="h-12 bg-white"
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
        className="mt-12 flex h-14 w-full items-center justify-center gap-2 text-[15px] font-bold"
      >
        {loading ? "Обработка..." : "Завершить регистрацию"}
        {!loading && <ChevronRight size={18} />}
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/30 px-4 py-12">
      <Card className="w-full max-w-[1000px] overflow-hidden border-white/50 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.04)]">
        <CardContent className="p-0">
          <div className={cn("p-6 md:p-10", step > 1 && "bg-white")}>
            {step === 1 && renderWelcome()}
            {step === 2 && renderRoleSelection()}
            {step === 3 && renderBasicInfo()}
            {step === 4 && renderPasswordSetup()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
