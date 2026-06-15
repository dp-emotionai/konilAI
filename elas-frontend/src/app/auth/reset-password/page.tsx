"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail, CheckCircle2, AlertCircle } from "lucide-react";

import { api, isApiAvailable } from "@/lib/api/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSent(false);

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError("Введите email аккаунта.");
      return;
    }

    if (!isApiAvailable()) {
      setError("Сервер недоступен. Попробуйте позже.");
      return;
    }

    setLoading(true);
    try {
      await api.post("auth/forgot-password", { email: normalizedEmail });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отправить ссылку.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-[calc(100vh-150px)] overflow-hidden bg-gradient-to-br from-white via-slate-50 to-purple-50/60 px-4 py-12 md:px-8 md:py-20">
      <div className="pointer-events-none absolute left-[-120px] top-1/3 h-[360px] w-[360px] rounded-full border border-purple-100/80" />
      <div className="pointer-events-none absolute left-[10%] top-[22%] grid grid-cols-6 gap-5 opacity-35">
        {Array.from({ length: 36 }).map((_, index) => (
          <span key={index} className="h-1 w-1 rounded-full bg-[#7448FF]" />
        ))}
      </div>
      <div className="pointer-events-none absolute right-[10%] top-[54%] grid grid-cols-8 gap-5 opacity-25">
        {Array.from({ length: 48 }).map((_, index) => (
          <span key={index} className="h-1 w-1 rounded-full bg-[#7448FF]" />
        ))}
      </div>
      <div className="pointer-events-none absolute right-[-80px] bottom-[12%] h-[260px] w-[260px] rounded-full bg-purple-100/40 blur-3xl" />

      <section className="relative mx-auto flex w-full max-w-[620px] items-center justify-center">
        <div className="w-full rounded-[34px] border border-white/80 bg-white/92 p-7 shadow-[0_28px_90px_rgba(15,23,42,0.08)] backdrop-blur md:p-10 lg:p-12">
          <div className="mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-full bg-purple-50 text-[#7448FF] shadow-[0_16px_40px_rgba(116,72,255,0.12)]">
            {sent ? <CheckCircle2 size={28} /> : <Mail size={28} />}
          </div>

          <div className="text-center">
            <h1 className="text-[30px] font-semibold tracking-tight text-slate-950 md:text-[34px]">
              {sent ? "Проверьте почту" : "Забыли пароль?"}
            </h1>
            <p className="mx-auto mt-4 max-w-md text-[15px] font-normal leading-7 text-slate-500">
              {sent
                ? "Мы отправили инструкцию для сброса пароля, если такой email есть в системе."
                : "Укажите email вашего аккаунта — мы отправим инструкцию для сброса пароля."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-10 space-y-6">
            <div>
              <label htmlFor="forgot-email" className="mb-2.5 block text-sm font-medium text-slate-700">
                Email
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={19} />
                <input
                  id="forgot-email"
                  type="email"
                  autoComplete="email"
                  placeholder="Введите ваш email"
                  value={email}
                  disabled={loading}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (error) setError("");
                    if (sent) setSent(false);
                  }}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-[15px] font-normal text-slate-900 shadow-[0_8px_22px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-slate-400 focus:border-[#7448FF] focus:ring-4 focus:ring-purple-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-600">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {sent && (
              <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
                <CheckCircle2 size={18} />
                Ссылка отправлена. Проверьте входящие и папку «Спам».
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6D36F5] to-[#7C3AED] text-[15px] font-medium text-white shadow-[0_16px_34px_rgba(116,72,255,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(116,72,255,0.34)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {loading ? "Отправляем..." : sent ? "Отправить ещё раз" : "Отправить ссылку"}
              {!loading && <ArrowRight size={18} className="transition group-hover:translate-x-0.5" />}
            </button>
          </form>

          <div className="my-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-medium text-slate-400">или</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <Link
            href="/auth/login"
            className="mx-auto flex w-fit items-center gap-2 text-[15px] font-medium text-[#7448FF] transition hover:text-[#5B21F6]"
          >
            <ArrowLeft size={17} />
            Назад ко входу
          </Link>
        </div>
      </section>
    </main>
  );
}
