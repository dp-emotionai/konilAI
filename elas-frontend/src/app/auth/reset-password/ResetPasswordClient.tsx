"use client";

import { useEffect, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import Button from "@/components/ui/Button";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/cn";

type ValidateResponse = {
  valid: boolean;
};

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const hasMinLength = newPassword.length >= 8;
  const hasNumber = /[0-9]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  useEffect(() => {
    if (!token) {
      setError("Токен для сброса пароля отсутствует или недействителен.");
      setValidating(false);
      return;
    }

    const validate = async () => {
      try {
        await api.get<ValidateResponse>(`auth/reset-password/validate?token=${encodeURIComponent(token)}`);
        setIsValidToken(true);
      } catch (err) {
        console.error("RESET TOKEN VALIDATION ERROR:", err);
        setError("Ссылка для сброса пароля недействительна или устарела.");
        setIsValidToken(false);
      } finally {
        setValidating(false);
      }
    };

    void validate();
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("Токен для сброса пароля недействителен.");
      return;
    }

    if (!hasMinLength) {
      setError("Пароль должен содержать не менее 8 символов.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Пароли не совпадают.");
      return;
    }

    setLoading(true);

    try {
      await api.post<unknown>("auth/reset-password", {
        token,
        password: newPassword,
      });
      setSuccess(true);
    } catch (err) {
      console.error("RESET PASSWORD ERROR:", err);
      setError("Не удалось изменить пароль. Ссылка могла устареть. Попробуйте запросить сброс ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-80px)] bg-gradient-to-br from-white via-slate-50 to-purple-50/60 px-4 py-12 md:px-8 md:py-16">
      <div className="pointer-events-none fixed left-12 top-40 h-64 w-64 rounded-full border border-purple-100/80" />
      <div className="pointer-events-none fixed right-20 bottom-28 h-72 w-72 rounded-full bg-purple-100/30 blur-3xl" />
      <div className="pointer-events-none fixed left-36 top-52 grid grid-cols-6 gap-4 opacity-30">
        {Array.from({ length: 30 }).map((_, index) => (
          <span key={index} className="h-1 w-1 rounded-full bg-[#7448FF]" />
        ))}
      </div>

      <section className="relative mx-auto flex min-h-[680px] w-full max-w-[720px] items-center justify-center">
        <div className="w-full rounded-[34px] border border-white/80 bg-white/92 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur md:p-12">
          {validating ? (
            <StatusBlock
              icon={<RefreshCw className="animate-spin" size={28} />}
              title="Проверяем ссылку"
              text="Подождите немного, мы проверяем ссылку для сброса пароля."
            />
          ) : success ? (
            <div className="text-center">
              <StatusBlock
                icon={<CheckCircle2 size={30} />}
                title="Пароль изменён"
                text="Теперь вы можете войти в систему, используя новый пароль."
                tone="success"
              />

              <Button className="mt-8 h-14 w-full rounded-2xl text-[15px] font-semibold" onClick={() => router.push("/auth/login")}>
                Перейти ко входу
                <ArrowRight size={18} />
              </Button>
            </div>
          ) : !isValidToken ? (
            <div className="text-center">
              <StatusBlock
                icon={<AlertCircle size={30} />}
                title="Ссылка устарела"
                text="Ссылка для сброса пароля недействительна. Запросите восстановление пароля ещё раз."
                tone="error"
              />

              <Link href="/auth/forgot-password" className="mt-8 block">
                <Button variant="outline" className="h-14 w-full rounded-2xl border-slate-200 bg-white text-[15px] font-semibold">
                  Запросить новую ссылку
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-3xl bg-purple-50 text-[#7448FF] shadow-[0_14px_35px_rgba(116,72,255,0.14)]">
                <KeyRound size={30} />
              </div>

              <div className="text-center">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-[34px]">Создайте новый пароль</h1>
                <p className="mx-auto mt-4 max-w-md text-[15px] font-normal leading-7 text-slate-500">
                  Придумайте новый пароль для входа в аккаунт. После сохранения старый пароль перестанет работать.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-9 space-y-5">
                <div>
                  <label className="mb-2.5 ml-1 block text-sm font-medium text-slate-700">Новый пароль</label>
                  <AuthInput
                    type={showPassword ? "text" : "password"}
                    placeholder="Введите новый пароль"
                    autoComplete="new-password"
                    value={newPassword}
                    disabled={loading}
                    icon={<LockKeyhole size={18} />}
                    onChange={(event) => {
                      setNewPassword(event.target.value);
                      if (error) setError(null);
                    }}
                    suffix={
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        disabled={loading}
                        aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                        className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      >
                        {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                      </button>
                    }
                    required
                  />
                </div>

                <div>
                  <label className="mb-2.5 ml-1 block text-sm font-medium text-slate-700">Повторите пароль</label>
                  <AuthInput
                    type={showPassword ? "text" : "password"}
                    placeholder="Повторите новый пароль"
                    autoComplete="new-password"
                    value={confirmPassword}
                    disabled={loading}
                    icon={<LockKeyhole size={18} />}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      if (error) setError(null);
                    }}
                    required
                  />
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                  <PasswordRule ok={hasMinLength} text="Минимум 8 символов" />
                  <PasswordRule ok={hasNumber} text="Хотя бы одна цифра" />
                  <PasswordRule ok={passwordsMatch} text="Пароли совпадают" />
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-600">
                    <AlertCircle className="mt-0.5 shrink-0" size={18} />
                    {error}
                  </div>
                )}

                <Button type="submit" className="h-14 w-full rounded-2xl text-[15px] font-semibold" disabled={loading}>
                  {loading ? "Сохраняем…" : "Сохранить новый пароль"}
                  {!loading && <ArrowRight size={18} />}
                </Button>
              </form>
            </>
          )}

          <div className="mt-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-100" />
            <span className="text-xs font-medium text-slate-400">или</span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <Link
            href="/auth/login"
            className="mt-6 block text-center text-sm font-medium text-[#7448FF] transition hover:text-[#5B21F6] hover:underline"
          >
            ← Назад ко входу
          </Link>
        </div>
      </section>
    </main>
  );
}

function AuthInput({ icon, suffix, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { icon: ReactNode; suffix?: ReactNode }) {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400">{icon}</div>

      <input
        {...props}
        className={cn(
          "h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-12 text-[15px] font-normal text-slate-900 shadow-[0_6px_20px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 focus:border-[#7448FF] focus:ring-4 focus:ring-purple-100 disabled:cursor-not-allowed disabled:bg-slate-50",
          className
        )}
      />

      {suffix && <div className="absolute right-3 top-1/2 z-10 -translate-y-1/2">{suffix}</div>}
    </div>
  );
}

function PasswordRule({ ok, text }: { ok: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      {ok ? <CheckCircle2 size={16} className="text-emerald-500" /> : <span className="h-4 w-4 rounded-full border border-slate-200" />}
      <span className={cn("text-sm font-medium", ok ? "text-emerald-600" : "text-slate-400")}>{text}</span>
    </div>
  );
}

function StatusBlock({
  icon,
  title,
  text,
  tone = "default",
}: {
  icon: ReactNode;
  title: string;
  text: string;
  tone?: "default" | "success" | "error";
}) {
  return (
    <div className="py-8 text-center">
      <div
        className={cn(
          "mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-3xl shadow-[0_14px_35px_rgba(116,72,255,0.14)]",
          tone === "success" && "bg-emerald-50 text-emerald-500",
          tone === "error" && "bg-red-50 text-red-500",
          tone === "default" && "bg-purple-50 text-[#7448FF]"
        )}
      >
        {icon}
      </div>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h1>
      <p className="mx-auto mt-4 max-w-md text-[15px] font-normal leading-7 text-slate-500">{text}</p>
    </div>
  );
}
