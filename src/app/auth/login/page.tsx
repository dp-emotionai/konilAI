"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Eye, EyeOff, ChevronRight, AlertCircle, ArrowLeft } from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { useUI } from "@/components/layout/Providers";
import { ROLE_HOME } from "@/lib/nav";
import { api, setAuth } from "@/lib/api/client";
import { extractAuthSession, type AuthApiResponse, type AuthSession } from "@/lib/auth/authSession";

export default function LoginPage() {
  const router = useRouter();
  const { setLoggedIn, setRole, setStatus, setUserInfo } = useUI();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const finishLogin = ({
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

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const data = await api.post<AuthApiResponse>("auth/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      finishLogin(extractAuthSession(data));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Ошибка входа.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/30 px-4 py-12 font-sans">
      <Card className="w-full max-w-[1000px] overflow-hidden border-white/50 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.04)]">
        <CardContent className="p-0">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col p-8 md:p-12">
              <div className="mb-10 flex items-center gap-2">
                <Link href="/" className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7448FF] text-sm font-bold text-white">
                    K
                  </div>
                  <span className="text-lg font-bold text-slate-900">KonilAI</span>
                </Link>
              </div>

              <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center lg:mx-0">
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Добро пожаловать в KonilAI</h2>
                <p className="mb-10 text-sm font-medium text-slate-500">
                  Используйте свои учетные данные для доступа к платформе
                </p>

                <div className="space-y-6">
                  <div>
                    <label className="ml-1 mb-2.5 block text-[13px] font-bold text-slate-500">Email</label>
                    <Input
                      placeholder="example@mail.ru"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 bg-white"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label className="ml-1 mb-2.5 flex items-center justify-between text-[13px] font-bold text-slate-500">
                      Пароль
                      <Link href="/auth/forgot-password" className="text-[12px] font-semibold text-[#7448FF] hover:underline">
                        Забыли?
                      </Link>
                    </label>
                    <Input
                      placeholder="••••••••••"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 bg-white"
                      disabled={loading}
                      suffix={
                        <button
                          type="button"
                          onClick={() => setShowPassword((value) => !value)}
                          className="transition-colors hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void handleLogin();
                      }}
                    />
                  </div>
                </div>

                {error && (
                  <div className="mt-6 flex items-center gap-2.5 rounded-2xl border border-red-100 bg-red-50 p-4 text-[13px] font-medium text-red-600">
                    <AlertCircle size={18} />
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleLogin}
                  disabled={loading || !email || !password}
                  className="mt-10 flex h-14 w-full items-center justify-center gap-2 text-[15px] font-bold"
                >
                  {loading ? "Вход..." : "Войти"}
                  {!loading && <ChevronRight size={18} />}
                </Button>

                <div className="mt-8 border-t border-slate-100 pt-8">
                  <SocialAuthButtons mode="login" onSuccess={finishLogin} onError={setError} />
                </div>

                <div className="mt-10 border-t border-slate-100 pt-8 text-center lg:text-left">
                  <p className="text-[13px] font-medium text-slate-500">
                    Нет аккаунта?{" "}
                    <Link href="/auth/register" className="font-bold text-[#7448FF] hover:underline">
                      Зарегистрироваться
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            <div className="relative hidden items-center justify-center border-l border-slate-100 bg-slate-50/50 p-12 lg:flex">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-8 aspect-square w-full max-w-[320px] animate-in zoom-in duration-700">
                  <Image
                    src="/auth_login_illustration_1776719102544.png"
                    alt="Login Illustration"
                    fill
                    className="object-contain"
                  />
                </div>
                <h3 className="mb-3 text-xl font-bold text-slate-800">Безопасный доступ</h3>
                <p className="max-w-xs text-sm font-medium leading-relaxed text-slate-500">
                  Мы используем современные стандарты безопасности для защиты ваших данных и учебной активности.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Link
        href="/"
        className="fixed bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2 text-sm font-semibold text-slate-400 transition-colors hover:text-slate-600"
      >
        <ArrowLeft size={16} />
        Вернуться на главную
      </Link>
    </div>
  );
}
