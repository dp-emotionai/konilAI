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
    <div className="rounded-2xl border border-[color:var(--border)] bg-surface-subtle/50 p-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold text-fg">{value}</div>
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
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-700"
      : tone === "red"
        ? "border-red-400/20 bg-red-500/10 text-red-700"
        : tone === "amber"
          ? "border-amber-400/20 bg-amber-500/10 text-amber-700"
          : tone === "violet"
            ? "border-violet-400/20 bg-violet-500/10 text-violet-700"
            : tone === "sky"
              ? "border-sky-400/20 bg-sky-500/10 text-sky-700"
              : tone === "lime"
                ? "border-lime-400/20 bg-lime-500/10 text-lime-700"
                : "border-[color:var(--border)] bg-surface-subtle text-muted";

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
      <div className="w-[78px] text-[10px] uppercase tracking-[0.16em] text-muted">
        {label}
      </div>
      <div className="flex-1">
        <div className="h-1.5 w-full rounded-full bg-surface-subtle overflow-hidden">
          <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.round((v ?? 0) * 100)}%` }} />
        </div>
      </div>
      <div className="w-10 text-right text-[10px] font-semibold text-fg tabular-nums">
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
      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-700"
      : tone === "mid"
        ? "border-amber-400/20 bg-amber-500/10 text-amber-700"
        : tone === "bad"
          ? "border-red-400/20 bg-red-500/10 text-red-700"
          : "border-[color:var(--border)] bg-surface-subtle text-muted";

  return (
    <div
      className={
        "relative overflow-hidden rounded-elas-lg bg-surface border border-[color:var(--border)] " +
        (aspect ? "aspect-video " : "") +
        "cursor-default transition-all duration-300 shadow-sm"
      }
    >
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        playsInline
        muted={isLocal}
        autoPlay
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-2 p-2">
        <div className="min-w-0 flex-1">
          <div className="inline-flex max-w-full flex-col gap-1 rounded-lg bg-surface/90 px-2 py-1.5 backdrop-blur shadow-sm">
            <div className="truncate text-xs font-semibold text-fg">{label}</div>

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
            <div className="mt-2 rounded-lg bg-surface/90 border border-[color:var(--border)] p-2 backdrop-blur shadow-sm">
              <div className="grid gap-1.5">
                <MetricBar label="eng" value01={metrics.engagement ?? null} tone="primary" />
                <MetricBar label="stress" value01={metrics.stress ?? null} tone="red" />
                <MetricBar label="fatigue" value01={metrics.fatigue ?? null} tone="amber" />
              </div>
            </div>
          )}
        </div>

        <Badge className="shrink-0 border border-[color:var(--border)] bg-surface/90 text-[10px] text-muted">
          {status}
        </Badge>
      </div>
      {!stream && (
        <div className="absolute inset-0 grid place-items-center bg-surface-subtle/50">
          <span className="text-xs text-muted">Ожидание...</span>
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

  // Важно: один и тот же ref нельзя использовать одновременно в main и в превью —
  // иначе React перепривяжет ref к последнему элементу, и одно из видео станет чёрным.
  const localVideoMainRef = useRef<HTMLVideoElement | null>(null);
  const localVideoThumbRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoMainRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const remoteVideoThumbRefs = useRef<Record<string, HTMLVideoElement | null>>({});

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
  // По умолчанию фокус на преподавателе, чтобы большой экран не был пустым
  const [focusedParticipant, setFocusedParticipant] = useState<Participant | "local" | null>("local");

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

        // на старте подцепляем стрим к обоим элементам (main и превью)
        for (const el of [localVideoMainRef.current, localVideoThumbRef.current]) {
          if (!el) continue;
          el.srcObject = stream;
          await el.play().catch(() => {});
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
    if (!localStream) return;
    for (const el of [localVideoMainRef.current, localVideoThumbRef.current]) {
      if (!el) continue;
      el.srcObject = localStream;
      el.play().catch(() => {});
    }
  }, [localStream]);

  useEffect(() => {
    Object.entries(remoteStreams).forEach(([peerId, stream]) => {
      const els = [
        (remoteVideoMainRefs.current as Record<string, HTMLVideoElement | null>)[peerId],
        (remoteVideoThumbRefs.current as Record<string, HTMLVideoElement | null>)[peerId],
      ];
      for (const el of els) {
        if (!el || !stream) continue;
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
            <>
              {connectionState === "connecting" && (
                <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-surface-subtle/50 px-4 py-3 text-sm text-muted">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                  Подключение к эфиру…
                </div>
              )}

              {connectionState === "connected" && wsDisconnected && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 text-amber-700 px-4 py-3 text-sm text-amber-100">
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

              <div className="flex min-h-[70vh] flex-col overflow-hidden rounded-[30px] border border-[color:var(--border)] bg-surface shadow-lg">
                <div className="flex min-h-0 flex-1 flex-col items-stretch xl:flex-row">
                  <div className="flex min-w-0 flex-1 flex-col bg-surface">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--border)] px-5 py-4">
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-[0.24em] text-muted">
                          Teacher · Live monitor
                        </div>
                        <div className="mt-1 truncate text-xl font-semibold text-fg">{sessionTitle}</div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="border border-[color:var(--border)] bg-surface-subtle/50 text-muted">
                          {sessionType === "exam" ? "Exam" : "Lecture"}
                        </Badge>

                        {connectionState === "connected" && (
                          <Badge className="border border-emerald-400/20 bg-emerald-500/10 text-emerald-700 text-emerald-700">
                            <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                            LIVE
                          </Badge>
                        )}

                        {isScreenSharing && (
                          <Badge className="border border-sky-400/20 bg-sky-500/10 text-sky-700 text-sky-700">
                            Screen sharing
                          </Badge>
                        )}

                        <Badge className="border border-[color:var(--border)] bg-surface-subtle/50 font-mono text-muted">
                          {timerLabel}
                        </Badge>

                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 border-[color:var(--border)] bg-surface-subtle/50 text-fg hover:bg-surface-subtle xl:hidden"
                          onClick={() => setChatOpen(true)}
                          aria-label="Открыть чат"
                        >
                          <MessageCircle size={14} />
                          Чат
                        </Button>
                      </div>
                    </div>

                    <div className="flex min-h-0 flex-1 flex-col gap-4 p-5">
                      <div className="relative h-[60vh] min-h-[320px] w-full overflow-hidden rounded-xl border border-[color:var(--border)] bg-surface">
                        {focusedParticipant && focusedParticipant !== "local" ? (
                          <VideoTile
                            stream={remoteStreams[focusedParticipant.id] ?? null}
                            label={formatParticipantLabel(focusedParticipant)}
                            status={remoteStreams[focusedParticipant.id] ? "LIVE" : "Подключение..."}
                            isLocal={false}
                            metrics={metricsForPeer(focusedParticipant)}
                            aspect={false}
                            videoRef={(el) => {
                              (remoteVideoMainRefs.current as Record<string, HTMLVideoElement | null>)[focusedParticipant.id] = el;
                            }}
                          />
                        ) : (
                          <VideoTile
                            stream={localStream}
                            label="Вы · Teacher"
                            status={connectionState === "connected" ? "LIVE" : "—"}
                            isLocal
                            aspect={false}
                            videoRef={localVideoMainRef}
                          />
                        )}
                      </div>

                      <div className="hidden flex-wrap justify-center gap-4 sm:flex">
                        <button
                          type="button"
                          className={`rounded-full border p-3 transition ${
                            isMicEnabled
                              ? "border-[color:var(--border)] bg-surface-subtle/50 text-fg hover:bg-surface-subtle"
                              : "border-red-400/20 bg-red-500/10 text-red-700 text-red-700 hover:bg-red-500/20"
                          }`}
                          onClick={toggleMic}
                        >
                          {isMicEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                        </button>

                        <button
                          type="button"
                          className={`rounded-full border p-3 transition ${
                            isCameraEnabled && !isScreenSharing
                              ? "border-[color:var(--border)] bg-surface-subtle/50 text-fg hover:bg-surface-subtle"
                              : "border-red-400/20 bg-red-500/10 text-red-700 text-red-700 hover:bg-red-500/20"
                          }`}
                          onClick={toggleCamera}
                          disabled={isScreenSharing}
                        >
                          {isCameraEnabled && !isScreenSharing ? <Video size={20} /> : <VideoOff size={20} />}
                        </button>

                        <button
                          type="button"
                          className={`rounded-full border p-3 transition ${
                            isScreenSharing
                              ? "border-sky-400/20 bg-sky-500/10 text-sky-700 text-sky-700 hover:bg-sky-500/20"
                              : "border-[color:var(--border)] bg-surface-subtle/50 text-fg hover:bg-surface-subtle"
                          }`}
                          onClick={toggleScreenShare}
                        >
                          <Monitor size={20} />
                        </button>

                        <button
                          type="button"
                          className={`rounded-full border p-3 transition ${
                            isSettingsOpen
                              ? "border-violet-400/20 bg-violet-500/10 text-violet-700 text-violet-700"
                              : "border-[color:var(--border)] bg-surface-subtle/50 text-muted hover:bg-surface-subtle"
                          }`}
                          onClick={() => setIsSettingsOpen((v) => !v)}
                        >
                          <Settings size={20} />
                        </button>

                        <button
                          type="button"
                          className="rounded-full bg-red-500 p-4 text-fg transition hover:bg-red-600"
                          onClick={() => setConfirmEndOpen(true)}
                        >
                          <PhoneOff size={22} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        <button
                          type="button"
                          onClick={() => setFocusedParticipant("local")}
                          className="cursor-pointer transition hover:scale-[1.03]"
                        >
                          <VideoTile
                            stream={localStream}
                            label="Вы · Teacher"
                            status={connectionState === "connected" ? "LIVE" : "—"}
                            isLocal
                            compact
                            videoRef={localVideoThumbRef}
                          />
                        </button>

                        {participants.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setFocusedParticipant(p)}
                            className="cursor-pointer transition hover:scale-[1.03]"
                          >
                            <VideoTile
                              stream={remoteStreams[p.id] ?? null}
                              label={formatParticipantLabel(p)}
                              status={remoteStreams[p.id] ? "LIVE" : "Подключение..."}
                              isLocal={false}
                              metrics={metricsForPeer(p)}
                              compact
                              videoRef={(el) => {
                                (remoteVideoThumbRefs.current as Record<string, HTMLVideoElement | null>)[p.id] = el;
                              }}
                            />
                          </button>
                        ))}
                      </div>

                      <div className="mt-1 flex flex-shrink-0 flex-wrap justify-center gap-4 px-2 sm:hidden">
                        <button
                          type="button"
                          className={`rounded-full border p-3 transition ${
                            isMicEnabled
                              ? "border-[color:var(--border)] bg-surface-subtle/50 text-fg hover:bg-surface-subtle"
                              : "border-red-400/20 bg-red-500/10 text-red-700 text-red-700 hover:bg-red-500/20"
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
                              ? "border-[color:var(--border)] bg-surface-subtle/50 text-fg hover:bg-surface-subtle"
                              : "border-red-400/20 bg-red-500/10 text-red-700 text-red-700 hover:bg-red-500/20"
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
                          {isCameraEnabled && !isScreenSharing ? <Video size={20} /> : <VideoOff size={20} />}
                        </button>

                        <button
                          type="button"
                          className={`rounded-full border p-3 transition ${
                            isScreenSharing
                              ? "border-sky-400/20 bg-sky-500/10 text-sky-700 text-sky-700 hover:bg-sky-500/20"
                              : "border-[color:var(--border)] bg-surface-subtle/50 text-fg hover:bg-surface-subtle"
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
                              ? "border-violet-400/20 bg-violet-500/10 text-violet-700 text-violet-700"
                              : "border-[color:var(--border)] bg-surface-subtle/50 text-muted hover:bg-surface-subtle"
                          }`}
                          title="Показать настройки"
                          onClick={() => setIsSettingsOpen((v) => !v)}
                        >
                          <Settings size={20} />
                        </button>

                        <button
                          type="button"
                          className="rounded-full border border-amber-400/20 bg-amber-500/10 text-amber-700 p-3 text-amber-700 transition hover:bg-amber-500/20"
                          title="Добавить маркер"
                        >
                          <Flag size={20} />
                        </button>

                        <button
                          type="button"
                          className="rounded-full bg-red-500 p-4 text-fg transition hover:bg-red-600"
                          title="Завершить сессию"
                          onClick={() => setConfirmEndOpen(true)}
                        >
                          <PhoneOff size={22} />
                        </button>
                      </div>

                      {isSettingsOpen && (
                        <div className="mx-auto mt-4 max-w-xl space-y-3">
                          <div className="rounded-2xl border border-[color:var(--border)] bg-surface-subtle/50 p-4 text-sm text-muted">
                            <div className="flex items-start gap-2">
                              <div className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-xl bg-purple-500/20 text-purple-200">
                                <Sparkles size={16} />
                              </div>
                              <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                                  Live assistant
                                </div>
                                <div className="mt-1 text-sm text-muted">{liveSuggestion}</div>
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

                  <aside
                    className={`w-full shrink-0 border-l border-[color:var(--border)] bg-surface-subtle xl:flex xl:min-h-0 xl:w-[390px] xl:max-w-[390px] ${
                      chatOpen ? "flex min-h-0 flex-col" : "hidden xl:flex xl:flex-col"
                    }`}
                  >
                    <div className="shrink-0 border-b border-[color:var(--border)] px-5 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-fg">Control center</div>
                          <div className="mt-1 text-xs text-muted">Live metrics, participants and chat</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[color:var(--border)] bg-surface-subtle/50 text-fg hover:bg-surface-subtle xl:hidden"
                            onClick={() => setChatOpen(false)}
                            aria-label="Закрыть чат"
                          >
                            Закрыть
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[color:var(--border)] bg-surface-subtle/50 text-fg hover:bg-surface-subtle"
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

                    <div className="min-h-0 flex-1 border-b border-[color:var(--border)] p-4">
                      <SessionChatPanel
                        sessionId={roomId}
                        role="teacher"
                        type={sessionType === "exam" ? "exam" : "lecture"}
                      />
                    </div>

                    <div className="border-b border-[color:var(--border)] px-5 py-4">
                      <div className="text-sm font-semibold text-fg">Session integrity</div>
                      <div className="mt-4 grid gap-3">
                        <div className="rounded-2xl border border-[color:var(--border)] bg-surface-subtle/50 p-3 text-sm text-muted">
                          Backend:{" "}
                          <span className={apiAvailable ? "text-emerald-700" : "text-amber-700"}>
                            {apiAvailable ? "connected" : "offline"}
                          </span>
                        </div>
                        <div className="rounded-2xl border border-[color:var(--border)] bg-surface-subtle/50 p-3 text-sm text-muted">
                          Camera:{" "}
                          <span className={cameraReady ? "text-emerald-700" : "text-amber-700"}>
                            {cameraReady ? "ready" : "check required"}
                          </span>
                        </div>
                        <div className="rounded-2xl border border-[color:var(--border)] bg-surface-subtle/50 p-3 text-sm text-muted">
                          Consent model: <span className="text-emerald-700">active</span>
                        </div>
                      </div>
                    </div>

                    {apiAvailable && isRealSessionId(roomId) && (
                      <div className="border-b border-[color:var(--border)] px-5 py-4">
                        <div className="text-sm font-semibold text-fg">Chat mode</div>
                        <div className="mt-3">
                          <select
                            className="h-10 w-full rounded-2xl border border-[color:var(--border)] bg-surface-subtle/50 px-3 text-sm text-fg outline-none"
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

                        <div className="mt-2 text-xs text-muted">
                          {chatPolicy?.mode === "locked" && "Студенты не могут писать"}
                          {chatPolicy?.mode === "questions_only" && "Студенты могут отправлять только вопросы"}
                          {chatPolicy?.mode === "lecture_open" && "Стандартный чат лекции"}
                          {chatPolicy?.mode === "exam_help_only" && "Только help-канал для экзамена"}
                        </div>
                      </div>
                    )}

                    <div className="border-b border-[color:var(--border)] px-5 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-fg">Participants & ML</div>
                        <div className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[color:var(--border)] bg-surface-subtle/50 text-muted">
                          <Users size={16} />
                        </div>
                      </div>

                      <div className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
                        {!hasMl ? (
                          <div className="rounded-2xl border border-[color:var(--border)] bg-surface-subtle/50 p-4 text-sm text-muted">
                            Пока нет ML-метрик. Студенты должны дать consent, включить камеру и открыть урок.
                          </div>
                        ) : (
                          liveMetrics!.participants.map((p) => (
                            <div key={p.userId} className="rounded-2xl border border-[color:var(--border)] bg-surface-subtle/50 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-fg">
                                    {p.name || p.email || p.userId}
                                  </div>
                                  <div className="mt-1 text-[11px] text-muted">
                                    {new Date(p.updatedAt).toLocaleTimeString()}
                                  </div>
                                </div>

                                <Badge className="border border-[color:var(--border)] bg-surface-subtle text-muted">
                                  {p.emotion} • {(p.confidence * 100).toFixed(0)}%
                                </Badge>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <Badge
                                  className={
                                    p.state === "NORMAL"
                                      ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-700 text-emerald-700"
                                      : "border border-amber-400/20 bg-amber-500/10 text-amber-700 text-amber-700"
                                  }
                                >
                                  {p.state}
                                </Badge>

                                <Badge className="border border-[color:var(--border)] bg-surface-subtle text-muted">
                                  Risk {(p.risk * 100).toFixed(0)}%
                                </Badge>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="border-b border-[color:var(--border)] px-5 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-fg">Alerts</div>
                        <AlertTriangle size={16} className="text-amber-700" />
                      </div>

                      <div className="mt-4 rounded-2xl border border-[color:var(--border)] bg-surface-subtle/50 p-4 text-sm text-muted">
                        Пока нет событий attention drop. После подключения потоковых alerts здесь появятся провалы внимания,
                        пики риска и таймлайн-маркеры.
                      </div>

                      {hasMl && apiAvailable && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3 w-full border-[color:var(--border)] bg-surface-subtle/50 text-fg hover:bg-surface-subtle"
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

                    <div className="px-5 py-4 text-xs leading-relaxed text-muted">
                      Метрики отображаются только для студентов, которые дали согласие.
                      Raw-video не сохраняется. Система показывает агрегированные emotion/state/risk
                      для live-поддержки преподавателя.
                    </div>
                  </aside>
                </div>
              </div>
            </>
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

