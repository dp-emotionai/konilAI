"use client";

import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { 
  ChevronLeft, 
  AlertCircle,
  RefreshCw,
  Mail,
  ArrowRight
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useUI } from "@/components/layout/Providers";
import StepHeading from "@/components/auth/StepHeading";
import { ROLE_HOME } from "@/lib/nav";
import {
  api,
  setAuth,
  clearAuth,
  isApiAvailable,
  type UserStatus,
} from "@/lib/api/client";
import type { Role } from "@/lib/roles";
import { cn } from "@/lib/cn";

type VerifyEmailRes = {
  user?: {
    id?: string;
    email?: string;
    role?: string;
    firstName?: string | null;
    lastName?: string | null;
    fullName?: string | null;
    avatarUrl?: string | null;
    status?: string | null;
  };
  token?: string;
  accessToken?: string;
  message?: string;
};

type PendingRegister = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
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

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setLoggedIn, setRole, setStatus } = useUI();

  const mode = useMemo(
    () =>
      searchParams.get("mode")?.trim().toLowerCase() === "register"
        ? "register"
        : "generic",
    [searchParams]
  );

  const emailFromQuery = useMemo(
    () => searchParams.get("email")?.trim().toLowerCase() ?? "",
    [searchParams]
  );

  const [email, setEmail] = useState(emailFromQuery);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(45);

  const codeInputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timer > 0) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [timer]);

  const finishLogin = ({
    token,
    role,
    email,
    firstName,
    lastName,
    fullName,
    avatarUrl,
    status,
  }: {
    token: string;
    role: Role;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    fullName?: string | null;
    avatarUrl?: string | null;
    status?: UserStatus | null;
  }) => {
    const safeHome = ROLE_HOME[role] || "/";

    setAuth({
      token,
      role,
      email,
      firstName: firstName ?? undefined,
      lastName: lastName ?? undefined,
      fullName: fullName ?? undefined,
      avatarUrl: avatarUrl ?? undefined,
      status: status ?? null,
    });

    setRole(role);
    setStatus(status ?? null);
    setLoggedIn(true);

    clearPendingRegister();

    if (mode === "register") {
      router.push("/auth/register/success");
    } else {
      router.push(safeHome);
    }
  };


  const handleVerify = async () => {
    setError("");
    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        email: email.trim().toLowerCase(),
        code: code.trim(),
      };

      if (mode === "register") {
        const pending = getPendingRegister();
        if (!pending) throw new Error("Данные регистрации не найдены. Попробуйте снова.");
        body.password = pending.password;
        body.firstName = pending.firstName ?? "";
        body.lastName = pending.lastName ?? "";
        body.role = pending.role;
      }

      const data = await api.post<VerifyEmailRes>("auth/verify-email", body);

      const user = data?.user;
      const token = data?.token ?? data?.accessToken;
      const role = normalizeRole(user?.role);
      const status = normalizeStatus(user?.status);

      if (!user || !user.email || !token || !role || !(role in ROLE_HOME)) {
        throw new Error("Ошибка подтверждения. Повторите попытку.");
      }

      finishLogin({
        token,
        role,
        email: user.email,
        firstName: (user as any).firstName,
        lastName: (user as any).lastName,
        fullName: (user as any).fullName,
        avatarUrl: (user as any).avatarUrl,
        status,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неверный код.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    setError("");
    setResending(true);

    try {
      if (mode === "register") {
        const pending = getPendingRegister();
        if (!pending) throw new Error("Данные не найдены.");
        
        await api.post("auth/register", {
          email: pending.email,
          password: pending.password,
          firstName: pending.firstName,
          lastName: pending.lastName,
          role: pending.role,
        });

        setTimer(60);
      } else {
        throw new Error("Повторная отправка пока не поддерживается для этого режима.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить код.");
    } finally {
      setResending(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    if (!val) return;

    const newCode = code.split("");
    newCode[index] = val[val.length - 1]; // Use last digit if pasted
    const finalCode = newCode.join("");
    setCode(finalCode);

    // Focus next
    if (index < 5 && val) {
      codeInputs.current[index + 1]?.focus();
    }

    if (finalCode.length === 6) {
       // auto-verify? 
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeInputs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/30 flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-[600px] border-white/50 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-hidden">
        <CardContent className="p-8 md:p-12">
          <div className="flex flex-col items-center">
            
            <button onClick={() => router.back()} className="self-start flex items-center gap-1.5 text-sm text-slate-400 font-medium mb-12 hover:text-slate-600 transition-colors">
              <ChevronLeft size={16} /> Назад
            </button>

            <div className="mb-8 p-6 bg-slate-50 rounded-[40px] border border-slate-100 flex items-center justify-center relative w-24 h-24">
               <Image 
                  src="/auth_verify_illustration_1776719333175.png" 
                  alt="Verify Illustration" 
                  width={140} 
                  height={140} 
                  className="absolute -top-10 scale-125"
               />
            </div>

            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3 text-center">Проверьте вашу почту</h2>
            <p className="text-slate-500 text-[15px] font-medium mb-10 text-center max-w-sm">
              Мы отправили код подтверждения на<br />
              <span className="text-slate-900 font-bold">{email || "ваш email"}</span>
            </p>

            {/* Digit Inputs */}
            <div className="flex gap-3 mb-8">
              {[...Array(6)].map((_, i) => (
                <input
                  key={i}
                  ref={el => { codeInputs.current[i] = el; }}
                  className={cn(
                    "w-12 h-14 md:w-14 md:h-16 text-center text-xl font-bold rounded-2xl border-2 transition-all outline-none",
                    code[i] ? "border-[#7448FF] bg-purple-50/50 text-[#7448FF]" : "border-slate-100 bg-slate-50 focus:border-slate-300"
                  )}
                  type="text"
                  maxLength={1}
                  value={code[i] || ""}
                  onChange={e => handleCodeChange(e, i)}
                  onKeyDown={e => handleKeyDown(e, i)}
                  disabled={loading}
                />
              ))}
            </div>

            <div className="text-center mb-10 space-y-4">
              {timer > 0 ? (
                <div className="text-[13px] text-slate-400 font-semibold tracking-wide">
                  Код отправлен повторно через <span className="text-slate-900 tabular-nums">00:{timer.toString().padStart(2, '0')}</span>
                </div>
              ) : (
                <button 
                  onClick={handleResend}
                  disabled={resending}
                  className="text-sm font-bold text-[#7448FF] flex items-center gap-2 mx-auto hover:underline"
                >
                  {resending ? <RefreshCw size={16} className="animate-spin" /> : "Отправить код повторно"}
                </button>
              )}
            </div>

            {error && (
              <div className="w-full mb-8 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-[13px] font-medium flex items-center gap-2.5">
                <AlertCircle size={18} /> {error}
              </div>
            )}

            <Button 
                onClick={handleVerify} 
                disabled={loading || code.length < 6} 
                className="w-full h-14 text-[15px] font-bold flex items-center justify-center gap-2"
              >
                {loading ? "Обработка..." : "Подтвердить"}
                {!loading && <ArrowRight size={18} />}
            </Button>

            <Link href="/auth/register" className="mt-8 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">
              Зарегистрироваться на другой Email
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50/30 flex items-center justify-center">Загрузка...</div>}>
      <VerifyEmailInner />
    </Suspense>
  );
}