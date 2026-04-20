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
  setAuth
} from "@/lib/api/client";

import {
  User, ShieldCheck, Bell, Blocks, Globe, CreditCard, Laptop, Camera, LogOut,
  ChevronRight, Info, CheckCircle2, Trash2, Lock, Smartphone, Mail, ChevronDown,
  Loader2, AlertCircle
} from "lucide-react";

type Role = "student" | "teacher" | "admin";
type MeRes = { id: string; email: string; role: Role; name?: string | null; status?: string | null; bio?: string | null; };
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

  // Profile Form State
  const [formName, setFormName] = useState("");
  const [formSurname, setFormSurname] = useState("");
  const [formBio, setFormBio] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{type: 'error' | 'success', text: string} | null>(null);

  // Security Form State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{type: 'error' | 'success', text: string} | null>(null);

  // Notifications State
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(false);
  const [notifDigest, setNotifDigest] = useState(true);

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
        if (mounted && stored) {
            setMe({ id: "local", email: stored.email, role: stored.role as Role, name: stored.name });
            setFormName(stored.name?.split(" ")[0] || "");
            setFormSurname(stored.name?.split(" ").slice(1).join(" ") || "");
        }
        setLoading(false);
        return;
      }
      try {
         const data = await api.get<MeRes>("auth/me");
         if (mounted) {
             setMe(data);
             setFormName(data.name?.split(" ")[0] || "");
             setFormSurname(data.name?.split(" ").slice(1).join(" ") || "");
             setFormBio(data.bio || "");
         }
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

  async function handleSaveProfile() {
      if (!isApiAvailable()) {
          setProfileMessage({ type: 'error', text: 'Нет подключения к API.' });
          return;
      }
      setIsSavingProfile(true);
      setProfileMessage(null);
      try {
          const fullName = `${formName.trim()} ${formSurname.trim()}`.trim();
          await api.patch("auth/me", { name: fullName, bio: formBio });
          setProfileMessage({ type: 'success', text: 'Профиль успешно сохранен.' });
          // Update local state and auth
          const newMe = { ...me!, name: fullName, bio: formBio };
          setMe(newMe);
          setAuth({ ...stored!, name: fullName }); 
      } catch (e) {
          setProfileMessage({ type: 'error', text: `API Endpoint Missing or Error: PATCH /auth/me не реализован на бэкенде. (${e instanceof Error ? e.message : 'Unknown'})` });
      } finally {
          setIsSavingProfile(false);
      }
  }

  async function handleActionStub(actionName: string, endpoint: string) {
      if (!isApiAvailable()) return alert('Нет подключения к API.');
      try {
          await api.post(endpoint, {});
          alert('Действие выполнено.');
      } catch (e) {
          alert(`API Endpoint Missing: ${endpoint} не реализован на бэкенде.`);
      }
  }

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
  
  const hasProfileChanges = formName !== (me?.name?.split(" ")[0] || "") 
                            || formSurname !== (me?.name?.split(" ").slice(1).join(" ") || "") 
                            || formBio !== (me?.bio || "");

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#FAFAFB] pt-8 md:pt-12">
      <div className="mx-auto max-w-[1240px] px-4 md:px-8 pb-16">
        
        <div className="mb-8">
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900">Мой аккаунт</h1>
          <p className="mt-1 text-[15px] text-slate-500">Управляйте своими данными и настройками аккаунта</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          
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

          <div className="flex-1 w-full min-h-[500px]">
             
             {activeTab === "profile" && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                   <div className="xl:col-span-2 space-y-6">
                     
                     <div className="p-8 bg-white border border-slate-100 rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                        <h2 className="text-[17px] font-bold text-slate-900 mb-6">Профильная информация</h2>
                        
                        <div className="flex flex-col sm:flex-row gap-8 items-start">
                           <div className="flex flex-col items-center gap-4 shrink-0">
                              <div className="w-[120px] h-[120px] rounded-full bg-slate-100 flex items-center justify-center relative shadow-inner overflow-hidden">
                                <span className="text-4xl font-bold text-slate-300">
                                   {me?.name ? me.name[0].toUpperCase() : me?.email?.[0].toUpperCase() ?? "U"}
                                </span>
                                <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#7448FF] hover:bg-[#623ce6] text-white flex items-center justify-center transition-colors border-2 border-white z-10" onClick={() => handleActionStub('Upload Avatar', 'auth/me/avatar')}>
                                  <Camera size={14} />
                                </button>
                              </div>
                              <span className="text-xs text-slate-400 font-medium tracking-wide">JPG, PNG не более 5 МБ</span>
                           </div>

                           <div className="flex-1 space-y-5 w-full">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                 <div>
                                   <label className="text-xs font-semibold text-slate-500 mb-2 block">Имя</label>
                                   <input type="text" value={formName} onChange={e => setFormName(e.target.value)} disabled={isSavingProfile} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[14px] text-slate-900 outline-none focus:border-[#7448FF] transition-colors" />
                                 </div>
                                 <div>
                                   <label className="text-xs font-semibold text-slate-500 mb-2 block">Фамилия</label>
                                   <input type="text" value={formSurname} onChange={e => setFormSurname(e.target.value)} disabled={isSavingProfile} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[14px] text-slate-900 outline-none focus:border-[#7448FF] transition-colors" />
                                 </div>
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-slate-500 mb-2 block">Email (Обратитесь в поддержку для изменения)</label>
                                <input type="text" readOnly value={me?.email || ""} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[14px] text-slate-500 outline-none cursor-not-allowed" />
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-slate-500 mb-2 block">Роль</label>
                                <div className="relative">
                                  <input type="text" readOnly value={roleLabel} className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-[14px] text-slate-500 outline-none cursor-not-allowed" />
                                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                </div>
                              </div>
                              <div>
                                <label className="text-xs font-semibold text-slate-500 mb-2 block">О себе</label>
                                <textarea rows={3} value={formBio} onChange={e => setFormBio(e.target.value)} disabled={isSavingProfile} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] text-slate-900 outline-none resize-none focus:border-[#7448FF] transition-colors"></textarea>
                                <div className="text-right text-[10px] text-slate-400 font-medium mt-1">{formBio.length}/200</div>
                              </div>
                              
                              {profileMessage && (
                                <div className={cn("text-[13px] p-3 rounded-lg flex items-start gap-2", profileMessage.type === 'error' ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600")}>
                                   <AlertCircle size={16} className="shrink-0 mt-0.5" /> {profileMessage.text}
                                </div>
                              )}

                              <div className="pt-2 flex justify-end">
                                <button onClick={handleSaveProfile} disabled={!hasProfileChanges || isSavingProfile} className="px-6 py-2.5 bg-[#7448FF] hover:bg-[#623ce6] text-white font-medium rounded-xl text-[14px] transition-colors disabled:opacity-50 shadow-sm flex items-center gap-2">
                                  {isSavingProfile && <Loader2 size={16} className="animate-spin" />}
                                  Сохранить изменения
                                </button>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="p-8 bg-white border border-slate-100 rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                        <h2 className="text-[17px] font-bold text-slate-900 mb-6">Двухфакторная аутентификация (2FA)</h2>
                        <div className="space-y-4">
                           <div className="flex items-center justify-between pb-4 border-b border-slate-50">
                             <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                 <ShieldCheck size={18} />
                               </div>
                               <div>
                                 <div className="font-semibold text-[14px] text-slate-900">Защита аккаунта 2FA</div>
                                 <div className="text-[12px] text-slate-500 mt-0.5">Дополнительная защита аккаунта</div>
                               </div>
                             </div>
                             <div className="flex items-center gap-4">
                               <span className="text-[13px] text-slate-400 font-medium">Выключено</span>
                               <button onClick={() => handleActionStub('Enable 2FA', 'auth/2fa/enable')} className="text-[13px] font-semibold text-[#7448FF] hover:underline">Включить</button>
                             </div>
                           </div>

                           <div className="flex items-center justify-between">
                             <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                                 <Lock size={18} />
                               </div>
                               <div>
                                 <div className="font-semibold text-[14px] text-slate-900">Резервные коды</div>
                                 <div className="text-[12px] text-slate-500 mt-0.5">Используйте для входа при недоступности 2FA</div>
                               </div>
                             </div>
                             <button onClick={() => handleActionStub('Show Codes', 'auth/2fa/recovery-codes')} className="text-[13px] font-medium px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors">Показать коды</button>
                           </div>
                        </div>
                     </div>

                     <div className="p-8 bg-white border border-slate-100 rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                        <h2 className="text-[17px] font-bold text-slate-900 mb-6">Интеграции</h2>
                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                             <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 font-bold text-lg text-slate-700">G</div>
                               <div>
                                 <div className="font-semibold text-[14px] text-slate-900">Google</div>
                                 <div className="text-[12px] text-slate-500 mt-0.5">{me?.email || "Не подключено"}</div>
                               </div>
                             </div>
                             <div className="flex items-center gap-4">
                               <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-1 bg-emerald-50 text-emerald-600 rounded">Подключено</span>
                               <button onClick={() => handleActionStub('Disconnect Google', 'user/integrations/google/disconnect')} className="text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                             </div>
                           </div>

                           <div className="flex items-center justify-between">
                             <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 font-bold text-lg text-slate-700">Git</div>
                               <div>
                                 <div className="font-semibold text-[14px] text-slate-900">GitHub</div>
                                 <div className="text-[12px] text-slate-500 mt-0.5">Не подключено</div>
                               </div>
                             </div>
                             <button onClick={() => handleActionStub('Connect GitHub', 'user/integrations/github/connect')} className="text-[13px] font-medium px-4 py-2 bg-purple-50 text-[#7448FF] rounded-lg hover:bg-purple-100 transition-colors">Подключить</button>
                           </div>

                        </div>
                     </div>
                   </div>

                   <div className="space-y-6">
                     <div className="p-8 bg-white border border-slate-100 rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                        <h2 className="text-[15px] font-bold text-slate-900 mb-6">Статистика активности</h2>
                        <div className="space-y-5">
                          <div className="flex justify-between items-center text-[13px]">
                            <div className="flex items-center gap-3 text-slate-600"><User size={14} className="text-[#7448FF]" /> С нами с</div>
                            <div className="font-medium text-slate-900">10 марта 2026</div> {/* In real impl: derive from user.createdAt */}
                          </div>
                          <div className="flex justify-between items-center text-[13px]">
                            <div className="flex items-center gap-3 text-slate-600"><Globe size={14} className="text-[#7448FF]" /> Текущий IP статус</div>
                            <div className="font-medium text-slate-900">Авторизован</div>
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
                                  <div className="text-[11px] text-slate-500 mt-0.5">Вкладка "Безопасность"</div>
                                </div>
                              </div>
                              <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                           </button>

                           <button onClick={() => setActiveTab("notifications")} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group text-left">
                              <div className="flex items-center gap-3">
                                <Bell size={16} className="text-[#7448FF]" />
                                <div>
                                  <div className="text-[13px] font-semibold text-slate-900">Настроить уведомления</div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">Вкладка "Уведомления"</div>
                                </div>
                              </div>
                              <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                           </button>

                           <button onClick={() => handleActionStub('Log Out All', 'auth/sessions/close-all')} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors group text-left">
                              <div className="flex items-center gap-3">
                                <Laptop size={16} className="text-[#7448FF]" />
                                <div>
                                  <div className="text-[13px] font-semibold text-slate-900">Завершить все сессии</div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">Разлогинить все устройства</div>
                                </div>
                              </div>
                              <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-600 transition-colors" />
                           </button>
                        </div>
                     </div>
                   </div>
                </div>
             )}

             {activeTab === "security" && (
                <div className="max-w-4xl space-y-6">
                   <h2 className="text-[20px] font-bold text-slate-900 mb-2">Безопасность</h2>
                   <p className="text-[14px] text-slate-500 mb-8">Настройки безопасности и защита вашего аккаунта</p>
                   
                   <div className="p-8 bg-white border border-slate-100 rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-6">
                      <div className="pb-6 border-b border-slate-50">
                        <div className="flex items-center justify-between mb-2">
                           <div className="font-semibold text-[15px] text-slate-900">Пароль</div>
                           <button onClick={async () => {
                               setIsChangingPassword(true);
                               setPasswordMessage(null);
                               try {
                                   await api.post("auth/change-password", {});
                               } catch (e) {
                                   setPasswordMessage({ type: 'error', text: `API Endpoint Missing: POST /auth/change-password не поддержан.` });
                               } finally {
                                   setIsChangingPassword(false);
                               }
                           }} disabled={isChangingPassword} className="text-[13px] font-medium px-5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[#7448FF] font-semibold hover:bg-slate-100 transition-colors disabled:opacity-50">Изменить пароль</button>
                        </div>
                        <div className="text-[13px] text-slate-500 mb-4">Используйте надежный пароль для защиты вашего аккаунта.</div>
                        <div className="flex gap-16 text-[13px] text-slate-500 font-medium">
                          <span className="tracking-widest">••••••••••••••••</span>
                        </div>
                        {passwordMessage && (
                            <div className={cn("text-[13px] p-3 rounded-lg flex items-start gap-2 mt-4", passwordMessage.type === 'error' ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600")}>
                                <AlertCircle size={16} className="shrink-0 mt-0.5" /> {passwordMessage.text}
                            </div>
                        )}
                      </div>

                      <div className="pb-6 border-b border-slate-50">
                        <div className="flex items-center justify-between mb-2">
                           <div className="font-semibold text-[15px] text-slate-900">Двухфакторная аутентификация (2FA)</div>
                           <button onClick={() => handleActionStub('Enable 2FA', 'auth/2fa/enable')} className="text-[13px] font-medium px-5 py-2.5 bg-[#7448FF] text-white rounded-xl font-semibold hover:bg-[#623ce6] transition-colors shadow-sm">Включить 2FA</button>
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
                           <button onClick={() => handleActionStub('Show codes', 'auth/2fa/recovery-codes')} className="text-[13px] font-medium px-5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-100 transition-colors">Показать коды</button>
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
                      <div className="font-semibold text-[15px] text-slate-900 mb-1">Завершение сессий (безопасность)</div>
                      <div className="flex items-center justify-between mt-4">
                         <div className="text-[13px] text-slate-500 max-w-sm">Завершив все сессии, вы автоматически разлогините ваш аккаунт со всех устройств.</div>
                         <button onClick={() => handleActionStub('Log Out Sessions', 'auth/sessions/close-all')} className="text-[13px] font-medium px-5 py-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors">Выйти глобально</button>
                      </div>
                   </div>

                   <div className="p-8 bg-white border border-slate-100 rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
                      <div className="flex items-center justify-between">
                         <div>
                            <div className="font-semibold text-[15px] text-slate-900 mb-1">Удаление аккаунта</div>
                            <div className="text-[13px] text-slate-500 max-w-sm">Удалите свой аккаунт и все связанные данные без возможности восстановления. Осторожно.</div>
                         </div>
                         <button onClick={() => {
                             if(confirm("Вы уверены? Это необратимо.")) {
                                 handleActionStub('Delete Account', 'auth/me');
                             }
                         }} className="text-[13px] font-semibold px-5 py-2.5 bg-rose-500 text-white rounded-xl shadow-sm hover:bg-rose-600 transition-colors">Удалить аккаунт</button>
                      </div>
                   </div>

                </div>
             )}

             {activeTab === "notifications" && (
                <div className="max-w-4xl space-y-6">
                   <h2 className="text-[20px] font-bold text-slate-900 mb-2">Уведомления</h2>
                   <p className="text-[14px] text-slate-500 mb-8">Настройте, какие уведомления вы хотите получать</p>
                   
                   <div className="p-8 bg-white border border-slate-100 rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] space-y-6">
                      <div className="font-semibold text-[15px] text-slate-900 mb-1">Способы получения уведомлений</div>
                      <div className="text-[13px] text-slate-500 mb-6 flex justify-between items-center">
                         <span>Выберите, куда и как вы хотите получать уведомления</span>
                         <button onClick={() => handleActionStub('Save Notifications', 'user/notifications/settings')} className="text-[#7448FF] hover:underline font-bold text-[13px]">Сохранить настройки сети</button>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between py-2">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#7448FF] flex items-center justify-center shrink-0"><Mail size={18} /></div>
                              <div>
                                <div className="text-[14px] font-semibold text-slate-900">Email уведомления</div>
                                <div className="text-[12px] text-slate-500 mt-0.5">{me?.email || "загружается..."}</div>
                              </div>
                           </div>
                           <button onClick={() => setNotifEmail(!notifEmail)} className={cn("w-12 h-6 rounded-full p-1 flex items-center transition-colors cursor-pointer", notifEmail ? "bg-[#7448FF] justify-end" : "bg-slate-200 justify-start")}>
                              <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                           </button>
                        </div>

                        <div className="flex items-center justify-between py-2 border-t border-slate-50 pt-4">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#7448FF] flex items-center justify-center shrink-0"><Smartphone size={18} /></div>
                              <div>
                                <div className="text-[14px] font-semibold text-slate-900">Push уведомления</div>
                                <div className="text-[12px] text-slate-500 mt-0.5">Уведомления в браузере. Выключены?</div>
                              </div>
                           </div>
                           <button onClick={() => setNotifPush(!notifPush)} className={cn("w-12 h-6 rounded-full p-1 flex items-center transition-colors cursor-pointer", notifPush ? "bg-[#7448FF] justify-end" : "bg-slate-200 justify-start")}>
                              <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                           </button>
                        </div>
                      </div>
                   </div>

                </div>
             )}

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

             {["integrations", "language", "subscription", "active_sessions"].includes(activeTab) && (
                <div className="p-8 h-full min-h-[500px] flex flex-col items-center justify-center text-center">
                   <Blocks size={64} className="text-slate-200 mb-6" strokeWidth={1} />
                   <h2 className="text-xl font-bold text-slate-900 mb-2">Отсутствует backend API</h2>
                   <p className="text-[15px] text-slate-500 max-w-sm">
                     Настройки данного раздела ({TABS.find(t => t.id === activeTab)?.label}) требуют новых endpoint-ов на стороне сервера.
                     <br/><br/>
                     <button onClick={() => alert('Смотрите файл backend-requirements.md для деталей')} className="text-[#7448FF] hover:underline font-bold text-[14px]">Узнать подробности для бэкенда</button>
                   </p>
                </div>
             )}

          </div>

        </div>
      </div>
    </div>
  );
}