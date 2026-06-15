"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, MailCheck } from "lucide-react";

import Button from "@/components/ui/Button";
import { api, isApiAvailable } from "@/lib/api/client";
import { cn } from "@/lib/cn";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Введите email.");
      return;
    }

    if (!isApiAvailable()) {
      setError("Сервер временно недоступен. Попробуйте позже.");
      return;
    }

    setLoading(true);

    try {
      await api.post<unknown>("auth/forgot-password", { email: trimmed });
      setSent(true);
    } catch (err) {
      // По соображениям безопасности не раскрываем, существует ли email.
      console.error("FORGOT PASSWORD ERROR:", err);
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-[calc(100vh-150px)] items-center justify-center overflow-hidden bg-gradient-to-br from-white via-slate-50 to-purple-50/50 px-4 py-14 md:px-8">
      <div className="pointer-events-none absolute left-[-140px] top-1/3 h-[420px] w-[420px] rounded-full border border-purple-100/70" />
      <div className="pointer-events-none absolute left-[9%] top-[22%] grid grid-cols-6 gap-5 opacity-40">
        {Array.from({ length: 36 }).map((_, index) => (
          <span key={index} className="h-1 w-1 rounded-full bg-[#7448FF]" />
        ))}
      </div>
      <div className="pointer-events-none absolute right-[9%] bottom-[20%] grid grid-cols-8 gap-4 opacity-30">
        {Array.from({ length: 64 }).map((_, index) => (
          <span key={index} className="h-1 w-1 rounded-full bg-[#7448FF]" />
        ))}
      </div>
      <div className="pointer-events-none absolute right-[10%] bottom-[13%] h-64 w-64 rounded-[45%] bg-purple-100/25 blur-sm" />

      <section className="relative w-full max-w-[620px] rounded-[32px] border border-white/80 bg-white/90 px-7 py-10 text-center shadow-[0_28px_90px_rgba(15,23,42,0.08)] backdrop-blur md:px-12 md:py-12">
        <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-full bg-purple-50 text-[#7448FF] shadow-[0_14px_35px_rgba(116,72,255,0.12)]">
          {sent ? <MailCheck size={30} strokeWidth={2.1} /> : <Mail size={30} strokeWidth={2.1} />}
        </div>

        <h1 className="text-[30px] font-semibold tracking-[-0.03em] text-slate-950 md:text-[34px]">
          {sent ? "Проверьте вашу почту" : "Забыли пароль?"}
        </h1>

        <p className="mx-auto mt-4 max-w-md text-[16px] font-normal leading-7 text-slate-500">
          {sent
            ? "Если аккаунт с указанным email существует, мы отправили инструкцию для сброса пароля."
            : "Укажите email вашего аккаунта — мы отправим инструкцию для сброса пароля."}
        </p>

        {sent ? (
          <div className="mt-9 space-y-5">
            <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/70 px-5 py-4 text-left">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-emerald-700">Инструкция отправлена</p>
                  <p className="mt-1 text-sm leading-6 text-emerald-700/75">
                    Не пришло письмо? Проверьте папку «Спам» или обратитесь к администратору вашей организации.
                  </p>
                </div>
              </div>
            </div>

            <Link href="/auth/login" className="block">
              <Button variant="outline" className="h-14 w-full rounded-2xl border-slate-200 bg-white text-[15px] font-medium">
                <ArrowLeft size={18} />
                Назад ко входу
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10 space-y-6 text-left">
            <div>
              <label htmlFor="forgot-email" className="mb-2.5 block text-[15px] font-medium text-slate-700">
                Email
              </label>

              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400" size={19} />
                <input
                  id="forgot-email"
                  placeholder="Введите ваш email"
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (error) setError(null);
                  }}
                  disabled={loading}
                  required
                  autoComplete="email"
                  className={cn(
                    "h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-[16px] font-normal text-slate-900 shadow-[0_6px_20px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400",
                    "focus:border-[#7448FF] focus:ring-4 focus:ring-purple-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  )}
                />
              </div>
            </div>

            {error && <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{error}</p>}

            <Button
              type="submit"
              className="h-14 w-full rounded-2xl text-[16px] font-medium shadow-[0_14px_32px_rgba(116,72,255,0.24)]"
              disabled={loading}
            >
              {loading ? "Отправка…" : "Отправить ссылку"}
              {!loading && <ArrowRight size={18} />}
            </Button>

            <div className="flex items-center gap-4 pt-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-sm font-normal text-slate-400">или</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <Link
              href="/auth/login"
              className="flex items-center justify-center gap-2 text-[16px] font-medium text-[#7448FF] transition hover:text-[#5B21F6]"
            >
              <ArrowLeft size={18} />
              Назад ко входу
            </Link>
          </form>
        )}
      </section>
    </main>
  );
}
