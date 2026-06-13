"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

import {
  getSessionLiveMetrics,
  getSessionChatPolicy,
  updateSessionChatPolicy,
  updateSessionStatus,
  type SessionLiveMetrics,
  type SessionChatPolicy,
  type LiveMetricsParticipant,
} from "@/lib/api/teacher";
import { getApiBaseUrl, hasAuth, isRealSessionId, getStoredAuth } from "@/lib/api/client";
import {
  getSessionPresence,
  joinSessionPresence,
  leaveSessionPresence,
  type SessionPresenceRow,
} from "@/lib/api/presence";

import { SignalingClient } from "@/lib/webrtc/signalingClient";
import { PeerConnectionManager } from "@/lib/webrtc/peerConnectionManager";
import type { Participant } from "@/lib/webrtc/types";
import { getWsBaseUrl } from "@/lib/env";
import { SessionChatPanel } from "@/components/chat/SessionChatPanel";
import { SessionContentEditor } from "@/components/session/SessionContentEditor";
import { SessionNotesPanel } from "@/components/session/SessionNotesPanel";
import { SessionMaterialsPanel } from "@/components/session/SessionMaterialsPanel";
import { SessionWhiteboard } from "@/components/session/SessionWhiteboard";
import { ZoomVideoTile } from "@/components/session/ZoomVideoTile";
import { ZoomMeetingControls } from "@/components/session/ZoomMeetingControls";
import CameraCheck from "@/components/session/CameraCheck";
import Modal from "@/components/ui/Modal";
import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

import {
  ArrowLeft,
  PhoneOff,
  Users,
  Layout,
  FileText,
  AlertTriangle,
  Sparkles,
  LogOut,
  BrainCircuit,
  TrendingUp,
  Info,
  Maximize2,
  ShieldCheck,
} from "lucide-react";

type SessionPhase = "preflight" | "live" | "ended";

const COLORS = {
  purple: "#7448FF",
  rose: "#F43F5E",
};

function normalizeKey(v?: string | null) {
  return (v || "").trim().toLowerCase();
}

function formatPersonName(input?: {
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  role?: string | null;
} | null) {
  if (!input) return "Участник";

  const fullName = input.fullName?.trim();
  if (fullName) return fullName;

  const first = input.firstName?.trim() || "";
  const last = input.lastName?.trim() || "";
  const composed = `${first} ${last}`.trim();
  if (composed) return composed;

  if (input.email) return input.email;
  if (input.role) return input.role === "teacher" ? "Преподаватель" : "Студент";

  return "Участник";
}

function formatParticipantLabel(p?: Participant | "local" | null) {
  if (p === "local") return "Вы";
  if (!p) return "Студент";

  return formatPersonName({
    fullName: p.fullName,
    firstName: (p as { firstName?: string | null }).firstName,
    lastName: (p as { lastName?: string | null }).lastName,
    email: p.email,
    role: p.role,
  });
}

function getMetricLabel(metric?: LiveMetricsParticipant | null) {
  if (!metric) return null;

  return formatPersonName({
    fullName: metric.fullName,
    firstName: metric.firstName,
    lastName: metric.lastName,
    email: metric.email,
  });
}

function participantHasIdentity(participant?: Participant | null) {
  if (!participant) return false;

  return Boolean(
      participant.fullName?.trim() ||
      (participant as { firstName?: string | null }).firstName?.trim() ||
      (participant as { lastName?: string | null }).lastName?.trim() ||
      participant.email?.trim()
  );
}

function getParticipantDisplayName(
    participant?: Participant | "local" | null,
    metric?: LiveMetricsParticipant | null
) {
  if (participant === "local") return "Вы";
  if (participant && participantHasIdentity(participant)) {
    return formatParticipantLabel(participant);
  }
  return getMetricLabel(metric) || formatParticipantLabel(participant);
}

function formatMetricPercent(value?: number | null) {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "—";
}

function ChecklistItem({
                         label,
                         ok,
                         hint,
                       }: {
  label: string;
  ok: boolean;
  hint: string;
}) {
  return (
      <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
        <div
            className={cn(
                "mt-0.5 inline-flex h-4 w-4 shrink-0 rounded-full items-center justify-center",
                ok ? "bg-emerald-500" : "bg-rose-500"
            )}
        >
          <div className={cn("h-1.5 w-1.5 rounded-full bg-white", !ok && "animate-pulse")} />
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
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          {label}
        </div>
        <div className="mt-1 text-[14px] font-bold text-slate-900">{value}</div>
      </div>
  );
}

function buildParticipantMetricsMap(
    participants: Participant[],
    mlParticipants: LiveMetricsParticipant[]
) {
  const map = new Map<string, LiveMetricsParticipant | null>();
  const assignedMetricIds = new Set<string>();
  const unresolvedParticipants: Participant[] = [];

  const getMetricId = (metric: LiveMetricsParticipant, index: number) =>
      `${metric.userId || "metric"}:${metric.email || metric.fullName || index}`;

  for (const participant of participants) {
    const participantUserId = normalizeKey(participant.userId);
    const participantEmail = normalizeKey(participant.email);
    const participantFullName = normalizeKey(
        participant.fullName ||
        `${(participant as { firstName?: string | null }).firstName || ""} ${(participant as {
          lastName?: string | null;
        }).lastName || ""}`.trim()
    );

    const candidates = mlParticipants.filter((metric, index) => {
      const metricId = getMetricId(metric, index);
      if (assignedMetricIds.has(metricId)) return false;

      const userIdMatch =
          normalizeKey(metric.userId) &&
          participantUserId &&
          normalizeKey(metric.userId) === participantUserId;
      const emailMatch =
          normalizeKey(metric.email) &&
          participantEmail &&
          normalizeKey(metric.email) === participantEmail;
      const fullNameMatch =
          normalizeKey(metric.fullName) &&
          participantFullName &&
          normalizeKey(metric.fullName) === participantFullName;

      return Boolean(userIdMatch || emailMatch || fullNameMatch);
    });

    if (candidates.length === 1) {
      const metric = candidates[0];
      map.set(participant.id, metric);
      assignedMetricIds.add(getMetricId(metric, mlParticipants.indexOf(metric)));
    } else {
      unresolvedParticipants.push(participant);
    }
  }

  if (participants.length === 1 && mlParticipants.length === 1) {
    map.set(participants[0].id, mlParticipants[0]);
    return map;
  }

  const remainingMetrics = mlParticipants.filter(
      (metric, index) => !assignedMetricIds.has(getMetricId(metric, index))
  );

  if (unresolvedParticipants.length === 1 && remainingMetrics.length === 1) {
    map.set(unresolvedParticipants[0].id, remainingMetrics[0]);
  }

  for (const participant of unresolvedParticipants) {
    if (!map.has(participant.id)) {
      map.set(participant.id, null);
    }
  }

  return map;
}

export default function TeacherLiveMonitorPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params?.id ?? "";
  const router = useRouter();

  const [phase, setPhase] = useState<SessionPhase>("preflight");
  const [liveSeconds, setLiveSeconds] = useState(0);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [presence, setPresence] = useState<SessionPresenceRow[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const [liveMetrics, setLiveMetrics] = useState<SessionLiveMetrics | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<
      { time: string; engagement: number; stress: number; risk: number }[]
  >([]);
  const [chatPolicy, setChatPolicy] = useState<SessionChatPolicy | null>(null);

  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const [connectionState, setConnectionState] = useState<
      "idle" | "connecting" | "connected" | "error"
  >("idle");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [wsDisconnected, setWsDisconnected] = useState(false);

  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [meetingView, setMeetingView] = useState<"gallery" | "speaker">("gallery");
  const [isMeetingFullscreen, setIsMeetingFullscreen] = useState(false);

  const [focusedParticipant, setFocusedParticipant] = useState<Participant | "local" | null>(
      null
  );
  const [cameraReady, setCameraReady] = useState(false);

  const peerManagerRef = useRef<PeerConnectionManager | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const chatSectionRef = useRef<HTMLDivElement | null>(null);
  const meetingRef = useRef<HTMLDivElement | null>(null);

  const [sessionTitle, setSessionTitle] = useState("Загрузка...");
  const [sessionType, setSessionType] = useState<"lecture" | "exam">("lecture");
  const [activeTab, setActiveTab] = useState<"board" | "materials" | "notes">("board");
  const [auth, setAuth] = useState<ReturnType<typeof getStoredAuth>>(null);
  const [chartReady, setChartReady] = useState(false);

  const apiAvailable = Boolean(getApiBaseUrl() && hasAuth());
  const wsUrl = getWsBaseUrl().replace(/^ws/, "http");

  useEffect(() => {
    setChartReady(true);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsMeetingFullscreen(document.fullscreenElement === meetingRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);
  const roomId = sessionId;
  const isLive = phase === "live";

  useEffect(() => {
    if (!isLive || !apiAvailable || !roomId) {
      setPresence([]);
      return;
    }

    const controller = new AbortController();
    let closed = false;

    void joinSessionPresence(roomId, { signal: controller.signal }).catch(() => {});

    const load = async () => {
      try {
        const list = await getSessionPresence(roomId, { signal: controller.signal });
        if (!closed) setPresence(Array.isArray(list) ? list : []);
      } catch {
        if (!closed) setPresence([]);
      }
    };

    void load();
    const interval = window.setInterval(load, 5000);

    return () => {
      closed = true;
      window.clearInterval(interval);
      controller.abort();
      void leaveSessionPresence(roomId).catch(() => {});
    };
  }, [apiAvailable, isLive, roomId]);

  const teacherDisplayName = useMemo(
      () =>
          formatPersonName({
            fullName: auth?.fullName,
            firstName: auth?.firstName,
            lastName: auth?.lastName,
            email: auth?.email,
            role: "teacher",
          }),
      [auth]
  );
  useEffect(() => {
    setAuth(getStoredAuth());
  }, []);

  useEffect(() => {
    import("@/lib/api/teacher")
        .then(({ getTeacherDashboardSessions }) => {
          return getTeacherDashboardSessions().then((sessions) => {
            const s = sessions.find((x) => x.id === sessionId);
            if (s) {
              setSessionTitle(s.title);
              setSessionType(s.type);
            }
          });
        })
        .catch(() => {});
  }, [sessionId]);

  useEffect(() => {
    if (!isLive) return;
    const id = window.setInterval(() => setLiveSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [isLive]);

  useEffect(() => {
    if (!isLive || !roomId) {
      setConnectionState("idle");
      setConnectionError(null);
      return;
    }

    setConnectionState("connecting");
    setConnectionError(null);
    setMediaError(null);

    const signaling = new SignalingClient([`${wsUrl}/api/ws`, `${wsUrl}/ws`]);
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
      onPeerLeft: (peerId) => {
        setRemoteStreams((prev) => {
          if (!prev[peerId]) return prev;

          const next = { ...prev };
          delete next[peerId];
          return next;
        });

        setFocusedParticipant((current) => {
          if (
              current &&
              current !== "local" &&
              current.id === peerId
          ) {
            return "local";
          }

          return current;
        });
      },
    });

    peerManagerRef.current = manager;
    signaling.on("open", () => setWsDisconnected(false));
    signaling.connect();

    void (async () => {
      try {
        const stream = await manager.initLocalStream({ video: true, audio: true });
        setLocalStream(stream);
        setIsMicEnabled(true);
        setIsCameraEnabled(true);

        await signaling.waitForOpen(12000);

        const currentAuth = getStoredAuth();
        manager.join(
            currentAuth
                ? {
                  email: currentAuth.email,
                  fullName: currentAuth.fullName || undefined,
                  firstName: currentAuth.firstName || undefined,
                  lastName: currentAuth.lastName || undefined,
                }
                : undefined
        );

        setConnectionState("connected");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Ошибка подключения";
        const friendly =
            msg.includes("timeout") || msg.includes("WebSocket")
                ? "Не удалось подключиться к серверу эфира. Проверьте интернет и настройки WS."
                : msg.includes("Permission") ||
                msg.includes("NotAllowed") ||
                msg.includes("NotFound")
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

  useEffect(() => {
    if (!focusedParticipant && participants.length > 0) {
      setFocusedParticipant(participants[0]);
    }

    if (
        focusedParticipant &&
        focusedParticipant !== "local" &&
        !participants.some((p) => p.id === focusedParticipant.id)
    ) {
      setFocusedParticipant(participants[0] ?? "local");
    }
  }, [participants, focusedParticipant]);

  useEffect(() => {
    if (!roomId || !apiAvailable || !isRealSessionId(roomId)) {
      setChatPolicy(null);
      return;
    }

    let mounted = true;
    getSessionChatPolicy(roomId).then((p) => {
      if (mounted && p) setChatPolicy(p);
    });

    return () => {
      mounted = false;
    };
  }, [roomId, apiAvailable]);

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
      if (inflight) {
        timer = window.setTimeout(tick, 700);
        return;
      }
      inflight = true;

      try {
        const data = await getSessionLiveMetrics(roomId);
        if (!stopped && data) {
          setLiveMetrics(data);

          const now = new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });

          const mlParticipants = data.participants ?? [];

          const e_val =
              data.avgEngagement ??
              (mlParticipants.length
                  ? mlParticipants.reduce(
                      (a, p) => a + (typeof p.engagement === "number" ? p.engagement : 0),
                      0
                  ) /
                  Math.max(
                      1,
                      mlParticipants.filter((p) => typeof p.engagement === "number").length
                  )
                  : 0);

          const s_val =
              data.avgStress ??
              (mlParticipants.length
                  ? mlParticipants.reduce(
                      (a, p) => a + (typeof p.stress === "number" ? p.stress : 0),
                      0
                  ) /
                  Math.max(
                      1,
                      mlParticipants.filter((p) => typeof p.stress === "number").length
                  )
                  : 0);

          const r_val = data.avgRisk ?? 0;

          setMetricsHistory((prev) => {
            const next = [
              ...prev,
              {
                time: now,
                engagement: Math.round(e_val * 100),
                stress: Math.round(s_val * 100),
                risk: Math.round(r_val * 100),
              },
            ];
            return next.slice(-30);
          });
        }
      } finally {
        inflight = false;
        if (!stopped) timer = window.setTimeout(tick, 2000);
      }
    };

    void tick();

    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [isLive, roomId, apiAvailable]);

  const mlParticipants = useMemo(() => liveMetrics?.participants ?? [], [liveMetrics?.participants]);
  const hasMl = mlParticipants.length > 0;

  const avgEngagement =
      metricsHistory.length > 0 ? metricsHistory[metricsHistory.length - 1].engagement : 0;
  const avgStress =
      metricsHistory.length > 0 ? metricsHistory[metricsHistory.length - 1].stress : 0;
  const avgRisk = liveMetrics?.avgRisk != null ? Math.round(liveMetrics.avgRisk * 100) : 0;
  const avgFatigue = liveMetrics?.avgFatigue != null ? Math.round(liveMetrics.avgFatigue * 100) : 0;

  const gates = { backend: apiAvailable, ws: Boolean(wsUrl), camera: cameraReady };
  const criticalOk = gates.backend && gates.ws && gates.camera;

  const formatTimer = () => {
    const m = Math.floor(liveSeconds / 60);
    const s = liveSeconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

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

  const toggleScreenShare = async () => {
    const manager = peerManagerRef.current;
    if (!manager || !localStream) return;

    if (isScreenSharing) {
      await stopScreenShare();
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      const displayTrack = displayStream.getVideoTracks()[0];
      if (!displayTrack) return;

      screenStreamRef.current = displayStream;
      await manager.replaceOutgoingVideoTrack(displayTrack);
      setIsScreenSharing(true);
      setMediaError(null);

      displayTrack.onended = () => {
        void stopScreenShare();
      };
    } catch {
      setMediaError("Не удалось запустить демонстрацию экрана.");
    }
  };

  const toggleMeetingFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await meetingRef.current?.requestFullscreen();
    } catch (error) {
      console.error("meeting fullscreen failed", error);
    }
  };

  const activeRemoteParticipant =
      focusedParticipant && focusedParticipant !== "local"
          ? focusedParticipant
          : participants[0] ?? null;

  const hasRemoteFocus =
      !!activeRemoteParticipant && !!remoteStreams[activeRemoteParticipant.id];

  const participantMetricsMap = useMemo(() => {
    return buildParticipantMetricsMap(participants, mlParticipants);
  }, [participants, mlParticipants]);

  const activeMainLabel =
      hasRemoteFocus && activeRemoteParticipant
          ? getParticipantDisplayName(
              activeRemoteParticipant,
              participantMetricsMap.get(activeRemoteParticipant.id) ?? null
          )
          : teacherDisplayName;

  const localMeetingStream = isScreenSharing ? screenStreamRef.current : localStream;
  const meetingTileCount = participants.length + 1;
  const galleryGridClass =
      meetingTileCount <= 1
          ? "grid-cols-1"
          : meetingTileCount === 2
              ? "grid-cols-1 sm:grid-cols-2"
              : meetingTileCount <= 4
                  ? "grid-cols-2"
                  : "grid-cols-2 lg:grid-cols-3";

  const visibleParticipantsCount = Math.max(participants.length + 1, presence.length || 0);

  if (phase === "preflight") {
    return (
        <div className="fixed top-[64px] bottom-0 left-0 right-0 bg-[#FAFAFB] flex flex-col pt-12 px-6 pb-24 selection:bg-purple-100 selection:text-[#7448FF] overflow-y-auto z-40">
          <div className="mx-auto w-full max-w-[1000px] space-y-8">
            <header className="flex items-center text-slate-500 transition-colors">
              <Link
                  href="/teacher/sessions"
                  className="flex items-center gap-2 text-[14px] font-bold hover:text-slate-900 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100"
              >
                <ArrowLeft size={16} /> Назад к сессиям
              </Link>
            </header>

            <div>
              <h1 className="text-[32px] font-extrabold text-slate-900 tracking-tight">
                Подготовка к эфиру
              </h1>
              <p className="text-slate-500 font-medium mt-1">
                Осталось проверить оборудование и подключение перед стартом.
              </p>
            </div>

            {connectionError && (
                <Card className="border-amber-400/30 bg-amber-50 shadow-none">
                  <CardContent className="flex flex-wrap items-center gap-4 p-5">
                    <AlertTriangle className="text-amber-500" size={24} />
                    <div className="flex-1 min-w-[200px]">
                      <div className="font-bold text-slate-900">Ошибка подключения</div>
                      <div className="text-[13px] text-slate-600 font-medium">
                        {connectionError}
                      </div>
                    </div>
                    <Button
                        className="bg-amber-100 text-amber-700 hover:bg-amber-200"
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
                        <div className="text-[12px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">
                          Checklist
                        </div>
                        <div className="text-[16px] font-bold text-slate-900 leading-tight">
                          Системные проверки
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-2">
                      <ChecklistItem
                          label="Подключение к API"
                          ok={gates.backend}
                          hint={apiAvailable ? "API сервера доступен" : "Отсутствует подключение или токен"}
                      />
                      <ChecklistItem
                          label="Сигналинг WebRTC"
                          ok={gates.ws}
                          hint={gates.ws ? "Соединение WS настроено" : "Проверьте NEXT_PUBLIC_WS_BASE_URL"}
                      />
                      <ChecklistItem
                          label="Камера и микрофон"
                          ok={gates.camera}
                          hint={gates.camera ? "Разрешения даны, медиа работает" : "Дайте доступ к устройствам"}
                      />
                    </div>

                    {!criticalOk && (
                        <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4 flex items-start gap-3">
                          <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                          <div className="text-[12px] font-medium text-slate-600 leading-relaxed">
                            Пока все проверки не станут зелеными, вы не сможете запустить сессию.
                          </div>
                        </div>
                    )}

                    <div className="pt-4 border-t border-slate-50">
                      <Button
                          onClick={async () => {
                            if (!criticalOk) return;
                            try {
                              await updateSessionStatus(roomId, "active");
                            } catch (e) {
                              console.error("Failed to start session on backend", e);
                            }
                            setPhase("live");
                            setLiveSeconds(0);
                          }}
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

  if (phase === "ended") {
    return (
        <div className="min-h-screen bg-[#FAFAFB] flex flex-col justify-center items-center p-4">
          <Card className="w-full max-w-lg border-none shadow-[0_8px_40px_rgba(0,0,0,0.04)] overflow-hidden rounded-[32px]">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-emerald-50 rounded-[24px] flex items-center justify-center text-emerald-500 mx-auto mb-8">
                <LogOut size={36} />
              </div>
              <h1 className="text-[26px] font-extrabold text-slate-900 mb-2">Сессия завершена</h1>
              <p className="text-slate-500 mb-10 font-medium tracking-tight">
                Подключение закрыто. Подробный отчет появится в аналитике.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <StatusPill label="Duration" value={formatTimer()} />
                <StatusPill label="Participants" value={`${participants.length}`} />
              </div>
              <Button
                  onClick={() => router.push("/teacher/sessions")}
                  className="w-full h-14 font-bold bg-[#7448FF] hover:bg-purple-600"
              >
                Вернуться к списку
              </Button>
            </CardContent>
          </Card>
        </div>
    );
  }

  return (
      <div className="min-h-[calc(100dvh-64px)] bg-[#FAFAFB] text-slate-900 font-sans selection:bg-purple-100 selection:text-[#7448FF]">
        <div className="mx-auto flex min-h-[calc(100dvh-64px)] w-full max-w-[1700px] flex-col px-4 py-6 sm:px-6">
          <header className="mb-5 flex shrink-0 items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <Link
                  href="/teacher/sessions"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-slate-900"
                  aria-label="Вернуться к сессиям"
              >
                <ArrowLeft size={19} />
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-xl font-extrabold tracking-tight text-slate-900">
                    {sessionTitle}
                  </h1>
                  <Badge className="shrink-0 border-none bg-emerald-50 px-2.5 py-0.5 font-bold text-emerald-600">
                    LIVE
                  </Badge>
                </div>
                <p className="mt-1 truncate text-[13px] font-medium text-slate-500">
                  Комната {roomId ? roomId.slice(0, 8) : "—"} · {formatTimer()}
                </p>
              </div>
            </div>

            <Button
                onClick={() => setConfirmEndOpen(true)}
                variant="outline"
                className="h-10 shrink-0 rounded-xl border-rose-200 bg-white px-4 font-bold text-rose-600 hover:bg-rose-50"
            >
              Завершить для всех
            </Button>
          </header>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-8 pb-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] 2xl:grid-cols-[minmax(0,1fr)_480px]">
            <div className="flex min-w-0 flex-col">
              <div
                  ref={meetingRef}
                  className={cn(
                      "flex w-full flex-col overflow-hidden rounded-2xl bg-[#111111] shadow-[0_20px_70px_rgba(0,0,0,0.25)] ring-1 ring-black/10",
                      isMeetingFullscreen && "h-screen rounded-none"
                  )}
              >
                <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-[#1c1c1c] px-3 text-white sm:px-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                        className={cn(
                            "flex items-center gap-1.5 text-[11px] font-medium",
                            connectionState === "connected" ? "text-emerald-400" : "text-amber-400"
                        )}
                    >
                      <ShieldCheck size={15} />
                      <span className="hidden sm:inline">
                      {connectionState === "connected" ? "Защищённая встреча" : "Подключение..."}
                    </span>
                    </div>
                    <span className="hidden h-4 w-px bg-white/15 sm:block" />
                    <span className="truncate text-xs font-medium text-white/80">{sessionTitle}</span>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <div className="hidden items-center gap-2 rounded-md bg-black/30 px-2.5 py-1 text-[11px] font-semibold text-white/80 sm:flex">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                      {formatTimer()}
                    </div>
                    <button
                        type="button"
                        onClick={() => setMeetingView((view) => (view === "gallery" ? "speaker" : "gallery"))}
                        className="flex h-8 items-center gap-1.5 rounded-md bg-white/10 px-2.5 text-[11px] font-medium text-white transition hover:bg-white/15"
                    >
                      <Layout size={15} />
                      {meetingView === "gallery" ? "Докладчик" : "Галерея"}
                    </button>
                    <button
                        type="button"
                        onClick={() => void toggleMeetingFullscreen()}
                        className="flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white transition hover:bg-white/15"
                        aria-label="Открыть встречу на весь экран"
                    >
                      <Maximize2 size={15} />
                    </button>
                  </div>
                </div>

                <div
                    className={cn(
                        "relative min-h-0 flex-1 bg-[#111111] p-2 sm:p-3",
                        isMeetingFullscreen
                            ? "h-[calc(100vh-106px)]"
                            : "h-[390px] sm:h-[470px] lg:h-[560px] xl:h-[620px]"
                    )}
                >
                  {meetingView === "gallery" ? (
                      <div className={cn("grid h-full w-full gap-2 sm:gap-3", galleryGridClass)}>
                        <ZoomVideoTile
                            stream={localMeetingStream}
                            name={teacherDisplayName}
                            isLocal
                            mirror={!isScreenSharing}
                            videoEnabled={isScreenSharing || isCameraEnabled}
                            audioEnabled={isMicEnabled}
                            selected={focusedParticipant === "local"}
                            onClick={() => setFocusedParticipant("local")}
                        />
                        {participants.map((participant) => (
                            <ZoomVideoTile
                                key={participant.id}
                                stream={remoteStreams[participant.id] || null}
                                name={getParticipantDisplayName(
                                    participant,
                                    participantMetricsMap.get(participant.id) ?? null
                                )}
                                selected={
                                    focusedParticipant !== "local" &&
                                    focusedParticipant?.id === participant.id
                                }
                                onClick={() => setFocusedParticipant(participant)}
                            />
                        ))}
                      </div>
                  ) : (
                      <div className="flex h-full min-h-0 flex-col gap-2 sm:flex-row sm:gap-3">
                        <div className="min-h-0 flex-1">
                          {hasRemoteFocus && activeRemoteParticipant ? (
                              <ZoomVideoTile
                                  stream={remoteStreams[activeRemoteParticipant.id] || null}
                                  name={activeMainLabel}
                                  selected
                                  onClick={() => setFocusedParticipant(activeRemoteParticipant)}
                              />
                          ) : (
                              <ZoomVideoTile
                                  stream={localMeetingStream}
                                  name={teacherDisplayName}
                                  isLocal
                                  mirror={!isScreenSharing}
                                  videoEnabled={isScreenSharing || isCameraEnabled}
                                  audioEnabled={isMicEnabled}
                                  selected
                                  onClick={() => setFocusedParticipant("local")}
                              />
                          )}
                        </div>

                        <div className="flex h-24 shrink-0 gap-2 overflow-x-auto sm:h-full sm:w-44 sm:flex-col sm:overflow-y-auto">
                          {hasRemoteFocus && (
                              <div className="h-full min-w-36 sm:h-28 sm:min-h-28 sm:w-full">
                                <ZoomVideoTile
                                    stream={localMeetingStream}
                                    name={teacherDisplayName}
                                    isLocal
                                    mirror={!isScreenSharing}
                                    compact
                                    videoEnabled={isScreenSharing || isCameraEnabled}
                                    audioEnabled={isMicEnabled}
                                    onClick={() => setFocusedParticipant("local")}
                                />
                              </div>
                          )}
                          {participants
                              .filter((participant) => participant.id !== activeRemoteParticipant?.id)
                              .map((participant) => (
                                  <div key={participant.id} className="h-full min-w-36 sm:h-28 sm:min-h-28 sm:w-full">
                                    <ZoomVideoTile
                                        stream={remoteStreams[participant.id] || null}
                                        name={getParticipantDisplayName(
                                            participant,
                                            participantMetricsMap.get(participant.id) ?? null
                                        )}
                                        compact
                                        onClick={() => setFocusedParticipant(participant)}
                                    />
                                  </div>
                              ))}
                        </div>
                      </div>
                  )}

                  <div className="pointer-events-none absolute left-4 top-4 z-20 flex flex-wrap gap-2">
                    {isScreenSharing && (
                        <div className="rounded-md bg-emerald-600 px-2.5 py-1 text-[10px] font-semibold text-white shadow-lg">
                          Вы демонстрируете экран
                        </div>
                    )}
                    {wsDisconnected && (
                        <div className="flex items-center gap-1.5 rounded-md bg-amber-500 px-2.5 py-1 text-[10px] font-semibold text-white shadow-lg">
                          <AlertTriangle size={12} /> Переподключение
                        </div>
                    )}
                    {mediaError && (
                        <div className="rounded-md bg-red-600 px-2.5 py-1 text-[10px] font-semibold text-white shadow-lg">
                          {mediaError}
                        </div>
                    )}
                  </div>
                </div>

                <ZoomMeetingControls
                    isMicEnabled={isMicEnabled}
                    isCameraEnabled={isCameraEnabled}
                    isScreenSharing={isScreenSharing}
                    isFullscreen={isMeetingFullscreen}
                    participantsCount={visibleParticipantsCount}
                    participantsActive={chatOpen}
                    chatActive={chatOpen}
                    cameraDisabled={isScreenSharing}
                    onToggleMic={toggleMic}
                    onToggleCamera={toggleCamera}
                    onToggleScreenShare={() => void toggleScreenShare()}
                    onToggleParticipants={() => {
                      setChatOpen(true);
                      window.setTimeout(
                          () => chatSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
                          0
                      );
                    }}
                    onToggleChat={() => {
                      setChatOpen(true);
                      window.setTimeout(
                          () => chatSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
                          0
                      );
                    }}
                    onToggleFullscreen={() => void toggleMeetingFullscreen()}
                    onMore={() =>
                        document.getElementById("teacher-session-tools")?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        })
                    }
                    onLeave={() => setConfirmEndOpen(true)}
                    leaveLabel="Завершить"
                />
              </div>

              <div id="teacher-session-tools" className="min-w-0 flex-1 space-y-6 pt-6">
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm flex flex-col min-h-[450px]">
                  <div className="flex border-b border-slate-50 px-4 sm:px-8 overflow-x-auto hide-scrollbar">
                    {["Доска", "Материалы", "Заметки"].map((t) => {
                      const id =
                          t === "Доска" ? "board" : t === "Материалы" ? "materials" : "notes";
                      const active = activeTab === id;

                      return (
                          <button
                              key={id}
                              onClick={() => setActiveTab(id as "board" | "materials" | "notes")}
                              className={cn(
                                  "h-16 px-6 font-bold text-sm transition-all relative shrink-0",
                                  active ? "text-[#7448FF]" : "text-slate-400 hover:text-slate-600"
                              )}
                          >
                            {t}
                            {active && (
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-[#7448FF] rounded-t-full shrink-0" />
                            )}
                          </button>
                      );
                    })}
                  </div>

                  <div className="flex-1 p-6 flex flex-col min-h-[300px]">
                    {activeTab === "board" && <SessionWhiteboard sessionId={sessionId} className="flex-1" />}
                    {activeTab === "materials" && (
                        <div className="grid flex-1 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                          <SessionContentEditor sessionId={sessionId} />
                          <SessionMaterialsPanel sessionId={sessionId} />
                        </div>
                    )}

                    {activeTab === "board" && false && (
                        <div className="flex-1 border-2 border-slate-100 border-dashed rounded-[24px] flex items-center justify-center bg-slate-50/50 p-6 text-center">
                          <div>
                            <div className="w-16 h-16 bg-white rounded-[20px] shadow-sm flex items-center justify-center mx-auto mb-4 text-slate-300">
                              <Layout size={32} strokeWidth={1.5} />
                            </div>
                            <p className="font-bold text-slate-900 mb-1">Доска не подключена</p>
                            <p className="text-[13px] text-slate-400 font-medium max-w-sm mx-auto leading-relaxed">
                              Инструмент совместного рисования не имеет источника данных на бэкенде в текущей сессии.
                            </p>
                          </div>
                        </div>
                    )}

                    {activeTab === "materials" && false && (
                        <div className="flex-1 border-2 border-slate-100 border-dashed rounded-[24px] flex items-center justify-center bg-slate-50/50 p-6 text-center">
                          <div>
                            <div className="w-16 h-16 bg-white rounded-[20px] shadow-sm flex items-center justify-center mx-auto mb-4 text-slate-300">
                              <FileText size={32} strokeWidth={1.5} />
                            </div>
                            <p className="font-bold text-slate-900 mb-1">Нет прикрепленных материалов</p>
                            <p className="text-[13px] text-slate-400 font-medium">
                              Файлы для этого урока пока не загружены сервером.
                            </p>
                          </div>
                        </div>
                    )}

                    {activeTab === "notes" && <SessionNotesPanel sessionId={sessionId} role="teacher" />}

                    {activeTab === "notes" && false && (
                        <div className="h-full flex flex-col">
                      <textarea
                          value=""
                          onChange={() => {}}
                          className="w-full flex-1 p-6 rounded-[24px] bg-slate-50/50 border border-slate-100 text-sm font-medium text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#7448FF]/10 transition-all resize-none"
                          placeholder="Напишите локальную черновую заметку..."
                      />
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-2">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-100">
                              <AlertTriangle size={14} className="text-orange-500" />
                              <span className="text-[11px] font-bold text-orange-600">
                            Черновик не сохраняется на сервере
                          </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => {}}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-bold text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                            >
                              Очистить заметки
                            </button>
                          </div>
                        </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 shrink-0">
                  <Card className="rounded-[32px] border-none shadow-sm overflow-hidden min-h-[340px] flex flex-col">
                    <header className="px-8 pt-8 pb-4 flex items-center justify-between shrink-0">
                      <h3 className="font-extrabold text-slate-900 text-[15px] uppercase tracking-wider">
                        Динамика ML
                      </h3>
                      <TrendingUp size={18} className="text-[#7448FF]" />
                    </header>
                    <CardContent className="px-6 pb-6 pt-0 flex-1 flex flex-col">
                      {hasMl && metricsHistory.length > 0 ? (
                          <div className="relative h-[180px] min-h-[180px] w-full min-w-0 overflow-hidden">
                            {chartReady ? (
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={metricsHistory}>
                                    <defs>
                                      <linearGradient id="teacherColorEngage" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.1} />
                                        <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0} />
                                      </linearGradient>
                                      <linearGradient id="teacherColorStress" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.rose} stopOpacity={0.1} />
                                        <stop offset="95%" stopColor={COLORS.rose} stopOpacity={0} />
                                      </linearGradient>
                                    </defs>
                                    <Area
                                        type="monotone"
                                        dataKey="engagement"
                                        stroke={COLORS.purple}
                                        fillOpacity={1}
                                        fill="url(#teacherColorEngage)"
                                        strokeWidth={3}
                                        isAnimationActive={false}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="stress"
                                        stroke={COLORS.rose}
                                        fillOpacity={1}
                                        fill="url(#teacherColorStress)"
                                        strokeWidth={2}
                                        strokeDasharray="3 3"
                                        isAnimationActive={false}
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex h-full items-center justify-center text-[13px] font-bold text-slate-300">
                                  Готовим график...
                                </div>
                            )}
                          </div>
                      ) : (
                          <div className="flex-1 flex items-center justify-center text-[13px] font-bold text-slate-300">
                            Сбор данных потока...
                          </div>
                      )}

                      <div className="flex flex-wrap items-center gap-6 mt-4 pl-4 shrink-0">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-[#7448FF]" />
                          <span className="text-[11px] font-bold text-slate-400">Вовлечённость</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full border-2 border-rose-400 border-dashed bg-white" />
                          <span className="text-[11px] font-bold text-slate-400">Стресс</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-[32px] border-none shadow-sm overflow-hidden min-h-[340px] flex flex-col">
                    <header className="px-8 pt-8 pb-4 flex items-center justify-between shrink-0">
                      <h3 className="font-extrabold text-slate-900 text-[15px] uppercase tracking-wider">
                        Эмоции по группе
                      </h3>
                      <BrainCircuit size={18} className="text-emerald-500" />
                    </header>
                    <CardContent className="px-6 pb-6 pt-0 flex-1 flex flex-col justify-center">
                      {mlParticipants.length > 0 ? (
                          <div className="space-y-4">
                            {(() => {
                              const counts = new Map<string, number>();
                              mlParticipants.forEach((m) => {
                                const key = (m.dominant_emotion || m.emotion || "neutral").trim();
                                counts.set(key, (counts.get(key) || 0) + 1);
                              });
                              const total = mlParticipants.length || 1;

                              return Array.from(counts.entries()).map(([emotion, count]) => {
                                const pct = Math.round((count / total) * 100);
                                return (
                                    <div key={emotion} className="space-y-1.5">
                                      <div className="flex justify-between text-[12px] font-bold">
                                        <span className="text-slate-600">{emotion}</span>
                                        <span className="text-slate-900">{pct}%</span>
                                      </div>
                                      <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-amber-500 rounded-full"
                                            style={{ width: `${pct}%` }}
                                        />
                                      </div>
                                    </div>
                                );
                              });
                            })()}
                          </div>
                      ) : (
                          <div className="flex-1 flex items-center justify-center text-[13px] font-bold text-slate-300">
                            Ожидание выражений лица
                          </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            <aside
                ref={chatSectionRef}
                className={cn(
                    "w-full overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-sm lg:sticky lg:top-20 lg:flex lg:h-[calc(100dvh-112px)] lg:min-h-[640px] lg:flex-col",
                    chatOpen
                        ? "fixed inset-0 z-50 flex min-h-0 flex-col rounded-none border-none lg:relative lg:inset-auto lg:z-auto lg:rounded-[32px] lg:border lg:shadow-sm"
                        : "hidden lg:flex"
                )}
            >
              <header className="p-6 pb-4 flex items-center justify-between border-b border-slate-50 shrink-0">
                <h3 className="font-extrabold text-slate-900 text-[14px] uppercase tracking-widest flex items-center gap-2">
                  Real-time Control
                  <div className="px-2 py-0.5 bg-rose-50 text-rose-500 text-[9px] rounded-md font-black animate-pulse">
                    LIVE
                  </div>
                </h3>
                <div className="flex items-center gap-2">
                  <button className="xl:hidden text-slate-400 p-2" onClick={() => setChatOpen(false)}>
                    <LogOut size={16} />
                  </button>
                  <div className="w-8 h-8 rounded-[10px] bg-slate-50 flex items-center justify-center text-slate-400">
                    <BrainCircuit size={16} />
                  </div>
                </div>
              </header>

              <div className="flex min-h-0 flex-1 flex-col">
                <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
                  <div className="p-6 border-b border-slate-50 space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-purple-50/50 rounded-2xl border border-purple-100/50">
                      <div className="w-12 h-12 bg-[#7448FF] rounded-xl flex items-center justify-center text-white shadow-md shadow-purple-500/20 shrink-0">
                        <Users size={24} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-black uppercase tracking-widest text-purple-400 mb-0.5">
                          Состояние группы
                        </div>
                        <div className="text-[14px] font-bold text-slate-900 truncate">
                          {liveMetrics?.groupState || "Сбор данных потока..."}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest">
                          <span>Ср. Вовлеченность</span>
                          <span className="text-[#7448FF]">{avgEngagement}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                          <div
                              className="h-full bg-[#7448FF] transition-all duration-1000 ease-out"
                              style={{ width: `${avgEngagement}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest">
                          <span>Стресс</span>
                          <span className="text-rose-500">{avgStress}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                          <div
                              className="h-full bg-rose-500 transition-all duration-1000 ease-out"
                              style={{ width: `${avgStress}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest">
                          <span>Усталость</span>
                          <span className="text-amber-500">{avgFatigue}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                          <div
                              className="h-full bg-amber-500 transition-all duration-1000 ease-out"
                              style={{ width: `${avgFatigue}%` }}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest">
                          <span>Риск</span>
                          <span className="text-slate-700">{avgRisk}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                          <div
                              className="h-full bg-slate-700 transition-all duration-1000 ease-out"
                              style={{ width: `${avgRisk}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border-b border-slate-50 space-y-6 shrink-0">
                    <div>
                      <div className="text-[12px] font-black uppercase text-slate-400 tracking-widest mb-3">
                        Студенты и их текущие метрики
                      </div>

                      <div className="space-y-4">
                        {participants.length === 0 && (
                            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-[13px] font-medium text-slate-400">
                              Пока никто не подключился.
                            </div>
                        )}

                        {participants.map((p) => {
                          const participantMetric = participantMetricsMap.get(p.id) ?? null;

                          return (
                              <div
                                  key={p.id}
                                  className="rounded-[24px] border border-[#7448FF]/30 bg-white p-4 shadow-sm"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-[14px] font-bold text-slate-900 truncate">
                                      {getParticipantDisplayName(p, participantMetric)}
                                    </div>
                                    <div className="mt-1 text-[12px] text-slate-400 font-medium">
                                      {participantMetric
                                          ? "Есть свежие ML-данные"
                                          : "Нет свежих ML-данных"}
                                    </div>
                                  </div>

                                  <div className="rounded-full bg-slate-50 border border-slate-100 px-3 py-1 text-[11px] font-bold text-slate-500 shrink-0">
                                    {participantMetric?.dominant_emotion ||
                                        participantMetric?.emotion ||
                                        "Нет данных"}
                                  </div>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
                                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-center">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                      Confidence
                                    </div>
                                    <div className="mt-2 text-[14px] font-bold text-slate-900">
                                      {formatMetricPercent(participantMetric?.confidence)}
                                    </div>
                                  </div>

                                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-center">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                      Stress
                                    </div>
                                    <div className="mt-2 text-[14px] font-bold text-slate-900">
                                      {formatMetricPercent(participantMetric?.stress)}
                                    </div>
                                  </div>

                                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-center">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                      Engage
                                    </div>
                                    <div className="mt-2 text-[14px] font-bold text-slate-900">
                                      {formatMetricPercent(participantMetric?.engagement)}
                                    </div>
                                  </div>

                                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-center">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                      Fatigue
                                    </div>
                                    <div className="mt-2 text-[14px] font-bold text-slate-900">
                                      {formatMetricPercent(participantMetric?.fatigue)}
                                    </div>
                                  </div>

                                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-center">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                      Risk
                                    </div>
                                    <div className="mt-2 text-[14px] font-bold text-slate-900">
                                      {formatMetricPercent(participantMetric?.risk)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <div className="text-[12px] font-black uppercase text-slate-400 tracking-widest mb-3">
                        Настройки чата
                      </div>
                      <select
                          className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-700 outline-none focus:ring-2 disabled:opacity-50"
                          disabled={!apiAvailable || !isRealSessionId(roomId)}
                          value={chatPolicy?.mode ?? "lecture_open"}
                          onChange={async (e) => {
                            try {
                              const updated = await updateSessionChatPolicy(roomId, {
                                mode: e.target.value as SessionChatPolicy["mode"],
                              });
                              setChatPolicy(updated);
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                      >
                        <option value="lecture_open">Свободный чат</option>
                        <option value="questions_only">Только вопросы (Q&A)</option>
                        <option value="locked">Чат заблокирован</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-[12px] font-black uppercase text-slate-400 tracking-widest mb-3">
                        Integrity Check <Info size={14} className="text-slate-300" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 flex flex-col gap-1 items-center justify-center text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Backend
                      </span>
                          <span
                              className={cn(
                                  "text-[12px] font-black",
                                  apiAvailable ? "text-emerald-500" : "text-rose-500"
                              )}
                          >
                        {apiAvailable ? "OK" : "ERR"}
                      </span>
                        </div>
                        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 flex flex-col gap-1 items-center justify-center text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Consent
                      </span>
                          <span className="text-[12px] font-black text-emerald-500">
                        ACTIVE
                      </span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                <div className="flex min-h-[320px] flex-[0_0_38%] flex-col border-t border-slate-100 bg-slate-50/30 lg:min-h-[340px]">
                  <header className="p-5 border-b border-slate-50 flex items-center justify-between shrink-0">
                    <h3 className="font-extrabold text-slate-900 text-[13px] uppercase tracking-widest flex items-center gap-2">
                      Сообщения
                      <Badge className="bg-slate-100 text-slate-500 border-none font-bold px-2 py-0">
                        {participants.length}
                      </Badge>
                    </h3>
                  </header>
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <SessionChatPanel sessionId={roomId} role="teacher" type={sessionType} />
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>

        <Modal open={confirmEndOpen} onClose={() => setConfirmEndOpen(false)} title="Завершить сессию?">
          <div className="p-4 text-center">
            <div className="w-16 h-16 bg-rose-50 rounded-[20px] flex items-center justify-center text-rose-500 mx-auto mb-6">
              <PhoneOff size={32} />
            </div>
            <p className="text-slate-500 font-medium mb-10 leading-relaxed max-w-sm mx-auto">
              Эфир будет остановлен для всех участников. Вы сможете найти запись и подробный отчет в архиве.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Button onClick={() => setConfirmEndOpen(false)} variant="outline" className="h-12 font-bold text-slate-500">
                Отмена
              </Button>
              <Button
                  onClick={() => {
                    setConfirmEndOpen(false);
                    setPhase("ended");
                    setWsDisconnected(false);
                  }}
                  className="h-12 bg-rose-500 hover:bg-rose-600 font-bold shadow-[0_8px_20px_rgba(244,63,94,0.3)] border-none"
              >
                Да, завершить
              </Button>
            </div>
          </div>
        </Modal>

        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #e2e8f0;
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #cbd5e1;
          }
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
      </div>
  );
}
