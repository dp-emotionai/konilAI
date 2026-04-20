"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  PartyPopper
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { getStoredAuth } from "@/lib/api/client";
import { ROLE_HOME } from "@/lib/nav";

export default function OnboardingSuccessPage() {
  const router = useRouter();
  const [roleHome, setRoleHome] = useState("/");

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth?.role && ROLE_HOME[auth.role]) {
      setRoleHome(ROLE_HOME[auth.role]);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50/10 flex items-center justify-center py-12 px-4 overflow-hidden relative">
      {/* Decorative Blur */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-100/30 blur-[120px] rounded-full pointer-events-none" />

      <Card className="w-full max-w-[600px] border-white/80 bg-white/90 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] overflow-hidden relative z-10 text-center">
        <CardContent className="p-10 md:p-16">
          <div className="flex flex-col items-center">
            <div className="relative w-48 h-48 mb-10 animate-bounce">
              <Image 
                src="/auth_success_illustration_1776717970852.png" 
                alt="Success Illustration" 
                fill 
                className="object-contain"
              />
              <div className="absolute -top-4 -right-4 bg-emerald-500 text-white p-3 rounded-2xl shadow-lg animate-in zoom-in duration-500 delay-300">
                <CheckCircle2 size={32} />
              </div>
            </div>

            <div className="space-y-4 mb-12">
               <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Готово! 🎉</h1>
               <p className="text-xl font-bold text-slate-400">Ваш аккаунт успешно создан</p>
               <p className="text-sm text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">
                 Мы рады приветствовать вас в Konilai. Теперь вы можете начать обучение или управление сессиями.
               </p>
            </div>

            <Button 
                onClick={() => router.push(roleHome)}
                className="w-full h-16 text-lg font-bold flex items-center justify-center gap-3 shadow-[0_8px_25px_rgba(116,72,255,0.25)] hover:shadow-[0_12px_30px_rgba(116,72,255,0.35)]"
              >
                Перейти в личный кабинет
                <ArrowRight size={22} />
            </Button>

            <div className="mt-10 flex items-center gap-2 text-[13px] text-slate-400 font-semibold tracking-wide uppercase">
               <Sparkles size={16} className="text-amber-400" />
               Добро пожаловать на борт!
               <PartyPopper size={16} className="text-purple-400" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
