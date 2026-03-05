"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Reveal from "@/components/common/Reveal";
import Section from "@/components/common/Section";

import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

import { useUI } from "@/components/layout/Providers";
import { mockSessions } from "@/lib/mock/sessions";
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

import { ShieldCheck, Video, Activity, AlertTriangle, LogOut } from "lucide-react";
import { getWsBaseUrl } from "@/lib/env"; // <-- добавь этот helper как я говорил ранее

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-elas-lg bg-surface-subtle px-3 py-2">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="text-sm font-semibold text-fg">{value}</div>
    </div>
  );
}

function VideoFrame({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-fg">{title}</div>
        {hint ? <div className="text-xs text-muted">{hint}</div> : null}
      </div>
      <div className="relative aspect-video rounded-elas-lg overflow-hidden border border-border bg-surface-subtle">
        {children}
      </div>
    </div>
  );
}

export default function StudentJoinSessionPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params?.id ?? "";
  const { state } = useUI();

  const session = useMemo(
    () => mockSessions.find((s) => s.id === sessionId) ?? mockSessions[0],
    [sessionId]
  );

  const [joinInfo, setJoinInfo] = useState<SessionJoinInfo | null>(null);
  const [joinInfoLoading, setJoinInfoLoading] = useState(!!(getApiBaseUrl() && hasAuth()));

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

      // auto record consent if already given in UI
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

  const title = joinInfo?.title ?? session.title;

  const apiAvailable = getApiBaseUrl() && hasAuth();
  const canJoin = !apiAvailable || joinInfo?.allowedToJoin !== false;
  const blockReason = joinInfo && !joinInfo.allowedToJoin ? joinInfo.reason : null;

  const [live, setLive] = useState(false);
  const [tab, setTab] = useState<"prepare" | "live">("prepare");

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const [mlResult, setMlResult] = useState<MlAnalyzeResponse | null>(null);
  const [mlActive, setMlActive] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const mlApiAvailable = Boolean(getMlApiBaseUrl());
  const shouldRunMl = live && state.consent && mlApiAvailable;

  // room = sessionId
  const roomId = sessionId || session.id;

  // WebRTC
  useEffect(() => {
    if (!live || !roomId) return;

    // ✅ use env-based WS base
    const wsBase = getWsBaseUrl();
    const signaling = new SignalingClient(`${wsBase}/ws`);

    const manager = new PeerConnectionManager(signaling, roomId, "student", {
      onRemoteStream: (_peerId, stream) => setRemoteStream(stream),
      onPeersChange: (peers) => setParticipants(peers),
    });

    signaling.connect();

    (async () => {
      const stream = await manager.initLocalStream({ video: true, audio: true });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        await localVideoRef.current.play().catch(() => {});
      }

      await signaling.waitForOpen();
      manager.join();
    })();

    return () => {
      manager.leave();
      setRemoteStream(null);
      setParticipants([]);
    };
  }, [live, roomId]);

  useEffect(() => {
    if (!remoteVideoRef.current || !remoteStream) return;
    remoteVideoRef.current.srcObject = remoteStream;
    remoteVideoRef.current.play().catch(() => {});
  }, [remoteStream]);

  // ML loop
  useEffect(() => {
    if (!shouldRunMl || !localVideoRef.current) return;

    setMlActive(true);
    const intervalMs = 650;
    const timer = setInterval(async () => {
      const video = localVideoRef.current;
      if (!video) return;

      const frame = captureFrame64x64Grayscale(video);
      if (!frame) return;

      const result = await mlAnalyzeFrame(frame);
      if (result) {
        setMlResult(result);

        if (sessionId && apiAvailable) {
          sendSessionMetrics(sessionId, {
            emotion: result.emotion,
            confidence: result.confidence,
            risk: result.risk,
            state: result.state,
            dominant_emotion: result.dominant_emotion,
          });
        }
      }
    }, intervalMs);

    return () => {
      clearInterval(timer);
      setMlActive(false);
      setMlResult(null);
    };
  }, [shouldRunMl, sessionId, apiAvailable]);

  return (
    <div className="pb-12 space-y-6">
      <Breadcrumbs
        items={[
          { label: "Студент", href: "/student/dashboard" },
          { label: "Сессии", href: "/student/sessions" },
          { label: title },
        ]}
      />

      <Link href="/student/sessions" className="inline-flex text-sm text-muted hover:text-fg transition-colors">
        ← К списку сессий
      </Link>

      <PageHero
        overline="Студент · Сессия"
        title={title}
        subtitle={
          joinInfo?.groupName
            ? `${joinInfo.groupName}. Сначала согласие и проверка камеры, затем подключение.`
            : "Сначала согласие и проверка камеры, затем подключение к эфиру."
        }
        right={
          <div className="flex items-center gap-2 flex-wrap">
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

      {/* Loading join info */}
      {joinInfoLoading && (
        <Section spacing="none" className="mt-6">
          <Card>
            <CardContent className="p-6 md:p-7">
              <div className="h-24 rounded-elas-lg bg-surface-subtle animate-pulse" />
            </CardContent>
          </Card>
        </Section>
      )}

      {/* Blocked */}
      {!joinInfoLoading && !canJoin && blockReason && (
        <Section spacing="none" className="mt-6">
          <Reveal>
            <Card className="mx-auto max-w-3xl">
              <CardContent className="p-6 md:p-7 space-y-3">
                {blockReason === "consent_required" && (
                  <>
                    <div className="text-sm text-muted">Требуется согласие</div>
                    <div className="text-lg font-semibold text-fg">
                      Для подключения к сессии нужно дать согласие на анализ эмоций
                    </div>
                    <div className="text-sm text-muted">
                      Согласие обязательно по этике платформы. Его можно отозвать в любой момент.
                    </div>

                    <Link href={`/consent?returnUrl=${encodeURIComponent(`/student/session/${sessionId}`)}`}>
                      <Button className="mt-2">Перейти к согласию</Button>
                    </Link>
                  </>
                )}

                {(blockReason === "session_not_started" || blockReason === "session_ended") && (
                  <>
                    <div className="text-sm text-muted">Статус сессии</div>
                    <div className="text-lg font-semibold text-fg">
                      {blockReason === "session_ended" ? "Сессия завершена." : "Сессия ещё не началась."}
                    </div>
                    <div className="text-sm text-muted">
                      {blockReason === "session_ended"
                        ? "Преподаватель завершил эфир. Подключение недоступно."
                        : "Дождитесь, когда преподаватель запустит сессию (статус «В эфире»)."}
                    </div>

                    <Link href="/student/sessions" className="inline-block mt-2">
                      <Button variant="outline">К списку</Button>
                    </Link>
                  </>
                )}
              </CardContent>
            </Card>
          </Reveal>
        </Section>
      )}

      {/* Allowed */}
      {!joinInfoLoading && canJoin && (
        <Section spacing="none" className="mt-6 space-y-6">
          <StudentSessionTabs tab={tab} onChange={setTab} />

          {/* PREPARE */}
          {tab === "prepare" && (
            <Reveal>
              <div className="grid gap-6 lg:grid-cols-12">
                <div className="lg:col-span-7">
                  <Card>
                    <CardContent className="p-6 md:p-7 space-y-4">
                      <div>
                        <div className="text-sm text-muted">Шаг 1</div>
                        <div className="mt-2 text-lg font-semibold text-fg">Consent и правила приватности</div>
                        <div className="mt-2 text-sm text-muted leading-relaxed">
                          Видео не сохраняется. Анализ идёт 1–2 кадра в секунду, в систему попадают только агрегированные метрики.
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <StatusPill label="Согласие" value={state.consent ? "Дано" : "Не дано"} />
                        <StatusPill label="ML сервис" value={mlApiAvailable ? "Доступен" : "Недоступен"} />
                      </div>

                      {!state.consent && (
                        <Link
                          href={`/consent?returnUrl=${encodeURIComponent(`/student/session/${sessionId}`)}`}
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
                  <Card>
                    <CardContent className="p-6 md:p-7 space-y-3">
                      <div>
                        <div className="text-sm text-muted">Шаг 2</div>
                        <div className="mt-2 text-lg font-semibold text-fg">Проверка камеры</div>
                        <div className="mt-2 text-sm text-muted">
                          Проверьте доступ, освещение и положение лица. Затем нажмите «Начать».
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

          {/* LIVE */}
          {tab === "live" && (
            <Reveal>
              <Card>
                <CardContent className="p-6 md:p-7 space-y-6">
                  {/* header */}
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-sm text-muted">Live</div>
                      <div className="mt-2 text-lg font-semibold text-fg">
                        {live ? "Подключено" : "Ещё не подключено"}
                      </div>
                      <div className="mt-2 text-sm text-muted">
                        {live
                          ? "Медиа передаётся по WebRTC. Аналитика активна только при согласии."
                          : "Перейдите на «Подготовка» и нажмите «Начать»."}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {mlResult ? (
                        <>
                          <Badge className="bg-primary/10">
                            {mlResult.emotion} • {(mlResult.confidence * 100).toFixed(0)}%
                          </Badge>
                          <Badge variant={mlResult.state === "NORMAL" ? "success" : "warning"}>
                            {mlResult.state}
                          </Badge>
                          <Badge className="bg-surface-subtle">
                            Risk {(mlResult.risk * 100).toFixed(0)}%
                          </Badge>
                        </>
                      ) : shouldRunMl && mlActive ? (
                        <Badge className="bg-surface-subtle">Анализ…</Badge>
                      ) : live && mlApiAvailable && !state.consent ? (
                        <Badge variant="warning">Нужно согласие для анализа</Badge>
                      ) : live && !mlApiAvailable ? (
                        <Badge variant="warning">ML сервис недоступен</Badge>
                      ) : null}

                      {live && (
                        <Button
                          variant="outline"
                          className="gap-2"
                          onClick={() => {
                            setLive(false);
                            setTab("prepare");
                          }}
                        >
                          <LogOut size={16} />
                          Выйти
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* videos */}
                  <div className="grid gap-5 lg:grid-cols-2">
                    <VideoFrame title="Ваша камера" hint={live ? "Streaming" : "Not started"}>
                      <video ref={localVideoRef} className="h-full w-full object-cover" playsInline muted />
                      {!live && (
                        <div className="absolute inset-0 grid place-items-center text-sm text-muted">
                          Запустите подключение на вкладке «Подготовка».
                        </div>
                      )}
                    </VideoFrame>

                    <VideoFrame
                      title="Видео преподавателя"
                      hint={remoteStream ? "Connected" : "Waiting…"}
                    >
                      <video ref={remoteVideoRef} className="h-full w-full object-cover" playsInline />
                      {!remoteStream && (
                        <div className="absolute inset-0 grid place-items-center text-sm text-muted text-center px-6">
                          Ожидание преподавателя. Откройте эту же сессию как teacher для связи.
                        </div>
                      )}
                    </VideoFrame>
                  </div>

                  {/* info row */}
                  <div className="grid gap-3 sm:grid-cols-4">
                    <StatusPill label="Room" value={roomId ? `${roomId.slice(0, 8)}…` : "—"} />
                    <StatusPill label="Peers" value={`${participants.length}`} />
                    <StatusPill label="Remote video" value={remoteStream ? "Да" : "Нет"} />
                    <StatusPill label="ML" value={shouldRunMl ? "On" : "Off"} />
                  </div>

                  {/* chat */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-lg font-semibold text-fg">Чат сессии</div>
                      <Badge className="bg-surface-subtle">Realtime</Badge>
                    </div>

                    <div className="mt-3">
                      <SessionChatPanel
                        sessionId={roomId}
                        role="student"
                        type={session.type === "exam" ? "exam" : "lecture"}
                      />
                    </div>
                  </div>

                  {/* safety note */}
                  <div className="rounded-elas-lg bg-surface-subtle p-4 flex items-start gap-3">
                    <Activity className="mt-0.5 text-[rgb(var(--primary))]" size={18} />
                    <div className="text-sm text-muted leading-relaxed">
                      Подключение идёт по WebRTC. Видео не записывается. В backend отправляются только агрегированные метрики
                      (emotion/state/risk) при наличии согласия.
                    </div>
                  </div>

                  {!getWsBaseUrl()?.startsWith("ws") && (
                    <div className="rounded-elas-lg bg-surface-subtle p-4 flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 text-[rgb(var(--warning))]" size={18} />
                      <div className="text-sm text-muted">
                        WS base URL не настроен. Проверь `NEXT_PUBLIC_WS_BASE_URL`.
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Reveal>
          )}
        </Section>
      )}
    </div>
  );
}