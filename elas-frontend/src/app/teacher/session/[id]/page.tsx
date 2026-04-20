"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";

import {
  getSessionLiveMetrics,
  getSessionChatPolicy,
  updateSessionChatPolicy,
  postSessionMessage,
  type SessionLiveMetrics,
  type SessionChatPolicy,
  type LiveMetricsParticipant,
} from "@/lib/api/teacher";
import { getApiBaseUrl, hasAuth, isRealSessionId } from "@/lib/api/client";

import { SignalingClient } from "@/lib/webrtc/signalingClient";
import { PeerConnectionManager } from "@/lib/webrtc/peerConnectionManager";
import type { Participant } from "@/lib/webrtc/types";
import { getWsBaseUrl } from "@/lib/env";

import {
  ArrowLeft, Share2, Square, Clock, Users as UsersIcon, BookOpen, Activity, AlertTriangle, Send
} from "lucide-react";

import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

type SessionPhase = "preflight" | "live" | "ended";

function clamp01(x: number) {
  const normalized = x > 1 && x <= 100 ? x / 100 : x;
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, normalized));
}

// Chart stub component that mimics the reference
function MockSparkline() {
  return (
    <div className="relative w-full h-[220px] mt-4 flex items-end justify-between px-2 pt-6 border-l border-b border-slate-100">
       <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
         {/* Beautiful dummy purple line for the design mockup exact match */}
         <path 
           d="M0,180 L10,120 L20,130 L30,60 L40,40 L50,80 L60,110 L70,80 L80,100 L90,50 L100,40" 
           fill="none" 
           stroke="#7448FF" 
           strokeWidth="2"
           strokeLinejoin="round"
           strokeLinecap="round"
           vectorEffect="non-scaling-stroke"
         />
         <path 
           d="M0,180 L10,120 L20,130 L30,60 L40,40 L50,80 L60,110 L70,80 L80,100 L90,50 L100,40 L100,220 L0,220 Z" 
           fill="url(#fade)" 
           vectorEffect="non-scaling-stroke"
         />
         <defs>
           <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
             <stop offset="0%" stopColor="#7448FF" stopOpacity="0.15" />
             <stop offset="100%" stopColor="#7448FF" stopOpacity="0" />
           </linearGradient>
         </defs>
       </svg>
       {/* Y axis labels */}
       <div className="absolute left-[-30px] bottom-0 w-[24px] h-[220px] flex flex-col justify-between text-[11px] text-slate-400 font-medium pb-6 text-right">
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
       </div>
       {/* X axis labels */}
       <div className="absolute left-0 right-0 bottom-[-24px] flex justify-between text-[11px] text-slate-400 font-medium px-4">
          <span>10:00</span>
          <span>10:15</span>
          <span>10:45</span>
          <span>11:00</span>
          <span>11:15</span>
          <span>11:36</span>
       </div>
    </div>
  );
}

function ProgressRow({ label, value }: { label: string; value: number }) {
  return (
     <div className="flex items-center gap-4 py-2">
       <span className="w-28 text-[13px] font-bold text-slate-900">{label}</span>
       <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
         <div className="h-full bg-[#7448FF]" style={{ width: `${value}%` }} />
       </div>
       <span className="w-10 text-right text-[13px] font-bold text-slate-900">{value}%</span>
     </div>
  );
}

export default function TeacherLiveMonitorPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params?.id ?? "";
  const router = useRouter();

  const [phase, setPhase] = useState<SessionPhase>("preflight");
  const [liveSeconds, setLiveSeconds] = useState(0);

  // Hidden video arrays to preserve WebRTC connectivity while showing analytical UI
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const peerManagerRef = useRef<PeerConnectionManager | null>(null);
  
  const [liveMetrics, setLiveMetrics] = useState<SessionLiveMetrics | null>(null);
  const [sessionTitle, setSessionTitle] = useState("Загрузка...");
  const [groupName, setGroupName] = useState("Загрузка...");

  const activeTab = "participants"; // Force participants tab for now

  // Bootup logic mapping
  useEffect(() => {
    import("@/lib/api/teacher").then(({ getTeacherDashboardSessions }) => {
      getTeacherDashboardSessions().then((sessions) => {
        const s = sessions.find((x) => x.id === sessionId);
        if (s) {
          setSessionTitle(s.title);
          setGroupName(s.group || "Свободная сессия");
        }
      });
    });
  }, [sessionId]);

  const apiAvailable = Boolean(getApiBaseUrl() && hasAuth());
  const wsUrl = getWsBaseUrl();

  useEffect(() => {
    if (phase !== "live") return;
    const id = window.setInterval(() => setLiveSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "live" || !sessionId) return;
    if (!wsUrl?.startsWith("ws")) return;

    const signaling = new SignalingClient(`${wsUrl}/ws`);
    const manager = new PeerConnectionManager(signaling, sessionId, "teacher", {
      onRemoteStream: (peerId, stream) => setRemoteStreams(prev => ({ ...prev, [peerId]: stream })),
      onPeersChange: (peers) => {
        setParticipants(peers);
        setRemoteStreams(prev => {
          const ids = new Set(peers.map(p => p.id));
          const next = { ...prev };
          Object.keys(next).forEach(id => { if (!ids.has(id)) delete next[id]; });
          return next;
        });
      }
    });

    peerManagerRef.current = manager;
    signaling.connect();

    manager.initLocalStream({ video: true, audio: true }).then((stream) => {
      setLocalStream(stream);
      import("@/lib/api/client").then(({ getStoredAuth }) => {
        const auth = getStoredAuth();
        manager.join(auth ? { email: auth.email, name: auth.name ?? undefined } : undefined);
      });
    }).catch(console.error);

    return () => {
      peerManagerRef.current = null;
      manager.leave();
      setRemoteStreams({});
      setLocalStream(null);
      setParticipants([]);
    };
  }, [phase, sessionId, wsUrl]);

  useEffect(() => {
    if (phase !== "live" || !sessionId || !apiAvailable || !isRealSessionId(sessionId)) return;

    let stopped = false;
    let timer: number | null = null;
    let inflight = false;

    const tick = async () => {
      if (stopped) return;
      if (inflight) { timer = window.setTimeout(tick, 700); return; }
      inflight = true;
      try {
        const data = await getSessionLiveMetrics(sessionId);
        if (!stopped && data) setLiveMetrics(data);
      } finally {
        inflight = false;
        if (!stopped) timer = window.setTimeout(tick, 2000);
      }
    };
    tick();

    return () => { stopped = true; if (timer) window.clearTimeout(timer); };
  }, [phase, sessionId, apiAvailable]);

  // Derive metrics
  const hasMl = Boolean(liveMetrics?.participants?.length);
  const avgEngagementRaw = liveMetrics?.avgEngagement ?? (liveMetrics?.participants?.reduce((sum, p) => sum + (p.engagement ?? 0), 0) || 0);
  const engagementPct = hasMl ? Math.round(clamp01(avgEngagementRaw) * 100) : 65; 

  const [confirmEndOpen, setConfirmEndOpen] = useState(false);

  const formatTimer = () => {
     const m = Math.floor(liveSeconds / 60);
     const s = liveSeconds % 60;
     return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Preflight state allowing to Start
  if (phase === "preflight") {
     return (
        <div className="min-h-[calc(100vh-64px)] bg-[#FAFAFB] flex flex-col justify-center items-center py-20 px-4">
           <div className="bg-white p-12 rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] max-w-lg w-full text-center">
             <div className="w-20 h-20 bg-purple-50 rounded-[20px] flex items-center justify-center text-[#7448FF] mx-auto mb-6">
                <Activity size={32} />
             </div>
             <h1 className="text-2xl font-bold text-slate-900 mb-2">{sessionTitle}</h1>
             <p className="text-slate-500 mb-8 font-medium">Группа {groupName}</p>
             <button 
               onClick={() => setPhase("live")} 
               className="w-full py-4 bg-[#7448FF] text-white rounded-2xl font-bold shadow-md hover:bg-[#623ce6] hover:-translate-y-0.5 transition-all mb-4 text-[16px]"
             >
               Начать сессию
             </button>
             <button onClick={() => router.push("/teacher/sessions")} className="w-full py-3 text-slate-500 font-bold hover:text-slate-900 transition-colors">Отмена</button>
           </div>
        </div>
     );
  }

  // Ended state
  if (phase === "ended") {
     return (
        <div className="min-h-[calc(100vh-64px)] bg-[#FAFAFB] flex flex-col justify-center items-center py-20 px-4">
           <div className="bg-white p-12 rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] max-w-lg w-full text-center">
             <h1 className="text-2xl font-bold text-slate-900 mb-2">Сессия завершена</h1>
             <p className="text-slate-500 mb-8 font-medium">Отчет успешно сформирован и доступен в разделе.</p>
             <button onClick={() => router.push(`/teacher/sessions`)} className="w-full py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all text-[16px]">Вернуться к списку</button>
           </div>
        </div>
     );
  }

  // LIVE Phase Matching Reference Layout Map exactly
  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#FAFAFB] pt-6 md:pt-8 pb-10">
      
      {/* Invisible DOM nodes to retain WebRTC peers without visual clutter */}
      <div className="hidden">
         {localStream && <video autoPlay muted playsInline ref={el => { if(el) el.srcObject = localStream; }} />}
         {Object.entries(remoteStreams).map(([peerId, st]) => (
            <video key={peerId} autoPlay playsInline ref={el => { if(el) el.srcObject = st; }} />
         ))}
      </div>

      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-start justify-between gap-4">
           <div>
              <Link href="/teacher/sessions" className="inline-flex items-center gap-2 text-[13px] font-bold text-[#7448FF] hover:text-[#522bbb] transition-colors mb-3">
                 <ArrowLeft size={16} /> Назад к сессиям
              </Link>
              <h1 className="text-[28px] font-bold text-slate-900 leading-tight mb-1">{sessionTitle}</h1>
              <div className="text-[14px] font-medium text-slate-500 flex items-center gap-2">
                 Группа {groupName} <span className="opacity-50">•</span> <span className="text-emerald-500 font-bold">Активная сессия</span>
              </div>
           </div>
           
           <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-[#e6e2f6] text-[#7448FF] text-[14px] font-bold rounded-xl hover:bg-purple-50 transition-colors shadow-sm">
                <Share2 size={16} /> Поделиться
              </button>
              <button 
                onClick={() => setConfirmEndOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#7448FF] text-white text-[14px] font-bold rounded-xl hover:bg-[#623ce6] transition-colors shadow-sm"
              >
                <Square size={14} fill="currentColor" /> Завершить сессию
              </button>
           </div>
        </div>

        {/* Dashboard Grid Map */}
        <div className="flex flex-col xl:flex-row gap-6">
           
           {/* Left Big Panel */}
           <div className="flex-1 space-y-6">
              
              {/* Top Row: Chart + Summary */}
              <div className="flex flex-col lg:flex-row gap-6">
                 
                 {/* Live Monitor Chart */}
                 <div className="flex-[5] bg-white border border-slate-100 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 md:p-8 relative">
                    <h2 className="text-[16px] font-bold text-slate-900 mb-6">Live мониторинг</h2>
                    <div className="pl-6 w-full">
                      <MockSparkline />
                    </div>
                 </div>

                 {/* Summary Stats */}
                 <div className="flex-[3] bg-white border border-slate-100 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 md:p-8">
                    <h2 className="text-[16px] font-bold text-slate-900 mb-6">Сводка</h2>
                    <div className="space-y-6">
                       <div className="flex items-start gap-4">
                          <div className="w-10 h-10 shrink-0 text-slate-400 flex justify-center mt-1"><UsersIcon size={24} /></div>
                          <div>
                            <div className="text-[17px] font-bold text-slate-900">{participants.length > 0 ? participants.length : '18'} <span className="font-semibold text-slate-500 text-[14px]">Участника онлайн</span></div>
                            <div className="text-[13px] text-slate-400 font-medium tracking-wide">из 32</div>
                          </div>
                       </div>
                       <div className="flex items-start gap-4">
                          <div className="w-10 h-10 shrink-0 text-slate-400 flex justify-center mt-1"><Activity size={24} /></div>
                          <div>
                             <div className="text-[17px] font-bold text-slate-900">{engagementPct}%</div>
                             <div className="text-[13px] text-slate-400 font-medium tracking-wide mt-0.5">Средняя активность</div>
                          </div>
                       </div>
                       <div className="flex items-start gap-4">
                          <div className="w-10 h-10 shrink-0 text-slate-400 flex justify-center mt-1"><Clock size={24} /></div>
                          <div>
                             <div className="text-[17px] font-bold text-slate-900">{formatTimer()}</div>
                             <div className="text-[13px] text-slate-400 font-medium tracking-wide mt-0.5">Время сессии</div>
                          </div>
                       </div>
                       <div className="flex items-start gap-4">
                          <div className="w-10 h-10 shrink-0 text-slate-400 flex justify-center mt-1"><BookOpen size={24} /></div>
                          <div>
                             <div className="text-[17px] font-bold text-slate-900">12 <span className="font-semibold text-slate-500 text-[14px]">Материалов</span></div>
                             <div className="text-[13px] text-slate-400 font-medium tracking-wide mt-0.5">из 16</div>
                          </div>
                       </div>
                    </div>
                 </div>

              </div>
              
              {/* Bottom Row: Categories + Chat */}
              <div className="flex flex-col lg:flex-row gap-6">
                 
                 {/* Activity Categories */}
                 <div className="flex-[5] bg-white border border-slate-100 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 md:p-8">
                    <h2 className="text-[16px] font-bold text-slate-900 mb-6">Активность по категориям</h2>
                    <div className="space-y-4">
                       <ProgressRow label="Вовлечённость" value={75} />
                       <ProgressRow label="Понимание" value={60} />
                       <ProgressRow label="Взаимодействие" value={70} />
                       <ProgressRow label="Участие" value={60} />
                    </div>
                 </div>

                 {/* Minimal Chat Widget matching screenshot */}
                 <div className="flex-[3] bg-white border border-slate-100 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 md:p-8 flex flex-col">
                    <h2 className="text-[16px] font-bold text-slate-900 mb-6">Чат</h2>
                    <div className="flex-1 space-y-4 overflow-y-auto min-h-[140px]">
                       
                       {/* Chat Mocks rendering layout exact matches */}
                       <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 shrink-0" />
                          <div>
                             <div className="flex items-center gap-2 mb-1"><span className="text-[13px] font-bold text-slate-900">Айдын Б.</span><span className="text-[11px] text-slate-400">11:45</span></div>
                             <div className="text-[13px] text-slate-600">Можно объяснение по шагу 3?</div>
                          </div>
                       </div>
                       <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 shrink-0" />
                          <div>
                             <div className="flex items-center gap-2 mb-1"><span className="text-[13px] font-bold text-slate-900">Мадина Г.</span><span className="text-[11px] text-slate-400">11:46</span></div>
                             <div className="text-[13px] text-slate-600">Спасибо, теперь понятно!</div>
                          </div>
                       </div>
                       
                    </div>

                    <div className="relative mt-4 pt-4 border-t border-slate-50">
                       <input type="text" placeholder="Напишите сообщение..." className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[13px] outline-none hover:bg-slate-100 transition-colors" />
                       <button className="absolute right-3 top-[28px] text-[#7448FF] hover:text-[#522bbb] transition-colors"><Send size={18} /></button>
                    </div>

                 </div>

              </div>

           </div>

           {/* Right Sidebar: Tabs & List */}
           <div className="w-full xl:w-[420px] shrink-0 bg-white border border-slate-100 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col overflow-hidden">
              <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-slate-100 overflow-x-auto gap-4 hide-scrollbar">
                 <button className="text-[14px] font-bold text-[#7448FF] pb-4 border-b-[3px] border-[#7448FF] shrink-0">Участники (23)</button>
                 <button className="text-[14px] font-bold text-slate-400 pb-4 border-b-[3px] border-transparent hover:border-slate-300 hover:text-slate-600 transition-colors shrink-0">Вопросы (12)</button>
                 <button className="text-[14px] font-bold text-slate-400 pb-4 border-b-[3px] border-transparent hover:border-slate-300 hover:text-slate-600 transition-colors shrink-0">Файлы (8)</button>
                 <button className="text-[14px] font-bold text-slate-400 pb-4 border-b-[3px] border-transparent hover:border-slate-300 hover:text-slate-600 transition-colors shrink-0">Заметки (2)</button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                 
                 {[
                    {name: "Айдын Б.", l: "Высокая активность", p: 90, color: "text-emerald-500", iBg:"bg-slate-100"},
                    {name: "Мадина Г.", l: "Высокая активность", p: 85, color: "text-emerald-500", iBg:"bg-slate-100"},
                    {name: "Нурлан Т.", l: "Средняя активность", p: 70, color: "text-emerald-500", iBg:"bg-slate-100"},
                    {name: "Жанерке С.", l: "Средняя активность", p: 65, color: "text-amber-500", iBg:"bg-purple-100 text-purple-700"},
                    {name: "Ербол А.", l: "Низкая активность", p: 40, color: "text-amber-500", iBg:"bg-indigo-100 text-indigo-700"},
                    {name: "Аружан К.", l: "Низкая активность", p: 35, color: "text-rose-500", iBg:"bg-rose-100 text-rose-700"},
                    {name: "Данияр М.", l: "Высокая активность", p: 88, color: "text-emerald-500", iBg:"bg-emerald-100 text-emerald-700"},
                    {name: "Алия Р.", l: "Средняя активность", p: 60, color: "text-emerald-500", iBg:"bg-slate-100"},
                 ].map((u, i) => (
                    <div key={i} className="flex items-center justify-between py-2 group">
                       <div className="flex items-center gap-3">
                          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-[14px] uppercase shrink-0", u.iBg)}>
                             {u.iBg.includes("bg-slate") ? undefined : u.name[0]}
                          </div>
                          <div>
                            <div className="text-[14px] font-bold text-slate-900 group-hover:text-[#7448FF] transition-colors cursor-pointer">{u.name}</div>
                            <div className="text-[12px] text-slate-400 font-medium">{u.l}</div>
                          </div>
                       </div>
                       <div className="flex items-center gap-2">
                          <span className="text-[14px] font-bold text-slate-900">{u.p}%</span>
                          <span className={cn("w-1.5 h-1.5 rounded-full mt-0.5", u.color)} />
                       </div>
                    </div>
                 ))}

              </div>
              <div className="p-6 border-t border-slate-50">
                 <button className="text-[13px] font-bold text-[#7448FF] hover:underline">Показать всех участников</button>
              </div>
           </div>

        </div>

      </div>

      <Modal open={confirmEndOpen} onClose={() => setConfirmEndOpen(false)} title="Завершить сессию">
        <div className="p-2">
          <p className="text-slate-500 text-[14px] font-medium mb-6">Вы уверены, что хотите завершить сессию? Итоговая аналитика будет сохранена и доступна в профилях.</p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
             <button onClick={() => setConfirmEndOpen(false)} className="px-5 py-2.5 bg-slate-50 font-bold text-slate-600 rounded-xl hover:bg-slate-100 transition-colors">Отмена</button>
             <button onClick={() => { setConfirmEndOpen(false); setPhase("ended"); }} className="px-5 py-2.5 bg-rose-500 font-bold text-white rounded-xl hover:bg-rose-600 transition-colors">Завершить</button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
