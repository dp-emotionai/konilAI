"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Reveal from "@/components/common/Reveal";
import Section from "@/components/common/Section";

import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

import { useUI } from "@/components/layout/Providers";
import {
  getSessionJoinInfo,
  recordSessionConsent,
  sendSessionMetrics,
  type SessionJoinInfo,
} from "@/lib/api/student";
import { getApiBaseUrl, hasAuth } from "@/lib/api/client";
import {
  getMlApiBaseUrl,
  mlAnalyzeFrame,
  captureFrame64x64Grayscale,
  ML_INTERVAL,
  ML_429_PAUSE_MS,
  type MlAnalyzeResponse,
} from "@/lib/api/ml";

import CameraCheck from "@/components/session/CameraCheck";
import { StudentSessionTabs } from "@/components/session/StudentSessionTabs";
import { SignalingClient } from "@/lib/webrtc/signalingClient";
import { PeerConnectionManager } from "@/lib/webrtc/peerConnectionManager";
import type { Participant } from "@/lib/webrtc/types";
import { SessionChatPanel } from "@/components/chat/SessionChatPanel";
import { StreamVideo } from "@/components/session/StreamVideo";

import {
  Mic,
  Video,
  Share2,
  Settings,
  PhoneOff,
  AlertTriangle,
  Activity,
  CheckCircle2,
  AlertCircle,
  Search,
  BarChart3,
  MicOff,
  VideoOff,
  MonitorUp,
  Sparkles,
  ShieldCheck,
  LogOut,
  Maximize2,
  MessageSquare,
  MoreHorizontal,
  Users2,
  FileText,
  Clock,
  PenTool,
  CheckSquare
} from "lucide-react";
import { getWsBaseUrl } from "@/lib/env";
import { cn } from "@/lib/cn";

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-slate-100 bg-slate-50 px-4 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
      <div className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">{label}</div>
      <div className="mt-1.5 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function formatParticipantLabel(p?: Participant | null) {
  if (!p) return "Преподаватель";
  return p.fullName || p.email || `${p.role} · ${p.id.slice(0, 6)}`;
}

function CallControlButton({ 
  active, 
  icon, 
  dangerIcon,
  label, 
  onClick, 
  disabled 
}: { 
  active?: boolean; 
  icon: React.ReactNode; 
  dangerIcon?: React.ReactNode;
  label: string; 
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
       <button
         type="button"
         onClick={onClick}
         disabled={disabled}
         className={cn(
           "w-14 h-14 rounded-full flex items-center justify-center transition-all bg-white border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.04)]",
           !active ? "bg-slate-100 text-slate-600" : "text-slate-900 hover:bg-slate-50 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]",
           disabled && "opacity-50 cursor-not-allowed"
         )}
       >
         {!active && dangerIcon ? dangerIcon : icon}
       </button>
       <span className="text-xs font-semibold text-slate-700">{label}</span>
    </div>
  );
}

export default function StudentJoinSessionPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params?.id ?? "";
  const { state } = useUI();

  const [joinInfo, setJoinInfo] = useState<SessionJoinInfo | null>(null);
  const [joinInfoLoading, setJoinInfoLoading] = useState(
    !!(getApiBaseUrl() && hasAuth())
  );
  const [joinInfoError, setJoinInfoError] = useState<string | null>(null);
  const [activeBottomTab, setActiveBottomTab] = useState<"materials" | "notes" | "whiteboard">("whiteboard");

  const loadJoinInfo = useCallback(async () => {
    if (!sessionId || !getApiBaseUrl() || !hasAuth()) {
      setJoinInfoLoading(false);
      return;
    }

    setJoinInfoError(null);
    setJoinInfoLoading(true);

    try {
      const info = await getSessionJoinInfo(sessionId);
      setJoinInfo(info ?? null);

      if (info?.reason === "consent_required" && state.consent) {
        try {
          await recordSessionConsent(sessionId);
          const updated = await getSessionJoinInfo(sessionId);
          if (updated) setJoinInfo(updated);
        } catch {
          // ignore
        }
      }
    } catch (e) {
      setJoinInfo(null);
      setJoinInfoError(
        e instanceof Error ? e.message : "Не удалось загрузить данные сессии."
      );
    } finally {
      setJoinInfoLoading(false);
    }
  }, [sessionId, state.consent]);

  useEffect(() => {
    void loadJoinInfo();
  }, [loadJoinInfo]);

  useEffect(() => {
    let timer: number | null = null;
    const blockReason = joinInfo && !joinInfo.allowedToJoin ? joinInfo.reason : null;
    
    if (blockReason === "session_not_started") {
      timer = window.setInterval(() => {
        void loadJoinInfo();
      }, 5000);
    }
    
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [joinInfo, loadJoinInfo]);

  const title = joinInfo?.title ?? "Сессия";
  const sessionType: "lecture" | "exam" =
    joinInfo?.type === "exam" ? "exam" : "lecture";

  const apiAvailable = Boolean(getApiBaseUrl() && hasAuth());
  const canJoin = !apiAvailable || joinInfo?.allowedToJoin !== false;
  const blockReason = joinInfo && !joinInfo.allowedToJoin ? joinInfo.reason : null;

  const [live, setLive] = useState(false);
  const [tab, setTab] = useState<"prepare" | "live">("prepare");

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const [mlResult, setMlResult] = useState<MlAnalyzeResponse | null>(null);
  const [mlActive, setMlActive] = useState(false);
  const [mlUnavailable, setMlUnavailable] = useState(false);

  const [connectionState, setConnectionState] = useState<
    "idle" | "connecting" | "connected" | "error"
  >("idle");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [wsDisconnected, setWsDisconnected] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localThumbRef = useRef<HTMLVideoElement | null>(null);

  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerManagerRef = useRef<PeerConnectionManager | null>(null);

  const mlApiAvailable = Boolean(getMlApiBaseUrl());
  const shouldRunMl = live && state.consent && mlApiAvailable;
  const roomId = sessionId;

  const teacherParticipant = useMemo(
    () => participants.find((p) => p.role === "teacher") ?? participants[0] ?? null,
    [participants]
  );
  
  const [sessionTimerLabel, setSessionTimerLabel] = useState<string>("00:00:00");
  const sessionStartTime = useRef<number>(Date.now());

  useEffect(() => {
    if (!live || connectionState !== "connected") return;
    sessionStartTime.current = Date.now();
    const updater = setInterval(() => {
       const span = Date.now() - sessionStartTime.current;
       const s = Math.floor(span / 1000);
       const m = Math.floor(s / 60);
       const h = Math.floor(m / 60);
       const fmt = (v: number) => v.toString().padStart(2, '0');
       setSessionTimerLabel(`${fmt(h)}:${fmt(m % 60)}:${fmt(s % 60)}`);
    }, 1000);
    return () => clearInterval(updater);
  }, [live, connectionState]);

  useEffect(() => {
    if (!live || !roomId) {
      setConnectionState("idle");
      setConnectionError(null);
      return;
    }

    setConnectionState("connecting");
    setConnectionError(null);

    const wsBase = getWsBaseUrl();
    if (!wsBase?.startsWith("ws")) {
      setConnectionError(
        "Не настроен адрес сервера эфира (WS). Обратитесь к администратору."
      );
      setConnectionState("error");
      setLive(false);
      return;
    }

    const signaling = new SignalingClient(`${wsBase}/ws`);
    const manager = new PeerConnectionManager(signaling, roomId, "student", {
      onRemoteStream: (_peerId, stream) => {
        const hasTracks = stream.getTracks().length > 0;
        setRemoteStream(hasTracks ? stream : null);
      },
      onPeersChange: (peers) => setParticipants(peers),
      onDisconnect: () => setWsDisconnected(true),
      onPeerLeft: () => {
        setRemoteStream(null);
      },
    });
    peerManagerRef.current = manager;

    signaling.connect();

    (async () => {
      try {
        const stream = await manager.initLocalStream({ video: true, audio: true });
        setLocalStream(stream);

        // Pre-warm local previews
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          await localVideoRef.current.play().catch(() => {});
        }
        if (localThumbRef.current) {
          localThumbRef.current.srcObject = stream;
          await localThumbRef.current.play().catch(() => {});
        }

        await signaling.waitForOpen(12000);
        
        const { getStoredAuth } = await import("@/lib/api/client");
        const auth = getStoredAuth();
        manager.join(auth ? { 
          email: auth.email, 
          fullName: auth.fullName || undefined,
          firstName: auth.firstName || undefined,
          lastName: auth.lastName || undefined
        } : undefined);
        
        setConnectionState("connected");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Ошибка подключения";
        const friendly =
          msg.includes("timeout") || msg.includes("WebSocket")
            ? "Не удалось подключиться к серверу эфира. Проверьте интернет и настройки WS."
            : msg.includes("Permission") ||
                msg.includes("NotAllowed") ||
                msg.includes("NotFound")
              ? "Камера или микрофон недоступны. Проверьте разрешения в браузере и попробуйте снова."
              : msg;

        setConnectionError(friendly);
        setConnectionState("error");
        setLive(false);
        setTab("prepare");
        manager.leave();
        setRemoteStream(null);
        setLocalStream(null);
        setParticipants([]);
      }
    })();

    return () => {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      peerManagerRef.current = null;
      manager.leave();
      setRemoteStream(null);
      setLocalStream(null);
      setParticipants([]);
      setConnectionState("idle");
      setConnectionError(null);
      setWsDisconnected(false);
      setIsScreenSharing(false);
    };
  }, [live, roomId]);

  const toggleMic = () => {
    const next = !isMicEnabled;
    peerManagerRef.current?.setAudioEnabled(next);
    setIsMicEnabled(next);
  };

  const toggleCamera = () => {
    if (isScreenSharing) return;
    const next = !isCameraEnabled;
    peerManagerRef.current?.setVideoEnabled(next);
    setIsCameraEnabled(next);
  };

  const toggleScreenShare = async () => {
    const manager = peerManagerRef.current;
    if (!manager || !localStream) return;

    if (isScreenSharing) {
      const cameraTrack = localStream.getVideoTracks()[0] ?? null;
      if (cameraTrack) cameraTrack.enabled = isCameraEnabled;
      await manager.replaceOutgoingVideoTrack(isCameraEnabled ? cameraTrack : null);
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const displayTrack = displayStream.getVideoTracks()[0];
      if (!displayTrack) return;

      screenStreamRef.current = displayStream;
      await manager.replaceOutgoingVideoTrack(displayTrack);
      setIsScreenSharing(true);

      displayTrack.onended = () => {
        void toggleScreenShare();
      };
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!remoteVideoRef.current || !remoteStream) return;
    remoteVideoRef.current.srcObject = remoteStream;
    remoteVideoRef.current.play().catch(() => {});
  }, [remoteStream, tab]); // Ensure re-binding if tab changed layout

  useEffect(() => {
    if (localThumbRef.current && localStream) {
      localThumbRef.current.srcObject = localStream;
      localThumbRef.current.play().catch(() => {});
    }
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, tab]);

  useEffect(() => {
    if (!shouldRunMl || !localThumbRef.current) return;

    setMlActive(true);
    setMlUnavailable(false);

    let cancelled = false;
    let inflight = false;
    let consecutiveFailures = 0;
    let pausedUntil = 0;
    const failureThreshold = 4;

    const timer = setInterval(async () => {
      if (cancelled || inflight) return;
      if (Date.now() < pausedUntil) return;

      const video = localThumbRef.current || localVideoRef.current;
      if (!video) return;

      const frame = captureFrame64x64Grayscale(video);
      if (!frame) return;

      try {
        inflight = true;
        const result = await mlAnalyzeFrame(frame);
        if (cancelled) return;

        if (!result) {
          consecutiveFailures += 1;
          if (consecutiveFailures >= failureThreshold) setMlUnavailable(true);
          return;
        }

        consecutiveFailures = 0;
        setMlResult(result);

        if (sessionId && apiAvailable) {
          sendSessionMetrics(sessionId, {
            emotion: result.emotion ?? "Neutral",
            confidence: result.confidence ?? 0,
            risk: result.risk ?? 0,
            state: result.state ?? "NORMAL",
            dominant_emotion: result.dominant_emotion ?? "Neutral",
            // Forward real ML engagement/stress/fatigue so teacher chart is accurate
            engagement: result.engagement,
            stress: result.stress,
            fatigue: result.fatigue,
          }).catch(() => {});
        }
      } catch (err) {
        const e = err as Error & { status?: number };
        if (e?.status === 429 || e?.message === "RATE_LIMIT") {
          pausedUntil = Date.now() + ML_429_PAUSE_MS;
        } else {
          consecutiveFailures += 1;
          if (consecutiveFailures >= failureThreshold) setMlUnavailable(true);
        }
      } finally {
        inflight = false;
      }
    }, ML_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(timer);
      setMlActive(false);
      setMlResult(null);
      setMlUnavailable(false);
    };
  }, [shouldRunMl, sessionId, apiAvailable]);

  // If live and active, render the premium redesign directly
  if (tab === "live") {
    return (
      <div className="fixed top-[64px] bottom-0 left-0 right-0 bg-[#FAFAFB] flex flex-col z-40 overflow-hidden">
        <div className="mx-auto max-w-[1550px] w-full px-4 md:px-8 py-8 flex flex-col flex-1 min-h-0 animate-in fade-in zoom-in-[0.98] duration-300">
          
          {/* HEADER */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
                <Badge className="bg-purple-50 text-[#7448FF] border-none font-semibold px-2.5 py-0.5">Онлайн-сессия</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-6 mt-2 text-[13px] text-slate-500 font-medium">
                <span>Преподаватель: <span className="text-slate-900">{formatParticipantLabel(teacherParticipant)}</span></span>
                {connectionState === "connected" ? (
                  <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/> Сессия активна</span>
                ) : (
                  <span className="flex items-center gap-2 text-amber-600"><AlertCircle size={14}/> {connectionState === "connecting" ? "Подключение..." : "Сбой соединения"}</span>
                )}
                {connectionState === "connected" && <span className="tabular-nums opacity-60 font-semibold">{sessionTimerLabel}</span>}
              </div>
            </div>
            <button 
              onClick={() => { setLive(false); setTab("prepare"); }}
              className="px-5 py-2.5 rounded-xl text-[13px] bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 hover:border-red-200 shadow-sm font-semibold transition-colors shrink-0"
            >
              Завершить сессию
            </button>
          </div>

          {/* MAIN GRID */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-6 items-stretch overflow-hidden">
            
            {/* LEFT COLUMN - MAIN WORKSPACE */}
            <div className="space-y-6 flex flex-col min-h-0 h-full overflow-y-auto pr-2">
              
              {/* VIDEO STAGE */}
              <div className="relative w-full aspect-[16/9] lg:aspect-[21/9] rounded-[28px] overflow-hidden bg-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-slate-200/50">
                 <video ref={remoteVideoRef} className="w-full h-full object-cover" autoPlay playsInline />
                 
                 {!remoteStream && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F4F5F7]">
                      <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4">
                         <span className="text-2xl">👨🏻‍🏫</span>
                      </div>
                      <div className="text-slate-500 font-medium text-sm">Ожидание подключения преподавателя...</div>
                    </div>
                 )}

                 {/* Top Right Expand Tool */}
                 <div className="absolute top-4 right-4 bg-slate-900/40 hover:bg-slate-900/60 transition-colors backdrop-blur-md text-white p-2.5 rounded-2xl cursor-pointer">
                    <Maximize2 size={16} strokeWidth={2.5}/>
                 </div>
                 
                 {/* Bottom Left Teacher Name */}
                 {remoteStream && (
                    <div className="absolute bottom-4 left-4 bg-slate-900/60 backdrop-blur-xl px-3 py-2 text-white rounded-2xl flex items-center gap-2 text-[13px] font-medium shadow-sm">
                      <div className="w-5 h-5 rounded-full bg-[#7448FF] flex items-center justify-center">🎓</div>
                      {formatParticipantLabel(teacherParticipant)}
                    </div>
                 )}

                 {/* PIP Local Preview (Bottom Right instead of left in reference to avoid overlap if desired, but reference shows bottom left below the main text. We will stick to reference: PIP below main stream or floating) */}
                 <div className="absolute bottom-4 left-4 xl:left-auto xl:right-4 xl:bottom-4 w-[240px] aspect-[16/10] bg-black rounded-[20px] overflow-hidden border-[3px] border-white/10 shadow-xl transition-all">
                    <StreamVideo stream={localStream} className="w-full h-full object-cover" autoPlay playsInline muted />
                    <div className="absolute bottom-2 left-2 bg-slate-900/60 backdrop-blur-xl px-2 py-1 text-white rounded-xl flex items-center gap-1.5 text-[11px] font-medium">
                      Вы <Mic size={12} className={isMicEnabled ? "text-white" : "text-red-400"}/>
                    </div>
                 </div>
              </div>

              {/* CALL CONTROLS */}
              <div className="flex flex-wrap items-center justify-center gap-4 py-2">
                 <CallControlButton active={isMicEnabled} icon={<Mic size={22}/>} label="Микрофон" dangerIcon={<MicOff size={22}/>} onClick={toggleMic} />
                 <CallControlButton active={isCameraEnabled} icon={<Video size={22}/>} label="Камера" dangerIcon={<VideoOff size={22}/>} onClick={toggleCamera} disabled={isScreenSharing} />
                 <CallControlButton active={isScreenSharing} icon={<Share2 size={22}/>} label="Экран" onClick={toggleScreenShare} />
                 
                 {/* Missing Features shown gracefully disabled */}
                 <CallControlButton active={false} disabled icon={<MessageSquare size={22}/>} label="Чат" />
                 <CallControlButton active={false} disabled icon={<MoreHorizontal size={22}/>} label="Еще" />
                 
                 <div className="flex flex-col items-center gap-2 mx-1">
                    <button onClick={() => { setLive(false); setTab("prepare"); }} className="w-14 h-14 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition shadow-[0_8px_20px_rgba(239,68,68,0.3)] shrink-0">
                       <PhoneOff size={22}/>
                    </button>
                    <span className="text-xs font-semibold text-slate-700">Выйти</span>
                 </div>
              </div>

              {/* TABS BOTTOM SECTION */}
              <div className="mt-4">
                 <div className="flex items-center gap-2 border-b border-slate-100 mb-6">
                    {["Материалы", "Заметки", "Доска"].map((t) => {
                      const id = t === "Материалы" ? "materials" : t === "Заметки" ? "notes" : "whiteboard";
                      const isActive = activeBottomTab === id;
                      return (
                        <button 
                          key={id}
                          onClick={() => setActiveBottomTab(id as any)}
                          className={cn(
                            "px-5 py-3 text-sm font-semibold transition-colors relative",
                            isActive ? "text-[#7448FF]" : "text-slate-500 hover:text-slate-700"
                          )}
                        >
                          {t}
                          {isActive && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#7448FF] rounded-t-full" />}
                        </button>
                      );
                    })}
                 </div>

                 {/* Tab Content Areas */}
                 <div className="bg-white border text-sm border-slate-100 rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] min-h-[300px] flex items-center justify-center p-8">
                    {activeBottomTab === "whiteboard" && (
                       <div className="text-center w-full">
                          <Reveal>
                            <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                               <PenTool size={32} className="text-slate-200" strokeWidth={1} />
                               <div className="font-semibold text-slate-700">Интерактивная доска недоступна</div>
                               <div className="text-sm max-w-sm">Модуль совместной работы (Whiteboard) пока находится в разработке. Ожидайте обновлений платформы.</div>
                            </div>
                          </Reveal>
                       </div>
                    )}
                    {activeBottomTab === "notes" && (
                       <div className="text-center w-full">
                          <Reveal>
                            <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                               <FileText size={32} className="text-slate-200" strokeWidth={1} />
                               <div className="font-semibold text-slate-700">Заметки к сессии пусты</div>
                               <div className="text-sm max-w-sm">Ни вы, ни преподаватель еще не добавили заметок в ходе этого занятия.</div>
                            </div>
                          </Reveal>
                       </div>
                    )}
                    {activeBottomTab === "materials" && (
                       <div className="text-center w-full">
                          <Reveal>
                            <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                               <CheckSquare size={32} className="text-slate-200" strokeWidth={1} />
                               <div className="font-semibold text-slate-700">Нет материалов</div>
                               <div className="text-sm max-w-sm">Учебный план для данной сессии не загружен сервером.</div>
                            </div>
                          </Reveal>
                       </div>
                    )}
                 </div>
                 
                 {/* Bottom Extra Cards using same empty states */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div className="bg-white border text-sm border-slate-100 rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 md:p-8">
                       <h3 className="font-bold text-slate-900 text-[15px] mb-4">План занятия</h3>
                       <div className="text-center py-8 text-slate-400">План не загружен</div>
                    </div>
                    <div className="bg-white border text-sm border-slate-100 rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 md:p-8">
                       <h3 className="font-bold text-slate-900 text-[15px] mb-4">Важные тезисы</h3>
                       <div className="text-center py-8 text-slate-400">Записей нет</div>
                    </div>
                 </div>
              </div>
            </div>

            {/* RIGHT COLUMN - TOOLS */}
            <div className="flex flex-col gap-6 min-w-0 h-full overflow-hidden">
              {/* Chat Panel */}
              <div className="bg-white border-slate-100 border rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col flex-1 min-h-0 overflow-hidden">
                 <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between bg-white z-10">
                    <h3 className="font-bold text-slate-900 text-[16px]">Чат сессии</h3>
                    <Badge className="bg-purple-50 text-[#7448FF] shadow-none flex items-center gap-1.5 px-2 py-0.5 rounded-lg border-none"><Users2 size={12}/> {participants.length || 1}</Badge>
                 </div>
                 {/* Functional real chat component mounted exactly inside the layout */}
                 <div className="flex-1 min-h-0 relative">
                   <SessionChatPanel sessionId={roomId} role="student" type={sessionType} />
                 </div>
              </div>

              {/* Info Card */}
              <div className="bg-white border-slate-100 border rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 space-y-6">
                 <h3 className="font-bold text-slate-900 text-[16px]">Информация о сессии</h3>
                 <div className="space-y-4">
                    <div>
                       <div className="text-[12px] text-slate-400 mb-0.5 font-medium">Тема</div>
                       <div className="font-semibold text-slate-900 text-sm">{title}</div>
                    </div>
                    <div>
                       <div className="text-[12px] text-slate-400 mb-0.5 font-medium">Режим</div>
                       <div className="font-semibold text-slate-900 text-sm flex items-center gap-1.5"><Clock size={14} className="text-slate-400"/> Live-трансляция ({sessionType})</div>
                    </div>
                    <div>
                       <div className="text-[12px] text-slate-400 mb-2 font-medium">Участники</div>
                       <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-2.5 rounded-2xl">
                             <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100">👩🏻‍🏫</div>
                             <div>
                                <div className="font-semibold text-[13px] text-slate-900">{formatParticipantLabel(teacherParticipant)}</div>
                                <div className="text-[11px] text-slate-500 font-medium">Преподаватель</div>
                             </div>
                          </div>
                          <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-2.5 rounded-2xl">
                             <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100">👦🏻</div>
                             <div>
                                <div className="font-semibold text-[13px] text-slate-900">Вы</div>
                                <div className="text-[11px] text-[#7448FF] font-semibold flex items-center gap-1"><span className="w-1.5 h-1.5 bg-[#7448FF] rounded-full"/> Студент</div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Files Card */}
              <div className="bg-white border-slate-100 border rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 flex flex-col min-h-[160px]">
                 <h3 className="font-bold text-slate-900 text-[16px] mb-4">Файлы</h3>
                 <div className="flex-1 flex flex-col items-center justify-center text-center py-4 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                    <FileText size={20} className="text-slate-300 mb-2" strokeWidth={1.5} />
                    <div className="text-[13px] font-semibold text-slate-500">Нет прикрепленных файлов</div>
                 </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pre-join state rendered normally using standard Elas components
  return (
    <div className="space-y-6 pb-12 mx-auto max-w-[1440px] px-4 py-8">
      <Breadcrumbs
        items={[
          { label: "Студент", href: "/student/dashboard" },
          { label: "Сессии", href: "/student/sessions" },
          { label: title },
        ]}
      />

      <Link
        href="/student/sessions"
        className="inline-flex text-sm text-slate-500 transition-colors hover:text-slate-800"
      >
        ← К списку сессий
      </Link>

      {!live && (
        <PageHero
          overline="Студент · Сессия"
          title={title}
          subtitle={
            joinInfo?.groupName
              ? `${joinInfo.groupName}. Сначала согласие и проверка камеры, затем подключение.`
              : "Сначала согласие и проверка камеры, затем подключение к эфиру."
          }
          right={
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{joinInfo?.type === "exam" ? "Экзамен" : "Лекция"}</Badge>
              <Badge variant={state.consent ? "success" : "warning"}>
                {state.consent ? "Согласие: да" : "Согласие: нет"}
              </Badge>
              <Link href="/student/sessions">
                <Button variant="outline">Назад</Button>
              </Link>
            </div>
          }
        />
      )}

      {joinInfoLoading && (
        <Section spacing="none" className="mt-6">
          <Card>
            <CardContent className="p-6 md:p-7">
              <div className="h-24 animate-pulse rounded-[20px] bg-slate-50" />
            </CardContent>
          </Card>
        </Section>
      )}

      {joinInfoError && (
        <Section spacing="none" className="mt-6">
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle
                  size={20}
                  className="shrink-0 text-amber-600"
                />
                <div>
                  <div className="font-semibold text-slate-900">Ошибка загрузки</div>
                  <div className="mt-0.5 text-sm text-amber-800">{joinInfoError}</div>
                </div>
              </div>
              <Button variant="outline" onClick={() => void loadJoinInfo()} className="bg-white">
                Повторить
              </Button>
            </CardContent>
          </Card>
        </Section>
      )}

      {!joinInfoLoading && !joinInfoError && !canJoin && blockReason && (
        <Section spacing="none" className="mt-6">
          <Reveal>
            <Card className="mx-auto max-w-3xl border-slate-100">
              <CardContent className="space-y-3 p-6 md:p-7">
                {blockReason === "consent_required" && (
                  <>
                    <div className="text-sm text-slate-500">Требуется согласие</div>
                    <div className="text-lg font-semibold text-slate-900">
                      Для подключения к сессии нужно дать согласие на анализ эмоций
                    </div>
                    <div className="text-sm text-slate-500">
                      Согласие обязательно по этике платформы. Его можно отозвать в любой момент.
                    </div>

                    <Link
                      href={`/consent?returnUrl=${encodeURIComponent(
                        `/student/session/${sessionId}`
                      )}`}
                    >
                      <Button className="mt-2 bg-[#7448FF] hover:bg-[#623ce6] text-white border-none shadow-sm">Перейти к согласию</Button>
                    </Link>
                  </>
                )}

                {(blockReason === "session_not_started" ||
                  blockReason === "session_ended") && (
                  <>
                    <div className="text-sm text-slate-500">Статус сессии</div>
                    <div className="text-lg font-semibold text-slate-900">
                      {blockReason === "session_ended"
                        ? "Сессия завершена."
                        : "Сессия ещё не началась."}
                    </div>
                    <div className="text-sm text-slate-500">
                      {blockReason === "session_ended"
                        ? "Преподаватель завершил эфир. Подключение недоступно."
                        : "Дождитесь, когда преподаватель запустит сессию."}
                    </div>

                    <Link href="/student/sessions" className="mt-2 inline-block">
                      <Button variant="outline">К списку</Button>
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </Section>
      )}

      {!joinInfoLoading && !joinInfoError && canJoin && (
        <Section spacing="none" className="mt-6 space-y-6">
          {!live && <StudentSessionTabs tab={tab} onChange={setTab} />}

          {tab === "prepare" && !live && (
            <Reveal>
              {connectionError && (
                <Card className="mb-6 border-amber-200 bg-amber-50">
                  <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                    <div className="flex items-center gap-3">
                      <AlertTriangle
                        size={20}
                        className="shrink-0 text-amber-600"
                      />
                      <div>
                        <div className="font-semibold text-slate-900">Ошибка подключения</div>
                        <div className="mt-0.5 text-sm text-amber-800">{connectionError}</div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="bg-white"
                      onClick={() => {
                        setConnectionError(null);
                        setConnectionState("idle");
                      }}
                    >
                      Попробовать снова
                    </Button>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-6 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <Card className="overflow-hidden border-slate-100">
                    <CardContent className="space-y-5 p-6 md:p-7">
                      <div className="flex items-start gap-4">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 border border-purple-100 text-[#7448FF] shadow-sm">
                          <Sparkles size={20} />
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold text-slate-400 uppercase tracking-wide">Шаг 1</div>
                          <div className="mt-1.5 text-lg font-bold text-slate-900">
                            Consent и правила приватности
                          </div>
                          <div className="mt-2 text-sm leading-relaxed text-slate-500 font-medium">
                            Видео не сохраняется. Анализ идёт 1–2 кадра в секунду, в систему
                            попадают только агрегированные метрики.
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2 mt-6">
                        <StatusPill
                          label="Согласие пользователя"
                          value={state.consent ? "Принято ✅" : "Ожидает"}
                        />
                        <StatusPill
                          label="ML сервис (нейросеть)"
                          value={mlApiAvailable ? "Подключен и Готов ✅" : "Временно недоступен"}
                        />
                      </div>

                      {!state.consent && (
                        <Link
                          href={`/consent?returnUrl=${encodeURIComponent(
                            `/student/session/${sessionId}`
                          )}`}
                          className="inline-flex mt-2"
                        >
                          <Button className="gap-2 bg-[#7448FF] hover:bg-[#623ce6] text-white shadow-sm border-none">
                            <ShieldCheck size={18} />
                            Подтвердить согласие
                          </Button>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-5">
                  <Card className="overflow-hidden border-slate-100 h-full">
                    <CardContent className="space-y-4 p-6 md:p-7 h-full flex flex-col">
                      <div className="flex items-start gap-4">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100 text-blue-500 shadow-sm">
                          <MonitorUp size={20} />
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold text-slate-400 uppercase tracking-wide">Шаг 2</div>
                          <div className="mt-1.5 text-lg font-bold text-slate-900">
                            Проверка камеры
                          </div>
                          <div className="mt-2 text-sm text-slate-500 font-medium">
                            Настройте свет и положение лица, затем нажмите «Начать».
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto pt-6 flex-1">
                        <CameraCheck
                          onStart={() => {
                            setLive(true);
                            setTab("live");
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </Reveal>
          )}

          {!live && !getWsBaseUrl()?.startsWith("ws") && (
            <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-100 p-4 shadow-sm">
              <AlertTriangle className="mt-0.5 text-amber-600" size={18} />
              <div className="text-sm font-semibold text-amber-800">
                WS base URL не настроен. Проверь конфигурацию <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_WS_BASE_URL</code>.
              </div>
            </div>
          )}

          {!live && (
            <div className="flex items-start gap-3 rounded-2xl bg-blue-50 border border-blue-100 p-4 shadow-sm">
              <Activity className="mt-0.5 text-blue-600" size={18} />
              <div className="text-sm leading-relaxed font-semibold text-blue-800">
                Соединение защищено по стандарту WebRTC P2P. Видео-поток не записывается. Бэкенд получает только обезличенные числовые метрики эмоций.
              </div>
            </div>
          )}
        </Section>
      )}
    </div>
  );
}