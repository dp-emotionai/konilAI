"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, AlertCircle, RefreshCw, ArrowRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useUI } from "@/components/layout/Providers";
import { ROLE_HOME } from "@/lib/nav";
import { api, setAuth } from "@/lib/api/client";
import { extractAuthSession, type AuthApiResponse, type AuthSession } from "@/lib/auth/authSession";
import { cn } from "@/lib/cn";

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

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setLoggedIn, setRole, setStatus, setUserInfo } = useUI();

  const mode = useMemo(
    () => (searchParams.get("mode")?.trim().toLowerCase() === "register" ? "register" : "generic"),
    [searchParams]
  );
  const emailFromQuery = useMemo(
    () => searchParams.get("email")?.trim().toLowerCase() ?? "",
    [searchParams]
  );

  const [email] = useState(emailFromQuery);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(45);

  const codeInputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timer <= 0) return;
    const timeout = setTimeout(() => setTimer((value) => value - 1), 1000);
    return () => clearTimeout(timeout);
  }, [timer]);

  const finishLogin = ({ token, role, email, id, firstName, lastName, fullName, avatarUrl, status }: AuthSession) => {
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

    clearPendingRegister();

    if (mode === "register") {
      router.push("/auth/register/success");
    } else {
      router.push(ROLE_HOME[role] || "/");
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

      const data = await api.post<AuthApiResponse>("auth/verify-email", body);
      finishLogin(extractAuthSession(data));
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
      if (mode !== "register") {
        throw new Error("Повторная отправка пока доступна только для регистрации.");
      }

      const pending = getPendingRegister();
      if (!pending) throw new Error("Данные регистрации не найдены.");

      await api.post("auth/resend-register-code", {
        email: pending.email,
      });

      setTimer(60);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить код.");
    } finally {
      setResending(false);
    }
  };

  const handleCodeChange = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const digit = event.target.value.replace(/[^0-9]/g, "").slice(-1);
    const nextCode = code.split("");

    if (digit) {
      nextCode[index] = digit;
      setCode(nextCode.join(""));
      if (index < 5) {
        codeInputs.current[index + 1]?.focus();
      }
      return;
    }

    nextCode[index] = "";
    setCode(nextCode.join(""));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === "Backspace" && !code[index] && index > 0) {
      codeInputs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/30 px-4 py-12">
      <Card className="w-full max-w-[600px] overflow-hidden border-white/50 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.04)]">
        <CardContent className="p-8 md:p-12">
          <div className="flex flex-col items-center">
            <button
              onClick={() => router.back()}
              className="self-start mb-12 flex items-center gap-1.5 text-sm font-medium text-slate-400 transition-colors hover:text-slate-600"
            >
              <ChevronLeft size={16} /> Назад
            </button>

            <div className="relative mb-8 flex h-24 w-24 items-center justify-center rounded-[40px] border border-slate-100 bg-slate-50 p-6">
              <Image
                src="/auth_verify_illustration_1776719333175.png"
                alt="Verify Illustration"
                width={140}
                height={140}
                className="absolute -top-10 scale-125"
              />
            </div>

            <h2 className="mb-3 text-center text-3xl font-extrabold tracking-tight text-slate-900">Проверьте вашу почту</h2>
            <p className="mb-10 max-w-sm text-center text-[15px] font-medium text-slate-500">
              Мы отправили код подтверждения на
              <br />
              <span className="font-bold text-slate-900">{email || "ваш email"}</span>
            </p>

            <div className="mb-8 flex gap-3">
              {[...Array(6)].map((_, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    codeInputs.current[index] = element;
                  }}
                  className={cn(
                    "h-14 w-12 rounded-2xl border-2 text-center text-xl font-bold outline-none transition-all md:h-16 md:w-14",
                    code[index]
                      ? "border-[#7448FF] bg-purple-50/50 text-[#7448FF]"
                      : "border-slate-100 bg-slate-50 focus:border-slate-300"
                  )}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={code[index] || ""}
                  onChange={(event) => handleCodeChange(event, index)}
                  onKeyDown={(event) => handleKeyDown(event, index)}
                  disabled={loading}
                />
              ))}
            </div>

            <div className="mb-10 space-y-4 text-center">
              {timer > 0 ? (
                <div className="text-[13px] font-semibold tracking-wide text-slate-400">
                  Код можно отправить повторно через{" "}
                  <span className="tabular-nums text-slate-900">00:{timer.toString().padStart(2, "0")}</span>
                </div>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="mx-auto flex items-center gap-2 text-sm font-bold text-[#7448FF] hover:underline"
                >
                  {resending ? <RefreshCw size={16} className="animate-spin" /> : "Отправить код повторно"}
                </button>
              )}
            </div>

            {error && (
              <div className="mb-8 flex w-full items-center gap-2.5 rounded-2xl border border-red-100 bg-red-50 p-4 text-[13px] font-medium text-red-600">
                <AlertCircle size={18} /> {error}
              </div>
            )}

            <Button
              onClick={handleVerify}
              disabled={loading || code.length < 6}
              className="flex h-14 w-full items-center justify-center gap-2 text-[15px] font-bold"
            >
              {loading ? "Обработка..." : "Подтвердить"}
              {!loading && <ArrowRight size={18} />}
            </Button>

            <Link href="/auth/register" className="mt-8 text-sm font-bold text-slate-400 transition-colors hover:text-slate-600">
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
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50/30">Загрузка...</div>}>
      <VerifyEmailInner />
    </Suspense>
  );
}
