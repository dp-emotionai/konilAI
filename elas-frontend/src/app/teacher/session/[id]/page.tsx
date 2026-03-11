"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Reveal from "@/components/common/Reveal";
import Section from "@/components/common/Section";

import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";

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

import { TeacherSessionTabs } from "@/components/session/TeacherSessionTabs";
import CameraCheck from "@/components/session/CameraCheck";
import { SessionChatPanel } from "@/components/chat/SessionChatPanel";

import { SignalingClient } from "@/lib/webrtc/signalingClient";
import { PeerConnectionManager } from "@/lib/webrtc/peerConnectionManager";
import type { Participant } from "@/lib/webrtc/types";

import { getWsBaseUrl } from "@/lib/env";
import {
  Activity,
  Users,
  Video,
  AlertTriangle,
  Send,
  LogOut,
  Share2,
  Flag,
  Clock,
  Mic,
  PhoneOff,
  Settings,
  Sparkles,
  ShieldCheck,
  Monitor,
  MicOff,
  VideoOff,
  MessageCircle,
} from "lucide-react";

type SessionPhase = "preflight" | "live" | "ended";

function clamp01(x: number) {
  // Accept either 0..1 or 0..100 inputs (normalize to 0..1).
  const normalized = x > 1 && x <= 100 ? x / 100 : x;
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, normalized));
}

function formatPct100(x?: number | null) {
  if (typeof x !== "number" || Number.isNaN(x)) return "—";
  return `${Math.round(clamp01(x) * 100)}%`;
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-surface-subtle px-3 py-3">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold text-fg">{value}</div>
    </div>
  );
}

function LiveInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function formatPct01(x?: number) {
  if (typeof x !== "number" || Number.isNaN(x)) return "—";
  return `${Math.round(x * 100)}%`;
}

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

function EmotionBadge({ emotion }: { emotion?: string | null }) {
  const tone = emotionTone(emotion);
  const base =
    "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold tracking-wide border backdrop-blur";
  const cls =
    tone === "emerald"
      ? "border-emerald-400/25 bg-emerald-500/15 text-emerald-200"
      : tone === "red"
        ? "border-red-400/25 bg-red-500/15 text-red-200"
        : tone === "amber"
          ? "border-amber-400/25 bg-amber-500/15 text-amber-200"
          : tone === "violet"
            ? "border-violet-400/25 bg-violet-500/15 text-violet-200"
            : tone === "sky"
              ? "border-sky-400/25 bg-sky-500/15 text-sky-200"
              : tone === "lime"
                ? "border-lime-400/25 bg-lime-500/15 text-lime-200"
                : "border-white/10 bg-white/10 text-white/80";

  return <span className={`${base} ${cls}`}>{emotion || "—"}</span>;
}

function MetricBar({
  label,
  value01,
  tone = "primary",
}: {
  label: string;
  value01?: number | null;
  tone?: "primary" | "red" | "amber";
}) {
  const v = typeof value01 === "number" ? clamp01(value01) : null;
  const bar =
    tone === "red"
      ? "bg-gradient-to-r from-red-500 to-rose-400"
      : tone === "amber"
        ? "bg-gradient-to-r from-amber-500 to-orange-400"
        : "bg-gradient-to-r from-[rgb(var(--primary))] to-indigo-400";

  return (
    <div className="flex items-center gap-2">
      <div className="w-[78px] text-[10px] uppercase tracking-[0.16em] text-white/45">
        {label}
      </div>
      <div className="flex-1">
        <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.round((v ?? 0) * 100)}%` }} />
        </div>
      </div>
      <div className="w-10 text-right text-[10px] font-semibold text-white/80 tabular-nums">
        {v == null ? "—" : `${Math.round(v * 100)}%`}
      </div>
    </div>
  );
}

function formatParticipantLabel(p?: Participant | null) {
  if (!p) return "Студент";
  return p.displayName || p.name || p.email || `${p.role} · ${p.id.slice(0, 8)}`;
}

function VideoTile({
  stream,
  label,
  status,
  isLocal,
  videoRef,
  metrics,
  compact,
  aspect = true,
}: {
  stream: MediaStream | null;
  label: string;
  status: string;
  isLocal: boolean;
  videoRef: React.Ref<HTMLVideoElement | null>;
  metrics?: LiveMetricsParticipant | null;
  compact?: boolean;
  aspect?: boolean;
}) {
  const engagement = metrics?.engagement ?? null;
  const tone =
    typeof engagement === "number"
      ? clamp01(engagement) >= 0.7
        ? "good"
        : clamp01(engagement) >= 0.4
          ? "mid"
          : "bad"
      : "neutral";
  const engagementPill =
    tone === "good"
      ? "border-emerald-400/25 bg-emerald-500/15 text-emerald-200"
      : tone === "mid"
        ? "border-amber-400/25 bg-amber-500/15 text-amber-200"
        : tone === "bad"
          ? "border-red-400/25 bg-red-500/15 text-red-200"
          : "border-white/10 bg-white/10 text-white/80";

  return (
    <div
      className={
        "relative overflow-hidden rounded-xl bg-black border border-white/10 " +
        (aspect ? "aspect-video " : "") +
        "cursor-default transition-all duration-300"
      }
    >
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        playsInline
        muted={isLocal}
        autoPlay
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-2 p-2">
        <div className="min-w-0 flex-1">
          <div className="inline-flex max-w-full flex-col gap-1 rounded-lg bg-black/45 px-2 py-1.5 backdrop-blur border border-white/10">
            <div className="truncate text-xs font-semibold text-white/90">{label}</div>

            {!isLocal && (
              <div className="flex flex-wrap items-center gap-1.5">
                <EmotionBadge emotion={metrics?.emotion ?? null} />
                <span
                  className={
                    "inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold tracking-wide border " +
                    engagementPill
                  }
                >
                  Engagement: {formatPct100(engagement)}
                </span>
              </div>
            )}
          </div>

          {!compact && !isLocal && metrics && (
            <div className="mt-2 rounded-lg bg-black/35 border border-white/10 p-2 backdrop-blur">
              <div className="grid gap-1.5">
                <MetricBar label="eng" value01={metrics.engagement ?? null} tone="primary" />
                <MetricBar label="stress" value01={metrics.stress ?? null} tone="red" />
                <MetricBar label="fatigue" value01={metrics.fatigue ?? null} tone="amber" />
              </div>
            </div>
          )}
        </div>

        <Badge className="shrink-0 border border-white/10 bg-black/50 text-[10px] text-white/80">
          {status}
        </Badge>
      </div>
      {!stream && (
        <div className="absolute inset-0 grid place-items-center bg-black/40">
          <span className="text-xs text-white/60">Ожидание...</span>
        </div>
      )}
    </div>
  );
}

export default function TeacherLiveMonitorPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params?.id ?? "";

  const [phase, setPhase] = useState<SessionPhase>("preflight");
  const [liveSeconds, setLiveSeconds] = useState(0);

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const peerManagerRef = useRef<PeerConnectionManager | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const [liveMetrics, setLiveMetrics] = useState<SessionLiveMetrics | null>(null);
  const [polling, setPolling] = useState(false);
  const [chatPolicy, setChatPolicy] = useState<SessionChatPolicy | null>(null);

  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const [connectionState, setConnectionState] = useState<"idle" | "connecting" | "connected" | "error">("idle");
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [wsDisconnected, setWsDisconnected] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [focusedParticipant, setFocusedParticipant] = useState<Participant | "local" | null>(null);

  const apiAvailable = Boolean(getApiBaseUrl() && hasAuth());
  const wsUrl = getWsBaseUrl();
  const [cameraReady, setCameraReady] = useState(false);

  const roomId = sessionId;
  const isLive = phase === "live";

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

    if (!wsUrl?.startsWith("ws")) {
      setConnectionError("Не настроен адрес сервера эфира (WS). Проверьте NEXT_PUBLIC_WS_BASE_URL.");
      setConnectionState("error");
      setPhase("preflight");
      return;
    }

    const signaling = new SignalingClient(`${wsUrl}/ws`);
    const manager = new PeerConnectionManager(signaling, roomId, "teacher", {
      onRemoteStream: (peerId, stream) => {
        setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
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

    (async () => {
      try {
        const stream = await manager.initLocalStream({ video: true, audio: true });
        setLocalStream(stream);
        setIsMicEnabled(true);
        setIsCameraEnabled(true);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          await localVideoRef.current.play().catch(() => {});
        }

        await signaling.waitForOpen(12000);
        manager.join();
        setConnectionState("connected");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Ошибка подключения";
        const friendly =
          msg.includes("timeout") || msg.includes("WebSocket")
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
      setIsSettingsOpen(false);
      setConnectionState("idle");
      setConnectionError(null);
      setWsDisconnected(false);
    };
  }, [isLive, roomId, wsUrl]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream]);

  useEffect(() => {
    Object.entries(remoteStreams).forEach(([peerId, stream]) => {
      const el = (remoteVideoRefs.current as Record<string, HTMLVideoElement | null>)[peerId];
      if (el && stream) {
        el.srcObject = stream;
        el.play().catch(() => {});
      }
    });
  }, [remoteStreams]);

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
      setPolling(false);
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
      setPolling(true);

      try {
        const data = await getSessionLiveMetrics(roomId);
        if (!stopped && data) setLiveMetrics(data);
      } finally {
        inflight = false;
        if (!stopped) timer = window.setTimeout(tick, 2000);
      }
    };

    tick();

    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      setPolling(false);
    };
  }, [isLive, roomId, apiAvailable]);

  const hasMl = Boolean(liveMetrics?.participants?.length);
  const avgRisk = liveMetrics?.avgRisk ?? 0;
  const avgConfidence = liveMetrics?.avgConfidence ?? 0;
  const mlParticipants = liveMetrics?.participants ?? [];

  const liveMetricsIndex = useMemo(() => {
    const byKey = new Map<string, LiveMetricsParticipant>();
    for (const m of mlParticipants) {
      if (m.userId) byKey.set(`uid:${m.userId}`, m);
      if (m.email) byKey.set(`email:${String(m.email).toLowerCase()}`, m);
      if (m.name) byKey.set(`name:${String(m.name).toLowerCase()}`, m);
    }
    return byKey;
  }, [mlParticipants]);

  const metricsForPeer = useCallback(
    (p: Participant): LiveMetricsParticipant | null => {
      const uid = `uid:${p.id}`;
      const email = p.email ? `email:${String(p.email).toLowerCase()}` : null;
      const name = p.displayName || p.name;
      const nameKey = name ? `name:${String(name).toLowerCase()}` : null;
      return (
        liveMetricsIndex.get(uid) ||
        (email ? liveMetricsIndex.get(email) : undefined) ||
        (nameKey ? liveMetricsIndex.get(nameKey) : undefined) ||
        null
      );
    },
    [liveMetricsIndex]
  );

  const avgEngagement =
    liveMetrics?.avgEngagement ??
    (mlParticipants.length
      ? mlParticipants.reduce((a, p) => a + (typeof p.engagement === "number" ? p.engagement : 0), 0) /
        Math.max(1, mlParticipants.filter((p) => typeof p.engagement === "number").length)
      : null);

  const avgStress =
    liveMetrics?.avgStress ??
    (mlParticipants.length
      ? mlParticipants.reduce((a, p) => a + (typeof p.stress === "number" ? p.stress : 0), 0) /
        Math.max(1, mlParticipants.filter((p) => typeof p.stress === "number").length)
      : null);

  const avgFatigue =
    liveMetrics?.avgFatigue ??
    (mlParticipants.length
      ? mlParticipants.reduce((a, p) => a + (typeof p.fatigue === "number" ? p.fatigue : 0), 0) /
        Math.max(1, mlParticipants.filter((p) => typeof p.fatigue === "number").length)
      : null);

  const gates = {
    backend: apiAvailable,
    ws: Boolean(wsUrl),
    camera: cameraReady,
  };

  const criticalOk = gates.backend && gates.ws && gates.camera;
  const liveLabel = phase === "ended" ? "Ended" : isLive ? "Live" : "Preflight";
  const timerLabel = new Date(liveSeconds * 1000).toISOString().substring(11, 19);

  const sessionTitle = "Сессия";
  const sessionType = "lecture" as "lecture" | "exam";

  const stopScreenShare = async () => {
    const manager = peerManagerRef.current;
    if (!manager || !localStream) return;

    const cameraTrack = localStream.getVideoTracks()[0] ?? null;
    if (cameraTrack) {
      cameraTrack.enabled = isCameraEnabled;
    }

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
    } catch (err) {
      console.error(err);
      setMediaError("Не удалось запустить демонстрацию экрана.");
    }
  };

  const liveSuggestion = useMemo(() => {
    if (!isLive) return null;
    const mins = Math.floor(liveSeconds / 60);
    const riskPct = Math.round(avgRisk * 100);

    if (mins >= 20 && mins < 35 && riskPct < 40) {
      return "20–30 минута: хорошее окно для короткого опроса или обсуждения — закрепите материал.";
    }
    if (riskPct >= 60) {
      return "Сейчас у части группы повышенный риск/напряжение. Подойдёт пауза на дыхание или смена активности.";
    }
    if (mins >= 35) {
      return "После 35-й минуты внимание часто падает. Добавьте практическое задание или разбор кейса.";
    }
    if (participants.length === 0) {
      return "Ждите подключений студентов. Как только кто-то зайдёт, начните с короткого чек-ина по самочувствию.";
    }
    return "Следите за live-графиком и помечайте важные моменты маркерами — это улучшит итоговый отчёт.";
  }, [isLive, liveSeconds, avgRisk, participants.length]);

  return (
    <div className="pb-12 space-y-6">
      <Breadcrumbs
        items={[
          { label: "Преподаватель", href: "/teacher/dashboard" },
          { label: "Сессии", href: "/teacher/sessions" },
              { label: sessionTitle },
        ]}
      />

      <Link
        href="/teacher/sessions"
        className="inline-flex text-sm text-muted transition-colors hover:text-fg"
      >
        ← К списку сессий
      </Link>

      {phase !== "live" && (
        <>
          <PageHero
            overline="Преподаватель · Live-монитор"
            title={sessionTitle}
            subtitle="Live-видео + метрики группы. Используется только для улучшения урока, не для оценивания личности."
            right={
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-surface-subtle">
                  Type: {sessionType === "exam" ? "Exam" : "Lecture"}
                </Badge>
                <Badge className={isLive ? "bg-primary/10 text-[rgb(var(--primary))]" : "bg-surface-subtle"}>
                  <span className="mr-1 inline-flex h-2 w-2 rounded-full bg-[rgb(var(--success))] animate-pulse" />
                  {liveLabel}
                </Badge>
              </div>
            }
          />

          <TeacherSessionTabs sessionId={sessionId} />
        </>
      )}

      {phase !== "live" && (
        <Section spacing="none" className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-elas-lg bg-surface-subtle/80 px-4 py-3 ring-1 ring-[color:var(--border)]/30">
            <div className="flex items-center gap-3">
              <Badge className={isLive ? "bg-primary/10 text-[rgb(var(--primary))]" : "bg-surface-subtle text-muted"}>
                {liveLabel}
              </Badge>
              <div className="inline-flex items-center gap-1 text-xs text-muted">
                <Clock size={14} />
                <span>{timerLabel}</span>
              </div>
              <div className="hidden items-center gap-2 text-xs text-muted sm:flex">
                <span>Room:</span>
                <span className="font-mono text-[11px]">
                  {roomId ? `${roomId.slice(0, 8)}…` : "—"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                className="gap-2"
                disabled={!criticalOk || isLive}
                onClick={() => {
                  if (!criticalOk) return;
                  setPhase("live");
                  setLiveSeconds(0);
                }}
              >
                <Video size={14} />
                Start session
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                disabled={!isLive}
                onClick={() => setPhase("ended")}
              >
                <LogOut size={14} />
                End session
              </Button>

              <Button size="sm" variant="outline" className="gap-1.5" disabled>
                <Share2 size={14} />
                Share join link
              </Button>

              <Button size="sm" variant="outline" className="gap-1.5" disabled>
                <Flag size={14} />
                Add marker
              </Button>
            </div>
          </div>
        </Section>
      )}

      {phase === "preflight" && (
        <Section spacing="none" className="mt-6">
          <Reveal>
            {connectionError && (
              <Card className="mb-6 border-amber-400/25 bg-amber-500/10">
                <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-fg">Ошибка подключения</div>
                      <div className="text-sm text-muted mt-0.5">{connectionError}</div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
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

            <div className="grid items-start gap-6 lg:grid-cols-12">
              <div className="space-y-4 lg:col-span-5">
                <Card variant="elevated" className="overflow-hidden">
                  <CardContent className="space-y-5 p-6 md:p-7">
                    <div className="flex items-start gap-3">
                      <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-[rgb(var(--primary))]">
                        <Sparkles size={18} />
                      </div>
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wider text-muted">
                          Preflight checklist
                        </div>
                        <div className="mt-1 text-lg font-semibold text-fg">
                          Проверьте перед стартом
                        </div>
                        <div className="mt-2 text-sm text-muted">
                          Пока критические проверки не зелёные — сессия не запустится.
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 text-sm">
                      <ChecklistItem
                        label="Backend / Auth"
                        ok={gates.backend}
                        hint={apiAvailable ? "API доступен" : "Нет API URL или токена"}
                      />
                      <ChecklistItem
                        label="WS signaling"
                        ok={gates.ws}
                        hint={wsUrl || "WS URL не настроен"}
                      />
                      <ChecklistItem
                        label="Camera ready"
                        ok={gates.camera}
                        hint={gates.camera ? "Preview OK" : "Запустите камеру и проверьте лицо/свет"}
                      />
                      <ChecklistItem
                        label="Consent-first"
                        ok
                        hint="Студенты дают согласие до аналитики. Напоминание есть в интерфейсе студента."
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <StatusPill label="Backend" value={gates.backend ? "OK" : "Off"} />
                      <StatusPill label="WS" value={gates.ws ? "OK" : "Off"} />
                      <StatusPill label="Camera" value={gates.camera ? "Ready" : "Check"} />
                      <StatusPill label="Session type" value={sessionType === "exam" ? "Exam" : "Lecture"} />
                    </div>

                    {!criticalOk && (
                      <div className="rounded-2xl bg-surface-subtle/80 px-3 py-3 text-xs text-muted">
                        Start session станет доступна, когда Backend, WS и Camera будут в статусе OK.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-7">
                <CameraCheck onReadyChange={setCameraReady} />
              </div>
            </div>
          </Reveal>
        </Section>
      )}

      {phase === "live" && (
        <Section spacing="none" className="mt-6">
          <Reveal>
            {connectionState === "connecting" && (
              <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/90">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                Подключение к эфиру…
              </div>
            )}

            {connectionState === "connected" && wsDisconnected && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/15 px-4 py-3 text-sm text-amber-100">
                <span className="flex items-center gap-2">
                  <AlertTriangle size={18} />
                  Соединение потеряно. Завершите сессию и перезапустите эфир при необходимости.
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-300/50 text-amber-100 hover:bg-amber-500/20"
                  onClick={() => setConfirmEndOpen(true)}
                >
                  Завершить сессию
                </Button>
              </div>
            )}

            <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#070b17] shadow-[0_30px_100px_rgba(0,0,0,0.42)] flex flex-col min-h-[70vh]">
              <div className="flex flex-1 min-h-0 items-stretch flex-col xl:flex-row">
                <div className="flex flex-1 min-w-0 flex-col bg-[radial-gradient(circle_at_top,#0f1730,transparent_35%),linear-gradient(180deg,#050914_0%,#050914_100%)]">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-[0.24em] text-white/40">
                        Teacher · Live monitor
                      </div>
                      <div className="mt-1 truncate text-xl font-semibold text-white">
                        {sessionTitle}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="border border-white/10 bg-white/5 text-white/75">
                          {sessionType === "exam" ? "Exam" : "Lecture"}
                      </Badge>

                      {connectionState === "connected" && (
                        <Badge className="border border-emerald-400/20 bg-emerald-500/15 text-emerald-300">
                          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                          LIVE
                        </Badge>
                      )}

                      {isScreenSharing && (
                        <Badge className="border border-sky-400/20 bg-sky-500/15 text-sky-300">
                          Screen sharing
                        </Badge>
                      )}

                      <Badge className="border border-white/10 bg-white/5 font-mono text-white/75">
                        {timerLabel}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="xl:hidden gap-1.5 border-white/10 bg-white/5 text-white hover:bg-white/10"
                        onClick={() => setChatOpen(true)}
                        aria-label="Открыть чат"
                      >
                        <MessageCircle size={14} />
                        Чат
                      </Button>
                    </div>
                  </div>

                  {/* Video area: focused layout (main + secondary grid) */}
                  <div className="flex flex-1 flex-col p-5 min-h-0 gap-4 transition-all duration-300">
                    {(() => {
                      const totalTiles = 1 + participants.length; // teacher + students

                      const focusedId =
                        focusedParticipant === "local"
                          ? "local"
                          : focusedParticipant && focusedParticipant !== "local"
                            ? focusedParticipant.id
                            : participants[0]?.id ?? "local";

                      const mainIsLocal =
                        focusedId === "local" ||
                        (!participants.length && focusedId !== "local");

                      const mainRemote =
                        !mainIsLocal && participants.find((p) => p.id === focusedId);

                      // Fallbacks if focused participant left
                      const effectiveMainIsLocal = mainRemote ? false : true;
                      const effectiveMainRemote =
                        !effectiveMainIsLocal && mainRemote
                          ? mainRemote
                          : !effectiveMainIsLocal
                            ? participants[0]
                            : null;

                      const secondary: Array<{ kind: "local" | "remote"; peer?: Participant }> = [];

                      if (!effectiveMainIsLocal) {
                        secondary.push({ kind: "local" });
                      }
                      participants.forEach((p) => {
                        if (effectiveMainRemote && p.id === effectiveMainRemote.id) return;
                        secondary.push({ kind: "remote", peer: p });
                      });

                      // Side‑by‑side layout when only two tiles total (desktop only; mobile uses grid)
                      if (totalTiles <= 2) {
                        const other =
                          totalTiles === 2
                            ? effectiveMainIsLocal
                              ? participants[0]
                              : null
                            : null;

                        return (
                          <>
                            {/* Mobile: grid-only */}
                            <div className="sm:hidden">
                              <div className="grid grid-cols-2 gap-3">
                                <button
                                  type="button"
                                  className="rounded-xl overflow-hidden bg-black border border-white/10 cursor-pointer transition-all duration-300 hover:scale-[1.03]"
                                  onClick={() => setFocusedParticipant("local")}
                                >
                                  <VideoTile
                                    stream={localStream}
                                    label="Вы · Teacher"
                                    status={connectionState === "connected" ? "LIVE" : "—"}
                                    isLocal
                                    compact
                                    videoRef={localVideoRef}
                                  />
                                </button>
                                {participants[0] && (
                                  <button
                                    type="button"
                                    className="rounded-xl overflow-hidden bg-black border border-white/10 cursor-pointer transition-all duration-300 hover:scale-[1.03]"
                                    onClick={() => setFocusedParticipant(participants[0])}
                                  >
                                    <VideoTile
                                      stream={remoteStreams[participants[0].id] ?? null}
                                      label={formatParticipantLabel(participants[0])}
                                      status={
                                        remoteStreams[participants[0].id]
                                          ? "LIVE"
                                          : "Подключение..."
                                      }
                                      isLocal={false}
                                      metrics={metricsForPeer(participants[0])}
                                      compact
                                      videoRef={(el) => {
                                        (remoteVideoRefs.current as Record<
                                          string,
                                          HTMLVideoElement | null
                                        >)[participants[0].id] = el;
                                      }}
                                    />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Desktop: side-by-side */}
                            <div className="hidden sm:flex flex-1 min-h-0 flex-col gap-4 md:flex-row transition-all duration-300">
                              <div className="flex-1 min-w-0 flex items-stretch">
                                <div className="w-full transition-all duration-300">
                                  {effectiveMainIsLocal ? (
                                    <VideoTile
                                      stream={localStream}
                                      label="Вы · Teacher"
                                      status={connectionState === "connected" ? "LIVE" : "—"}
                                      isLocal
                                      videoRef={localVideoRef}
                                    />
                                  ) : effectiveMainRemote ? (
                                    <VideoTile
                                      stream={remoteStreams[effectiveMainRemote.id] ?? null}
                                      label={formatParticipantLabel(effectiveMainRemote)}
                                      status={
                                        remoteStreams[effectiveMainRemote.id]
                                          ? "LIVE"
                                          : "Подключение..."
                                      }
                                      isLocal={false}
                                      metrics={metricsForPeer(effectiveMainRemote)}
                                      videoRef={(el) => {
                                        (remoteVideoRefs.current as Record<
                                          string,
                                          HTMLVideoElement | null
                                        >)[effectiveMainRemote.id] = el;
                                      }}
                                    />
                                  ) : null}
                                </div>
                              </div>

                              {other && (
                                <div className="flex-1 min-w-0 flex items-stretch">
                                  <button
                                    type="button"
                                    className="w-full cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-xl"
                                    onClick={() => setFocusedParticipant(other)}
                                  >
                                    <VideoTile
                                      stream={remoteStreams[other.id] ?? null}
                                      label={formatParticipantLabel(other)}
                                      status={
                                        remoteStreams[other.id] ? "LIVE" : "Подключение..."
                                      }
                                      isLocal={false}
                                      metrics={metricsForPeer(other)}
                                      compact
                                      videoRef={(el) => {
                                        (remoteVideoRefs.current as Record<
                                          string,
                                          HTMLVideoElement | null
                                        >)[other.id] = el;
                                      }}
                                    />
                                  </button>
                                </div>
                              )}
                            </div>
                          </>
                        );
                      }

                      // Main focused video
                      return (
                        <>
                          <div className="hidden sm:block w-full transition-all duration-300">
                            <div className="w-full h-[60vh] min-h-[320px] rounded-xl overflow-hidden bg-black border border-white/10">
                              {effectiveMainIsLocal ? (
                                <VideoTile
                                  stream={localStream}
                                  label="Вы · Teacher"
                                  status={connectionState === "connected" ? "LIVE" : "—"}
                                  isLocal
                                  aspect={false}
                                  videoRef={localVideoRef}
                                />
                              ) : effectiveMainRemote ? (
                                <VideoTile
                                  stream={remoteStreams[effectiveMainRemote.id] ?? null}
                                  label={formatParticipantLabel(effectiveMainRemote)}
                                  status={
                                    remoteStreams[effectiveMainRemote.id]
                                      ? "LIVE"
                                      : "Подключение..."
                                  }
                                  isLocal={false}
                                  metrics={metricsForPeer(effectiveMainRemote)}
                                  aspect={false}
                                  videoRef={(el) => {
                                    (remoteVideoRefs.current as Record<
                                      string,
                                      HTMLVideoElement | null
                                    >)[effectiveMainRemote.id] = el;
                                  }}
                                />
                              ) : null}
                            </div>
                          </div>

                          {/* Controls directly under main video (desktop) */}
                          <div className="hidden sm:flex flex-shrink-0 justify-center gap-4 mt-4 flex-wrap px-2 transition-all duration-300">
                            <button
                              type="button"
                              className={`rounded-full border p-3 transition ${
                                isMicEnabled
                                  ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                                  : "border-red-400/20 bg-red-500/15 text-red-300 hover:bg-red-500/20"
                              }`}
                              title={isMicEnabled ? "Выключить микрофон" : "Включить микрофон"}
                              onClick={toggleMic}
                            >
                              {isMicEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                            </button>

                            <button
                              type="button"
                              className={`rounded-full border p-3 transition ${
                                isCameraEnabled && !isScreenSharing
                                  ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                                  : "border-red-400/20 bg-red-500/15 text-red-300 hover:bg-red-500/20"
                              }`}
                              title={
                                isScreenSharing
                                  ? "Камера недоступна во время демонстрации"
                                  : isCameraEnabled
                                    ? "Выключить камеру"
                                    : "Включить камеру"
                              }
                              onClick={toggleCamera}
                              disabled={isScreenSharing}
                            >
                              {isCameraEnabled && !isScreenSharing ? (
                                <Video size={20} />
                              ) : (
                                <VideoOff size={20} />
                              )}
                            </button>

                            <button
                              type="button"
                              className={`rounded-full border p-3 transition ${
                                isScreenSharing
                                  ? "border-sky-400/20 bg-sky-500/15 text-sky-300 hover:bg-sky-500/20"
                                  : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                              }`}
                              title={
                                isScreenSharing
                                  ? "Остановить демонстрацию экрана"
                                  : "Запустить демонстрацию экрана"
                              }
                              onClick={toggleScreenShare}
                            >
                              <Monitor size={20} />
                            </button>

                            <button
                              type="button"
                              className={`rounded-full border p-3 transition ${
                                isSettingsOpen
                                  ? "border-violet-400/20 bg-violet-500/15 text-violet-300"
                                  : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                              }`}
                              title="Показать настройки"
                              onClick={() => setIsSettingsOpen((v) => !v)}
                            >
                              <Settings size={20} />
                            </button>

                            <button
                              type="button"
                              className="rounded-full bg-red-500 p-4 text-white transition hover:bg-red-600"
                              title="Завершить сессию"
                              onClick={() => setPhase("ended")}
                            >
                              <PhoneOff size={22} />
                            </button>
                          </div>

                          {/* Secondary participants grid */}
                          {secondary.length > 0 && (
                            <div className="flex-shrink-0">
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-4 transition-all duration-300">
                                {secondary.map((item, idx) => {
                                  if (item.kind === "local") {
                                    return (
                                      <button
                                        type="button"
                                        key={`local-secondary-${idx}`}
                                        className="w-full cursor-pointer transition-all duration-300 hover:scale-[1.03]"
                                        onClick={() => setFocusedParticipant("local")}
                                      >
                                        <VideoTile
                                          stream={localStream}
                                          label="Вы · Teacher"
                                          status={
                                            connectionState === "connected" ? "LIVE" : "—"
                                          }
                                          isLocal
                                          compact
                                          videoRef={localVideoRef}
                                        />
                                      </button>
                                    );
                                  }

                                  const peer = item.peer!;
                                  return (
                                    <button
                                      type="button"
                                      key={peer.id}
                                      className="w-full cursor-pointer transition-all duration-300 hover:scale-[1.03]"
                                      onClick={() => setFocusedParticipant(peer)}
                                    >
                                      <VideoTile
                                        stream={remoteStreams[peer.id] ?? null}
                                        label={formatParticipantLabel(peer)}
                                        status={
                                          remoteStreams[peer.id]
                                            ? "LIVE"
                                            : "Подключение..."
                                        }
                                        isLocal={false}
                                        metrics={metricsForPeer(peer)}
                                        compact
                                        videoRef={(el) => {
                                          (remoteVideoRefs.current as Record<
                                            string,
                                            HTMLVideoElement | null
                                          >)[peer.id] = el;
                                        }}
                                      />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}

                    {/* Controls bar (mobile) */}
                    <div className="sm:hidden flex flex-shrink-0 justify-center gap-4 mt-4 flex-wrap px-2">
                      <button
                        type="button"
                        className={`rounded-full border p-3 transition ${
                          isMicEnabled
                            ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                            : "border-red-400/20 bg-red-500/15 text-red-300 hover:bg-red-500/20"
                        }`}
                        title={isMicEnabled ? "Выключить микрофон" : "Включить микрофон"}
                        onClick={toggleMic}
                      >
                        {isMicEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                      </button>

                      <button
                        type="button"
                        className={`rounded-full border p-3 transition ${
                          isCameraEnabled && !isScreenSharing
                            ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                            : "border-red-400/20 bg-red-500/15 text-red-300 hover:bg-red-500/20"
                        }`}
                        title={
                          isScreenSharing
                            ? "Камера недоступна во время демонстрации"
                            : isCameraEnabled
                              ? "Выключить камеру"
                              : "Включить камеру"
                        }
                        onClick={toggleCamera}
                        disabled={isScreenSharing}
                      >
                        {isCameraEnabled && !isScreenSharing ? (
                          <Video size={20} />
                        ) : (
                          <VideoOff size={20} />
                        )}
                      </button>

                      <button
                        type="button"
                        className={`rounded-full border p-3 transition ${
                          isScreenSharing
                            ? "border-sky-400/20 bg-sky-500/15 text-sky-300 hover:bg-sky-500/20"
                            : "border-white/10 bg-white/5 text-white hover:bg-white/10"
                        }`}
                        title={
                          isScreenSharing
                            ? "Остановить демонстрацию экрана"
                            : "Запустить демонстрацию экрана"
                        }
                        onClick={toggleScreenShare}
                      >
                        <Monitor size={20} />
                      </button>

                      <button
                        type="button"
                        className={`rounded-full border p-3 transition ${
                          isSettingsOpen
                            ? "border-violet-400/20 bg-violet-500/15 text-violet-300"
                            : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                        }`}
                        title="Показать настройки"
                        onClick={() => setIsSettingsOpen((v) => !v)}
                      >
                        <Settings size={20} />
                      </button>

                      <button
                        type="button"
                        className="rounded-full border border-amber-400/20 bg-amber-500/15 p-3 text-amber-300 transition hover:bg-amber-500/20"
                        title="Добавить маркер"
                      >
                        <Flag size={20} />
                      </button>

                      <button
                        type="button"
                        className="rounded-full bg-red-500 p-4 text-white transition hover:bg-red-600"
                        title="Завершить сессию"
                        onClick={() => setPhase("ended")}
                      >
                        <PhoneOff size={22} />
                      </button>
                    </div>

                    {isSettingsOpen && (
                      <div className="mx-auto mt-4 max-w-xl space-y-3">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/20 text-purple-200">
                              <Sparkles size={16} />
                            </div>
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                                Live assistant
                              </div>
                              <div className="mt-1 text-sm text-white/85">
                                {liveSuggestion}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <LiveInfoCard label="Mic" value={isMicEnabled ? "On" : "Off"} />
                          <LiveInfoCard label="Camera" value={isCameraEnabled ? "On" : "Off"} />
                          <LiveInfoCard label="Screen" value={isScreenSharing ? "Sharing" : "Off"} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Chat sidebar: visible on xl; on mobile show toggle */}
                <aside
                  className={`flex min-h-0 flex-col border-l border-white/10 bg-[linear-gradient(180deg,#0a0f1d_0%,#0a0e19_100%)] w-full xl:w-[390px] xl:max-w-[390px] shrink-0 ${
                    chatOpen ? "flex" : "hidden xl:flex"
                  }`}
                >
                  <div className="border-b border-white/10 px-5 py-4 shrink-0">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">Control center</div>
                        <div className="mt-1 text-xs text-white/45">
                          Live metrics, participants and chat
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="xl:hidden border-white/10 bg-white/5 text-white hover:bg-white/10"
                          onClick={() => setChatOpen(false)}
                          aria-label="Закрыть чат"
                        >
                          Закрыть
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                          onClick={() => setConfirmEndOpen(true)}
                        >
                          <LogOut size={14} />
                          Завершить
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <LiveInfoCard label="Room" value={roomId ? `${roomId.slice(0, 8)}…` : "—"} />
                      <LiveInfoCard label="Participants" value={`${participants.length}`} />
                      <LiveInfoCard label="Avg engagement" value={hasMl ? formatPct100(avgEngagement) : "—"} />
                      <LiveInfoCard label="Avg stress" value={hasMl ? formatPct100(avgStress) : "—"} />
                      <LiveInfoCard label="Group state" value={hasMl ? (liveMetrics?.groupState ?? "—") : "—"} />
                      <LiveInfoCard label="Pattern" value={hasMl ? (liveMetrics?.pattern ?? "—") : "—"} />
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 border-b border-white/10 p-4">
                    <SessionChatPanel
                      sessionId={roomId}
                      role="teacher"
                      type={sessionType === "exam" ? "exam" : "lecture"}
                    />
                  </div>

                  <div className="border-b border-white/10 px-5 py-4">
                    <div className="text-sm font-semibold text-white">Session integrity</div>
                    <div className="mt-4 grid gap-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/75">
                        Backend:{" "}
                        <span className={apiAvailable ? "text-emerald-300" : "text-amber-300"}>
                          {apiAvailable ? "connected" : "offline"}
                        </span>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/75">
                        Camera:{" "}
                        <span className={cameraReady ? "text-emerald-300" : "text-amber-300"}>
                          {cameraReady ? "ready" : "check required"}
                        </span>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/75">
                        Consent model: <span className="text-emerald-300">active</span>
                      </div>
                    </div>
                  </div>

                  {apiAvailable && isRealSessionId(roomId) && (
                    <div className="border-b border-white/10 px-5 py-4">
                      <div className="text-sm font-semibold text-white">Chat mode</div>
                      <div className="mt-3">
                        <select
                          className="h-10 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none"
                          value={chatPolicy?.mode ?? "lecture_open"}
                          onChange={async (e) => {
                            const mode = e.target.value as SessionChatPolicy["mode"];
                            try {
                              const updated = await updateSessionChatPolicy(roomId, { mode });
                              setChatPolicy(updated);
                            } catch (err) {
                              console.error("updateSessionChatPolicy", err);
                            }
                          }}
                        >
                          <option value="lecture_open">Открытый (все сообщения)</option>
                          <option value="questions_only">Только вопросы</option>
                          <option value="locked">Закрыт</option>
                          <option value="exam_help_only">Экзамен (только help)</option>
                        </select>
                      </div>

                      <div className="mt-2 text-xs text-white/45">
                        {chatPolicy?.mode === "locked" && "Студенты не могут писать"}
                        {chatPolicy?.mode === "questions_only" && "Студенты могут отправлять только вопросы"}
                        {chatPolicy?.mode === "lecture_open" && "Стандартный чат лекции"}
                        {chatPolicy?.mode === "exam_help_only" && "Только help-канал для экзамена"}
                      </div>
                    </div>
                  )}

                  <div className="border-b border-white/10 px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-white">Participants & ML</div>
                      <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70">
                        <Users size={16} />
                      </div>
                    </div>

                    <div className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
                      {!hasMl ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/55">
                          Пока нет ML-метрик. Студенты должны дать consent, включить камеру и открыть урок.
                        </div>
                      ) : (
                        liveMetrics!.participants.map((p) => (
                          <div key={p.userId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-white">
                                  {p.name || p.email || p.userId}
                                </div>
                                <div className="mt-1 text-[11px] text-white/40">
                                  {new Date(p.updatedAt).toLocaleTimeString()}
                                </div>
                              </div>

                              <Badge className="border border-white/10 bg-white/10 text-white/85">
                                {p.emotion} • {(p.confidence * 100).toFixed(0)}%
                              </Badge>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <Badge
                                className={
                                  p.state === "NORMAL"
                                    ? "border border-emerald-400/20 bg-emerald-500/15 text-emerald-300"
                                    : "border border-amber-400/20 bg-amber-500/15 text-amber-300"
                                }
                              >
                                {p.state}
                              </Badge>

                              <Badge className="border border-white/10 bg-white/10 text-white/85">
                                Risk {(p.risk * 100).toFixed(0)}%
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="border-b border-white/10 px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-white">Alerts</div>
                      <AlertTriangle size={16} className="text-amber-300" />
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/55">
                      Пока нет событий attention drop. После подключения потоковых alerts здесь появятся провалы внимания,
                      пики риска и таймлайн-маркеры.
                    </div>

                    {hasMl && apiAvailable && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 w-full border-white/10 bg-white/5 text-white hover:bg-white/10"
                        onClick={() => {
                          const riskPct = (avgRisk * 100).toFixed(0);
                          const text = `⚠ Средний риск сейчас ${riskPct}% (по текущим ML-метрикам группы).`;
                          postSessionMessage(roomId, {
                            type: "system",
                            text,
                            channel: "public",
                          }).catch(() => {});
                        }}
                      >
                        <Send size={14} />
                        Отправить агрегат в чат
                      </Button>
                    )}
                  </div>

                  <div className="px-5 py-4 text-xs leading-relaxed text-white/45">
                    Метрики отображаются только для студентов, которые дали согласие.
                    Raw-video не сохраняется. Система показывает агрегированные emotion/state/risk
                    для live-поддержки преподавателя.
                  </div>
                </aside>
              </div>
            </div>
          </Reveal>
        </Section>
      )}

      {phase === "ended" && (
        <Section spacing="none" className="mt-6">
          <Reveal>
            <Card variant="elevated" className="overflow-hidden">
              <CardContent className="space-y-4 p-6 md:p-8">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-muted">Итог сессии</div>
                    <div className="mt-2 text-lg font-semibold text-fg">Сессия завершена</div>
                    <div className="mt-2 text-sm text-muted">
                      Здесь позже появится отчёт: длительность, участники, средняя вовлечённость,
                      alerts и markers.
                    </div>
                  </div>
                  <Badge className="bg-surface-subtle">Duration {timerLabel}</Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <StatusPill label="Duration" value={timerLabel} />
                  <StatusPill label="Participants" value={`${participants.length}`} />
                  <StatusPill label="Avg risk" value={hasMl ? formatPct01(avgRisk) : "—"} />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm" variant="outline" disabled>
                    Экспорт отчёта (скоро)
                  </Button>
                  <div className="inline-flex items-center gap-2 text-xs text-muted">
                    <ShieldCheck size={14} />
                    Итоговый отчёт будет учитывать только агрегированные данные.
                  </div>
                </div>
              </CardContent>
            </Card>
          </Reveal>
        </Section>
      )}

      {!getWsBaseUrl()?.startsWith("ws") && phase !== "live" && (
        <div className="flex items-start gap-3 rounded-elas-lg bg-surface-subtle p-4">
          <AlertTriangle className="mt-0.5 text-[rgb(var(--warning))]" size={18} />
          <div className="text-sm text-muted">
            WS base URL не настроен. Проверь `NEXT_PUBLIC_WS_BASE_URL`.
          </div>
        </div>
      )}

      {phase !== "live" && (
        <div className="flex items-start gap-3 rounded-elas-lg bg-surface-subtle p-4">
          <Activity className="mt-0.5 text-[rgb(var(--primary))]" size={18} />
          <div className="text-sm leading-relaxed text-muted">
            Подключение идёт по WebRTC. Видео не записывается. В backend и аналитику
            попадают только агрегированные показатели.
          </div>
        </div>
      )}

      <Modal
        open={confirmEndOpen}
        onClose={() => setConfirmEndOpen(false)}
        title="Завершить сессию?"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmEndOpen(false)}>
              Отмена
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-600"
              onClick={() => {
                setConfirmEndOpen(false);
                setPhase("ended");
                setWsDisconnected(false);
              }}
            >
              Завершить сессию
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          Участники будут отключены от эфира. Это действие нельзя отменить.
        </p>
      </Modal>
    </div>
  );
}

function ChecklistItem({ label, ok, hint }: { label: string; ok: boolean; hint: string }) {
  return (
    <div className="flex items-start gap-2">
      <span
        className={
          "mt-1 inline-flex h-2.5 w-2.5 rounded-full " +
          (ok ? "bg-[rgb(var(--success))]" : "bg-[rgb(var(--error))]")
        }
      />
      <div className="text-xs">
        <div className="font-medium text-fg">{label}</div>
        <div className="mt-0.5 text-muted">{hint}</div>
      </div>
    </div>
  );
}

