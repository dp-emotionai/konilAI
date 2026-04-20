"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { useUI } from "@/components/layout/Providers";
import {
  api,
  clearAuth,
  getStoredAuth,
  hasAuth,
  isApiAvailable,
} from "@/lib/api/client";

import {
  User,
  ShieldCheck,
  Bell,
  Blocks,
  Globe,
  CreditCard,
  Laptop,
  Camera,
  LogOut,
  ChevronRight,
  Info,
  CheckCircle2,
  Trash2,
  Lock,
  Smartphone,
  Mail,
  ChevronDown
} from "lucide-react";

type Role = "student" | "teacher" | "admin";
type MeRes = { id: string; email: string; role: Role; name?: string | null; status?: string | null; };
type PermissionStateLite = "granted" | "denied" | "prompt" | "unsupported";

const TABS = [
  { id: "profile", label: "Профиль", icon: User },
  { id: "security", label: "Безопасность", icon: ShieldCheck },
  { id: "devices", label: "Устройства и Сеть", icon: Laptop },
  { id: "notifications", label: "Уведомления", icon: Bell },
  { id: "integrations", label: "Интеграции", icon: Blocks },
  { id: "language", label: "Язык и регион", icon: Globe },
  { id: "subscription", label: "Подписка", icon: CreditCard },
  { id: "active_sessions", label: "Активные сессии", icon: Smartphone },
];

export default function UnifiedProfilePage() {
  const router = useRouter();
  const ui = useUI();
  const [activeTab, setActiveTab] = useState("profile");

  const [me, setMe] = useState<MeRes | null>(null);
  const [loading, setLoading] = useState(true);

  const [camPerm, setCamPerm] = useState<PermissionStateLite>("prompt");
  const [micPerm, setMicPerm] = useState<PermissionStateLite>("prompt");
  const [netMs, setNetMs] = useState<number | null>(null);
  const [netStatus, setNetStatus] = useState<"idle" | "checking" | "ok" | "fail">("idle");
  const [previewOn, setPreviewOn] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stored = useMemo(() => getStoredAuth(), []);

  useEffect(() => {
    let mounted = true;
    async function loadMe() {
      setLoading(true);
      if (!hasAuth()) {
        router.push("/auth/login");
        return;
      }
      if (!isApiAvailable()) {
        if (mounted && stored) setMe({ id: "local", email: stored.email, role: stored.role as Role, name: stored.name });
        setLoading(false);
        return;
      }
      try {
         const data = await api.get<MeRes>("auth/me");
         if (mounted) setMe(data);
      } catch (e) {
         setMe(null);
      } finally {
         if (mounted) setLoading(false);
      }
    }
    loadMe();
    return () => { mounted = false; };
  }, [router, stored]);

  useEffect(() => {
    let cancelled = false;
    async function queryPerms() {
      const perms = (navigator as any)?.permissions;
      if (!perms?.query) return;
      try {
        const cam = await perms.query({ name: "camera" });
        if (!cancelled) setCamPerm((cam.state as PermissionStateLite) || "prompt");
      } catch {}
      try {
        const mic = await perms.query({ name: "microphone" });
        if (!cancelled) setMicPerm((mic.state as PermissionStateLite) || "prompt");
      } catch {}
    }
    queryPerms();
    return () => { cancelled = true; };
  }, []);

  async function runNetworkCheck() {
    if (!isApiAvailable()) return;
    setNetStatus("checking");
    const t0 = performance.now();
    try {
      await api.get("health");
      setNetMs(Math.round(performance.now() - t0));
      setNetStatus("ok");
    } catch {
      setNetStatus("fail");
    }
  }

  async function startPreview() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return;
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setPreviewOn(true);
    } catch {
      setPreviewOn(false);
    }
  }

  function stopPreview() {
    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    } catch {}
    setPreviewOn(false);
  }

  function signOut() {
    clearAuth();
    ui.setLoggedIn(false);
    ui.setConsent(false);
    router.push("/");
  }

  const roleLabel = me?.role === 'teacher' ? 'Преподаватель' : me?.role === 'admin' ? 'Администратор' : 'Студент';
  const nameParts = me?.name ? me.name.split(" ") : [];
  const firstName = nameParts[0] || "";
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#FAFAFB] pt-8 md:pt-12">
      <div className="mx-auto max-w-[1240px] px-4 md:px-8 pb-16">
        
        <div className="mb-8">
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900">Мой аккаунт</h1>
          <p className="mt-1 text-[15px] text-slate-500">Управляйте своими данными и настройками аккаунта</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          {/* Sidebar Navigation */}
          <div className="w-full md:w-[260px] shrink-0 sticky top-24">
            <nav className="space-y-1">
              {TABS.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-[14px] font-medium rounded-[14px] transition-all",
                      isActive 
                        ? "bg-purple-50 text-[#7448FF]" 
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <Icon size={18} className={cn(isActive ? "text-[#7448FF]" : "text-slate-400")} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 w-full min-h-[500px]">
             
             {/* Profile Layout */}
             {activeTab === "profile" && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                   {/* Left Col Profile Settings */}
                   <div className="xl:col-span-2 space-y-6">
                     
                     <div className="p-8 bg-white border border-slate-100 rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                        <h2 className="text-[17px] font-bold text-slate-900 mb-6">Профильная информация</h2>
                        
                        <div className="flex flex-col sm:flex-row gap-8 items-start">
                           <div className="flex flex-col items-center gap-4 shrink-0">
                              <div className="w-[120px] h-[120px] rounded-full bg-slate-100 flex items-center justify-center relative shadow-inner">
                                <span className="text-4xl font-bold text-slate-300">
                                   {me?.name ? me.name[0].toUpperCase() : me?.email?.[0].toUpperCase() ?? "U"}
                                </span>
                                <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#7448FF] hover:bg-[#623ce6] text-white flex items-center justify-center transition-colors border-2 border-white">
                                  <Camera size={14} />
                                </button>
                              </div>
                              <span className="text-xs text-slate-400 font-medium tracking-wide">JPG, PNG не более 5 МБ</span>
                           </div>

                           <div className="flex-1 space-y-5 w-full">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                 <div>
                                   <label className="text-xs font-semibold text-slate-500 mb-2 block">Имя</label>
                                   <input type="text" readOnly value={firstName} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[14px] text-slate-900 outline-none" />
                                 </div>
                                 <div>
                                   <label className="text-xs font-semibold text-slate-500 mb-2 block">Фамилия</label>
                                   <input type="text" readOnly value={lastName} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[14px] text-slate-900 outline-none" />
                                 </div>
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-slate-500 mb-2 block">Email</label>
                                <input type="text" readOnly value={me?.email || ""} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[14px] text-slate-900 outline-none disabled:bg-slate-50" />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-slate-500 mb-2 block">Роль</label>
                                <div className="relative">
                                  <input type="text" readOnly value={roleLabel} className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[14px] text-slate-500 outline-none" />
                                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                </div>
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-slate-500 mb-2 block">О себе</label>
                                <textarea rows={3} readOnly value="Студент 3 курса, интересуюсь машинным обучением и анализом данных." className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] text-slate-900 outline-none resize-none"></textarea>
                                <div className="text-right text-[10px] text-slate-400 font-medium mt-1">0/200</div>
                              </div>
                              
                              <div className="pt-2 flex justify-end">
                                <button className="px-6 py-2.5 bg-[#7448FF] hover:bg-[#623ce6] text-white font-medium rounded-xl text-[14px] transition-colors cursor-not-allowed opacity-80 shadow-sm">
                                  Сохранить изменения
                                </button>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="p-8 bg-white border border-slate-100 rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                        <h2 className="text-[17px] font-bold text-slate-900 mb-6">Безопасность</h2>
                        <div className="space-y-4">
                           <div className="flex items-center justify-between pb-4 border-b border-slate-50">
                             <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                 <Lock size={18} />
                               </div>
                               <div>
                                 <div className="font-semibold text-[14px] text-slate-900">Пароль</div>
                                 <div className="text-[12px] text-slate-500 flex items-center gap-2 mt-0.5">
                                   <span className="tracking-widest">••••••••••••••</span>
                                   <span className="text-slate-300">|</span>
                                   <span>Обновлен 2 месяца назад</span>
                                 </div>
                               </div>
                             </div>
                             <button className="text-[13px] font-semibold text-[#7448FF]">Изменить</button>
                           </div>

                           <div className="flex items-center justify-between pb-4 border-b border-slate-50">
                             <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                 <ShieldCheck size={18} />
                               </div>
                               <div>
                                 <div className="font-semibold text-[14px] text-slate-900">Двухфакторная аутентификация</div>
                                 <div className="text-[12px] text-slate-500 mt-0.5">Дополнительная защита аккаунта</div>
                               </div>
                             </div>
                             <div className="flex items-center gap-4">
                               <span className="text-[13px] text-slate-400 font-medium">Выключено</span>
                               <button className="text-[13px] font-semibold text-[#7448FF]">Включить</button>
                             </div>
                           </div>

                           <div className="flex items-center justify-between">
                             <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                 <ShieldCheck size={18} />
                               </div>
                               <div>
                                 <div className="font-semibold text-[14px] text-slate-900">Резервные коды</div>
                                 <div className="text-[12px] text-slate-500 mt-0.5">Используйте для входа при недоступности 2FA</div>
                               </div>
                             </div>
                             <button className="text-[13px] font-medium px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors">Показать коды</button>
                           </div>
                        </div>
                     </div>

                     <div className="p-8 bg-white border border-slate-100 rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                        <h2 className="text-[17px] font-bold text-slate-900 mb-6">Интеграции</h2>
                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                             <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 font-bold text-lg text-slate-700">
                                 G
                               </div>
                               <div>
                                 <div className="font-semibold text-[14px] text-slate-900">Google</div>
                                 <div className="text-[12px] text-slate-500 mt-0.5">{me?.email || "Не подключено"}</div>
                               </div>
                             </div>
                             <div className="flex items-center gap-4">
                               <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-1 bg-emerald-50 text-emerald-600 rounded">Подключено</span>
                               <button className="text-slate-400 hover:text-slate-700"><ChevronRight size={18} className="rotate-90" /></button>
                             </div>
                           </div>

                           <div className="flex items-center justify-between">
                             <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 font-bold text-lg text-slate-700">
                                 Git
                               </div>
                               <div>
                                 <div className="font-semibold text-[14px] text-slate-900">GitHub</div>
                                 <div className="text-[12px] text-slate-500 mt-0.5">Не подключено</div>
                               </div>
                             </div>
                             <button className="text-[13px] font-medium px-4 py-2 bg-purple-50 text-[#7448FF] rounded-lg hover:bg-purple-100 transition-colors">Подключить</button>
                           </div>

                           <div className="flex items-center justify-between">
                             <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 font-bold text-lg text-slate-700">
                                 D
                               </div>
                               <div>
                                 <div className="font-semibold text-[14px] text-slate-900">Dropbox</div>
                                 <div className="text-[12px] text-slate-500 mt-0.5">Не подключено</div>
                               </div>
                             </div>
                             <button className="text-[13px] font-medium px-4 py-2 bg-purple-50 text-[#7448FF] rounded-lg hover:bg-purple-100 transition-colors">Подключить</button>
                           </div>
                        </div>
                     </div>
                   </div>

                   {/* Right Col Stats & Quick Actions */}
                   <div className="space-y-6">
                     <div className="p-8 bg-white border border-slate-100 rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                        <h2 className="text-[15px] font-bold text-slate-900 mb-6">Статистика активности</h2>
                        <div className="space-y-5">
                          <div className="flex justify-between items-center text-[13px]">
                            <div className="flex items-center gap-3 text-slate-600"><User size={14} className="text-[#7448FF]" /> Присоединился</div>
                            <div className="font-medium text-slate-900">10 марта 2026</div>
                          </div>
                          <div className="flex justify-between items-center text-[13px]">
                            <div className="flex items-center gap-3 text-slate-600"><CheckCircle2 size={14} className="text-[#7448FF]" /> Активность</div>
                            <div className="font-medium text-emerald-500">Высокая</div>
                          </div>
                          <div className="flex justify-between items-center text-[13px]">
                            <div className="flex items-center gap-3 text-slate-600"><Blocks size={14} className="text-[#7448FF]" /> Завершено сессий</div>
                            <div className="font-medium text-slate-900">18</div>
                          </div>
                          <div className="flex justify-between items-center text-[13px]">
                            <div className="flex items-center gap-3 text-slate-600"><Laptop size={14} className="text-[#7448FF]" /> Время в системе</div>
                            <div className="font-medium text-slate-900">48 ч 32 мин</div>
                          </div>
                          <div className="flex justify-between items-center text-[13px]">
                            <div className="flex items-center gap-3 text-slate-600"><Globe size={14} className="text-[#7448FF]" /> Последний вход</div>
                            <div className="font-medium text-slate-900">Сегодня, 10:24</div>
                          </div>
                        </div>
                     </div>

                     <div className="p-8 bg-white border border-slate-100 rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                        <h2 className="text-[15px] font-bold text-slate-900 mb-6">Быстрые действия</h2>
                        <div className="gap-2 flex flex-col">
                           <button onClick={() => setActiveTab("security")} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group text-left">
                              <div className="flex items-center gap-3">
                                <ShieldCheck size={16} className="text-[#7448FF]" />
                                <div>
                                  <div className="text-[13px] font-semibold text-slate-900">Изменить пароль</div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">Обновите пароль от аккаунта</div>
                                </div>
                              </div>
                              <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                           </button>

                           <button onClick={() => setActiveTab("notifications")} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group text-left">
                              <div className="flex items-center gap-3">
                                <Bell size={16} className="text-[#7448FF]" />
                                <div>
                                  <div className="text-[13px] font-semibold text-slate-900">Настроить уведомления</div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">Выберите как получать уведомления</div>
                                </div>
                              </div>
                              <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                           </button>

                           <button onClick={() => setActiveTab("subscription")} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group text-left">
                              <div className="flex items-center gap-3">
                                <CreditCard size={16} className="text-[#7448FF]" />
                                <div>
                                  <div className="text-[13px] font-semibold text-slate-900">Управление подпиской</div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">Просмотр и изменение подписки</div>
                                </div>
                              </div>
                              <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                           </button>

                           <button onClick={signOut} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group text-left">
                              <div className="flex items-center gap-3">
                                <Laptop size={16} className="text-[#7448FF]" />
                                <div>
                                  <div className="text-[13px] font-semibold text-slate-900">Выйти из всех устройств</div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">Завершить все активные сессии</div>
                                </div>
                              </div>
                              <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                           </button>
                        </div>
                     </div>
                   </div>
                </div>
             )}

             {/* Security Tab */}
             {activeTab === "security" && (
                <div className="max-w-4xl space-y-6">
                   <h2 className="text-[20px] font-bold text-slate-900 mb-2">Безопасность</h2>
                   <p className="text-[14px] text-slate-500 mb-8">Настройки безопасности и защита вашего аккаунта</p>
                   
                   <div className="p-8 bg-white border border-slate-100 rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-6">
                      <div className="pb-6 border-b border-slate-50">
                        <div className="flex items-center justify-between mb-2">
                           <div className="font-semibold text-[15px] text-slate-900">Пароль</div>
                           <button className="text-[13px] font-medium px-5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[#7448FF] font-semibold hover:bg-slate-100 transition-colors">Изменить пароль</button>
                        </div>
                        <div className="text-[13px] text-slate-500 mb-4">Используйте надежный пароль для защиты вашего аккаунта.</div>
                        <div className="flex gap-16 text-[13px] text-slate-500 font-medium">
                          <span className="tracking-widest">••••••••••••••••</span>
                          <span>Обновлен 2 месяца назад</span>
                        </div>
                      </div>

                      <div className="pb-6 border-b border-slate-50">
                        <div className="flex items-center justify-between mb-2">
                           <div className="font-semibold text-[15px] text-slate-900">Двухфакторная аутентификация (2FA)</div>
                           <button className="text-[13px] font-medium px-5 py-2.5 bg-[#7448FF] text-white rounded-xl font-semibold hover:bg-[#623ce6] transition-colors shadow-sm">Включить 2FA</button>
                        </div>
                        <div className="text-[13px] text-slate-500 mb-4">Дополнительный уровень защиты вашего аккаунта.</div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"><ShieldCheck size={18}/></div>
                          <div>
                            <div className="text-[11px] text-slate-400 font-semibold tracking-wide uppercase">Статус</div>
                            <div className="text-[14px] text-slate-900 font-medium">Выключено</div>
                          </div>
                        </div>
                      </div>

                      <div>
                         <div className="flex items-center justify-between mb-2">
                           <div className="font-semibold text-[15px] text-slate-900">Резервные коды</div>
                           <button className="text-[13px] font-medium px-5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-100 transition-colors">Показать коды</button>
                        </div>
                        <div className="text-[13px] text-slate-500 mb-4">Используйте резервные коды для входа при недоступности 2FA.</div>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"><Lock size={18}/></div>
                          <div>
                            <div className="text-[11px] text-slate-400 font-semibold tracking-wide uppercase">Резервные коды</div>
                            <div className="text-[14px] text-slate-900 font-medium">0 кодов создано</div>
                          </div>
                        </div>
                      </div>
                   </div>

                   <div className="p-8 bg-white border border-slate-100 rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                      <div className="font-semibold text-[15px] text-slate-900 mb-1">Последняя активность</div>
                      <div className="text-[13px] text-slate-500 mb-6">Устройства и места, с которых был выполнен вход в ваш аккаунт.</div>
                      
                      <div className="w-full">
                        <div className="grid grid-cols-12 gap-4 pb-3 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-widest px-2">
                           <div className="col-span-5">Устройство</div>
                           <div className="col-span-4">Местоположение</div>
                           <div className="col-span-2">Время входа</div>
                           <div className="col-span-1 text-right">Статус</div>
                        </div>

                        <div className="py-2">
                           {/* Current device */}
                           <div className="grid grid-cols-12 gap-4 items-center py-4 px-2 hover:bg-slate-50 transition-colors rounded-xl">
                              <div className="col-span-5 flex items-center gap-4">
                                <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-purple-50 text-[#7448FF]"><Laptop size={20}/></div>
                                <div>
                                  <div className="font-medium text-slate-900 text-[14px]">Windows PC</div>
                                  <div className="text-[12px] text-slate-500">Chrome • Windows</div>
                                </div>
                              </div>
                              <div className="col-span-4">
                                <div className="font-medium text-slate-900 text-[14px]">Текущий город</div>
                                <div className="text-[12px] text-slate-500">IP: Ваш текущий</div>
                              </div>
                              <div className="col-span-2">
                                <div className="text-[13px] text-slate-600">Сегодня, Сейчас</div>
                              </div>
                              <div className="col-span-1 text-right">
                                <span className="text-[11px] tracking-wide font-bold uppercase text-emerald-500 px-2.5 py-1 bg-emerald-50 rounded">Текущая</span>
                              </div>
                           </div>
                        </div>
                      </div>
                   </div>

                   <div className="p-8 bg-white border border-slate-100 rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                      <div className="flex items-center justify-between">
                         <div>
                            <div className="font-semibold text-[15px] text-slate-900 mb-1">Удаление аккаунта</div>
                            <div className="text-[13px] text-slate-500">Удалите свой аккаунт и все связанные данные без возможности восстановления.</div>
                         </div>
                         <button className="text-[13px] font-semibold px-5 py-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors">Удалить аккаунт</button>
                      </div>
                   </div>

                </div>
             )}

             {/* Notifications Tab */}
             {activeTab === "notifications" && (
                <div className="max-w-4xl space-y-6">
                   <h2 className="text-[20px] font-bold text-slate-900 mb-2">Уведомления</h2>
                   <p className="text-[14px] text-slate-500 mb-8">Настройте, какие уведомления вы хотите получать и как</p>
                   
                   <div className="p-8 bg-white border border-slate-100 rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-6">
                      <div className="font-semibold text-[15px] text-slate-900 mb-1">Способы получения уведомлений</div>
                      <div className="text-[13px] text-slate-500 mb-6">Выберите, куда и как вы хотите получать уведомления</div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between py-2">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#7448FF] flex items-center justify-center shrink-0"><Mail size={18} /></div>
                              <div>
                                <div className="text-[14px] font-semibold text-slate-900">Email уведомления</div>
                                <div className="text-[12px] text-slate-500 mt-0.5">{me?.email || "alisher.b@mail.ru"}</div>
                              </div>
                           </div>
                           <div className="w-12 h-6 rounded-full bg-[#7448FF] p-1 flex justify-end cursor-pointer"><div className="w-4 h-4 bg-white rounded-full"></div></div>
                        </div>

                        <div className="flex items-center justify-between py-2 border-t border-slate-50 pt-4">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#7448FF] flex items-center justify-center shrink-0"><Smartphone size={18} /></div>
                              <div>
                                <div className="text-[14px] font-semibold text-slate-900">Push уведомления</div>
                                <div className="text-[12px] text-slate-500 mt-0.5">Уведомления в браузере</div>
                              </div>
                           </div>
                           <div className="w-12 h-6 rounded-full bg-[#7448FF] p-1 flex justify-end cursor-pointer"><div className="w-4 h-4 bg-white rounded-full"></div></div>
                        </div>

                        <div className="flex items-center justify-between py-2 border-t border-slate-50 pt-4">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#7448FF] flex items-center justify-center shrink-0"><CheckCircle2 size={18} /></div>
                              <div>
                                <div className="text-[14px] font-semibold text-slate-900">Ежедневная сводка</div>
                                <div className="text-[12px] text-slate-500 mt-0.5">Получайте сводку по активности раз в день</div>
                              </div>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="px-4 py-2 border border-slate-200 rounded-xl text-[13px] font-medium text-slate-600 bg-slate-50">Включено (09:00) <ChevronDown size={14} className="inline ml-2" /></span>
                           </div>
                        </div>
                      </div>
                   </div>

                   <div className="p-8 bg-white border border-slate-100 rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                      <div className="font-semibold text-[15px] text-slate-900 mb-1">Типы уведомлений</div>
                      <div className="text-[13px] text-slate-500 mb-6">Выберите, о каких событиях вы хотите получать уведомления</div>

                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100">
                             <th className="pb-4 font-normal text-[12px] text-slate-400"></th>
                             <th className="pb-4 font-normal text-[12px] text-slate-500 w-24 text-center">Email</th>
                             <th className="pb-4 font-normal text-[12px] text-slate-500 w-24 text-center">Push</th>
                             <th className="pb-4 font-normal text-[12px] text-slate-400 w-10"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { title: "Расписание и занятия", subtitle: "Изменения в расписании, напоминания о занятиях", icon: Bell },
                            { title: "Задания и дедлайны", subtitle: "Новые задания, приближающиеся дедлайны", icon: CheckCircle2 },
                            { title: "Сообщения", subtitle: "Личные сообщения и ответы в обсуждениях", icon: Mail },
                            { title: "Группы и сессии", subtitle: "Приглашения, обновления в группах и сессиях", icon: Blocks },
                          ].map((item, i) => {
                             const Icon = item.icon;
                             return (
                              <tr key={i} className="border-b border-slate-50">
                                <td className="py-4 font-medium flex items-center gap-3">
                                   <Icon size={18} className="text-[#7448FF] shrink-0" />
                                   <div>
                                     <div className="text-[14px] text-slate-900">{item.title}</div>
                                     <div className="text-[11px] text-slate-500 font-normal mt-0.5">{item.subtitle}</div>
                                   </div>
                                </td>
                                <td className="py-4 text-center align-middle">
                                  <div className="w-5 h-5 mx-auto bg-[#7448FF] rounded-md flex items-center justify-center text-white"><CheckCircle2 size={12} strokeWidth={4} /></div>
                                </td>
                                <td className="py-4 text-center align-middle">
                                  <div className="w-5 h-5 mx-auto bg-[#7448FF] rounded-md flex items-center justify-center text-white"><CheckCircle2 size={12} strokeWidth={4} /></div>
                                </td>
                                <td className="py-4 text-right">
                                  <ChevronDown size={14} className="text-slate-300" />
                                </td>
                              </tr>
                             )
                          })}
                        </tbody>
                      </table>
                   </div>

                </div>
             )}

             {/* Devices Tab from before */}
             {activeTab === "devices" && (
                <div className="p-8 max-w-4xl space-y-6">
                   <h2 className="text-[20px] font-bold text-slate-900 mb-2 flex items-center gap-2">
                      Устройства и Сеть <Info size={18} className="text-slate-400" />
                   </h2>
                   
                   <p className="text-[14px] text-slate-500 mb-8 w-full max-w-2xl">
                     Перед подключением к сессиям вы можете проверить работоспособность вашей камеры и качество интернет-соединения прямо здесь.
                   </p>

                   <div className="border border-slate-100 rounded-[20px] p-6 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                         <div>
                            <h3 className="font-semibold text-slate-900 text-[15px]">Камера и микрофон</h3>
                            <p className="text-[13px] text-slate-500 mt-1">Тест устройств работает полностью локально</p>
                         </div>
                         <div className="flex items-center gap-2">
                            {camPerm === 'granted' ? <span className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-[11px] font-bold uppercase tracking-wide">Доступ разрешен</span> : <span className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 text-[11px] font-bold uppercase tracking-wide">Тест не начат</span>}
                         </div>
                      </div>

                      <div className={cn("rounded-2xl overflow-hidden bg-slate-900 aspect-video max-w-xl relative mx-auto my-6 shadow-lg border border-slate-200", !previewOn && "flex items-center justify-center")}>
                         {previewOn ? (
                           <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                         ) : (
                           <Camera size={48} className="text-slate-700" />
                         )}
                      </div>

                      <div className="flex justify-center mt-4 pt-4 border-t border-slate-200/50">
                        {!previewOn ? (
                          <button onClick={startPreview} className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm text-slate-700 font-medium rounded-xl text-[14px] transition-colors">
                            Запустить предварительный просмотр
                          </button>
                        ) : (
                          <button onClick={stopPreview} className="px-6 py-2.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 shadow-sm font-medium rounded-xl text-[14px] transition-colors">
                            Остановить тест
                          </button>
                        )}
                      </div>
                   </div>

                   <div className="border border-slate-100 rounded-[20px] p-6 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                         <div>
                            <h3 className="font-semibold text-slate-900 text-[15px]">Проверка соединения</h3>
                            <p className="text-[13px] text-slate-500 mt-1">Текущая задержка (ping) до серверов KonilAI</p>
                         </div>
                         <div className="flex items-center gap-4">
                            {netStatus === 'ok' && <span className="text-[15px] font-bold text-emerald-600 drop-shadow-sm">{netMs} ms</span>}
                            {netStatus === 'fail' && <span className="text-[15px] font-bold text-rose-600">Ошибка соединения</span>}
                            {netStatus === 'checking' && <span className="text-[15px] font-medium text-slate-500 animate-pulse">Идет проверка...</span>}

                            <button 
                              onClick={runNetworkCheck} 
                              disabled={netStatus === 'checking'}
                              className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 shadow-sm text-slate-700 font-medium rounded-xl text-[14px] transition-colors disabled:opacity-50"
                            >
                              Проверить сеть
                            </button>
                         </div>
                      </div>
                   </div>
                </div>
             )}

             {/* Stubs for other tabs */}
             {["integrations", "language", "subscription", "active_sessions"].includes(activeTab) && (
                <div className="p-8 h-full min-h-[500px] flex flex-col items-center justify-center text-center">
                   <Blocks size={64} className="text-slate-200 mb-6" strokeWidth={1} />
                   <h2 className="text-xl font-bold text-slate-900 mb-2">В разработке</h2>
                   <p className="text-[15px] text-slate-500 max-w-sm">
                     Настройки данного раздела ({TABS.find(t => t.id === activeTab)?.label}) будут доступны в следующих обновлениях.
                   </p>
                </div>
             )}

          </div>

        </div>
      </div>
    </div>
  );
}