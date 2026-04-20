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
} from "lucide-react";
import { getWsBaseUrl } from "@/lib/env";

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-surface-subtle px-3 py-3">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold text-fg">{value}</div>
    </div>
  );
}

function LiveMetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-surface-subtle/50 p-3 backdrop-blur-sm">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function formatParticipantLabel(p?: Participant | null) {
  if (!p) return "Преподаватель";
  return p.displayName || p.name || p.email || `${p.role} · ${p.id.slice(0, 6)}`;
}

function TopStatBadge({ children }: { children: React.ReactNode }) {
  return (
    <Badge className="border border-[color:var(--border)] bg-surface-subtle/80 text-muted backdrop-blur">
      {children}
    </Badge>
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

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          await localVideoRef.current.play().catch(() => {});
        }

        if (localThumbRef.current) {
          localThumbRef.current.srcObject = stream;
          await localThumbRef.current.play().catch(() => {});
        }

        await signaling.waitForOpen(12000);
        
        // Pass display name via user auth to signaling
        const { getStoredAuth } = await import("@/lib/api/client");
        const auth = getStoredAuth();
        manager.join(auth ? { email: auth.email, name: auth.name ?? undefined } : undefined);
        
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
  }, [remoteStream]);

  useEffect(() => {
    if (localThumbRef.current && localStream) {
      localThumbRef.current.srcObject = localStream;
      localThumbRef.current.play().catch(() => {});
    }
  }, [localStream]);

  useEffect(() => {
    if (!shouldRunMl || !localVideoRef.current) return;

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

      const video = localVideoRef.current;
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

  return (
    <div className="space-y-6 pb-12">
      <Breadcrumbs
        items={[
          { label: "Студент", href: "/student/dashboard" },
          { label: "Сессии", href: "/student/sessions" },
          { label: title },
        ]}
      />

      <Link
        href="/student/sessions"
        className="inline-flex text-sm text-muted transition-colors hover:text-fg"
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
                {state.consent ? "Consent: да" : "Consent: нет"}
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
              <div className="h-24 animate-pulse rounded-elas-lg bg-surface-subtle" />
            </CardContent>
          </Card>
        </Section>
      )}

      {joinInfoError && (
        <Section spacing="none" className="mt-6">
          <Card className="border-amber-400/25 bg-amber-500/10">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle
                  size={20}
                  className="shrink-0 text-amber-600 dark:text-amber-400"
                />
                <div>
                  <div className="font-semibold text-fg">Ошибка загрузки</div>
                  <div className="mt-0.5 text-sm text-muted">{joinInfoError}</div>
                </div>
              </div>
              <Button variant="outline" onClick={() => void loadJoinInfo()}>
                Повторить
              </Button>
            </CardContent>
          </Card>
        </Section>
      )}

      {!joinInfoLoading && !joinInfoError && !canJoin && blockReason && (
        <Section spacing="none" className="mt-6">
          <Reveal>
            <Card className="mx-auto max-w-3xl">
              <CardContent className="space-y-3 p-6 md:p-7">
                {blockReason === "consent_required" && (
                  <>
                    <div className="text-sm text-muted">Требуется согласие</div>
                    <div className="text-lg font-semibold text-fg">
                      Для подключения к сессии нужно дать согласие на анализ эмоций
                    </div>
                    <div className="text-sm text-muted">
                      Согласие обязательно по этике платформы. Его можно отозвать в любой момент.
                    </div>

                    <Link
                      href={`/consent?returnUrl=${encodeURIComponent(
                        `/student/session/${sessionId}`
                      )}`}
                    >
                      <Button className="mt-2">Перейти к согласию</Button>
                    </Link>
                  </>
                )}

                {(blockReason === "session_not_started" ||
                  blockReason === "session_ended") && (
                  <>
                    <div className="text-sm text-muted">Статус сессии</div>
                    <div className="text-lg font-semibold text-fg">
                      {blockReason === "session_ended"
                        ? "Сессия завершена."
                        : "Сессия ещё не началась."}
                    </div>
                    <div className="text-sm text-muted">
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
                <Card className="mb-6 border-amber-400/25 bg-amber-500/10">
                  <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                    <div className="flex items-center gap-3">
                      <AlertTriangle
                        size={20}
                        className="shrink-0 text-amber-600 dark:text-amber-400"
                      />
                      <div>
                        <div className="font-semibold text-fg">Ошибка подключения</div>
                        <div className="mt-0.5 text-sm text-muted">{connectionError}</div>
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

              <div className="grid gap-6 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <Card className="overflow-hidden">
                    <CardContent className="space-y-5 p-6 md:p-7">
                      <div className="flex items-start gap-3">
                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-[rgb(var(--primary))]">
                          <Sparkles size={18} />
                        </div>
                        <div>
                          <div className="text-sm text-muted">Шаг 1</div>
                          <div className="mt-1 text-lg font-semibold text-fg">
                            Consent и правила приватности
                          </div>
                          <div className="mt-2 text-sm leading-relaxed text-muted">
                            Видео не сохраняется. Анализ идёт 1–2 кадра в секунду, в систему
                            попадают только агрегированные метрики.
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <StatusPill
                          label="Согласие"
                          value={state.consent ? "Дано" : "Не дано"}
                        />
                        <StatusPill
                          label="ML сервис"
                          value={mlApiAvailable ? "Доступен" : "Недоступен"}
                        />
                      </div>

                      {!state.consent && (
                        <Link
                          href={`/consent?returnUrl=${encodeURIComponent(
                            `/student/session/${sessionId}`
                          )}`}
                          className="inline-flex"
                        >
                          <Button className="gap-2">
                            <ShieldCheck size={18} />
                            Принять согласие
                          </Button>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-5">
                  <Card className="overflow-hidden">
                    <CardContent className="space-y-4 p-6 md:p-7">
                      <div className="flex items-start gap-3">
                        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-[rgb(var(--primary))]">
                          <MonitorUp size={18} />
                        </div>
                        <div>
                          <div className="text-sm text-muted">Шаг 2</div>
                          <div className="mt-1 text-lg font-semibold text-fg">
                            Проверка камеры
                          </div>
                          <div className="mt-2 text-sm text-muted">
                            Проверьте доступ, освещение и положение лица. Затем нажмите «Начать».
                          </div>
                        </div>
                      </div>

                      <CameraCheck
                        onStart={() => {
                          setLive(true);
                          setTab("live");
                        }}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </Reveal>
          )}

          {tab === "live" && (
            <Reveal>
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
                    Соединение потеряно. Выйдите и попробуйте подключиться снова.
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-300/50 text-amber-100 hover:bg-amber-500/20"
                    onClick={() => {
                      setLive(false);
                      setTab("prepare");
                      setWsDisconnected(false);
                    }}
                  >
                    Выйти
                  </Button>
                </div>
              )}

              <div className="overflow-hidden rounded-[30px] border border-[color:var(--border)] bg-surface shadow-lg">
                <div className="grid min-h-[720px] grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px]">
                  <div className="flex min-w-0 flex-col bg-surface/50">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--border)] px-5 py-4">
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-[0.24em] text-muted">
                          Student · Live session
                        </div>
                        <div className="mt-1 truncate text-xl font-semibold text-white">
                          {title}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="border border-[color:var(--border)] bg-surface-subtle/50 text-muted">
                          {joinInfo?.type === "exam" ? "Exam" : "Lecture"}
                        </Badge>

                        {connectionState === "connected" && (
                          <Badge className="border border-emerald-400/20 bg-emerald-500/10 text-emerald-700 text-emerald-700">
                            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                            Connected
                          </Badge>
                        )}

                        {shouldRunMl && mlActive && !mlUnavailable && (
                          <Badge className="border border-violet-400/20 bg-violet-500/10 text-violet-700 text-violet-700">
                            ML analyzing
                          </Badge>
                        )}

                        {shouldRunMl && mlUnavailable && (
                          <Badge className="border border-amber-400/20 bg-amber-500/10 text-amber-700 text-amber-700">
                            ML временно недоступен
                          </Badge>
                        )}

                        <Button
                          variant="outline"
                          className="border-[color:var(--border)] bg-surface-subtle/50 text-white hover:bg-surface-subtle"
                          onClick={() => {
                            setLive(false);
                            setTab("prepare");
                          }}
                        >
                          <LogOut size={16} />
                          Выйти
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-3 overflow-x-auto border-b border-[color:var(--border)] px-5 py-4">
                      <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-2xl border border-violet-400/30 bg-surface-subtle">
                        <video
                          ref={localThumbRef}
                          className="h-full w-full object-cover"
                          playsInline
                          muted
                        />
                        <div className="absolute inset-x-2 bottom-2 flex items-center justify-between rounded-xl bg-surface-subtle/80 px-2 py-1 text-[10px] text-muted backdrop-blur">
                          <span>Вы</span>
                          <span>Student</span>
                        </div>
                      </div>

                      {teacherParticipant && (
                        <div className="flex h-20 min-w-[180px] shrink-0 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-surface-subtle/50 px-4 text-sm text-muted">
                          {formatParticipantLabel(teacherParticipant)}
                        </div>
                      )}

                      {!remoteStream && (
                        <div className="flex h-20 w-48 shrink-0 items-center justify-center rounded-2xl border border-dashed border-[color:var(--border)] bg-surface-subtle/50 text-fg text-sm text-muted">
                          Ожидание преподавателя
                        </div>
                      )}
                    </div>

                    <div className="min-h-0 flex-1 p-5">
                      <div className="relative h-full min-h-[420px] overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-black">
                        <video
                          ref={remoteVideoRef}
                          className="absolute inset-0 h-full w-full object-cover"
                          style={{ display: remoteStream ? "block" : "none" }}
                          playsInline
                        />

                        {!remoteStream && (
                          <div className="absolute inset-0 grid place-items-center">
                            <div className="rounded-2xl border border-[color:var(--border)] bg-surface-subtle/80 px-5 py-3 text-sm text-muted backdrop-blur">
                              Ожидание преподавателя...
                            </div>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.5),transparent_20%,transparent_78%,rgba(0,0,0,0.22))]" />

                        <div className="absolute left-4 top-4 z-10 max-w-[55%] rounded-2xl border border-[color:var(--border)] bg-surface-subtle/80 px-3 py-2 text-sm text-white backdrop-blur">
                          <div className="truncate">
                            {remoteStream
                              ? formatParticipantLabel(teacherParticipant)
                              : "Ожидание преподавателя"}
                          </div>
                          <div className="mt-0.5 text-xs text-muted">
                            {remoteStream ? "Teacher stream" : "Live room"}
                          </div>
                        </div>

                        <div className="absolute right-4 top-4 z-10 rounded-2xl border border-[color:var(--border)] bg-surface-subtle/80 px-3 py-2 text-sm text-muted backdrop-blur">
                          Room: {roomId ? `${roomId.slice(0, 8)}…` : "—"}
                        </div>

                        {mlResult && (
                          <div className="absolute left-4 top-20 z-10 flex max-w-[62%] flex-wrap gap-2">
                            <TopStatBadge>
                              {mlResult.emotion ?? "—"} • {Math.round((mlResult.confidence ?? 0) * 100)}%
                            </TopStatBadge>
                            <Badge
                              className={
                                mlResult.state === "NORMAL"
                                  ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-700 text-emerald-700"
                                  : "border border-amber-400/20 bg-amber-500/10 text-amber-700 text-amber-700"
                              }
                            >
                              {mlResult.state ?? "—"}
                            </Badge>
                            <TopStatBadge>
                              Risk {Math.round((mlResult.risk ?? 0) * 100)}%
                            </TopStatBadge>
                          </div>
                        )}

                        <div className="absolute bottom-4 left-4 z-10 flex flex-wrap gap-2">
                          <TopStatBadge>Peers: {participants.length}</TopStatBadge>
                          <TopStatBadge>ML: {shouldRunMl ? "On" : "Off"}</TopStatBadge>
                          <TopStatBadge>Remote: {remoteStream ? "Yes" : "No"}</TopStatBadge>
                        </div>

                        <div className="absolute bottom-4 right-4 z-10 h-28 w-44 overflow-hidden rounded-2xl border border-[color:var(--border)] bg-black shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                          <video
                            ref={localVideoRef}
                            className="h-full w-full object-cover"
                            playsInline
                            muted
                          />
                          <div className="absolute inset-x-2 bottom-2 rounded-xl bg-black/55 px-2 py-1 text-[10px] text-muted backdrop-blur">
                            Вы · Student
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[color:var(--border)] px-5 py-4">
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <button
                          type="button"
                          className={`rounded-full border p-3 transition ${
                            isMicEnabled
                              ? "border-[color:var(--border)] bg-surface-subtle/50 text-white hover:bg-surface-subtle"
                              : "border-red-400/20 bg-red-500/10 text-red-700 hover:bg-red-500/20"
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
                              ? "border-[color:var(--border)] bg-surface-subtle/50 text-white hover:bg-surface-subtle"
                              : "border-red-400/20 bg-red-500/10 text-red-700 hover:bg-red-500/20"
                          }`}
                          title={isScreenSharing ? "Камера недоступна" : isCameraEnabled ? "Выключить камеру" : "Включить камеру"}
                          onClick={toggleCamera}
                          disabled={isScreenSharing}
                        >
                          {isCameraEnabled && !isScreenSharing ? <Video size={20} /> : <VideoOff size={20} />}
                        </button>

                        <button
                          type="button"
                          className={`rounded-full border p-3 transition ${
                            isScreenSharing
                              ? "border-sky-400/20 bg-sky-500/10 text-sky-700 hover:bg-sky-500/20"
                              : "border-[color:var(--border)] bg-surface-subtle/50 text-white hover:bg-surface-subtle"
                          }`}
                          title={isScreenSharing ? "Остановить демонстрацию" : "Демонстрация экрана"}
                          onClick={toggleScreenShare}
                        >
                          <MonitorUp size={20} />
                        </button>

                        <button
                          type="button"
                          className="rounded-full border border-[color:var(--border)] bg-surface-subtle/50 p-3 text-muted transition hover:bg-surface-subtle"
                          title="Настройки"
                        >
                          <Settings size={20} />
                        </button>

                        <button
                          type="button"
                          className="rounded-full bg-red-500 p-4 text-white transition hover:bg-red-600"
                          title="Выйти"
                          onClick={() => {
                            setLive(false);
                            setTab("prepare");
                          }}
                        >
                          <PhoneOff size={22} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <aside className="flex min-h-0 flex-col border-l border-[color:var(--border)] bg-surface-subtle">
                    <div className="border-b border-[color:var(--border)] px-5 py-4">
                      <div className="text-sm font-semibold text-white">Session info</div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <LiveMetricCard label="Emotion" value={mlResult?.emotion ?? "—"} />
                        <LiveMetricCard
                          label="Risk"
                          value={mlResult ? `${Math.round((mlResult.risk ?? 0) * 100)}%` : "—"}
                        />
                        <LiveMetricCard label="State" value={mlResult?.state ?? "—"} />
                        <LiveMetricCard
                          label="Confidence"
                          value={
                            mlResult ? `${Math.round((mlResult.confidence ?? 0) * 100)}%` : "—"
                          }
                        />
                      </div>
                    </div>

                    <div className="border-b border-[color:var(--border)] px-5 py-4">
                      <div className="text-sm font-semibold text-white">Privacy & status</div>

                      <div className="mt-4 space-y-3">
                        <div className="rounded-2xl border border-[color:var(--border)] bg-surface-subtle/50 p-3 text-sm text-muted">
                          Consent:{" "}
                          <span className={state.consent ? "text-emerald-700" : "text-amber-700"}>
                            {state.consent ? "дано" : "не дано"}
                          </span>
                        </div>

                        <div className="rounded-2xl border border-[color:var(--border)] bg-surface-subtle/50 p-3 text-sm text-muted">
                          ML service:{" "}
                          <span className={mlApiAvailable ? "text-emerald-700" : "text-amber-700"}>
                            {mlApiAvailable ? "доступен" : "недоступен"}
                          </span>
                        </div>

                        <div className="rounded-2xl border border-[color:var(--border)] bg-surface-subtle/50 p-3 text-sm text-muted">
                          WS:{" "}
                          <span
                            className={
                              getWsBaseUrl()?.startsWith("ws")
                                ? "text-emerald-700"
                                : "text-amber-700"
                            }
                          >
                            {getWsBaseUrl()?.startsWith("ws") ? "настроен" : "не настроен"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="min-h-0 flex-1 p-4">
                      <SessionChatPanel sessionId={roomId} role="student" type={sessionType} />
                    </div>

                    <div className="border-t border-[color:var(--border)] px-5 py-4 text-xs leading-relaxed text-muted">
                      Подключение идёт по WebRTC. Raw-video не сохраняется. В backend
                      отправляются только агрегированные метрики при наличии consent.
                    </div>

                    <div className="border-t border-[color:var(--border)] px-5 py-4">
                      <Link
                        href="/student/summary"
                        className="flex items-center gap-2 rounded-xl border border-[color:var(--border)] bg-surface-subtle/50 px-3 py-2.5 text-sm text-muted transition hover:bg-surface-subtle"
                      >
                        <BarChart3 size={16} />
                        <span>После сессии → отчёт</span>
                      </Link>
                    </div>
                  </aside>
                </div>
              </div>
            </Reveal>
          )}

          {!live && !getWsBaseUrl()?.startsWith("ws") && (
            <div className="flex items-start gap-3 rounded-elas-lg bg-surface-subtle p-4">
              <AlertTriangle className="mt-0.5 text-[rgb(var(--warning))]" size={18} />
              <div className="text-sm text-muted">
                WS base URL не настроен. Проверь `NEXT_PUBLIC_WS_BASE_URL`.
              </div>
            </div>
          )}

          {!live && (
            <div className="flex items-start gap-3 rounded-elas-lg bg-surface-subtle p-4">
              <Activity className="mt-0.5 text-[rgb(var(--primary))]" size={18} />
              <div className="text-sm leading-relaxed text-muted">
                Подключение идёт по WebRTC. Видео не записывается. В backend отправляются только агрегированные метрики при наличии согласия.
              </div>
            </div>
          )}
        </Section>
      )}
    </div>
  );
}