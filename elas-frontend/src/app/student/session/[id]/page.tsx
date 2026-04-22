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
  getStudentSessionDetails,
  recordSessionConsent,
  sendSessionMetrics,
  type SessionJoinInfo,
} from "@/lib/api/student";
import { getApiBaseUrl, hasAuth, getStoredAuth } from "@/lib/api/client";
import {
  getMlApiBaseUrl,
  mlAnalyzeFrame,
  captureSquareFrameGrayscale,
  ML_INTERVAL,
  ML_429_PAUSE_MS,
  type MlAnalyzeResponse,
} from "@/lib/api/ml";
import {
  getSessionContent,
  getSessionMaterials,
  type SessionContent,
  type SessionContentFile,
} from "@/lib/api/sessionContent";
import { getMaterialDownload, resolveDownloadUrl } from "@/lib/api/materials";
import {
  getSessionPresence,
  joinSessionPresence,
  leaveSessionPresence,
  type SessionPresenceRow,
} from "@/lib/api/presence";

import CameraCheck from "@/components/session/CameraCheck";
import { SessionNotesPanel } from "@/components/session/SessionNotesPanel";
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
  PhoneOff,
  AlertTriangle,
  Activity,
  AlertCircle,
  MicOff,
  VideoOff,
  MonitorUp,
  Sparkles,
  ShieldCheck,
  Maximize2,
  MessageSquare,
  MoreHorizontal,
  Users2,
  FileText,
  Clock,
  PenTool,
  CheckSquare,
} from "lucide-react";
import { getWsBaseUrl } from "@/lib/env";
import { cn } from "@/lib/cn";

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-slate-100 bg-slate-50 px-4 py-4 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
      <div className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">
        {label}
      </div>
      <div className="mt-1.5 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function formatPersonName(
  input?: {
    fullName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    role?: string | null;
    id?: string | null;
  } | null
) {
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

function formatParticipantLabel(p?: Participant | null) {
  if (!p) return "Преподаватель";

  return formatPersonName({
    fullName: p.fullName,
    firstName: (p as { firstName?: string | null }).firstName,
    lastName: (p as { lastName?: string | null }).lastName,
    email: p.email,
    role: p.role,
    id: p.id,
  });
}

function formatPercentMetric(value?: number | null) {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "—";
}

function CallControlButton({
  active = true,
  icon,
  dangerIcon,
  label,
  onClick,
  disabled,
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
          !active
            ? "bg-slate-100 text-slate-600"
            : "text-slate-900 hover:bg-slate-50 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]",
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
  const chatSectionRef = useRef<HTMLDivElement | null>(null);
  const monitorRef = useRef<HTMLDivElement | null>(null);

  const [joinInfo, setJoinInfo] = useState<SessionJoinInfo | null>(null);
  const [sessionTeacherName, setSessionTeacherName] = useState<string | null>(null);
  const [joinInfoLoading, setJoinInfoLoading] = useState(!!(getApiBaseUrl() && hasAuth()));
  const [joinInfoError, setJoinInfoError] = useState<string | null>(null);
  const [activeBottomTab, setActiveBottomTab] = useState<"materials" | "notes" | "whiteboard">(
    "whiteboard"
  );
  const [currentUser, setCurrentUser] = useState<ReturnType<typeof getStoredAuth>>(null);
  const [sessionContent, setSessionContent] = useState<SessionContent | null>(null);
  const [sessionFiles, setSessionFiles] = useState<SessionContentFile[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [isMonitorFullscreen, setIsMonitorFullscreen] = useState(false);

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
  const loadSessionContent = useCallback(async () => {
    if (!sessionId || !getApiBaseUrl() || !hasAuth()) {
      setSessionContent(null);
      setSessionFiles([]);
      return;
    }

    setContentLoading(true);
    try {
      const [content, materials] = await Promise.all([
        getSessionContent(sessionId),
        getSessionMaterials(sessionId),
      ]);

      setSessionContent(content);
      setSessionFiles(materials ?? content?.files ?? []);
    } finally {
      setContentLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadSessionContent();
  }, [loadSessionContent]);

  const sessionType: "lecture" | "exam" = joinInfo?.type === "exam" ? "exam" : "lecture";

  const apiAvailable = Boolean(getApiBaseUrl() && hasAuth());
  const canJoin = !apiAvailable || joinInfo?.allowedToJoin !== false;
  const blockReason = joinInfo && !joinInfo.allowedToJoin ? joinInfo.reason : null;

  const [live, setLive] = useState(false);
  const [tab, setTab] = useState<"prepare" | "live">("prepare");

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [presence, setPresence] = useState<SessionPresenceRow[]>([]);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (!apiAvailable || !sessionId || !live) {
      setPresence([]);
      return;
    }

    const controller = new AbortController();
    let closed = false;

    void joinSessionPresence(sessionId, { signal: controller.signal }).catch(() => {});

    const load = async () => {
      try {
        const list = await getSessionPresence(sessionId, { signal: controller.signal });
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
      void leaveSessionPresence(sessionId).catch(() => {});
    };
  }, [apiAvailable, live, sessionId]);

  const [mlResult, setMlResult] = useState<MlAnalyzeResponse | null>(null);
  const [mlFaceDetected, setMlFaceDetected] = useState<boolean | null>(null);
  const [mlActive, setMlActive] = useState(false);
  const [mlUnavailable, setMlUnavailable] = useState(false);

  const [connectionState, setConnectionState] = useState<
    "idle" | "connecting" | "connected" | "error"
  >("idle");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [wsDisconnected, setWsDisconnected] = useState(false);

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

  const currentStudentName = useMemo(
    () =>
      formatPersonName({
        fullName: currentUser?.fullName,
        firstName: currentUser?.firstName,
        lastName: currentUser?.lastName,
        email: currentUser?.email,
        role: "student",
      }),
    [currentUser]
  );
  useEffect(() => {
    setCurrentUser(getStoredAuth());
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsMonitorFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleMonitorFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      await monitorRef.current?.requestFullscreen();
    } catch (error) {
      console.error("monitor fullscreen failed", error);
    }
  }, []);

  const teacherDisplayName = useMemo(() => {
    const liveParticipantName = formatParticipantLabel(teacherParticipant);
    if (sessionTeacherName?.trim()) return sessionTeacherName.trim();
    return liveParticipantName;
  }, [sessionTeacherName, teacherParticipant]);

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
      const fmt = (v: number) => v.toString().padStart(2, "0");
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
      setConnectionError("Не настроен адрес сервера эфира (WS). Обратитесь к администратору.");
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
    signaling.on("open", () => setWsDisconnected(false));
    signaling.connect();

    void (async () => {
      try {
        const stream = await manager.initLocalStream({ video: true, audio: true });
        setLocalStream(stream);

        await signaling.waitForOpen(12000);

        const auth = getStoredAuth();
        manager.join(
          auth
            ? {
              email: auth.email,
              fullName: auth.fullName || undefined,
              firstName: auth.firstName || undefined,
              lastName: auth.lastName || undefined,
            }
            : undefined
        );

        setConnectionState("connected");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Ошибка подключения";
        const friendly =
          msg.includes("timeout") || msg.includes("WebSocket")
            ? "Не удалось подключиться к серверу эфира. Проверьте интернет и настройки WS."
            : msg.includes("Permission") || msg.includes("NotAllowed") || msg.includes("NotFound")
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

  useEffect(() => {
    if (!live || !sessionId || !apiAvailable) return;

    let cancelled = false;

    void getStudentSessionDetails(sessionId).then((details) => {
      if (cancelled || !details) return;
      setSessionTeacherName(details.teacherFullName || details.teacher || null);
    });

    return () => {
      cancelled = true;
    };
  }, [apiAvailable, live, sessionId]);

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
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
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
    if (!shouldRunMl || !localStream) return;

    setMlActive(true);
    setMlUnavailable(false);

    let cancelled = false;
    let inflight = false;
    let consecutiveFailures = 0;
    let pausedUntil = 0;
    const failureThreshold = 4;

    const hiddenVideo = document.createElement("video");
    hiddenVideo.muted = true;
    hiddenVideo.playsInline = true;
    hiddenVideo.autoplay = true;
    hiddenVideo.srcObject = localStream;
    hiddenVideo.play().catch(() => { });

    const timer = setInterval(async () => {
      if (cancelled || inflight) return;
      if (Date.now() < pausedUntil) return;

      const frame = captureSquareFrameGrayscale(hiddenVideo, 192);
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
        const hasFace = result.face_detected !== false;
        setMlFaceDetected(hasFace);

        if (!hasFace) {
          setMlResult(null);
          return;
        }

        setMlResult(result);

        if (sessionId && apiAvailable) {
          sendSessionMetrics(sessionId, {
            emotion: result.emotion ?? "Neutral",
            confidence: result.confidence ?? 0,
            risk: result.risk ?? 0,
            state: result.state ?? "NORMAL",
            dominant_emotion: result.dominant_emotion ?? "Neutral",
            engagement: result.engagement,
            stress: result.stress,
            fatigue: result.fatigue,
          }).catch(() => { });
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
      hiddenVideo.pause();
      hiddenVideo.srcObject = null;
      setMlActive(false);
      setMlResult(null);
      setMlFaceDetected(null);
      setMlUnavailable(false);
    };
  }, [shouldRunMl, sessionId, apiAvailable, localStream]);

  if (tab === "live") {
    return (
      <div className="min-h-[calc(100dvh-64px)] bg-[#FAFAFB]">
        <div className="mx-auto flex min-h-[calc(100dvh-64px)] w-full max-w-[1550px] flex-col px-4 py-8 md:px-8 animate-in fade-in zoom-in-[0.98] duration-300">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 truncate">{title}</h1>
                <Badge className="bg-purple-50 text-[#7448FF] border-none font-semibold px-2.5 py-0.5 shrink-0">
                  Онлайн-сессия
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-6 mt-2 text-[13px] text-slate-500 font-medium">
                <span>
                  Преподаватель:{" "}
                  <span className="text-slate-900">{teacherDisplayName}</span>
                </span>

                {connectionState === "connected" ? (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Сессия активна
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-amber-600">
                    <AlertCircle size={14} />{" "}
                    {connectionState === "connecting" ? "Подключение..." : "Сбой соединения"}
                  </span>
                )}

                {wsDisconnected && (
                  <span className="flex items-center gap-2 text-rose-600">
                    <AlertTriangle size={14} />
                    Соединение потеряно
                  </span>
                )}

                {connectionState === "connected" && (
                  <span className="tabular-nums opacity-60 font-semibold">{sessionTimerLabel}</span>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                setLive(false);
                setTab("prepare");
              }}
              className="px-5 py-2.5 rounded-xl text-[13px] bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 hover:border-red-200 shadow-sm font-semibold transition-colors shrink-0"
            >
              Завершить сессию
            </button>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(400px,460px)] xl:grid-cols-[minmax(0,1fr)_460px] 2xl:grid-cols-[minmax(0,1fr)_480px]">
            <div className="flex min-w-0 flex-col">
              <div className="shrink-0 space-y-6">
                <div
                  ref={monitorRef}
                  className="relative w-full rounded-[28px] overflow-hidden bg-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-slate-200/50 h-[340px] sm:h-[420px] lg:h-[500px] xl:h-[560px] shrink-0"
                >
                  {remoteStream ? (
                    <StreamVideo
                      stream={remoteStream}
                      className="w-full h-full object-cover"
                      autoPlay
                      playsInline
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F4F5F7]">
                      <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4">
                        <span className="text-2xl">👨🏻‍🏫</span>
                      </div>
                      <div className="text-slate-500 font-medium text-sm">
                        Ожидание подключения преподавателя...
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => void toggleMonitorFullscreen()}
                    className="absolute top-4 right-4 bg-slate-900/40 hover:bg-slate-900/60 transition-colors backdrop-blur-md text-white p-2.5 rounded-2xl cursor-pointer"
                    aria-label={isMonitorFullscreen ? "Exit fullscreen" : "Open fullscreen"}
                  >
                    <Maximize2 size={16} strokeWidth={2.5} />
                  </button>

                  {remoteStream && (
                    <div className="absolute bottom-4 left-4 bg-slate-900/60 backdrop-blur-xl px-3 py-2 text-white rounded-2xl flex items-center gap-2 text-[13px] font-medium shadow-sm max-w-[55%]">
                      <div className="w-5 h-5 rounded-full bg-[#7448FF] flex items-center justify-center shrink-0">
                        🎓
                      </div>
                      <span className="truncate">{formatParticipantLabel(teacherParticipant)}</span>
                    </div>
                  )}

                  <div className="absolute bottom-4 right-4 w-[170px] sm:w-[220px] xl:w-[260px] h-[108px] sm:h-[132px] xl:h-[164px] bg-black rounded-[20px] overflow-hidden border-[3px] border-white/10 shadow-xl transition-all">
                    <StreamVideo
                      stream={localStream}
                      className="w-full h-full object-cover"
                      autoPlay
                      playsInline
                      muted
                    />
                    <div className="absolute bottom-2 left-2 max-w-[85%] bg-slate-900/60 backdrop-blur-xl px-2 py-1 text-white rounded-xl flex items-center gap-1.5 text-[11px] font-medium">
                      <span className="truncate">{currentStudentName}</span>
                      <Mic size={12} className={isMicEnabled ? "text-white shrink-0" : "text-red-400 shrink-0"} />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4 py-2">
                  <CallControlButton
                    active={isMicEnabled}
                    icon={<Mic size={22} />}
                    label="Микрофон"
                    dangerIcon={<MicOff size={22} />}
                    onClick={toggleMic}
                  />
                  <CallControlButton
                    active={isCameraEnabled}
                    icon={<Video size={22} />}
                    label="Камера"
                    dangerIcon={<VideoOff size={22} />}
                    onClick={toggleCamera}
                    disabled={isScreenSharing}
                  />
                  <CallControlButton
                    active={isScreenSharing}
                    icon={<Share2 size={22} />}
                    label="Экран"
                    onClick={toggleScreenShare}
                  />
                  <CallControlButton
                    active
                    icon={<MessageSquare size={22} />}
                    label="Чат"
                    onClick={() => {
                      chatSectionRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }}
                  />
                  <CallControlButton
                    active={false}
                    disabled
                    icon={<MoreHorizontal size={22} />}
                    label="Еще"
                  />

                  <div className="flex flex-col items-center gap-2 mx-1">
                    <button
                      onClick={() => {
                        setLive(false);
                        setTab("prepare");
                      }}
                      className="w-14 h-14 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition shadow-[0_8px_20px_rgba(239,68,68,0.3)] shrink-0"
                    >
                      <PhoneOff size={22} />
                    </button>
                    <span className="text-xs font-semibold text-slate-700">Выйти</span>
                  </div>
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-6 pt-2">
                <div>
                  <div className="flex items-center gap-2 border-b border-slate-100 mb-6">
                    {["Материалы", "Заметки", "Доска"].map((t) => {
                      const id =
                        t === "Материалы"
                          ? "materials"
                          : t === "Заметки"
                            ? "notes"
                            : "whiteboard";
                      const isActive = activeBottomTab === id;

                      return (
                        <button
                          key={id}
                          onClick={() =>
                            setActiveBottomTab(id as "materials" | "notes" | "whiteboard")
                          }
                          className={cn(
                            "px-5 py-3 text-sm font-semibold transition-colors relative",
                            isActive ? "text-[#7448FF]" : "text-slate-500 hover:text-slate-700"
                          )}
                        >
                          {t}
                          {isActive && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#7448FF] rounded-t-full" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="bg-white border text-sm border-slate-100 rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] min-h-[300px] flex items-center justify-center p-8">
                    {activeBottomTab === "whiteboard" && (
                      <div className="text-center w-full">
                        <Reveal>
                          <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                            <PenTool size={32} className="text-slate-200" strokeWidth={1} />
                            <div className="font-semibold text-slate-700">
                              Интерактивная доска недоступна
                            </div>
                            <div className="text-sm max-w-sm">
                              Модуль совместной работы (Whiteboard) пока находится в разработке.
                            </div>
                          </div>
                        </Reveal>
                      </div>
                    )}

                    {activeBottomTab === "notes" && <SessionNotesPanel sessionId={sessionId} role="student" />}

                    {activeBottomTab === "notes" && false && (
                      <div className="flex h-full w-full flex-col text-left">
                        <textarea
                          value=""
                          onChange={() => {}}
                          className="min-h-[220px] w-full flex-1 resize-none rounded-[24px] border border-slate-100 bg-slate-50/50 p-6 text-sm font-medium text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#7448FF]/10 transition-all"
                          placeholder="Личные заметки по сессии. Сохраняются только в этом браузере."
                        />
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-2">
                          <div className="flex items-center gap-2 rounded-lg border border-orange-100 bg-orange-50 px-3 py-1.5">
                            <AlertTriangle size={14} className="text-orange-500" />
                            <span className="text-[11px] font-bold text-orange-600">
                              Личные заметки не синхронизируются с сервером
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

                    {activeBottomTab === "materials" && (contentLoading || sessionFiles.length > 0) && (
                      <div className="w-full">
                        {contentLoading ? (
                          <div className="text-center text-sm text-slate-400">
                            Загружаем материалы сессии...
                          </div>
                        ) : (
                          <div className="grid gap-3">
                            {sessionFiles.map((file) => (
                              <button
                                key={file.id}
                                type="button"
                                onClick={async () => {
                                  const direct = file.url?.trim();
                                  if (direct) {
                                    window.open(direct, "_blank", "noreferrer");
                                    return;
                                  }

                                  const info = await getMaterialDownload(file.id);
                                  const url = info?.downloadUrl ? resolveDownloadUrl(info.downloadUrl) : "";
                                  if (url) {
                                    window.open(url, "_blank", "noreferrer");
                                  }
                                }}
                                className={cn(
                                  "rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4 text-left transition",
                                  "hover:bg-slate-50"
                                )}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="mt-0.5 rounded-2xl border border-slate-100 bg-white p-2 text-slate-500">
                                    <FileText size={16} />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="truncate font-semibold text-slate-900">
                                      {file.title}
                                    </div>
                                    <div className="mt-1 text-xs text-slate-500">
                                      {file.fileName || "Файл сессии"}
                                    </div>
                                    {false && (
                                      <div className="mt-2 text-xs text-amber-600">
                                        Backend ещё не вернул ссылку на скачивание.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {activeBottomTab === "materials" && !contentLoading && sessionFiles.length === 0 && (
                      <div className="text-center w-full">
                        <Reveal>
                          <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                            <CheckSquare size={32} className="text-slate-200" strokeWidth={1} />
                            <div className="font-semibold text-slate-700">Нет материалов</div>
                            <div className="text-sm max-w-sm">
                              Учебный план для данной сессии не загружен сервером.
                            </div>
                          </div>
                        </Reveal>
                      </div>
                    )}
                  </div>

                  {(contentLoading ||
                    sessionContent?.lessonPlan ||
                    sessionContent?.keyPoints?.length ||
                    sessionFiles.length > 0) && (
                    <div className="grid grid-cols-1 gap-6 mt-6 xl:grid-cols-3">
                      <div className="bg-white border text-sm border-slate-100 rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 md:p-8">
                        <h3 className="font-bold text-slate-900 text-[15px] mb-4">План занятия</h3>
                        {contentLoading ? (
                          <div className="text-center py-8 text-slate-400">Загружаем план...</div>
                        ) : sessionContent?.lessonPlan ? (
                          <div className="whitespace-pre-line leading-7 text-slate-600">
                            {sessionContent.lessonPlan}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-slate-400">
                            Backend пока не передал план занятия для этой сессии.
                          </div>
                        )}
                      </div>

                      <div className="bg-white border text-sm border-slate-100 rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 md:p-8">
                        <h3 className="font-bold text-slate-900 text-[15px] mb-4">Важные тезисы</h3>
                        {contentLoading ? (
                          <div className="text-center py-8 text-slate-400">Загружаем тезисы...</div>
                        ) : sessionContent?.keyPoints?.length ? (
                          <ul className="space-y-3">
                            {sessionContent.keyPoints.map((point, index) => (
                              <li
                                key={`${index}-${point}`}
                                className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 text-slate-600"
                              >
                                {point}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-center py-8 text-slate-400">
                            Backend пока не передал важные тезисы для этой сессии.
                          </div>
                        )}
                      </div>

                      <div className="bg-white border text-sm border-slate-100 rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 md:p-8">
                        <h3 className="font-bold text-slate-900 text-[15px] mb-4">Файлы</h3>
                        {contentLoading ? (
                          <div className="text-center py-8 text-slate-400">Загружаем файлы...</div>
                        ) : sessionFiles.length > 0 ? (
                          <div className="space-y-3">
                            {sessionFiles.map((file) => (
                              <button
                                key={file.id}
                                type="button"
                                onClick={async () => {
                                  const direct = file.url?.trim();
                                  if (direct) {
                                    window.open(direct, "_blank", "noreferrer");
                                    return;
                                  }

                                  const info = await getMaterialDownload(file.id);
                                  const url = info?.downloadUrl ? resolveDownloadUrl(info.downloadUrl) : "";
                                  if (url) {
                                    window.open(url, "_blank", "noreferrer");
                                  }
                                }}
                                className={cn(
                                  "flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 transition",
                                  "hover:bg-slate-50"
                                )}
                              >
                                <div className="rounded-2xl border border-slate-100 bg-white p-2 text-slate-500">
                                  <FileText size={16} />
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate font-semibold text-slate-900">{file.title}</div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    {file.fileName || "Файл сессии"}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-slate-400">
                            Backend пока не передал прикреплённые файлы для этой сессии.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div
                    className={cn(
                      "grid grid-cols-1 gap-6 mt-6 xl:grid-cols-3",
                      (contentLoading ||
                        sessionContent?.lessonPlan ||
                        sessionContent?.keyPoints?.length ||
                        sessionFiles.length > 0) &&
                        "hidden"
                    )}
                  >
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
            </div>

            <div
              ref={chatSectionRef}
              className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-4 lg:h-[calc(100dvh-96px)] lg:min-h-0"
            >
              <div className="bg-white border-slate-100 border rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col min-h-[480px] overflow-hidden lg:min-h-0 lg:flex-[1.2]">
                <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between bg-white z-10 shrink-0">
                  <h3 className="font-bold text-slate-900 text-[16px]">Чат сессии</h3>
                  <Badge className="bg-purple-50 text-[#7448FF] shadow-none flex items-center gap-1.5 px-2 py-0.5 rounded-lg border-none">
                    <Users2 size={12} /> {participants.length || 1}
                  </Badge>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <SessionChatPanel sessionId={roomId} role="student" type={sessionType} />
                </div>
              </div>

              <div className="bg-white border-slate-100 border rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 space-y-6 shrink-0">
                <h3 className="font-bold text-slate-900 text-[16px]">Информация о сессии</h3>

                <div className="space-y-4">
                  <div>
                    <div className="text-[12px] text-slate-400 mb-0.5 font-medium">Тема</div>
                    <div className="font-semibold text-slate-900 text-sm">{title}</div>
                  </div>

                  <div>
                    <div className="text-[12px] text-slate-400 mb-0.5 font-medium">Режим</div>
                    <div className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                      <Clock size={14} className="text-slate-400" />
                      Live-трансляция ({sessionType})
                    </div>
                  </div>

                  <div>
                    <div className="text-[12px] text-slate-400 mb-2 font-medium">Участники</div>
                    <div className="flex flex-col gap-3">
                      {presence.length > 0 && (
                        <div className="space-y-2">
                          {presence.map((p) => (
                            <div
                              key={p.userId}
                              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3"
                            >
                              <div className="min-w-0">
                                <div className="truncate text-[13px] font-semibold text-slate-900">
                                  {p.fullName || p.email || p.userId}
                                </div>
                                <div className="mt-0.5 truncate text-[11px] font-medium text-slate-500">
                                  {p.email || ""}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] font-semibold">
                                <span
                                  className={cn(
                                    "h-2 w-2 rounded-full",
                                    p.status === "online" ? "bg-emerald-500" : "bg-slate-300"
                                  )}
                                />
                                <span className={p.status === "online" ? "text-emerald-600" : "text-slate-500"}>
                                  {p.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-2.5 rounded-2xl">
                        <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100">
                          👩🏻‍🏫
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-[13px] text-slate-900 truncate">
                            {teacherDisplayName}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            Преподаватель
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-2.5 rounded-2xl">
                        <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100">
                          👦🏻
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-[13px] text-slate-900 truncate">
                            {currentStudentName}
                          </div>
                          <div className="text-[11px] text-[#7448FF] font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-[#7448FF] rounded-full" />
                            Студент
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {mlResult && (
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="text-[12px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      Ваши локальные ML-метрики
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-2xl border border-slate-100 bg-white p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Эмоция
                        </div>
                        <div className="mt-1.5 font-semibold text-slate-900">
                          {mlResult.dominant_emotion || mlResult.emotion || "—"}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-white p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Уверенность
                        </div>
                        <div className="mt-1.5 font-semibold text-slate-900">
                          {formatPercentMetric(mlResult.confidence)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-white p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Вовлечённость
                        </div>
                        <div className="mt-1.5 font-semibold text-slate-900">
                          {formatPercentMetric(mlResult.engagement)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-white p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Стресс
                        </div>
                        <div className="mt-1.5 font-semibold text-slate-900">
                          {formatPercentMetric(mlResult.stress)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-white p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Усталость
                        </div>
                        <div className="mt-1.5 font-semibold text-slate-900">
                          {formatPercentMetric(mlResult.fatigue)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-white p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Риск
                        </div>
                        <div className="mt-1.5 font-semibold text-slate-900">
                          {formatPercentMetric(mlResult.risk)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] font-medium">
                      <span className="rounded-full bg-white px-3 py-1 text-slate-600 border border-slate-100">
                        Состояние: {mlResult.state || "—"}
                      </span>
                      {typeof mlResult.face_detected === "boolean" && (
                        <span className="rounded-full bg-white px-3 py-1 text-slate-600 border border-slate-100">
                          Лицо в кадре: {mlResult.face_detected ? "обнаружено" : "не найдено"}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {mlActive && mlFaceDetected === false && !mlUnavailable && (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-[13px] text-amber-700 font-medium">
                    Лицо не найдено в кадре. Аналитика временно приостановлена, пока лицо не вернется.
                  </div>
                )}

                {mlActive && !mlResult && mlFaceDetected !== false && !mlUnavailable && (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-[13px] text-emerald-700 font-medium">
                    ML-анализ активен. Ожидание первых результатов...
                  </div>
                )}

                {mlUnavailable && (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-[13px] text-amber-700 font-medium">
                    ML-анализ временно недоступен.
                  </div>
                )}
              </div>

              <div className="bg-white border-slate-100 border rounded-[28px] shadow-[0_4px_24px_rgba(0,0,0,0.02)] p-6 flex flex-col min-h-[160px]">
                <h3 className="font-bold text-slate-900 text-[16px] mb-4">Файлы</h3>
                <div className="flex-1 flex flex-col items-center justify-center text-center py-4 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                  <FileText size={20} className="text-slate-300 mb-2" strokeWidth={1.5} />
                  <div className="text-[13px] font-semibold text-slate-500">
                    Нет прикрепленных файлов
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

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
        `}</style>
      </div>
    );
  }

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
                <AlertTriangle size={20} className="shrink-0 text-amber-600" />
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

                    <Link href={`/consent?returnUrl=${encodeURIComponent(`/student/session/${sessionId}`)}`}>
                      <Button className="mt-2 bg-[#7448FF] hover:bg-[#623ce6] text-white border-none shadow-sm">
                        Перейти к согласию
                      </Button>
                    </Link>
                  </>
                )}

                {(blockReason === "session_not_started" || blockReason === "session_ended") && (
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
                      <AlertTriangle size={20} className="shrink-0 text-amber-600" />
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

              <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
                <div>
                  <Card className="overflow-hidden border-slate-100">
                    <CardContent className="space-y-5 p-6 md:p-7">
                      <div className="flex items-start gap-4">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 border border-purple-100 text-[#7448FF] shadow-sm">
                          <Sparkles size={20} />
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold text-slate-400 uppercase tracking-wide">
                            Шаг 1
                          </div>
                          <div className="mt-1.5 text-lg font-bold text-slate-900">
                            Consent и правила приватности
                          </div>
                          <div className="mt-2 text-sm leading-relaxed text-slate-500 font-medium">
                            Видео не сохраняется. Анализ идёт 1–2 кадра в секунду, в систему попадают только агрегированные метрики.
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
                          href={`/consent?returnUrl=${encodeURIComponent(`/student/session/${sessionId}`)}`}
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

                <div>
                  <Card className="overflow-hidden border-slate-100 h-full">
                    <CardContent className="space-y-4 p-6 md:p-7 h-full flex flex-col">
                      <div className="flex items-start gap-4">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100 text-blue-500 shadow-sm">
                          <MonitorUp size={20} />
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold text-slate-400 uppercase tracking-wide">
                            Шаг 2
                          </div>
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
                WS base URL не настроен. Проверь конфигурацию{" "}
                <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_WS_BASE_URL</code>.
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
