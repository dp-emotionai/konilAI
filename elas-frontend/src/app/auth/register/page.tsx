"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { 
  ChevronLeft, 
  ChevronRight, 
  Mail, 
  Lock, 
  User, 
  GraduationCap, 
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  MoveRight
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import StepHeading from "@/components/auth/StepHeading";

import { api, isApiAvailable } from "@/lib/api/client";
import { cn } from "@/lib/cn";

type RegisterRes = {
  success?: boolean;
  message?: string;
};

const PENDING_REGISTER_KEY = "elas_pending_register_v1";

function savePendingRegister(data: {
  email: string;
  password: string;
  name?: string;
  role: "student" | "teacher";
}) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PENDING_REGISTER_KEY, JSON.stringify(data));
}

export default function RegisterWizardPage() {
  const router = useRouter();

  // Navigation state
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"student" | "teacher" | null>(null);
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Password validation
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password === confirmPassword && password.length > 0;
  const isPasswordValid = hasMinLength && hasUppercase && hasNumber && passwordsMatch;

  const nextStep = () => {
    setError("");
    setDirection(1);
    setStep(s => s + 1);
  };

  const prevStep = () => {
    setError("");
    setDirection(-1);
    setStep(s => s - 1);
  };

  const handleRegister = async () => {
    setError("");
    
    if (!isPasswordValid) return;

    const e = email.trim().toLowerCase();
    const p = password;
    const n = `${firstName.trim()} ${lastName.trim()}`.trim();

    if (!isApiAvailable()) {
      setError("Сервер недоступен. Обратитесь к администратору.");
      return;
    }

    setLoading(true);

    try {
      const data = await api.post<RegisterRes>("auth/register", {
        email: e,
        password: p,
        name: n || undefined,
        role: role || "student",
      });

      savePendingRegister({
        email: e,
        password: p,
        name: n || undefined,
        role: role || "student",
      });

      router.push(`/auth/verify-email?email=${encodeURIComponent(e)}&mode=register`);
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setError(raw || "Ошибка регистрации.");
    } finally {
      setLoading(false);
    }
  };

  const renderWelcome = () => (
    <div className="grid w-full lg:grid-cols-[1.1fr_0.9fr] gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col justify-center py-8">
        <div className="mb-10 flex items-center gap-2">
          <div className="w-9 h-9 bg-[#7448FF] rounded-xl flex items-center justify-center text-white font-bold">K</div>
          <span className="text-xl font-bold text-slate-900">KoniAI</span>
        </div>

        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
          Привет! 👋<br />
          <span className="text-slate-400">Начните учиться и достигать новых целей!</span>
        </h1>
        
        <div className="mt-8 space-y-4 max-w-sm">
          <Button onClick={() => router.push("/auth/login")} className="w-full h-12 text-base">Войти</Button>
          <Button variant="outline" onClick={nextStep} className="w-full h-12 text-base">Зарегистрироваться</Button>
        </div>

        <div className="mt-10">
          <div className="text-[13px] text-slate-400 font-medium mb-4">или войти с помощью</div>
          <div className="flex items-center gap-4">
            {['google', 'apple', 'telegram'].map(icon => (
              <button key={icon} className="w-12 h-12 rounded-xl border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm bg-white">
                <Image src={`/icons/${icon}.svg`} alt={icon} width={20} height={20} className="opacity-70" 
                  onError={(e) => { // Fallback if svg missing
                    (e.target as any).style.display = 'none';
                  }}
                />
                <div className="capitalize font-bold text-[10px] text-slate-400">{icon[0].toUpperCase()}</div>
              </button>
            ))}
          </div>
        </div>

        <p className="mt-12 text-[12px] text-slate-400 leading-relaxed max-w-xs">
          Продолжая, вы соглашаетесь с <Link href="/terms" className="text-[#7448FF] font-semibold underline">Условиями использования</Link> и <Link href="/privacy" className="text-[#7448FF] font-semibold underline">Политикой конфиденциальности</Link>
        </p>
      </div>

      <div className="relative hidden lg:flex items-center justify-center bg-slate-50/50 rounded-[40px] overflow-hidden border border-slate-100">
        <Image 
          src="/auth_onboarding_illustration_1776717858308.png" 
          alt="Illustration" 
          fill 
          className="object-contain p-12"
        />
      </div>
    </div>
  );

  const renderRoleSelection = () => (
    <div className="max-w-xl mx-auto py-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <button onClick={prevStep} className="flex items-center gap-1.5 text-sm text-slate-400 font-medium mb-8 hover:text-slate-600 transition-colors">
        <ChevronLeft size={16} /> Назад
      </button>
      
      <StepHeading step={2} title="Выбор роли" subtitle="Выберите свою роль в системе" />
      
      <div className="mt-10 space-y-4">
        <div 
          onClick={() => setRole("student")}
          className={cn(
            "group relative flex items-center gap-5 p-5 rounded-[28px] border-2 transition-all cursor-pointer",
            role === "student" ? "border-[#7448FF] bg-purple-50/30" : "border-slate-100 bg-white hover:border-slate-200"
          )}
        >
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors",
            role === "student" ? "bg-[#7448FF] text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
          )}>
            <GraduationCap size={28} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-900">Студент</h3>
            <p className="text-sm text-slate-500">Хочу учиться, проходить курсы и развиваться</p>
          </div>
          <div className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
            role === "student" ? "border-[#7448FF]" : "border-slate-200"
          )}>
            {role === "student" && <div className="w-3 h-3 rounded-full bg-[#7448FF]" />}
          </div>
        </div>

        <div 
          onClick={() => setRole("teacher")}
          className={cn(
            "group relative flex items-center gap-5 p-5 rounded-[28px] border-2 transition-all cursor-pointer",
            role === "teacher" ? "border-[#7448FF] bg-purple-50/30" : "border-slate-100 bg-white hover:border-slate-200"
          )}
        >
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors",
            role === "teacher" ? "bg-[#7448FF] text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
          )}>
            <Briefcase size={28} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-900">Преподаватель</h3>
            <p className="text-sm text-slate-500">Хочу создавать курсы и обучать студентов</p>
          </div>
          <div className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
            role === "teacher" ? "border-[#7448FF]" : "border-slate-200"
          )}>
            {role === "teacher" && <div className="w-3 h-3 rounded-full bg-[#7448FF]" />}
          </div>
        </div>
      </div>

      <Button 
        onClick={nextStep} 
        disabled={!role} 
        className="w-full h-14 mt-12 text-[15px] font-bold"
      >
        Продолжить
      </Button>
    </div>
  );

  const renderBasicInfo = () => (
    <div className="max-w-xl mx-auto py-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <button onClick={prevStep} className="flex items-center gap-1.5 text-sm text-slate-400 font-medium mb-8 hover:text-slate-600 transition-colors">
        <ChevronLeft size={16} /> Назад
      </button>

      <StepHeading step={3} title="Расскажите о себе" subtitle="Заполните основную информацию для аккаунта" />

      <div className="space-y-6 mt-10">
        <div>
          <label className="block text-[13px] font-bold text-slate-500 mb-2.5 ml-1">Имя</label>
          <Input 
            placeholder="Введите имя" 
            value={firstName} 
            onChange={e => setFirstName(e.target.value)}
            className="h-12 bg-white"
          />
        </div>
        <div>
          <label className="block text-[13px] font-bold text-slate-500 mb-2.5 ml-1">Фамилия</label>
          <Input 
            placeholder="Введите фамилию" 
            value={lastName} 
            onChange={e => setLastName(e.target.value)}
            className="h-12 bg-white"
          />
        </div>
        <div>
          <label className="block text-[13px] font-bold text-slate-500 mb-2.5 ml-1">Email</label>
          <Input 
            placeholder="example@mail.ru" 
            type="email"
            value={email} 
            onChange={e => setEmail(e.target.value)}
            className="h-12 bg-white"
          />
        </div>
        <div>
          <label className="block text-[13px] font-bold text-slate-500 mb-2.5 ml-1">Телефон</label>
          <Input 
            placeholder="+7 000 000 00 00" 
            value={phone} 
            onChange={e => setPhone(e.target.value)}
            className="h-12 bg-white"
          />
        </div>
      </div>

      <Button 
        onClick={nextStep} 
        disabled={!firstName || !lastName || !email} 
        className="w-full h-14 mt-12 text-[15px] font-bold"
      >
        Продолжить
      </Button>
    </div>
  );

  const renderPasswordSetup = () => (
    <div className="max-w-xl mx-auto py-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <button onClick={prevStep} className="flex items-center gap-1.5 text-sm text-slate-400 font-medium mb-8 hover:text-slate-600 transition-colors">
        <ChevronLeft size={16} /> Назад
      </button>

      <StepHeading step={4} title="Создайте пароль" subtitle="Придумайте надежный пароль для защиты аккаунта" />

      <div className="space-y-6 mt-10">
        <div>
          <label className="block text-[13px] font-bold text-slate-500 mb-2.5 ml-1">Пароль</label>
          <Input 
            placeholder="••••••••••" 
            type={showPassword ? "text" : "password"}
            value={password} 
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
            className="h-12 bg-white"
            suffix={
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />
        </div>

        <div className="space-y-2.5 px-1 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-2.5 transition-colors">
            {hasMinLength ? <CheckCircle2 size={16} className="text-emerald-500" /> : <div className="w-4 h-4 rounded-full border border-slate-200" />}
            <span className={cn("text-[13px] font-medium", hasMinLength ? "text-emerald-600" : "text-slate-400")}>Минимум 8 символов</span>
          </div>
          <div className="flex items-center gap-2.5 transition-colors">
            {hasUppercase ? <CheckCircle2 size={16} className="text-emerald-500" /> : <div className="w-4 h-4 rounded-full border border-slate-200" />}
            <span className={cn("text-[13px] font-medium", hasUppercase ? "text-emerald-600" : "text-slate-400")}>Хотя бы одна заглавная буква</span>
          </div>
          <div className="flex items-center gap-2.5 transition-colors">
            {hasNumber ? <CheckCircle2 size={16} className="text-emerald-500" /> : <div className="w-4 h-4 rounded-full border border-slate-200" />}
            <span className={cn("text-[13px] font-medium", hasNumber ? "text-emerald-600" : "text-slate-400")}>Хотя бы одна цифра</span>
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-bold text-slate-500 mb-2.5 ml-1">Подтвердите пароль</label>
          <Input 
            placeholder="••••••••••" 
            type={showPassword ? "text" : "password"}
            value={confirmPassword} 
            onChange={e => setConfirmPassword(e.target.value)}
            className="h-12 bg-white"
          />
          {confirmPassword && !passwordsMatch && (
            <p className="mt-1.5 text-xs text-red-500 font-medium ml-1 flex items-center gap-1">
              <AlertCircle size={12} /> Пароли не совпадают
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-[13px] font-medium flex items-center gap-2.5">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <Button 
        onClick={handleRegister} 
        disabled={!isPasswordValid || loading} 
        className="w-full h-14 mt-12 text-[15px] font-bold flex items-center justify-center gap-2"
      >
        {loading ? "Обработка..." : "Завершить регистрацию"}
        {!loading && <ChevronRight size={18} />}
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/30 flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-[1000px] border-white/50 bg-white shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-hidden">
        <CardContent className="p-0">
          <div className={cn(
             "p-6 md:p-10",
             step > 1 && "bg-white" // Keep center card style for steps 2-4
          )}>
            {step === 1 && renderWelcome()}
            {step === 2 && renderRoleSelection()}
            {step === 3 && renderBasicInfo()}
            {step === 4 && renderPasswordSetup()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}