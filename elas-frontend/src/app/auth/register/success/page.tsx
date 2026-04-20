"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  PartyPopper,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  LineChart,
  MessageSquare,
  Award,
  Globe,
  Clock,
  Briefcase,
  Users
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import StepHeading from "@/components/auth/StepHeading";
import { getStoredAuth } from "@/lib/api/client";
import { ROLE_HOME } from "@/lib/nav";
import { cn } from "@/lib/cn";

export default function OnboardingWizardPage() {
  const router = useRouter();
  
  const [step, setStep] = useState(6); // Start at Step 6 after verification
  const [roleHome, setRoleHome] = useState("/");

  // Step 6 Form data
  const [group, setGroup] = useState("");
  const [course, setCourse] = useState("");
  const [language, setLanguage] = useState("ru");
  const [timezone, setTimezone] = useState("(GMT+05:00) Almaty");

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth?.role && ROLE_HOME[auth.role]) {
      setRoleHome(ROLE_HOME[auth.role]);
    }
  }, []);

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const renderStep6 = () => (
    <div className="max-w-xl mx-auto py-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <StepHeading step={6} title="Дополнительная информация" subtitle="Это поможет нам персонализировать ваш опыт обучения" />

      <div className="space-y-6 mt-10 text-left">
        <div className="space-y-2">
          <label className="block text-[13px] font-bold text-slate-500 ml-1">Группа (если есть)</label>
          <div className="relative">
             <Input 
                placeholder="Например, CS-201" 
                value={group} 
                onChange={e => setGroup(e.target.value)}
                className="h-12 pr-10"
             />
             <Users className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-[13px] font-bold text-slate-500 ml-1">Курс</label>
          <select 
            value={course}
            onChange={e => setCourse(e.target.value)}
            className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7448FF] focus:border-transparent transition-all appearance-none"
          >
            <option value="">Выберите курс</option>
            <option value="1">1 курс</option>
            <option value="2">2 курс</option>
            <option value="3">3 курс</option>
            <option value="4">4 курс</option>
            <option value="master">Магистратура</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-[13px] font-bold text-slate-500 ml-1">Язык интерфейса</label>
          <div className="relative">
            <select 
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7448FF] focus:border-transparent transition-all appearance-none pr-10"
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
              <option value="kz">Қазақша</option>
            </select>
            <Globe className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-[13px] font-bold text-slate-500 ml-1">Часовой пояс</label>
          <div className="relative">
            <select 
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#7448FF] focus:border-transparent transition-all appearance-none pr-10"
            >
              <option value="(GMT+05:00) Almaty">(GMT+05:00) Алматы</option>
              <option value="(GMT+03:00) Moscow">(GMT+03:00) Москва</option>
              <option value="(GMT+00:00) London">(GMT+00:00) Лондон</option>
            </select>
            <Clock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" size={18} />
          </div>
        </div>
      </div>

      <div className="flex gap-4 mt-12">
        <Button variant="outline" onClick={nextStep} className="flex-1 h-14 font-bold text-slate-500">
          Пропустить
        </Button>
        <Button onClick={nextStep} className="flex-[1.5] h-14 font-bold">
          Продолжить
        </Button>
      </div>
    </div>
  );

  const renderStep7 = () => (
    <div className="py-2 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col items-center text-center">
        <div className="mb-8 flex items-center gap-2">
          <div className="w-8 h-8 bg-[#7448FF] rounded-lg flex items-center justify-center text-white font-bold text-sm">K</div>
          <span className="text-[20px] font-bold text-slate-900 tracking-tight">KonilAI</span>
        </div>

        <div className="space-y-3 mb-10">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Добро пожаловать в KonilAI! 🎉</h2>
          <p className="text-slate-500 font-medium tracking-tight">Ваш аккаунт успешно создан</p>
        </div>

        <div className="w-full max-w-md space-y-4 mb-12">
          {/* Feature Cards from references */}
          <div className="flex items-center gap-5 p-4 rounded-2xl bg-white border border-slate-50 shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-transform hover:scale-[1.02]">
            <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-500 shrink-0">
              <BookOpen size={24} />
            </div>
            <div className="text-left">
              <div className="font-bold text-slate-900 text-sm">Доступ к курсам и материалам</div>
              <div className="text-xs text-slate-400 font-medium">Начните учиться прямо сейчас</div>
            </div>
          </div>

          <div className="flex items-center gap-5 p-4 rounded-2xl bg-white border border-slate-50 shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-transform hover:scale-[1.02]">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
              <LineChart size={24} />
            </div>
            <div className="text-left">
              <div className="font-bold text-slate-900 text-sm">Отслеживание прогресса</div>
              <div className="text-xs text-slate-400 font-medium">Следите за своими достижениями</div>
            </div>
          </div>

          <div className="flex items-center gap-5 p-4 rounded-2xl bg-white border border-slate-50 shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-transform hover:scale-[1.02]">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
              <MessageSquare size={24} />
            </div>
            <div className="text-left">
              <div className="font-bold text-slate-900 text-sm">Общение и сотрудничество</div>
              <div className="text-xs text-slate-400 font-medium">Общайтесь с преподавателями и студентами</div>
            </div>
          </div>

          <div className="flex items-center gap-5 p-4 rounded-2xl bg-white border border-slate-50 shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-transform hover:scale-[1.02]">
            <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
              <Award size={24} />
            </div>
            <div className="text-left">
              <div className="font-bold text-slate-900 text-sm">Персональные рекомендации</div>
              <div className="text-xs text-slate-400 font-medium">Получайте рекомендации по обучению</div>
            </div>
          </div>
        </div>

        <Button 
          onClick={() => router.push(roleHome)}
          className="w-full h-14 text-[15px] font-bold shadow-[0_10px_25px_rgba(116,72,255,0.2)]"
        >
          Начать работу
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/20 flex items-center justify-center py-12 px-4 overflow-hidden relative">
      {/* Subtle brand glow */}
      <div className="absolute -top-[100px] -right-[100px] w-[500px] h-[500px] bg-purple-100/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-[100px] -left-[100px] w-[500px] h-[500px] bg-indigo-100/10 blur-[120px] rounded-full pointer-events-none" />

      <Card className="w-full max-w-[640px] border-white/80 bg-white/95 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.03)] overflow-hidden relative z-10">
        <CardContent className={cn(
          "transition-all duration-500",
          step === 6 ? "p-8 md:p-12" : "p-10 md:p-14"
        )}>
          {step === 6 ? renderStep6() : renderStep7()}
        </CardContent>
      </Card>
    </div>
  );
}
