"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  type MlAnalyzeResponse,
} from "@/lib/api/ml";

import CameraCheck from "@/components/session/CameraCheck";
import { StudentSessionTabs } from "@/components/session/StudentSessionTabs";
import { SignalingClient } from "@/lib/webrtc/signalingClient";
import { PeerConnectionManager } from "@/lib/webrtc/peerConnectionManager";
import type { Participant } from "@/lib/webrtc/types";
import { SessionChatPanel } from "@/components/chat/SessionChatPanel";

import {
  ShieldCheck,
  Video,
  Activity,
  AlertTriangle,
  LogOut,
  Mic,
  PhoneOff,
  Share2,
  Settings,
  Sparkles,
  MonitorUp,
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
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">{label}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
      {hint ? <div className="mt-1 text-[11px] text-white/40">{hint}</div> : null}
    </div>
  );
}

function formatParticipantLabel(p?: Participant | null) {
  if (!p) return "Преподаватель";
  return `${p.role} · ${p.id.slice(0, 6)}`;
}

export default function StudentJoinSessionPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params?.id ?? "";
  const { state } = useUI();

  const [joinInfo, setJoinInfo] = useState<SessionJoinInfo | null>(null);
  const [joinInfoLoading, setJoinInfoLoading] = useState(
    !!(getApiBaseUrl() && hasAuth())
  );

  useEffect(() => {
    if (!sessionId || !getApiBaseUrl() || !hasAuth()) {
      setJoinInfoLoading(false);
      return;
    }

    let mounted = true;

    const run = async () => {
      const info = await getSessionJoinInfo(sessionId);
      if (!mounted) return;

      setJoinInfo(info ?? null);
      setJoinInfoLoading(false);

      if (info?.reason === "consent_required" && state.consent) {
        try {
          await recordSessionConsent(sessionId);
          const updated = await getSessionJoinInfo(sessionId);
          if (mounted && updated) setJoinInfo(updated);
        } catch {
          // ignore
        }
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [sessionId, state.consent]);

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

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localThumbRef = useRef<HTMLVideoElement | null>(null);

  const mlApiAvailable = Boolean(getMlApiBaseUrl());
  const shouldRunMl = live && state.consent && mlApiAvailable;

  const roomId = sessionId;

  useEffect(() => {
    if (!live || !roomId) return;

    const wsBase = getWsBaseUrl();
    const signaling = new SignalingClient(`${wsBase}/ws`);

    const manager = new PeerConnectionManager(signaling, roomId, "student", {
      onRemoteStream: (_peerId, stream) => setRemoteStream(stream),
      onPeersChange: (peers) => setParticipants(peers),
    });

    signaling.connect();

    (async () => {
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

      await signaling.waitForOpen();
      manager.join();
    })();

    return () => {
      manager.leave();
      setRemoteStream(null);
      setLocalStream(null);
      setParticipants([]);
    };
  }, [live, roomId]);

  useEffect(() => {
    if (!remoteVideoRef.current || !remoteStream) return;
    remoteVideoRef.current.srcObject = remoteStream;
    remoteVideoRef.current.play().catch(() => {});
  }, [remoteStream]);

  useEffect(() => {
    if (localThumbRef.current && localStream) {
      localThumbRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (!shouldRunMl || !localVideoRef.current) return;

    setMlActive(true);

    let cancelled = false;
    let inflight = false;
    const intervalMs = 650;

    const timer = setInterval(async () => {
      if (cancelled || inflight) return;

      const video = localVideoRef.current;
      if (!video) return;

      const frame = captureFrame64x64Grayscale(video);
      if (!frame) return;

      try {
        inflight = true;
        const result = await mlAnalyzeFrame(frame);
        if (!result || cancelled) return;

        setMlResult(result);

        if (sessionId && apiAvailable) {
          sendSessionMetrics(sessionId, {
            emotion: result.emotion,
            confidence: result.confidence,
            risk: result.risk,
            state: result.state,
            dominant_emotion: result.dominant_emotion,
          }).catch(() => {});
        }
      } finally {
        inflight = false;
      }
    }, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(timer);
      setMlActive(false);
      setMlResult(null);
    };
  }, [shouldRunMl, sessionId, apiAvailable]);

  const mainParticipant = participants[0];

  return (
    <div className="pb-12 space-y-6">
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

      {!joinInfoLoading && !canJoin && blockReason && (
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
                        : "Дождитесь, когда преподаватель запустит сессию (статус «В эфире»)."}
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

      {!joinInfoLoading && canJoin && (
        <Section spacing="none" className="mt-6 space-y-6">
          {!live && <StudentSessionTabs tab={tab} onChange={setTab} />}

          {tab === "prepare" && !live && (
            <Reveal>
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
              <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#070b17] shadow-[0_30px_100px_rgba(0,0,0,0.42)]">
                <div className="grid min-h-[760px] grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px]">
                  <div className="flex min-w-0 flex-col bg-[radial-gradient(circle_at_top,#0f1730,transparent_35%),linear-gradient(180deg,#050914_0%,#050914_100%)]">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-[0.24em] text-white/40">
                          Student · Live session
                        </div>
                        <div className="mt-1 truncate text-xl font-semibold text-white">
                          {title}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="border border-white/10 bg-white/5 text-white/80">
                          {joinInfo?.type === "exam" ? "Exam" : "Lecture"}
                        </Badge>

                        <Badge className="border border-emerald-400/20 bg-emerald-500/15 text-emerald-300">
                          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                          Connected
                        </Badge>

                        {shouldRunMl && mlActive && (
                          <Badge className="border border-violet-400/20 bg-violet-500/15 text-violet-300">
                            ML analyzing
                          </Badge>
                        )}

                        {!state.consent && (
                          <Badge className="border border-amber-400/20 bg-amber-500/15 text-amber-300">
                            No consent
                          </Badge>
                        )}

                        <Button
                          variant="outline"
                          className="border-white/10 bg-white/5 text-white hover:bg-white/10"
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

                    <div className="flex gap-3 overflow-x-auto border-b border-white/10 px-5 py-4">
                      <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-2xl border border-violet-400/30 bg-white/5">
                        <video
                          ref={localThumbRef}
                          className="h-full w-full object-cover"
                          playsInline
                          muted
                        />
                        <div className="absolute inset-x-2 bottom-2 flex items-center justify-between rounded-xl bg-black/50 px-2 py-1 text-[10px] text-white/80 backdrop-blur">
                          <span>Вы</span>
                          <span>Student</span>
                        </div>
                      </div>

                      {mainParticipant && (
                        <div className="flex h-20 min-w-[152px] shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white/70">
                          {formatParticipantLabel(mainParticipant)}
                        </div>
                      )}

                      {!remoteStream && (
                        <div className="flex h-20 w-48 shrink-0 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.03] text-sm text-white/40">
                          Ожидание преподавателя
                        </div>
                      )}
                    </div>

                    <div className="flex-1 p-5">
                      <div className="relative mx-auto aspect-[16/10] max-h-[72vh] w-full overflow-hidden rounded-[30px] border border-white/10 bg-black shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                        <video
                          ref={remoteVideoRef}
                          className="absolute inset-0 h-full w-full object-cover"
                          style={{ display: remoteStream ? "block" : "none" }}
                          playsInline
                        />

                        {!remoteStream && (
                          <div className="absolute inset-0 grid place-items-center">
                            <div className="rounded-2xl border border-white/10 bg-black/45 px-5 py-3 text-sm text-white/80 backdrop-blur">
                              Ожидание преподавателя...
                            </div>
                          </div>
                        )}

                        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.45),transparent_22%,transparent_78%,rgba(0,0,0,0.3))]" />

                        <div className="absolute left-4 top-4 rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white backdrop-blur">
                          {remoteStream ? formatParticipantLabel(mainParticipant) : "Ожидание преподавателя"}
                          <span className="ml-2 text-xs text-white/60">
                            {remoteStream ? "Teacher stream" : "Live room"}
                          </span>
                        </div>

                        <div className="absolute right-4 top-4 rounded-2xl border border-white/10 bg-black/50 px-3 py-2 text-sm text-white/90 backdrop-blur">
                          Room: {roomId ? `${roomId.slice(0, 8)}…` : "—"}
                        </div>

                        <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
                          <Badge className="border border-white/10 bg-black/50 text-white/85">
                            Peers: {participants.length}
                          </Badge>
                          <Badge className="border border-white/10 bg-black/50 text-white/85">
                            ML: {shouldRunMl ? "On" : "Off"}
                          </Badge>
                          <Badge className="border border-white/10 bg-black/50 text-white/85">
                            Remote: {remoteStream ? "Yes" : "No"}
                          </Badge>
                        </div>

                        {mlResult && (
                          <div className="absolute bottom-4 right-4 flex flex-wrap gap-2">
                            <Badge className="border border-white/10 bg-black/50 text-white/85">
                              {mlResult.emotion} • {Math.round(mlResult.confidence * 100)}%
                            </Badge>
                            <Badge
                              className={
                                mlResult.state === "NORMAL"
                                  ? "border border-emerald-400/20 bg-emerald-500/15 text-emerald-300"
                                  : "border border-amber-400/20 bg-amber-500/15 text-amber-300"
                              }
                            >
                              {mlResult.state}
                            </Badge>
                            <Badge className="border border-white/10 bg-black/50 text-white/85">
                              Risk {Math.round(mlResult.risk * 100)}%
                            </Badge>
                          </div>
                        )}

                        <div className="absolute bottom-4 right-4 z-10 h-28 w-44 overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                          <video
                            ref={localVideoRef}
                            className="h-full w-full object-cover"
                            playsInline
                            muted
                          />
                          <div className="absolute inset-x-2 bottom-2 rounded-xl bg-black/55 px-2 py-1 text-[10px] text-white/80 backdrop-blur">
                            Вы · Student
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-white/10 px-5 py-4">
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <button
                          type="button"
                          className="rounded-full border border-white/10 bg-white/5 p-3 text-white transition hover:bg-white/10"
                          title="Микрофон"
                        >
                          <Mic size={20} />
                        </button>

                        <button
                          type="button"
                          className="rounded-full border border-white/10 bg-white/5 p-3 text-white transition hover:bg-white/10"
                          title="Камера"
                        >
                          <Video size={20} />
                        </button>

                        <button
                          type="button"
                          className="rounded-full border border-white/10 bg-white/5 p-3 text-white transition hover:bg-white/10"
                          title="Поделиться"
                        >
                          <Share2 size={20} />
                        </button>

                        <button
                          type="button"
                          className="rounded-full border border-white/10 bg-white/5 p-3 text-white/70 transition hover:bg-white/10"
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

                  <aside className="flex min-h-0 flex-col border-l border-white/10 bg-[linear-gradient(180deg,#0a0f1d_0%,#0a0e19_100%)]">
                    <div className="border-b border-white/10 px-5 py-4">
                      <div className="text-sm font-semibold text-white">Session info</div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <LiveMetricCard label="Emotion" value={mlResult?.emotion ?? "—"} />
                        <LiveMetricCard
                          label="Risk"
                          value={mlResult ? `${Math.round(mlResult.risk * 100)}%` : "—"}
                        />
                        <LiveMetricCard label="State" value={mlResult?.state ?? "—"} />
                        <LiveMetricCard
                          label="Confidence"
                          value={mlResult ? `${Math.round(mlResult.confidence * 100)}%` : "—"}
                        />
                      </div>
                    </div>

                    <div className="border-b border-white/10 px-5 py-4">
                      <div className="text-sm font-semibold text-white">Privacy & status</div>

                      <div className="mt-4 space-y-3">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/75">
                          Consent:{" "}
                          <span className={state.consent ? "text-emerald-300" : "text-amber-300"}>
                            {state.consent ? "дано" : "не дано"}
                          </span>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/75">
                          ML service:{" "}
                          <span className={mlApiAvailable ? "text-emerald-300" : "text-amber-300"}>
                            {mlApiAvailable ? "доступен" : "недоступен"}
                          </span>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/75">
                          WS:{" "}
                          <span
                            className={
                              getWsBaseUrl()?.startsWith("ws")
                                ? "text-emerald-300"
                                : "text-amber-300"
                            }
                          >
                            {getWsBaseUrl()?.startsWith("ws") ? "настроен" : "не настроен"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="min-h-0 flex-1 p-4">
                      <SessionChatPanel
                        sessionId={roomId}
                        role="student"
                        type={sessionType}
                      />
                    </div>

                    <div className="border-t border-white/10 px-5 py-4 text-xs leading-relaxed text-white/50">
                      Подключение идёт по WebRTC. Raw-video не сохраняется. В backend
                      отправляются только агрегированные метрики при наличии consent.
                    </div>
                  </aside>
                </div>
              </div>
            </Reveal>
          )}

          {!live && !getWsBaseUrl()?.startsWith("ws") && (
            <div className="flex items-start gap-3 rounded-elas-lg bg-surface-subtle p-4">
              <AlertTriangle
                className="mt-0.5 text-[rgb(var(--warning))]"
                size={18}
              />
              <div className="text-sm text-muted">
                WS base URL не настроен. Проверь `NEXT_PUBLIC_WS_BASE_URL`.
              </div>
            </div>
          )}

          {!live && (
            <div className="flex items-start gap-3 rounded-elas-lg bg-surface-subtle p-4">
              <Activity className="mt-0.5 text-[rgb(var(--primary))]" size={18} />
              <div className="text-sm leading-relaxed text-muted">
                Подключение идёт по WebRTC. Видео не записывается. В backend
                отправляются только агрегированные метрики (emotion/state/risk) при
                наличии согласия.
              </div>
            </div>
          )}
        </Section>
      )}
    </div>
  );
}