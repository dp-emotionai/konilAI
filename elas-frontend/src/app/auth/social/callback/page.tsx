"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

import { useUI } from "@/components/layout/Providers";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { ROLE_HOME } from "@/lib/nav";
import { setAuth, type UserStatus } from "@/lib/api/client";
import type { Role } from "@/lib/roles";
import { normalizeRole, normalizeStatus } from "@/lib/auth/authSession";

function SocialCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setLoggedIn, setRole, setStatus, setUserInfo } = useUI();
  const [error, setError] = useState("");

  const payload = useMemo(() => {
    const token = searchParams.get("token") || searchParams.get("accessToken") || "";
    const email = searchParams.get("email")?.trim().toLowerCase() || "";
    const role = normalizeRole(searchParams.get("role")) as Role | null;
    const status = normalizeStatus(searchParams.get("status")) as UserStatus | null;
    const fullName = searchParams.get("fullName");
    const firstName = searchParams.get("firstName");
    const lastName = searchParams.get("lastName");
    const avatarUrl = searchParams.get("avatarUrl");
    const serverError = searchParams.get("error") || "";

    return {
      token,
      email,
      role,
      status,
      fullName,
      firstName,
      lastName,
      avatarUrl,
      serverError,
    };
  }, [searchParams]);

  useEffect(() => {
    if (payload.serverError) {
      setError(payload.serverError);
      return;
    }

    if (!payload.token || !payload.email || !payload.role) {
      setError("GitHub вход завершился без токена или данных пользователя.");
      return;
    }

    setAuth({
      token: payload.token,
      email: payload.email,
      role: payload.role,
      firstName: payload.firstName ?? undefined,
      lastName: payload.lastName ?? undefined,
      fullName: payload.fullName ?? undefined,
      avatarUrl: payload.avatarUrl ?? undefined,
      status: payload.status ?? null,
    });

    setRole(payload.role);
    setStatus(payload.status ?? null);
    setLoggedIn(true);
    setUserInfo({
      firstName: payload.firstName ?? undefined,
      lastName: payload.lastName ?? undefined,
      fullName: payload.fullName ?? undefined,
      avatarUrl: payload.avatarUrl ?? undefined,
    });

    router.replace(ROLE_HOME[payload.role] || "/");
  }, [payload, router, setLoggedIn, setRole, setStatus, setUserInfo]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/30 px-4 py-12">
      <Card className="w-full max-w-[520px] border-white/50 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.04)]">
        <CardContent className="p-8 text-center">
          {error ? (
            <>
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-500">
                <AlertCircle size={28} />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Не удалось завершить вход</h1>
              <p className="mt-3 text-sm text-slate-500">{error}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Link href="/auth/login">
                  <Button>Вернуться ко входу</Button>
                </Link>
                <Link href="/auth/register">
                  <Button variant="outline">К регистрации</Button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-50 text-[#7448FF]">
                <Loader2 size={28} className="animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Завершаем вход</h1>
              <p className="mt-3 text-sm text-slate-500">Подготавливаем вашу сессию и перенаправляем в кабинет.</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SocialCallbackPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50/30">Загрузка...</div>}>
      <SocialCallbackInner />
    </Suspense>
  );
}
