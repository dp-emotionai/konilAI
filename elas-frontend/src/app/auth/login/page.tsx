"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  ChevronRight, 
  AlertCircle,
  ArrowLeft
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useUI } from "@/components/layout/Providers";
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

type LoginRes = {
  user?: {
    id?: string;
    email?: string;
    role?: string;
    name?: string | null;
    status?: string | null;
  };
  token?: string;
  accessToken?: string;
  message?: string;
};

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

export default function LoginPage() {
  const router = useRouter();
  const { setLoggedIn, setRole, setStatus } = useUI();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const finishLogin = ({
    token,
    email,
    role,
    name,
    status,
  }: {
    token: string;
    email: string;
    role: Role;
    name?: string | null;
    status?: UserStatus | null;
  }) => {
    const safeHome = ROLE_HOME[role] || "/";

    setAuth({
      token,
      role,
      email,
      name: name ?? undefined,
      status: status ?? null,
    });

    setRole(role);
    setStatus(status ?? null);
    setLoggedIn(true);

    router.push(safeHome);
  };

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const data = await api.post<LoginRes>("auth/login", {
        email: email.trim().toLowerCase(),
        password: password,
      });

      const user = data?.user;
      const role = normalizeRole(user?.role);
      const token = data?.token ?? data?.accessToken;
      const status = normalizeStatus(user?.status);

      if (!user || !user.email || !token || !role || !(role in ROLE_HOME)) {
        throw new Error("Некорректный ответ сервера. Попробуйте позже.");
      }

      finishLogin({
        token,
        role,
        email: user.email,
        name: user.name ?? undefined,
        status,
      });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Ошибка входа.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/30 flex items-center justify-center py-12 px-4 font-sans">
      <Card className="w-full max-w-[1000px] border-white/50 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-hidden">
        <CardContent className="p-0">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-0">
            {/* Left Column: Form */}
            <div className="p-8 md:p-12 flex flex-col">
              <div className="mb-10 flex items-center gap-2">
                <Link href="/" className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-[#7448FF] rounded-lg flex items-center justify-center text-white font-bold text-sm">K</div>
                  <span className="text-lg font-bold text-slate-900">KoniAI</span>
                </Link>
              </div>

              <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto lg:mx-0">
                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Вход в аккаунт</h2>
                <p className="text-slate-500 text-sm font-medium mb-10">Используйте свои учетные данные для доступа к платформе</p>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[13px] font-bold text-slate-500 mb-2.5 ml-1">Email</label>
                    <Input 
                      placeholder="example@mail.ru" 
                      type="email"
                      value={email} 
                      onChange={e => setEmail(e.target.value)}
                      className="h-12 bg-white"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-bold text-slate-500 mb-2.5 ml-1 flex justify-between items-center">
                      Пароль
                      <Link href="/auth/forgot-password" className="text-[#7448FF] hover:underline font-semibold text-[12px]">Забыли?</Link>
                    </label>
                    <Input 
                      placeholder="••••••••••" 
                      type={showPassword ? "text" : "password"}
                      value={password} 
                      onChange={e => setPassword(e.target.value)}
                      className="h-12 bg-white"
                      disabled={loading}
                      suffix={
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)}
                          className="hover:text-slate-600 transition-colors"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleLogin();
                      }}
                    />
                  </div>
                </div>

                {error && (
                  <div className="mt-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-[13px] font-medium flex items-center gap-2.5">
                    <AlertCircle size={18} /> {error}
                  </div>
                )}

                <Button 
                  onClick={handleLogin} 
                  disabled={loading || !email || !password} 
                  className="w-full h-14 mt-10 text-[15px] font-bold flex items-center justify-center gap-2"
                >
                  {loading ? "Вход..." : "Войти"}
                  {!loading && <ChevronRight size={18} />}
                </Button>

                <div className="mt-10 pt-8 border-t border-slate-100 text-center lg:text-left">
                  <p className="text-[13px] text-slate-500 font-medium">
                    Нет аккаунта?{" "}
                    <Link href="/auth/register" className="text-[#7448FF] font-bold hover:underline">Зарегистрироваться</Link>
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Illustration */}
            <div className="relative hidden lg:flex items-center justify-center bg-slate-50/50 p-12 border-l border-slate-100">
              <div className="flex flex-col items-center text-center">
                <div className="relative w-full aspect-square max-w-[320px] mb-8 animate-in zoom-in duration-700">
                  <Image 
                    src="/auth_login_illustration_1776719102544.png" 
                    alt="Login Illustration" 
                    fill 
                    className="object-contain"
                  />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-3">Безопасный доступ</h3>
                <p className="text-sm text-slate-500 max-w-xs font-medium leading-relaxed">
                  Мы используем сквозное шифрование и современные стандарты безопасности для защиты ваших данных.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Link href="/" className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors text-sm font-semibold">
        <ArrowLeft size={16} /> Вернуться на главную
      </Link>
    </div>
  );
}