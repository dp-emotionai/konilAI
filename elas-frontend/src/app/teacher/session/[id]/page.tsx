"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  AreaChart, Area, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

import {
  getSessionLiveMetrics, getSessionChatPolicy, updateSessionChatPolicy, postSessionMessage,
  type SessionLiveMetrics, type SessionChatPolicy, type LiveMetricsParticipant,
} from "@/lib/api/teacher";
import { getApiBaseUrl, hasAuth, isRealSessionId } from "@/lib/api/client";

import { SignalingClient } from "@/lib/webrtc/signalingClient";
import { PeerConnectionManager } from "@/lib/webrtc/peerConnectionManager";
import type { Participant } from "@/lib/webrtc/types";
import { getWsBaseUrl } from "@/lib/env";
import { SessionChatPanel } from "@/components/chat/SessionChatPanel";
import CameraCheck from "@/components/session/CameraCheck";
import Modal from "@/components/ui/Modal";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

import {
  ArrowLeft, PhoneOff, Mic, Video, MicOff, VideoOff, MonitorUp,
  MessageSquare, Users, Layout, FileText,
  Pin, Clock, Smile, TrendingUp, Zap,
  BrainCircuit, Pencil, AlertTriangle, Sparkles, Send, Settings, LogOut, Info
} from "lucide-react";

type SessionPhase = "preflight" | "live" | "ended";

const COLORS = { 
  purple: "#7448FF", 
  emerald: "#10B981", 
  rose: "#F43F5E", 
  blue: "#3B82F6", 
  orange: "#F59E0B", 
  slate: "#64748B" 
};

// Emotion tones
function emotionTone(e?: string | null) {
  const v = (e || "").toLowerCase();
  if (v.includes("happy") || v.includes("joy") || v.includes("smile")) return "emerald";
  if (v.includes("neutral") || v.includes("calm")) return "zinc";
  if (v.includes("sad")) return "sky";
  if (v.includes("angry") || v.includes("anger")) return "red";
  if (v.includes("fear") || v.includes("anx")) return "amber";
  if (v.includes("surprise")) return "violet";
  if (v.includes("disgust")) return "lime";
  return "zinc";
}

const EMOTION_PIE_COLORS = {
  emerald: COLORS.emerald,
  zinc: COLORS.slate,
  sky: COLORS.blue,
  red: COLORS.rose,
  amber: COLORS.orange,
  violet: COLORS.purple,
  lime: "#84CC16"
};

function clamp01(x: number) { 
  const n = x > 1 && x <= 100 ? x / 100 : x; 
  if (Number.isNaN(x)) return 0; 
  return Math.max(0, Math.min(1, n)); 
}

function formatPct100(x?: number | null) { 
  if (typeof x !== "number" || Number.isNaN(x)) return "—"; 
  return `${Math.round(clamp01(x) * 100)}%`; 
}

function ChecklistItem({ label, ok, hint }: { label: string; ok: boolean; hint: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
      <div className={`mt-0.5 inline-flex h-4 w-4 shrink-0 rounded-full items-center justify-center ${ok ? "bg-emerald-500" : "bg-rose-500"}`}>
        <div className={`h-1.5 w-1.5 rounded-full bg-white ${!ok && "animate-pulse"}`} />
      </div>
      <div>
        <div className="text-[13px] font-bold text-slate-900">{label}</div>
        <div className="mt-0.5 text-[12px] text-slate-500 font-medium">{hint}</div>
      </div>
    </div>
  );
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-3 py-3 shadow-sm">
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div>
      <div className="mt-1 text-[14px] font-bold text-slate-900">{value}</div>
    </div>
  );
}

function formatParticipantLabel(p?: Participant | "local" | null) {
  if (p === "local") return "Вы · Teacher";
  if (!p) return "Студент";
  return p.fullName || p.email || `${p.role} · ${p.id.slice(0, 8)}`;
}

export default function TeacherLiveMonitorPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params?.id ?? "";
  const router = useRouter();

  const [phase, setPhase] = useState<SessionPhase>("preflight");
  const [liveSeconds, setLiveSeconds] = useState(0);

  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  // WebRTC Complex States (from old logic)
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const [liveMetrics, setLiveMetrics] = useState<SessionLiveMetrics | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<{ time: string; engagement: number; stress: number; risk: number }[]>([]);
  const [chatPolicy, setChatPolicy] = useState<SessionChatPolicy | null>(null);

  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const [connectionState, setConnectionState] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [wsDisconnected, setWsDisconnected] = useState(false);
  
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  
  const [focusedParticipant, setFocusedParticipant] = useState<Participant | "local" | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  // Refs
  const peerManagerRef = useRef<PeerConnectionManager | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // UI state
  const [sessionTitle, setSessionTitle] = useState("Загрузка...");
  const [sessionType, setSessionType] = useState<"lecture" | "exam">("lecture");
  const [activeTab, setActiveTab] = useState<"board" | "materials" | "notes">("board");

  const [localNotes, setLocalNotes] = useState("");

  const apiAvailable = Boolean(getApiBaseUrl() && hasAuth());
  const wsUrl = getWsBaseUrl();
  const roomId = sessionId;
  const isLive = phase === "live";

  // Bootup
  useEffect(() => {
    import("@/lib/api/teacher").then(({ getTeacherDashboardSessions }) => {
      getTeacherDashboardSessions().then((sessions) => {
        const s = sessions.find((x) => x.id === sessionId);
        if (s) {
          setSessionTitle(s.title);
          setSessionType(s.type);
        }
      });
    }).catch(()=>{});
  }, [sessionId]);

  useEffect(() => {
    if (!isLive) return;
    const id = window.setInterval(() => setLiveSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [isLive]);

  // WebRTC Connection Logic
  useEffect(() => {
    if (!isLive || !roomId) {
      setConnectionState("idle");
      setConnectionError(null);
      return;
    }

    setConnectionState("connecting");
    setConnectionError(null);
    setMediaError(null);

    if (!wsUrl?.startsWith("ws")) {
      setConnectionError("Не настроен адрес сервера эфира (WS). Проверьте NEXT_PUBLIC_WS_BASE_URL.");
      setConnectionState("error");
      setPhase("preflight");
      return;
    }

    const signaling = new SignalingClient(`${wsUrl}/ws`);
    const manager = new PeerConnectionManager(signaling, roomId, "teacher", {
      onRemoteStream: (peerId, stream) => {
        const hasTracks = stream.getTracks().length > 0;
        setRemoteStreams((prev) => {
          if (!hasTracks) {
            const next = { ...prev };
            delete next[peerId];
            return next;
          }
          return { ...prev, [peerId]: stream };
        });
      },
      onPeersChange: (peers) => {
        setParticipants(peers);
        setRemoteStreams((prev) => {
          const ids = new Set(peers.map((p) => p.id));
          const next = { ...prev };
          Object.keys(next).forEach((id) => {
            if (!ids.has(id)) delete next[id];
          });
          return next;
        });
      },
      onDisconnect: () => setWsDisconnected(true),
    });

    peerManagerRef.current = manager;
    signaling.connect();

    void (async () => {
      try {
        const stream = await manager.initLocalStream({ video: true, audio: true });
        setLocalStream(stream);
        setIsMicEnabled(true);
        setIsCameraEnabled(true);

        import("@/lib/api/client").then(({ getStoredAuth }) => {
          const auth = getStoredAuth();
          manager.join(auth ? {
            email: auth.email,
            fullName: auth.fullName || undefined,
            firstName: auth.firstName || undefined,
            lastName: auth.lastName || undefined
          } : undefined);
        });

        await signaling.waitForOpen(12000);
        setConnectionState("connected");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Ошибка подключения";
        const friendly = msg.includes("timeout") || msg.includes("WebSocket")
          ? "Не удалось подключиться к серверу эфира. Проверьте интернет и настройки WS."
          : msg.includes("Permission") || msg.includes("NotAllowed") || msg.includes("NotFound")
            ? "Камера или микрофон недоступны. Проверьте разрешения в браузере."
            : "Не удалось запустить эфир. Проверьте камеру и подключение.";

        setConnectionError(friendly);
        setConnectionState("error");
        setPhase("preflight");
        manager.leave();
        setRemoteStreams({});
        setLocalStream(null);
        setParticipants([]);
      }
    })();

    return () => {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      peerManagerRef.current = null;
      manager.leave();
      setRemoteStreams({});
      setLocalStream(null);
      setParticipants([]);
      setIsScreenSharing(false);
      setConnectionState("idle");
      setConnectionError(null);
      setWsDisconnected(false);
    };
  }, [isLive, roomId, wsUrl]);

  // Handle focus fallback
  useEffect(() => {
    if (!focusedParticipant && participants.length > 0) {
      setFocusedParticipant(participants[0]);
    }
    if (focusedParticipant && focusedParticipant !== "local" && !participants.some((p) => p.id === focusedParticipant.id)) {
      setFocusedParticipant(participants[0] ?? "local");
    }
  }, [participants, focusedParticipant]);

  // Load chat policy
  useEffect(() => {
    if (!roomId || !apiAvailable || !isRealSessionId(roomId)) {
      setChatPolicy(null);
      return;
    }
    let mounted = true;
    getSessionChatPolicy(roomId).then((p) => { if (mounted && p) setChatPolicy(p); });
    return () => { mounted = false; };
  }, [roomId, apiAvailable]);

  // Live Metrics Polling setup
  useEffect(() => {
    if (!isLive || !roomId || !apiAvailable || !isRealSessionId(roomId)) {
      setLiveMetrics(null);
      return;
    }

    let stopped = false;
    let timer: number | null = null;
    let inflight = false;

    const tick = async () => {
      if (stopped) return;
      if (inflight) { timer = window.setTimeout(tick, 700); return; }
      inflight = true;

      try {
        const data = await getSessionLiveMetrics(roomId);
        if (!stopped && data) {
          setLiveMetrics(data);
          
          // History mapping for charts
          const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const mlParticipants = data.participants ?? [];
          
          const e_val = data.avgEngagement ?? (mlParticipants.length ? mlParticipants.reduce((a, p) => a + (typeof p.engagement === "number" ? p.engagement : 0), 0) / Math.max(1, mlParticipants.filter((p) => typeof p.engagement === "number").length) : 0);
          const s_val = data.avgStress ?? (mlParticipants.length ? mlParticipants.reduce((a, p) => a + (typeof p.stress === "number" ? p.stress : 0), 0) / Math.max(1, mlParticipants.filter((p) => typeof p.stress === "number").length) : 0);
          const r_val = data.avgRisk ?? 0;

          setMetricsHistory(prev => {
            const next = [...prev, {
              time: now,
              engagement: Math.round(e_val * 100),
              stress: Math.round(s_val * 100),
              risk: Math.round(r_val * 100)
            }];
            return next.slice(-30);
          });
        }
      } finally {
        inflight = false;
        if (!stopped) timer = window.setTimeout(tick, 2000);
      }
    };
    void tick();
    return () => { stopped = true; if (timer) window.clearTimeout(timer); };
  }, [isLive, roomId, apiAvailable]);

  // Metrics extraction helpers
  const mlParticipants = liveMetrics?.participants ?? [];
  const hasMl = mlParticipants.length > 0;
  
  const avgEngagement = metricsHistory.length > 0 ? metricsHistory[metricsHistory.length - 1].engagement / 100 : 0;
  const avgStress = metricsHistory.length > 0 ? metricsHistory[metricsHistory.length - 1].stress / 100 : 0;
  const avgRisk = metricsHistory.length > 0 ? metricsHistory[metricsHistory.length - 1].risk / 100 : 0;

  const gates = { backend: apiAvailable, ws: Boolean(wsUrl), camera: cameraReady };
  const criticalOk = gates.backend && gates.ws && gates.camera;

  const formatTimer = () => {
    const m = Math.floor(liveSeconds / 60);
    const s = liveSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Video Track Toggles
  const stopScreenShare = async () => {
    const manager = peerManagerRef.current;
    if (!manager || !localStream) return;
    const cameraTrack = localStream.getVideoTracks()[0] ?? null;
    if (cameraTrack) cameraTrack.enabled = isCameraEnabled;
    await manager.replaceOutgoingVideoTrack(isCameraEnabled ? cameraTrack : null);
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setIsScreenSharing(false);
  };

  const toggleMic = () => {
    const next = !isMicEnabled;
    peerManagerRef.current?.setAudioEnabled(next);
    setIsMicEnabled(next);
  };

  const toggleCamera = async () => {
    if (isScreenSharing) return;
    const next = !isCameraEnabled;
    peerManagerRef.current?.setVideoEnabled(next);
    setIsCameraEnabled(next);
  };

  const toggleScreenShare = async () => {
    const manager = peerManagerRef.current;
    if (!manager || !localStream) return;
    if (isScreenSharing) {
      await stopScreenShare();
      return;
    }
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const displayTrack = displayStream.getVideoTracks()[0];
      if (!displayTrack) return;
      screenStreamRef.current = displayStream;
      await manager.replaceOutgoingVideoTrack(displayTrack);
      setIsScreenSharing(true);
      setMediaError(null);
      displayTrack.onended = () => void stopScreenShare();
    } catch {
      setMediaError("Не удалось запустить демонстрацию экрана.");
    }
  };

  // Stage Focus Logic
  const activeRemoteParticipant = focusedParticipant && focusedParticipant !== "local" ? focusedParticipant : participants[0] ?? null;
  const hasRemoteFocus = !!activeRemoteParticipant && !!remoteStreams[activeRemoteParticipant.id];
  const activeMainLabel = hasRemoteFocus && activeRemoteParticipant ? formatParticipantLabel(activeRemoteParticipant) : "Вы · Teacher";

  // Active Pie Chart Data
  const emotionStats = useMemo(() => {
    if (!hasMl) return [];
    const counts: Record<string, number> = {};
    mlParticipants.forEach(p => {
      const e = p.emotion || "neutral";
      counts[e] = (counts[e] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ 
      name, value, 
      tone: emotionTone(name) as keyof typeof EMOTION_PIE_COLORS 
    }));
  }, [hasMl, mlParticipants]);

  // RENDER: PREFLIGHT
  if (phase === "preflight") {
    return (
      <div className="min-h-screen bg-[#FAFAFB] flex flex-col pt-12 px-6 pb-24 selection:bg-purple-100 selection:text-[#7448FF] overflow-y-auto">
        <div className="mx-auto w-full max-w-[1000px] space-y-8">
          <header className="flex items-center text-slate-500 transition-colors">
            <Link href="/teacher/sessions" className="flex items-center gap-2 text-[14px] font-bold hover:text-slate-900 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100"><ArrowLeft size={16} /> Назад к сессиям</Link>
          </header>
          
          <div>
            <h1 className="text-[32px] font-extrabold text-slate-900 tracking-tight">Подготовка к эфиру</h1>
            <p className="text-slate-500 font-medium mt-1">Осталось проверить оборудование и подключение перед стартом.</p>
          </div>

          {connectionError && (
            <Card className="border-amber-400/30 bg-amber-50 shadow-none">
              <CardContent className="flex flex-wrap items-center gap-4 p-5">
                 <AlertTriangle className="text-amber-500" size={24} />
                 <div className="flex-1 min-w-[200px]">
                   <div className="font-bold text-slate-900">Ошибка подключения</div>
                   <div className="text-[13px] text-slate-600 font-medium">{connectionError}</div>
                 </div>
                 <Button className="bg-amber-100 text-amber-700 hover:bg-amber-200" onClick={() => { setConnectionError(null); setConnectionState("idle"); }}>Попробовать снова</Button>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8">
            <div className="flex flex-col gap-6">
              <div className="bg-white rounded-[32px] p-2 border border-slate-100 shadow-sm overflow-hidden h-full min-h-[400px]">
                 <CameraCheck onReadyChange={setCameraReady} />
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <Card className="rounded-[32px] border-none shadow-sm bg-white overflow-hidden max-h-min">
                 <CardContent className="p-8 space-y-6">
                   <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-purple-50 text-[#7448FF] rounded-2xl flex items-center justify-center shrink-0">
                        <Sparkles size={20} />
                      </div>
                      <div>
                        <div className="text-[12px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Cheklist</div>
                        <div className="text-[16px] font-bold text-slate-900 leading-tight">Системные проверки</div>
                      </div>
                   </div>
                   <div className="space-y-4 pt-2">
                      <ChecklistItem label="Подключение к API" ok={gates.backend} hint={apiAvailable ? "API сервера доступен" : "Отсутствует подключение или токен"} />
                      <ChecklistItem label="Сигналинг WebRTC" ok={gates.ws} hint={gates.ws ? "Соединение WS настроено" : "Проверьте NEXT_PUBLIC_WS_BASE_URL"} />
                      <ChecklistItem label="Камера и микрофон" ok={gates.camera} hint={gates.camera ? "Разрешения даны, медиа работает" : "Дайте доступ к устройствам"} />
                   </div>
                   
                   {!criticalOk && (
                     <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4 flex items-start gap-3">
                       <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                       <div className="text-[12px] font-medium text-slate-600 leading-relaxed">Пока все проверки не станут зелеными, вы не сможете запустить сессию.</div>
                     </div>
                   )}

                   <div className="pt-4 border-t border-slate-50">
                      <Button 
                        onClick={() => { if(criticalOk) { setPhase("live"); setLiveSeconds(0); } }} 
                        disabled={!criticalOk}
                        className="w-full h-14 rounded-2xl font-bold bg-[#7448FF] hover:bg-purple-600 shadow-[0_10px_25px_rgba(116,72,255,0.2)] disabled:opacity-50 disabled:shadow-none transition-all"
                      >
                        {criticalOk ? "Начать сессию" : "Ожидание оборудования..."}
                      </Button>
                   </div>
                 </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                 <StatusPill label="Room" value={roomId ? `${roomId.slice(0, 8)}…` : "—"} />
                 <StatusPill label="Backend" value={gates.backend ? "OK" : "Off"} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // RENDER: ENDED
  if (phase === "ended") {
    return (
      <div className="min-h-screen bg-[#FAFAFB] flex flex-col justify-center items-center p-4">
        <Card className="w-full max-w-lg border-none shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-hidden rounded-[32px]">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-emerald-50 rounded-[24px] flex items-center justify-center text-emerald-500 mx-auto mb-8">
              <Zap size={36} />
            </div>
            <h1 className="text-[26px] font-extrabold text-slate-900 mb-2">Сессия завершена</h1>
            <p className="text-slate-500 mb-10 font-medium tracking-tight">Подключение закрыто. Подробный отчет появится в аналитике.</p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <StatusPill label="Duration" value={formatTimer()} />
              <StatusPill label="Participants" value={`${participants.length}`} />
            </div>
            <Button onClick={() => router.push("/teacher/sessions")} className="w-full h-14 font-bold bg-[#7448FF] hover:bg-purple-600">
              Вернуться к списку
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // RENDER: LIVE
  return (
    <div className="min-h-screen bg-[#FAFAFB] text-slate-900 font-sans selection:bg-purple-100 selection:text-[#7448FF]">
      <div className="mx-auto max-w-[1700px] px-4 sm:px-6 py-6 h-screen flex flex-col min-h-0">

        {/* HEADER */}
        <header className="flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-6">
            <Link href="/teacher/sessions" className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all hover:shadow-md shrink-0">
              <ArrowLeft size={20} />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900 truncate">{sessionTitle}</h1>
                <Badge className="bg-purple-50 text-[#7448FF] border-none font-bold px-2.5 py-0.5 shrink-0">Онлайн</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] font-bold text-slate-400">
                <span className="truncate">Фокус: <span className="text-slate-600 underline decoration-slate-200 underline-offset-4 cursor-pointer">{formatParticipantLabel(focusedParticipant)}</span></span>
                <span className="flex items-center gap-1.5 text-emerald-500 font-bold shrink-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> {formatTimer()}
                </span>
                {connectionState === "connecting" && (
                  <span className="flex items-center gap-1.5 text-orange-500 shrink-0"><div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" /> reconnecting...</span>
                )}
              </div>
            </div>
          </div>
          <Button
            onClick={() => setConfirmEndOpen(true)}
            variant="outline"
            className="border-rose-100 bg-white text-rose-500 hover:bg-rose-50 font-bold h-11 px-6 rounded-[16px] transition-all shadow-sm shrink-0"
          >
            Завершить
          </Button>
        </header>

        {/* MAIN GRID */}
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-8 min-h-0 overflow-hidden pb-4">

          {/* LEFT CONTENT AREA */}
          <div className="flex flex-col gap-6 min-h-0 overflow-y-auto pr-2 custom-scrollbar">

            {/* THUMBNAILS ROW */}
            {participants.length > 0 && (
              <div className="flex gap-3 overflow-x-auto shrink-0 pb-2 hide-scrollbar">
                {participants.map(p => {
                  const isActive = focusedParticipant !== "local" && focusedParticipant?.id === p.id;
                  return (
                    <button
                      key={p.id} onClick={() => setFocusedParticipant(p)}
                      className={cn("px-4 py-2 rounded-2xl border bg-white flex items-center justify-between min-w-[200px] transition text-left shadow-sm shrink-0", isActive ? "border-[#7448FF] ring-2 ring-[#7448FF]/20" : "border-slate-100 hover:border-slate-200 hover:bg-slate-50")}
                    >
                      <div className="min-w-0 pr-3">
                         <div className="text-[13px] font-bold text-slate-900 truncate">{formatParticipantLabel(p)}</div>
                         <div className="text-[11px] font-medium text-slate-400 mt-0.5">{remoteStreams[p.id] ? "Видео потоком" : "Ожидание медиа"}</div>
                      </div>
                      <div className={`shrink-0 w-2 h-2 rounded-full ${remoteStreams[p.id] ? "bg-emerald-500" : "bg-orange-400 animate-pulse"}`} />
                    </button>
                  )
                })}
              </div>
            )}

            {/* HERO VIDEO MONITOR */}
            <div className="relative aspect-[16/9] min-h-[360px] rounded-[32px] overflow-hidden bg-slate-900 shadow-[0_12px_45px_rgba(0,0,0,0.08)] group border border-slate-100 shrink-0">
               {hasRemoteFocus && activeRemoteParticipant ? (
                  <video
                     ref={el => { if(el && remoteStreams[activeRemoteParticipant.id]){ el.srcObject = remoteStreams[activeRemoteParticipant.id]; el.play().catch(()=>{}); } }}
                     autoPlay playsInline muted={false}
                     className="w-full h-full object-cover"
                  />
               ) : (
                  <video
                     ref={el => { if(el && localStream){ el.srcObject = localStream; el.play().catch(()=>{}); } }}
                     autoPlay playsInline muted
                     className="w-full h-full object-cover"
                  />
               )}
               
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

               <div className="absolute top-6 left-6 z-10 flex items-center gap-3">
                 {isScreenSharing && (
                   <div className="bg-sky-500/80 backdrop-blur-xl border border-sky-500/20 text-white px-3 py-1.5 rounded-xl flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
                     <MonitorUp size={14} /> Screen Share ON
                   </div>
                 )}
                 {wsDisconnected && (
                   <div className="bg-amber-500/80 backdrop-blur-xl border border-amber-500/20 text-white px-3 py-1.5 rounded-xl flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider shadow-lg">
                     <AlertTriangle size={14} /> WS Off
                   </div>
                 )}
                 {mediaError && (
                   <div className="bg-rose-500/80 backdrop-blur-xl border border-rose-500/20 text-white px-3 py-1.5 rounded-xl flex items-center gap-2 text-[11px] font-bold shadow-lg">
                     {mediaError}
                   </div>
                 )}
               </div>

               {/* Remote Badge */}
               <div className="absolute bottom-6 left-6 z-10 transition-transform group-hover:-translate-y-1">
                 <div className="bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl text-[12px] text-white font-bold flex items-center gap-2 border border-white/10">
                    <div className={`w-2 h-2 rounded-full ${hasRemoteFocus ? "bg-emerald-400" : "bg-purple-400"}`} />
                    {activeMainLabel}
                 </div>
               </div>

               {/* LOCAL PIP INSET */}
               {hasRemoteFocus && (
                 <button onClick={() => setFocusedParticipant("local")} className="absolute bottom-6 right-6 w-48 aspect-video bg-slate-800 rounded-[20px] overflow-hidden border border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.4)] z-20 hover:scale-105 transition-transform duration-300 text-left">
                    <video autoPlay playsInline muted ref={el => { if(el && localStream){ el.srcObject = localStream; el.play().catch(()=>{}); } }} className="w-full h-full object-cover" />
                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] text-white font-bold flex items-center gap-1.5">Вы <div className="w-1.5 h-1.5 rounded-full bg-purple-400" /></div>
                 </button>
               )}
            </div>

            {/* CALL CONTROLS */}
            <div className="flex items-center justify-center gap-6 py-2 shrink-0">
               <button onClick={toggleMic} className={cn("w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-sm", isMicEnabled ? 'bg-white text-[#7448FF] hover:bg-purple-50 hover:text-purple-700 border border-slate-100 hover:border-purple-200' : 'bg-rose-500 text-white hover:bg-rose-600 shadow-[0_8px_20px_rgba(244,63,94,0.3)]')}>
                 {isMicEnabled ? <Mic size={24} /> : <MicOff size={24} />}
               </button>
               <button onClick={toggleCamera} disabled={isScreenSharing} className={cn("w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-sm disabled:opacity-50", isCameraEnabled && !isScreenSharing ? 'bg-white text-[#7448FF] hover:bg-purple-50 hover:text-purple-700 border border-slate-100 hover:border-purple-200' : 'bg-rose-500 text-white hover:bg-rose-600 shadow-[0_8px_20px_rgba(244,63,94,0.3)]')}>
                 {isCameraEnabled && !isScreenSharing ? <Video size={24} /> : <VideoOff size={24} />}
               </button>
               <button onClick={toggleScreenShare} className={cn("w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-sm relative group", isScreenSharing ? 'bg-[#7448FF] text-white hover:bg-purple-600 shadow-[0_8px_24px_rgba(116,72,255,0.4)]' : 'bg-white text-[#7448FF] hover:bg-purple-50 hover:text-purple-700 border border-slate-100 hover:border-purple-200')}>
                 <MonitorUp size={24} />
               </button>
               <button className="xl:hidden w-14 h-14 rounded-full flex items-center justify-center bg-white border border-slate-100 text-slate-400 hover:text-slate-600 shadow-sm" onClick={() => setChatOpen(!chatOpen)}>
                 <MessageSquare size={24} />
                 {chatOpen && <div className="absolute top-0 right-0 w-3 h-3 bg-rose-500 rounded-full border-2 border-[#FAFAFB]" />}
               </button>
               <button onClick={() => setConfirmEndOpen(true)} className="w-16 h-16 rounded-full bg-rose-500 text-white hover:bg-rose-600 flex items-center justify-center transition-all shadow-[0_8px_20px_rgba(244,63,94,0.3)] hover:scale-105">
                 <PhoneOff size={26} fill="currentColor" />
               </button>
            </div>

            {/* TABBED WORKSPACE */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm flex flex-col flex-1 min-h-[450px]">
              <div className="flex border-b border-slate-50 px-4 sm:px-8 overflow-x-auto hide-scrollbar">
                {["Доска", "Материалы", "Заметки"].map((t) => {
                  const id = t === "Доска" ? "board" : t === "Материалы" ? "materials" : "notes";
                  const active = activeTab === id;
                  return (
                    <button
                      key={id} onClick={() => setActiveTab(id as any)}
                      className={cn("h-16 px-6 font-bold text-sm transition-all relative shrink-0", active ? "text-[#7448FF]" : "text-slate-400 hover:text-slate-600")}
                    >
                      {t}
                      {active && <div className="absolute bottom-0 left-0 w-full h-1 bg-[#7448FF] rounded-t-full shrink-0" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex-1 p-6 flex flex-col min-h-[300px]">
                {activeTab === "board" && (
                  <div className="flex-1 border-2 border-slate-100 border-dashed rounded-[24px] flex items-center justify-center bg-slate-50/50 p-6 text-center">
                    <div>
                      <div className="w-16 h-16 bg-white rounded-[20px] shadow-sm flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <Layout size={32} strokeWidth={1.5} />
                      </div>
                      <p className="font-bold text-slate-900 mb-1">Доска не подключена</p>
                      <p className="text-[13px] text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">Инструмент совместного рисования не имеет источника данных на бэкенде в текущей сессии.</p>
                    </div>
                  </div>
                )}
                {activeTab === "materials" && (
                  <div className="flex-1 border-2 border-slate-100 border-dashed rounded-[24px] flex items-center justify-center bg-slate-50/50 p-6 text-center">
                    <div>
                      <div className="w-16 h-16 bg-white rounded-[20px] shadow-sm flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <FileText size={32} strokeWidth={1.5} />
                      </div>
                      <p className="font-bold text-slate-900 mb-1">Нет прикрепленных материалов</p>
                      <p className="text-[13px] text-slate-400 font-medium">Файлы для этого урока пока не загружены сервером.</p>
                    </div>
                  </div>
                )}
                {activeTab === "notes" && (
                  <div className="h-full flex flex-col">
                    <textarea
                      value={localNotes}
                      onChange={(e) => setLocalNotes(e.target.value)}
                      className="w-full flex-1 p-6 rounded-[24px] bg-slate-50/50 border border-slate-100 text-sm font-medium text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#7448FF]/10 transition-all resize-none"
                      placeholder="Напишите локальную черновую заметку..."
                    />
                    <div className="mt-4 flex justify-start items-center px-2">
                       <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-100">
                         <AlertTriangle size={14} className="text-orange-500" />
                         <span className="text-[11px] font-bold text-orange-600">Черновик не сохраняется на сервере</span>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* BOTTOM SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 shrink-0">
              <Card className="rounded-[32px] border-none shadow-sm overflow-hidden min-h-[340px] flex flex-col">
                <header className="px-8 pt-8 pb-4 flex items-center justify-between shrink-0">
                  <h3 className="font-extrabold text-slate-900 text-[15px] uppercase tracking-wider">Динамика ML</h3>
                  <TrendingUp size={18} className="text-[#7448FF]" />
                </header>
                <CardContent className="px-6 pb-6 pt-0 flex-1 flex flex-col">
                  {hasMl ? (
                    <div className="flex-1 w-full min-w-0 min-h-[160px] relative">
                      {isClient && (
                        <ResponsiveContainer width="99%" height="100%">
                           <AreaChart data={metricsHistory}>
                             <defs>
                                <linearGradient id="colorEngage" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.1}/><stop offset="95%" stopColor={COLORS.purple} stopOpacity={0}/></linearGradient>
                                <linearGradient id="colorStress" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={COLORS.rose} stopOpacity={0.1}/><stop offset="95%" stopColor={COLORS.rose} stopOpacity={0}/></linearGradient>
                             </defs>
                             <Area type="monotone" dataKey="engagement" stroke={COLORS.purple} fillOpacity={1} fill="url(#colorEngage)" strokeWidth={3} isAnimationActive={false} />
                             <Area type="monotone" dataKey="stress" stroke={COLORS.rose} fillOpacity={1} fill="url(#colorStress)" strokeWidth={2} strokeDasharray="3 3" isAnimationActive={false} />
                           </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-[13px] font-bold text-slate-300">Сбор данных потока...</div>
                  )}
                  <div className="flex flex-wrap items-center gap-6 mt-4 pl-4 shrink-0">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#7448FF]" /><span className="text-[11px] font-bold text-slate-400">Вовлечённость</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full border-2 border-rose-400 border-dashed bg-white" /><span className="text-[11px] font-bold text-slate-400">Стресс</span></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[32px] border-none shadow-sm overflow-hidden min-h-[340px] flex flex-col">
                <header className="px-8 pt-8 pb-4 flex items-center justify-between shrink-0">
                  <h3 className="font-extrabold text-slate-900 text-[15px] uppercase tracking-wider">Эмоции</h3>
                  <Smile size={18} className="text-emerald-500" />
                </header>
                <CardContent className="px-6 pb-6 pt-0 flex-1 flex flex-col items-center">
                  {hasMl && emotionStats.length > 0 ? (
                    <>
                      <div className="flex-1 w-full min-w-0 relative">
                        {isClient && (
                          <ResponsiveContainer width="99%" height="100%">
                            <PieChart>
                              <Pie data={emotionStats} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value">
                                {emotionStats.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={EMOTION_PIE_COLORS[entry.tone] || COLORS.slate} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                      <div className="flex flex-wrap justify-center gap-4 mt-2 shrink-0">
                        {emotionStats.map((e) => (
                          <div key={e.name} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: EMOTION_PIE_COLORS[e.tone] || COLORS.slate }} />
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{e.name}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-[13px] font-bold text-slate-300">Ожидание выражений лица</div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* ADDITIONAL PANELS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0 mt-2">
              <Card className="rounded-[32px] border-none shadow-sm overflow-hidden bg-white">
                <header className="px-6 pt-6 pb-4"><h3 className="font-extrabold text-slate-900 text-[14px]">План занятия</h3></header>
                <CardContent className="px-6 pb-6 pt-0 space-y-3">
                  <div className="p-6 text-center text-slate-400 text-[13px] font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-100">
                    Модуль плана недоступен
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-[32px] border-none shadow-sm overflow-hidden bg-white">
                <header className="px-6 pt-6 pb-4"><h3 className="font-extrabold text-slate-900 text-[14px]">Заметки</h3></header>
                <CardContent className="px-6 pb-6 pt-0">
                  <div className="p-6 text-center text-slate-400 text-[13px] font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-100">
                     Панель быстрого доступа пуста
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-[32px] border-none shadow-sm overflow-hidden bg-white flex flex-col">
                <header className="px-6 pt-6 pb-4"><h3 className="font-extrabold text-slate-900 text-[14px]">Сессионные файлы</h3></header>
                <CardContent className="px-6 pb-6 pt-0 flex-1 flex">
                   <div className="w-full text-center text-slate-400 text-[13px] font-medium bg-slate-50/50 rounded-2xl border border-dashed border-slate-100 flex items-center justify-center">
                     Нет файлов для сессии
                   </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* SIDEBAR */}
          <aside className={cn("w-full bg-white rounded-[32px] border border-slate-100 shadow-sm xl:flex xl:min-h-0 xl:flex-col overflow-hidden", chatOpen ? "flex min-h-0 flex-col fixed inset-0 z-50 rounded-none border-none sm:relative sm:inset-auto sm:z-auto" : "hidden xl:flex")}>
            {/* REAL-TIME ANALYSIS HEADER */}
            <header className="p-6 pb-4 flex items-center justify-between border-b border-slate-50 shrink-0">
              <h3 className="font-extrabold text-slate-900 text-[14px] uppercase tracking-widest flex items-center gap-2">
                Real-time Control
                <div className="px-2 py-0.5 bg-rose-50 text-rose-500 text-[9px] rounded-md font-black animate-pulse">LIVE</div>
              </h3>
              <div className="flex items-center gap-2">
                 <button className="xl:hidden text-slate-400 p-2" onClick={() => setChatOpen(false)}><LogOut size={16} /></button>
                 <div className="w-8 h-8 rounded-[10px] bg-slate-50 flex items-center justify-center text-slate-400"><BrainCircuit size={16} /></div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0">
               {/* Metrics Stats Block */}
               <div className="p-6 border-b border-slate-50 space-y-6">
                 {/* Group State Pill */}
                 <div className="flex items-center gap-4 p-4 bg-purple-50/50 rounded-2xl border border-purple-100/50">
                    <div className="w-12 h-12 bg-[#7448FF] rounded-xl flex items-center justify-center text-white shadow-md shadow-purple-500/20 shrink-0">
                      <Users size={24} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-black uppercase tracking-widest text-purple-400 mb-0.5">Состояние группы</div>
                      <div className="text-[14px] font-bold text-slate-900 truncate">{liveMetrics?.groupState || "Сбор данных потока..."}</div>
                    </div>
                 </div>

                 {/* Key Progress Bars */}
                 <div className="space-y-5">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        <span>Ср. Вовлеченность</span>
                        <span className="text-[#7448FF]">{Math.round(avgEngagement * 100)}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                        <div className="h-full bg-[#7448FF] transition-all duration-1000 ease-out" style={{ width: `${Math.round(avgEngagement * 100)}%` }} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest">
                        <span>Стресс</span>
                        <span className="text-rose-500">{Math.round(avgStress * 100)}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 transition-all duration-1000 ease-out" style={{ width: `${Math.round(avgStress * 100)}%` }} />
                      </div>
                    </div>
                 </div>
               </div>

               {/* CHAT POLICY & INTEGRITY (merged from old) */}
               <div className="p-6 border-b border-slate-50 space-y-6 shrink-0">
                  <div>
                    <div className="text-[12px] font-black uppercase text-slate-400 tracking-widest mb-3">Настройки чата</div>
                    <select
                      className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-700 outline-none focus:ring-2 disabled:opacity-50"
                      disabled={!apiAvailable || !isRealSessionId(roomId)}
                      value={chatPolicy?.mode ?? "lecture_open"}
                      onChange={async (e) => {
                        try {
                          const updated = await updateSessionChatPolicy(roomId, { mode: e.target.value as SessionChatPolicy["mode"] });
                          setChatPolicy(updated);
                        } catch (err) { console.error(err); }
                      }}
                    >
                      <option value="lecture_open">Свободный чат</option>
                      <option value="questions_only">Только вопросы (Q&A)</option>
                      <option value="locked">Чат заблокирован</option>
                    </select>
                  </div>
                  
                  <div>
                     <div className="flex items-center gap-2 text-[12px] font-black uppercase text-slate-400 tracking-widest mb-3">Integrity Check <Info size={14} className="text-slate-300" /></div>
                     <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 flex flex-col gap-1 items-center justify-center text-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Backend</span>
                          <span className={`text-[12px] font-black ${apiAvailable ? "text-emerald-500" : "text-rose-500"}`}>{apiAvailable ? "OK" : "ERR"}</span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 flex flex-col gap-1 items-center justify-center text-center">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consent</span>
                          <span className="text-[12px] font-black text-emerald-500">ACTIVE</span>
                        </div>
                     </div>
                  </div>
               </div>

               {/* CHAT SESSION PANEL */}
               <div className="flex-1 flex flex-col min-h-0 bg-slate-50/30">
                  <header className="p-5 border-b border-slate-50 flex items-center justify-between shrink-0">
                     <h3 className="font-extrabold text-slate-900 text-[13px] uppercase tracking-widest flex items-center gap-2">
                       Сообщения
                       <Badge className="bg-slate-100 text-slate-500 border-none font-bold px-2 py-0">{participants.length}</Badge>
                     </h3>
                  </header>
                  <div className="flex-1 min-h-0 relative">
                     <SessionChatPanel sessionId={roomId} role="teacher" type={sessionType} />
                  </div>
               </div>
            </div>
          </aside>
        </div>
      </div>

      {/* END SESSION CONFIRMATION MODAL */}
      <Modal open={confirmEndOpen} onClose={() => setConfirmEndOpen(false)} title="Завершить сессию?">
        <div className="p-4 text-center">
          <div className="w-16 h-16 bg-rose-50 rounded-[20px] flex items-center justify-center text-rose-500 mx-auto mb-6">
            <PhoneOff size={32} />
          </div>
          <p className="text-slate-500 font-medium mb-10 leading-relaxed max-w-sm mx-auto">
            Эфир будет остановлен для всех участников. Вы сможете найти запись и подробный отчет в архиве.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Button onClick={() => setConfirmEndOpen(false)} variant="outline" className="h-12 font-bold text-slate-500">Отмена</Button>
            <Button onClick={() => { setConfirmEndOpen(false); setPhase("ended"); setWsDisconnected(false); }} className="h-12 bg-rose-500 hover:bg-rose-600 font-bold shadow-[0_8px_20px_rgba(244,63,94,0.3)] border-none">Да, завершить</Button>
          </div>
        </div>
      </Modal>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
