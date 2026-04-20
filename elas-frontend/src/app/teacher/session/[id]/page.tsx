"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import {
  getSessionLiveMetrics,
  type SessionLiveMetrics,
} from "@/lib/api/teacher";
import { getApiBaseUrl, hasAuth, isRealSessionId } from "@/lib/api/client";

import { SignalingClient } from "@/lib/webrtc/signalingClient";
import { PeerConnectionManager } from "@/lib/webrtc/peerConnectionManager";
import type { Participant } from "@/lib/webrtc/types";
import { getWsBaseUrl } from "@/lib/env";
import { SessionChatPanel } from "@/components/chat/SessionChatPanel";

import {
  ArrowLeft,
  PhoneOff,
  Mic,
  Video,
  MicOff,
  VideoOff,
  MonitorUp,
  MessageSquare,
  MoreHorizontal,
  Maximize2,
  Users,
  Layout,
  FileText,
  Pin,
  Clock,
  BookOpen,
  Send,
  MoreVertical,
  Download,
  Trash2,
  Smile,
  Zap,
  TrendingUp,
  BrainCircuit,
  Pencil
} from "lucide-react";

import Modal from "@/components/ui/Modal";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

type SessionPhase = "preflight" | "live" | "ended";

// Chart Colors
const COLORS = {
  purple: "#7448FF",
  emerald: "#10B981",
  rose: "#F43F5E",
  blue: "#3B82F6",
  orange: "#F59E0B",
  slate: "#64748B",
};

const EMOTION_PIE_COLORS = [COLORS.emerald, COLORS.blue, COLORS.rose];

export default function TeacherLiveMonitorPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params?.id ?? "";
  const router = useRouter();

  const [phase, setPhase] = useState<SessionPhase>("preflight");
  const [liveSeconds, setLiveSeconds] = useState(0);

  // WebRTC State
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  const [selectedPeerId, setSelectedPeerId] = useState<string | null>(null);

  const peerManagerRef = useRef<PeerConnectionManager | null>(null);
  const localMainRef = useRef<HTMLVideoElement | null>(null);
  
  const [liveMetrics, setLiveMetrics] = useState<SessionLiveMetrics | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<{ time: string; engagement: number; stress: number; attention: number }[]>([]);
  
  const [sessionTitle, setSessionTitle] = useState("Загрузка...");
  const [groupName, setGroupName] = useState("Загрузка...");
  const [sessionType, setSessionType] = useState<"lecture" | "exam">("lecture");

  const [activeTab, setActiveTab] = useState<"board" | "materials" | "notes">("board");

  // Bootup
  useEffect(() => {
    import("@/lib/api/teacher").then(({ getTeacherDashboardSessions }) => {
      getTeacherDashboardSessions().then((sessions) => {
        const s = sessions.find((x) => x.id === sessionId);
        if (s) {
          setSessionTitle(s.title);
          setGroupName(s.group || "Свободная сессия");
          setSessionType(s.type);
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

  // WebRTC Connection Logic (Preserved)
  useEffect(() => {
    if (phase !== "live" || !sessionId) return;
    if (!wsUrl?.startsWith("ws")) return;

    const signaling = new SignalingClient(`${wsUrl}/ws`);
    const manager = new PeerConnectionManager(signaling, sessionId, "teacher", {
      onRemoteStream: (peerId, stream) => {
          setRemoteStreams(prev => ({ ...prev, [peerId]: stream }));
      },
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
        manager.join(auth ? { 
          email: auth.email, 
          fullName: auth.fullName || undefined,
          firstName: auth.firstName || undefined,
          lastName: auth.lastName || undefined
        } : undefined);
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

  // Live Metrics Polling (Preserved & Enhanced with History)
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
        if (!stopped && data) {
          setLiveMetrics(data);
          
          // Add to sparkline history
          const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setMetricsHistory(prev => {
             const avgEngagement = data.avgEngagement ?? (data.participants.length > 0 ? data.participants.reduce((a,b) => a + (b.engagement ?? 0), 0) / data.participants.length : 0);
             const avgStress = data.avgStress ?? (data.participants.length > 0 ? data.participants.reduce((a,b) => a + (b.stress ?? 0), 0) / data.participants.length : 0);
             const avgAttention = data.avgConfidence ?? 0;
             
             const next = [...prev, { 
                time: now, 
                engagement: Math.round(avgEngagement * 100), 
                stress: Math.round(avgStress * 100), 
                attention: Math.round(avgAttention * 100) 
             }];
             return next.slice(-20); // keep last 20 points
          });
        }
      } finally {
        inflight = false;
        if (!stopped) timer = window.setTimeout(tick, 2000);
      }
    };
    tick();

    return () => { stopped = true; if (timer) window.clearTimeout(timer); };
  }, [phase, sessionId, apiAvailable]);

  // Video sync
  useEffect(() => {
      if (!localMainRef.current) return;
      const targetStream = selectedPeerId && remoteStreams[selectedPeerId] 
                           ? remoteStreams[selectedPeerId] 
                           : localStream;
      localMainRef.current.srcObject = targetStream;
      localMainRef.current.play().catch(() => {});
  }, [selectedPeerId, remoteStreams, localStream]);

  const [confirmEndOpen, setConfirmEndOpen] = useState(false);

  const formatTimer = () => {
     const m = Math.floor(liveSeconds / 60);
     const s = liveSeconds % 60;
     return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleMic = () => {
      setIsMicOn(!isMicOn);
      peerManagerRef.current?.setAudioEnabled(!isMicOn);
  };
  const toggleCam = () => {
      setIsCamOn(!isCamOn);
      peerManagerRef.current?.setVideoEnabled(!isCamOn);
  };
  const toggleScreen = async () => {
      // Screen share logic (placeholder for refactor)
      setIsScreenSharing(!isScreenSharing);
  };

  const emotionStats = useMemo(() => {
    if (!liveMetrics?.participants.length) return [];
    const counts = { positive: 0, neutral: 0, negative: 0 };
    liveMetrics.participants.forEach(p => {
       const e = p.dominant_emotion?.toLowerCase() || p.emotion?.toLowerCase() || "";
       if (["happy", "surprised", "positive"].includes(e)) counts.positive++;
       else if (["sad", "angry", "fear", "negative"].includes(e)) counts.negative++;
       else counts.neutral++;
    });
    return [
      { name: "Позитивные", value: counts.positive },
      { name: "Нейтральные", value: counts.neutral },
      { name: "Негативные", value: counts.negative },
    ].filter(v => v.value > 0);
  }, [liveMetrics]);

  if (phase === "preflight") {
    return (
       <div className="min-h-[calc(100vh-64px)] bg-[#FAFAFB] flex flex-col justify-center items-center p-4">
          <Card className="w-full max-w-lg border-none shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-hidden rounded-[32px]">
             <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-purple-50 rounded-[24px] flex items-center justify-center text-[#7448FF] mx-auto mb-8 animate-bounce">
                   <Video size={36} />
                </div>
                <h1 className="text-2xl font-extrabold text-slate-900 mb-2">{sessionTitle}</h1>
                <p className="text-slate-500 mb-10 font-medium">Мониторинг эфира: Группа {groupName}</p>
                <div className="space-y-4">
                  <Button onClick={() => setPhase("live")} className="w-full h-14 font-bold text-[16px] shadow-[0_10px_25px_rgba(116,72,255,0.2)]">
                    Начать сессию
                  </Button>
                  <Button onClick={() => router.push("/teacher/sessions")} variant="outline" className="w-full h-14 font-bold text-slate-500">
                    Отмена
                  </Button>
                </div>
             </CardContent>
          </Card>
       </div>
    );
  }

  if (phase === "ended") {
    return (
       <div className="min-h-[calc(100vh-64px)] bg-[#FAFAFB] flex flex-col justify-center items-center p-4">
          <Card className="w-full max-w-lg border-none shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-hidden rounded-[32px]">
             <CardContent className="p-12 text-center">
                <div className="w-20 h-20 bg-emerald-50 rounded-[24px] flex items-center justify-center text-emerald-500 mx-auto mb-8">
                   <Zap size={36} />
                </div>
                <h1 className="text-2xl font-extrabold text-slate-900 mb-2">Сессия успешно завершена</h1>
                <p className="text-slate-500 mb-10 font-medium tracking-tight">Все данные сохранены. Вы можете просмотреть аналитику в разделе отчетов.</p>
                <Button onClick={() => router.push("/teacher/sessions")} className="w-full h-14 font-bold">
                  Вернуться к списку
                </Button>
             </CardContent>
          </Card>
       </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFB] text-slate-900 font-sans selection:bg-purple-100 selection:text-[#7448FF]">
      <div className="mx-auto max-w-[1700px] px-6 py-6 h-screen flex flex-col min-h-0">
        
        {/* HEADER */}
        <header className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-6">
            <Link href="/teacher/sessions" className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all hover:shadow-md">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900">{sessionTitle}</h1>
                <Badge className="bg-purple-50 text-[#7448FF] border-none font-bold px-2.5 py-0.5">Онлайн</Badge>
              </div>
              <div className="flex items-center gap-4 text-[13px] font-bold text-slate-400">
                <span>Студент: <span className="text-slate-600 underline decoration-slate-200 underline-offset-4 cursor-pointer">{selectedPeerId ? (participants.find(p => p.id === selectedPeerId)?.fullName || selectedPeerId) : "Ожидание..."}</span></span>
                <span className="flex items-center gap-1.5 text-emerald-500 font-bold">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> {formatTimer()}
                </span>
              </div>
            </div>
          </div>
          <Button 
            onClick={() => setConfirmEndOpen(true)}
            variant="outline" 
            className="border-rose-100 text-rose-500 hover:bg-rose-50 font-bold h-11 px-6 rounded-xl transition-all"
          >
            Завершить сессию
          </Button>
        </header>

        {/* MAIN GRID */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 min-h-0 overflow-hidden pb-4">
          
          {/* CONTENT AREA */}
          <div className="flex flex-col gap-6 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
            
            {/* HERO VIDEO MONITOR */}
            <div className="relative aspect-video rounded-[32px] overflow-hidden bg-slate-900 shadow-[0_12px_45px_rgba(0,0,0,0.08)] group">
               <video 
                 ref={localMainRef} 
                 playsInline 
                 muted={!selectedPeerId} 
                 autoPlay 
                 className="w-full h-full object-cover" 
               />
               
               {/* Controls Overlay */}
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
               
               <div className="absolute top-6 left-6 z-10 flex items-center gap-3">
                  <div className="bg-white/10 backdrop-blur-xl border border-white/20 text-white px-3 py-1.5 rounded-xl flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Запись
                  </div>
               </div>

               <div className="absolute top-6 right-6 z-10">
                  <button className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xl border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-all">
                    <Maximize2 size={18} />
                  </button>
               </div>

               {/* PIP Local Preview */}
               <div className="absolute bottom-24 right-6 w-52 aspect-[14/9] bg-slate-800 rounded-2xl overflow-hidden border-4 border-white/10 shadow-2xl z-20">
                  <video 
                    autoPlay 
                    playsInline 
                    muted 
                    ref={el => { if(el && localStream) el.srcObject = localStream; }} 
                    className="w-full h-full object-cover" 
                  />
                  <div className="absolute bottom-2 left-2 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] text-white font-bold">Вы (Монитор)</div>
               </div>

               {/* CONTROL BAR */}
               <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/95 backdrop-blur-2xl px-5 py-4 rounded-[28px] shadow-2xl border border-white/50 pointer-events-auto z-30 transition-transform group-hover:scale-105 duration-500">
                  <button onClick={toggleMic} className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all", isMicOn ? 'bg-purple-50 text-[#7448FF] hover:bg-purple-100' : 'bg-rose-500 text-white hover:bg-rose-600')}>
                      {isMicOn ? <Mic size={22} /> : <MicOff size={22} />}
                  </button>
                  <button onClick={toggleCam} className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all", isCamOn ? 'bg-purple-50 text-[#7448FF] hover:bg-purple-100' : 'bg-rose-500 text-white hover:bg-rose-600')}>
                      {isCamOn ? <Video size={22} /> : <VideoOff size={22} />}
                  </button>
                  <button onClick={toggleScreen} className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all", isScreenSharing ? 'bg-[#7448FF] text-white' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900')}>
                      <MonitorUp size={22} />
                  </button>
                  <div className="w-px h-8 bg-slate-100 mx-1" />
                  <button className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-center transition-all">
                      <MessageSquare size={22} />
                  </button>
                  <button className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-900 flex items-center justify-center transition-all">
                      <MoreHorizontal size={22} />
                  </button>
                  <button onClick={() => setConfirmEndOpen(true)} className="w-12 h-12 rounded-2xl bg-rose-500 text-white hover:bg-rose-600 flex items-center justify-center transition-all shadow-lg shadow-rose-500/20">
                      <PhoneOff size={22} fill="currentColor" />
                  </button>
               </div>
            </div>

            {/* TABBED WORKSPACE */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm flex flex-col flex-1 min-h-[500px]">
               <div className="flex border-b border-slate-50 px-8">
                  {["Доска", "Материалы", "Заметки"].map((t) => {
                    const id = t === "Доска" ? "board" : t === "Материалы" ? "materials" : "notes";
                    const active = activeTab === id;
                    return (
                      <button 
                         key={id}
                         onClick={() => setActiveTab(id as any)}
                         className={cn(
                           "h-16 px-6 font-bold text-sm transition-all relative",
                           active ? "text-[#7448FF]" : "text-slate-400 hover:text-slate-600"
                         )}
                      >
                         {t}
                         {active && <div className="absolute bottom-0 left-0 w-full h-1 bg-[#7448FF] rounded-t-full shrink-0" />}
                      </button>
                    );
                  })}
                  <div className="ml-auto flex items-center gap-2">
                     <button className="w-9 h-9 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 flex items-center justify-center transition-all"><Pin size={16} /></button>
                  </div>
               </div>

               <div className="flex-1 p-8">
                  {activeTab === "board" && (
                    <div className="h-full flex flex-col">
                       <div className="flex items-center justify-between mb-6">
                          <div className="flex gap-2 p-1 bg-slate-50 rounded-xl border border-slate-100">
                             <button className="p-2 bg-white rounded-lg shadow-sm text-[#7448FF]"><Layout size={18} /></button>
                             <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><Pencil size={18} /></button>
                             <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><FileText size={18} /></button>
                          </div>
                          <div className="flex gap-3">
                             <Button variant="outline" size="sm" className="h-9 px-4 font-bold border-slate-100">Очистить</Button>
                          </div>
                       </div>
                       <div className="flex-1 border-2 border-slate-50 border-dashed rounded-[24px] flex items-center justify-center bg-slate-50/30">
                          <div className="text-center">
                             <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-4 text-slate-200">
                                <Layout size={32} strokeWidth={1} />
                             </div>
                             <p className="font-bold text-slate-900 mb-1">Интерактивная доска</p>
                             <p className="text-[13px] text-slate-400 font-medium">Coming soon: совместное рисование и тезисы</p>
                          </div>
                       </div>
                    </div>
                  )}
                  {activeTab === "materials" && (
                    <div className="space-y-4">
                       {[
                         { name: "Конспект_матрицы.pdf", size: "1.2 MB" },
                         { name: "Домашнее_задание.pdf", size: "856 KB" }
                       ].map((f, i) => (
                         <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-[#7448FF]/20 hover:bg-white hover:shadow-md transition-all">
                            <div className="flex items-center gap-4">
                               <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
                                  <FileText size={20} />
                               </div>
                               <div>
                                  <div className="font-bold text-slate-900 text-sm">{f.name}</div>
                                  <div className="text-xs text-slate-400 font-medium">{f.size}</div>
                               </div>
                            </div>
                            <div className="flex gap-2">
                               <button className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"><Download size={18} /></button>
                               <button className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
                            </div>
                         </div>
                       ))}
                       <Button variant="outline" className="w-full h-12 border-dashed border-slate-200 text-slate-400 font-bold hover:border-[#7448FF] hover:text-[#7448FF] transition-all">
                          + Загрузить материал
                       </Button>
                    </div>
                  )}
                  {activeTab === "notes" && (
                     <div className="h-full flex flex-col">
                        <textarea 
                           className="w-full flex-1 p-6 rounded-[24px] bg-slate-50/50 border border-slate-100 text-sm font-medium text-slate-600 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#7448FF]/10 transition-all resize-none"
                           placeholder="Ваши персональные заметки по сессии..."
                        />
                        <div className="mt-4 flex justify-between items-center px-2">
                           <span className="text-xs text-slate-400 font-bold font-mono">AUTOSAVING...</span>
                           <Button size="sm" className="font-bold">Сохранить</Button>
                        </div>
                     </div>
                  )}
               </div>
            </div>

            {/* BOTTOM SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 shrink-0">
               <Card className="rounded-[32px] border-none shadow-sm overflow-hidden">
                  <header className="px-8 pt-8 pb-4 flex items-center justify-between">
                     <h3 className="font-extrabold text-slate-900 text-[15px] uppercase tracking-wider">Динамика за сессию</h3>
                     <TrendingUp size={18} className="text-emerald-500" />
                  </header>
                  <CardContent className="px-6 pb-6 pt-0">
                    <div className="h-64 mt-2">
                       <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={metricsHistory}>
                            <defs>
                              <linearGradient id="colorEngage" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.1}/>
                                <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <Area 
                              type="monotone" 
                              dataKey="engagement" 
                              stroke={COLORS.purple} 
                              fillOpacity={1} 
                              fill="url(#colorEngage)" 
                              strokeWidth={3}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="attention" 
                              stroke={COLORS.blue} 
                              fill="transparent" 
                              strokeWidth={2}
                              strokeDasharray="4 4"
                            />
                         </AreaChart>
                       </ResponsiveContainer>
                    </div>
                    <div className="flex items-center gap-6 mt-4 pl-4">
                       <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#7448FF]" /><span className="text-[11px] font-bold text-slate-400">Вовлечённость</span></div>
                       <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /><span className="text-[11px] font-bold text-slate-400">Внимание</span></div>
                    </div>
                  </CardContent>
               </Card>

               <Card className="rounded-[32px] border-none shadow-sm overflow-hidden">
                  <header className="px-8 pt-8 pb-4 flex items-center justify-between">
                     <h3 className="font-extrabold text-slate-900 text-[15px] uppercase tracking-wider">Эмоции</h3>
                     <Smile size={18} className="text-purple-400" />
                  </header>
                  <CardContent className="px-6 pb-6 pt-0 flex flex-col items-center">
                    <div className="h-64 w-full mt-2">
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie
                             data={emotionStats}
                             cx="50%"
                             cy="50%"
                             innerRadius={60}
                             outerRadius={85}
                             paddingAngle={8}
                             dataKey="value"
                           >
                             {emotionStats.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={EMOTION_PIE_COLORS[index % EMOTION_PIE_COLORS.length]} />
                             ))}
                           </Pie>
                         </PieChart>
                       </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap justify-center gap-4 mt-2">
                       {emotionStats.map((e, index) => (
                         <div key={e.name} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: EMOTION_PIE_COLORS[index % EMOTION_PIE_COLORS.length] }} />
                            <span className="text-[11px] font-bold text-slate-400">{e.name} ({Math.round(e.value / (liveMetrics?.participants.length || 1) * 100)}%)</span>
                         </div>
                       ))}
                    </div>
                  </CardContent>
               </Card>
            </div>
          </div>

          {/* SIDEBAR */}
          <aside className="flex flex-col gap-6 min-h-0 overflow-hidden pb-4">
             {/* REAL-TIME ANALYSIS */}
             <Card className="rounded-[32px] border-none shadow-sm flex flex-col min-h-0 bg-white">
                <header className="p-6 pb-2 flex items-center justify-between">
                   <h3 className="font-extrabold text-slate-900 text-[14px] uppercase tracking-widest flex items-center gap-2">
                      Анализ в реальном времени
                      <div className="px-2 py-0.5 bg-rose-50 text-rose-500 text-[9px] rounded-md font-black animate-pulse">LIVE</div>
                   </h3>
                   <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"><BrainCircuit size={16} /></div>
                </header>
                <CardContent className="p-6 pt-2 space-y-8 flex-1 overflow-y-auto custom-scrollbar">
                   
                   {/* Mood Summary */}
                   <div className="flex items-center gap-5 p-5 bg-emerald-50/50 rounded-3xl border border-emerald-100">
                      <div className="w-14 h-14 bg-emerald-400 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                         <Smile size={32} />
                      </div>
                      <div>
                         <div className="text-[12px] font-bold text-emerald-600 mb-0.5">Состояние: Спокойно</div>
                         <div className="h-1.5 w-32 bg-emerald-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 w-3/4 rounded-full" />
                         </div>
                      </div>
                   </div>

                   {/* Stats Group */}
                   <div className="space-y-8">
                      <div className="space-y-3">
                         <div className="flex items-center justify-between px-1">
                            <span className="text-[13px] font-bold text-slate-900 flex items-center gap-2"><TrendingUp size={16} className="text-purple-500" /> Вовлечённость</span>
                            <span className="text-[14px] font-black text-[#7448FF]">{metricsHistory.length > 0 ? metricsHistory[metricsHistory.length-1].engagement : 0}%</span>
                         </div>
                         <div className="h-14 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                               <AreaChart data={metricsHistory}>
                                  <Area type="monotone" dataKey="engagement" stroke={COLORS.purple} strokeWidth={2} fill="transparent" />
                               </AreaChart>
                            </ResponsiveContainer>
                         </div>
                      </div>

                      <div className="space-y-3">
                         <div className="flex items-center justify-between px-1">
                            <span className="text-[13px] font-bold text-slate-900 flex items-center gap-2"><Clock size={16} className="text-blue-500" /> Внимание</span>
                            <span className="text-[14px] font-black text-blue-500">{metricsHistory.length > 0 ? metricsHistory[metricsHistory.length-1].attention : 0}%</span>
                         </div>
                         <div className="h-14 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                               <AreaChart data={metricsHistory}>
                                  <Area type="monotone" dataKey="attention" stroke={COLORS.blue} strokeWidth={2} fill="transparent" />
                               </AreaChart>
                            </ResponsiveContainer>
                         </div>
                      </div>

                      <div className="space-y-6">
                         <div className="space-y-1.5 px-1">
                            <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest">
                               <span>Стресс</span>
                               <span className="text-rose-500">{metricsHistory.length > 0 ? metricsHistory[metricsHistory.length-1].stress : 0}%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                               <div 
                                 className="h-full bg-rose-500 transition-all duration-500 rounded-full" 
                                 style={{ width: `${metricsHistory.length > 0 ? metricsHistory[metricsHistory.length-1].stress : 0}%` }} 
                               />
                            </div>
                         </div>

                         <div className="space-y-1.5 px-1">
                            <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest">
                               <span>Понимание</span>
                               <span className="text-emerald-500">78%</span>
                            </div>
                            <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                               <div className="h-full bg-emerald-500 w-[78%] rounded-full" />
                            </div>
                         </div>
                      </div>
                   </div>

                </CardContent>
             </Card>

             {/* CHAT SESSION PANEL */}
             <Card className="rounded-[32px] border-none shadow-sm flex flex-col flex-1 min-h-0 bg-white overflow-hidden">
                <header className="p-6 pb-2 flex items-center justify-between shrink-0">
                   <h3 className="font-extrabold text-slate-900 text-[14px] uppercase tracking-widest flex items-center gap-2">
                      Чат сессии
                      <Badge className="bg-slate-50 text-slate-400 border-none font-bold">{participants.length}</Badge>
                   </h3>
                   <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400"><Users size={16} /></div>
                </header>
                <div className="flex-1 min-h-0 relative">
                   <SessionChatPanel sessionId={sessionId} role="teacher" type={sessionType} />
                </div>
             </Card>
          </aside>

        </div>
      </div>

      {/* END SESSION CONFIRMATION MODAL */}
      <Modal open={confirmEndOpen} onClose={() => setConfirmEndOpen(false)} title="Завершить сессию?">
        <div className="p-4 text-center">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mx-auto mb-6">
             <PhoneOff size={32} />
          </div>
          <p className="text-slate-500 font-medium mb-10 leading-relaxed max-w-sm mx-auto">
            Эфир будет остановлен для всех участников. Вы сможете найти запись и подробный отчет в архиве.
          </p>
          <div className="grid grid-cols-2 gap-4">
             <Button onClick={() => setConfirmEndOpen(false)} variant="outline" className="h-12 font-bold text-slate-500">Отмена</Button>
             <Button onClick={() => { setConfirmEndOpen(false); setPhase("ended"); }} className="h-12 bg-rose-500 hover:bg-rose-600 font-bold">Да, завершить</Button>
          </div>
        </div>
      </Modal>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #CBD5E1;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
