"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";

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
  ArrowLeft, Share2, Square, Clock, Users as UsersIcon, BookOpen, Activity, AlertTriangle, Send, PhoneOff, Mic, Video, MicOff, VideoOff, MonitorUp, Focus
} from "lucide-react";

import Modal from "@/components/ui/Modal";

type SessionPhase = "preflight" | "live" | "ended";

function clamp01(x: number) {
  const normalized = x > 1 && x <= 100 ? x / 100 : x;
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, normalized));
}

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
  const [sessionTitle, setSessionTitle] = useState("Загрузка...");
  const [groupName, setGroupName] = useState("Загрузка...");
  const [sessionType, setSessionType] = useState<"lecture" | "exam">("lecture");

  const [activeTab, setActiveTab] = useState<"participants" | "chat">("participants"); 

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

  // WebRTC Connection
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

  // Live Metrics Polling
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

  // Main stage video sync
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
      // Screen sharing logic stub (full implementation similar to student)
      setIsScreenSharing(!isScreenSharing);
  };

  // Preflight state allowing to Start
  if (phase === "preflight") {
     return (
        <div className="min-h-[calc(100vh-64px)] bg-[#FAFAFB] flex flex-col justify-center items-center py-20 px-4">
           <div className="bg-white p-12 rounded-[32px] border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] max-w-lg w-full text-center">
             <div className="w-20 h-20 bg-purple-50 rounded-[20px] flex items-center justify-center text-[#7448FF] mx-auto mb-6">
                <Video size={32} />
             </div>
             <h1 className="text-2xl font-bold text-slate-900 mb-2">{sessionTitle}</h1>
             <p className="text-slate-500 mb-8 font-medium">Мониторинг эфира и звонки: Группа {groupName}</p>
             <button 
               onClick={() => setPhase("live")} 
               className="w-full py-4 bg-[#7448FF] text-white rounded-2xl font-bold shadow-md hover:bg-[#623ce6] hover:-translate-y-0.5 transition-all mb-4 text-[16px]"
             >
               Присоединиться к эфиру
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
             <p className="text-slate-500 mb-8 font-medium">Эфир окончен. Вы можете посмотреть отчет в аналитике.</p>
             <button onClick={() => router.push(`/teacher/sessions`)} className="w-full py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all text-[16px]">Вернуться к списку</button>
           </div>
        </div>
     );
  }

  // RESTORED WEBRTC FUNCTIONAL RENDER WITH PREMIUM DESIGN
  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#FAFAFB] pt-4 md:pt-6 pb-8 flex flex-col h-screen overflow-hidden">

      <div className="mx-auto max-w-[1600px] px-4 md:px-8 w-full flex-1 flex flex-col h-full min-h-0">
        
        {/* Header */}
        <div className="shrink-0 mb-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
           <div>
              <Link href="/teacher/sessions" className="inline-flex items-center gap-2 text-[13px] font-bold text-[#7448FF] hover:text-[#522bbb] transition-colors mb-2">
                 <ArrowLeft size={16} /> Назад к сессиям
              </Link>
              <h1 className="text-[20px] font-bold text-slate-900 leading-tight mb-1">{sessionTitle}</h1>
              <div className="text-[13px] font-medium text-slate-500 flex items-center gap-2">
                 Группа {groupName} <span className="opacity-50">•</span> 
                 <span className="flex items-center gap-1.5 font-bold text-emerald-500"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Активный мониторинг ({formatTimer()})</span>
              </div>
           </div>
           
           <div className="flex items-center gap-3">
              <button 
                onClick={() => setConfirmEndOpen(true)}
                className="flex items-center gap-2 px-5 py-2 bg-rose-500 text-white text-[13px] font-bold rounded-xl hover:bg-rose-600 transition-colors shadow-sm"
              >
                <PhoneOff size={16} fill="currentColor" /> Завершить сессию
              </button>
           </div>
        </div>

        {/* Dashboard Grid Map */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden pb-4">
           
           {/* MAIN VIDEO STAGE */}
           <div className="flex-1 flex flex-col gap-4 min-w-0">
              <div className="w-full flex-1 rounded-[24px] overflow-hidden bg-slate-900 relative shadow-md">
                 <video 
                     ref={localMainRef} 
                     playsInline 
                     muted={!selectedPeerId} 
                     autoPlay 
                     className="w-full h-full object-cover transition-opacity duration-300"
                 />
                 
                 <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md border border-white/10 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm z-10">
                    <Focus size={14} className="text-[#7448FF]"/>
                    {selectedPeerId ? (participants.find(p => p.id === selectedPeerId)?.name || selectedPeerId) : "Моя камера (Преподаватель)"}
                 </div>

                 {/* Bottom Floating Controls */}
                 <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-xl px-4 py-3 rounded-2xl border border-white/10 shadow-lg z-20">
                    <button onClick={toggleMic} className={cn("w-12 h-12 rounded-[14px] flex items-center justify-center transition-colors", isMicOn ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-rose-500 text-white hover:bg-rose-600')}>
                        {isMicOn ? <Mic size={20}/> : <MicOff size={20}/>}
                    </button>
                    <button onClick={toggleCam} className={cn("w-12 h-12 rounded-[14px] flex items-center justify-center transition-colors", isCamOn ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-rose-500 text-white hover:bg-rose-600')}>
                        {isCamOn ? <Video size={20}/> : <VideoOff size={20}/>}
                    </button>
                    <button onClick={toggleScreen} className={cn("w-12 h-12 rounded-[14px] flex items-center justify-center transition-colors", isScreenSharing ? 'bg-[#7448FF] text-white hover:bg-[#623ce6]' : 'bg-white/20 hover:bg-white/30 text-white')}>
                        <MonitorUp size={20}/>
                    </button>
                 </div>
              </div>

              {/* PARTICIPANTS THUMBNAIL CAROUSEL */}
              <div className="h-32 shrink-0 bg-white border border-slate-100 rounded-[20px] p-3 flex gap-3 overflow-x-auto shadow-sm hide-scrollbar items-center">
                  {/* Local Stream Thumbnail */}
                  <div onClick={() => setSelectedPeerId(null)} className={cn("relative h-full aspect-video rounded-xl overflow-hidden cursor-pointer border-[3px] transition-all shrink-0 bg-slate-900 group", !selectedPeerId ? "border-[#7448FF] shadow-md" : "border-transparent opacity-70 hover:opacity-100 object-cover")}>
                      <video autoPlay playsInline muted ref={el => { if(el && localStream) el.srcObject = localStream; }} className="w-full h-full object-cover" />
                      <div className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-lg border border-white/10 group-hover:bg-black/80 transition-colors">Я (Local)</div>
                  </div>

                  {/* Remote Streams Thumbnails */}
                  {participants.filter(p => p.role !== 'teacher').map(p => {
                      const st = remoteStreams[p.id];
                      return (
                         <div key={p.id} onClick={() => setSelectedPeerId(p.id)} className={cn("relative h-full aspect-video rounded-xl overflow-hidden cursor-pointer border-[3px] transition-all shrink-0 bg-slate-900 group flex items-center justify-center", selectedPeerId === p.id ? "border-[#7448FF] shadow-md" : "border-transparent opacity-70 hover:opacity-100 object-cover")}>
                             {st ? (
                                <video autoPlay playsInline ref={el => { if(el) el.srcObject = st; }} className="w-full h-full object-cover" />
                             ) : (
                                <div className="text-xs text-slate-500 font-medium font-bold text-center">Нет видео</div>
                             )}
                             <div className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-lg border border-white/10 group-hover:bg-black/80 transition-colors truncate max-w-[90%]">
                                {p.name || p.id.slice(0,6)}
                             </div>
                         </div>
                      );
                  })}
                  {participants.filter(p => p.role !== 'teacher').length === 0 && (
                      <div className="flex-1 text-center text-sm font-medium text-slate-400">Ожидание подключения студентов...</div>
                  )}
              </div>
           </div>

           {/* RIGHT SIDEBAR (Chat + ML Metrics) */}
           <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 flex flex-col min-h-0 bg-white border border-slate-100 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden">
              <div className="flex border-b border-slate-100 shrink-0">
                 <button onClick={() => setActiveTab('participants')} className={cn("flex-1 text-[13px] font-bold py-4 border-b-2 transition-colors", activeTab === 'participants' ? "border-[#7448FF] text-[#7448FF]" : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/50")}>
                    Участники и ML ({participants.length})
                 </button>
                 <button onClick={() => setActiveTab('chat')} className={cn("flex-1 text-[13px] font-bold py-4 border-b-2 transition-colors", activeTab === 'chat' ? "border-[#7448FF] text-[#7448FF]" : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/50")}>
                    Чат эфира
                 </button>
              </div>

              <div className="flex-1 min-h-0 relative bg-slate-50/30">
                 {/* Participants Tab View */}
                 {activeTab === 'participants' && (
                     <div className="absolute inset-0 overflow-y-auto px-4 py-4 space-y-3">
                         {participants.length === 0 && (
                            <div className="text-center text-xs text-slate-400 pt-6 font-medium">Никто из студентов еще не подключился.</div>
                         )}
                         {participants.filter(p => p.role !== 'teacher').map(p => {
                            const ml = liveMetrics?.participants.find(m => m.userId === p.id || m.name === p.name);
                            const nameInitial = p.name ? p.name[0].toUpperCase() : '?';
                            return (
                               <div key={p.id} onClick={() => setSelectedPeerId(p.id)} className={cn("flex items-center justify-between p-3 rounded-2xl bg-white border cursor-pointer hover:shadow-md transition-all group", selectedPeerId === p.id ? "border-[#7448FF]" : "border-slate-100")}>
                                  <div className="flex items-center gap-3 min-w-0">
                                     <div className="w-10 h-10 rounded-full bg-purple-50 text-[#7448FF] shrink-0 flex items-center justify-center font-bold text-sm">
                                        {nameInitial}
                                     </div>
                                     <div className="min-w-0 pr-2">
                                        <div className="text-[13px] font-bold text-slate-900 group-hover:text-[#7448FF] transition-colors truncate">{p.name || `Студент ${p.id.slice(0,5)}`}</div>
                                        <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5 mt-0.5">
                                           Эмоция: <span className="text-slate-600 font-bold">{ml?.emotion || "Без анализа"}</span>
                                        </div>
                                     </div>
                                  </div>
                                  {ml && (
                                     <div className="text-right shrink-0">
                                        <div className="text-[12px] font-bold text-slate-900">Вним.: {Math.round((ml?.confidence || 0)*100)}%</div>
                                        <div className="text-[10px] font-bold uppercase mt-0.5" style={{ color: (ml?.risk || 0) > 0.5 ? '#f43f5e' : '#10b981' }}>
                                           {ml.state || "Stable"}
                                        </div>
                                     </div>
                                  )}
                               </div>
                            )
                         })}
                     </div>
                 )}

                 {/* Real Session Chat Tab View */}
                 {activeTab === 'chat' && (
                     <div className="absolute inset-0 bg-white">
                         <SessionChatPanel sessionId={sessionId} role="teacher" type={sessionType} />
                     </div>
                 )}

              </div>
           </div>

        </div>

      </div>

      <Modal open={confirmEndOpen} onClose={() => setConfirmEndOpen(false)} title="Завершить сессию">
        <div className="p-2">
          <p className="text-slate-500 text-[14px] font-medium mb-6">Завершить текущий эфир? Все видео и веб-сокет соединения участников будут отключены.</p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
             <button onClick={() => setConfirmEndOpen(false)} className="px-5 py-2.5 bg-slate-50 font-bold text-slate-600 rounded-xl hover:bg-slate-100 transition-colors shadow-sm">Отмена</button>
             <button onClick={() => { setConfirmEndOpen(false); setPhase("ended"); }} className="px-5 py-2.5 bg-rose-500 font-bold text-white rounded-xl hover:bg-rose-600 transition-colors shadow-sm flex items-center gap-2"><PhoneOff size={16}/> Завершить эфир</button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
