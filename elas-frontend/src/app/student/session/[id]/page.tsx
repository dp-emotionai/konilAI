"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Reveal from "@/components/common/Reveal";
import Section from "@/components/common/Section";
import {Card} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useUI } from "@/components/layout/Providers";
import { mockSessions } from "@/lib/mock/sessions";
import { getSessionJoinInfo, recordSessionConsent, sendSessionMetrics, type SessionJoinInfo } from "@/lib/api/student";
import { getApiBaseUrl, hasAuth } from "@/lib/api/client";
import { getMlApiBaseUrl, mlAnalyzeFrame, captureFrame64x64Grayscale, type MlAnalyzeResponse } from "@/lib/api/ml";
import CameraCheck from "@/components/session/CameraCheck";
import { StudentSessionTabs } from "@/components/session/StudentSessionTabs";
import { SignalingClient } from "@/lib/webrtc/signalingClient";
import { PeerConnectionManager } from "@/lib/webrtc/peerConnectionManager";
import type { Participant } from "@/lib/webrtc/types";
import { SessionChatPanel } from "@/components/chat/SessionChatPanel";

export default function StudentJoinSessionPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params?.id ?? "";
  const { state } = useUI();

  const session = useMemo(() => mockSessions.find((s) => s.id === sessionId) ?? mockSessions[0], [sessionId]);
  const [joinInfo, setJoinInfo] = useState<SessionJoinInfo | null>(null);
  const [joinInfoLoading, setJoinInfoLoading] = useState(!!(getApiBaseUrl() && hasAuth()));

  useEffect(() => {
    if (!sessionId || !getApiBaseUrl() || !hasAuth()) {
      setJoinInfoLoading(false);
      return;
    }
    let mounted = true;
    const run = async () => {
      let info = await getSessionJoinInfo(sessionId);
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
    return () => { mounted = false; };
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

  // Комната WebRTC = sessionId из URL (та же, что у преподавателя)
  const roomId = sessionId || session.id;

  useEffect(() => {
    if (!live || !roomId) return;
    const signaling = new SignalingClient("ws://localhost:4000/ws");
    const manager = new PeerConnectionManager(signaling, roomId, "student", {
      onRemoteStream: (_peerId, stream) => {
        setRemoteStream(stream);
      },
      onPeersChange: (peers) => {
        setParticipants(peers);
      },
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
    };
  }, [live, roomId]);

  useEffect(() => {
    if (!remoteVideoRef.current || !remoteStream) return;
    remoteVideoRef.current.srcObject = remoteStream;
    remoteVideoRef.current.play().catch(() => {});
  }, [remoteStream]);

  // ML: 1–2 fps анализ кадра с камеры (только при согласии и доступном ML API)
  useEffect(() => {
    if (!shouldRunMl || !localVideoRef.current) return;
    setMlActive(true);
    const intervalMs = 600;
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
  }, [shouldRunMl]);

  return (
    <div className="space-y-6 pb-10">
      <Breadcrumbs
        items={[
          { label: "Студент", href: "/student/dashboard" },
          { label: "Сессии", href: "/student/sessions" },
          { label: title },
        ]}
      />
      <div className="flex items-center gap-2 mb-2">
        <Link
          href="/student/sessions"
          className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition"
        >
          ← К списку сессий
        </Link>
      </div>
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
            <Badge>{state.consent ? "Согласие дано" : "Нет согласия"}</Badge>
            <Link href="/student/sessions">
              <Button variant="outline">Назад</Button>
            </Link>
          </div>
        }
      />

      {joinInfoLoading && (
        <Section>
          <Card className="p-6 md:p-7">
            <div className="h-20 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />
          </Card>
        </Section>
      )}

      {!joinInfoLoading && !canJoin && blockReason && (
        <Section>
          <Reveal>
            <Card className="mx-auto max-w-3xl p-6 md:p-7">
              {blockReason === "consent_required" && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-sm text-slate-500 dark:text-white/60">Требуется согласие</div>
                    <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-zinc-100">
                      Для подключения к сессии нужно дать согласие на анализ эмоций
                    </div>
                    <div className="mt-2 text-sm text-slate-500 dark:text-white/60">
                      По этике платформы согласие обязательно. Его можно отозвать в любой момент.
                    </div>
                  </div>
                  <Link href={`/consent?returnUrl=${encodeURIComponent(`/student/session/${sessionId}`)}`}>
                    <Button>Перейти к согласию</Button>
                  </Link>
                </div>
              )}
              {(blockReason === "session_not_started" || blockReason === "session_ended") && (
                <div>
                  <div className="text-sm text-slate-500 dark:text-white/60">Статус сессии</div>
                  <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-zinc-100">
                    {blockReason === "session_ended" ? "Сессия завершена." : "Сессия ещё не началась."}
                  </div>
                  <div className="mt-2 text-sm text-slate-500 dark:text-white/60">
                    {blockReason === "session_ended"
                      ? "Преподаватель завершил эфир. Подключение недоступно."
                      : "Дождитесь, когда преподаватель запустит сессию (статус «В эфире»)."}
                  </div>
                  <Link href="/student/sessions" className="inline-block mt-4">
                    <Button variant="outline">К списку сессий</Button>
                  </Link>
                </div>
              )}
            </Card>
          </Reveal>
        </Section>
      )}

      {!joinInfoLoading && canJoin && (
        <>
          <Section>
            <StudentSessionTabs tab={tab} onChange={setTab} />

            {tab === "prepare" && (
              <Reveal>
                <Card className="mx-auto mt-4 max-w-4xl p-6 md:p-7 space-y-4">
                  <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)] items-start">
                    <div className="space-y-3">
                      <div className="text-sm text-slate-500 dark:text-white/60">Шаг 1 · Статус и согласие</div>
                      <div className="text-lg font-semibold text-slate-900 dark:text-zinc-100">
                        Подготовка к подключению
                      </div>
                      <div className="text-sm text-slate-500 dark:text-white/60">
                        Сначала убедитесь, что вы дали согласие на анализ эмоций и камера работает корректно. После
                        этого можно подключиться к сессии.
                      </div>
                      {!state.consent && (
                        <div className="mt-1">
                          <Link
                            href={`/consent?returnUrl=${encodeURIComponent(`/student/session/${sessionId}`)}`}
                            className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm ring-1 ring-amber-400/25 bg-amber-500/15 hover:bg-amber-500/20 text-amber-100 transition"
                          >
                            Принять согласие
                          </Link>
                        </div>
                      )}
                      <div className="mt-2 rounded-2xl border border-slate-200/70 bg-slate-50 px-4 py-3 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
                        Видео не сохраняется. Анализ идёт 1–2 кадра в секунду, в систему попадают только обезличенные
                        метрики вовлечённости.
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="text-sm text-slate-500 dark:text-white/60">Шаг 2 · Проверка камеры</div>
                      <CameraCheck
                        onStart={() => {
                          setLive(true);
                          setTab("live");
                        }}
                      />
                    </div>
                  </div>
                </Card>
              </Reveal>
            )}

            {tab === "live" && (
              <Reveal>
                <Card className="mt-4 p-6 md:p-7 space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-sm text-slate-500 dark:text-white/60">Статус</div>
                    <div className="mt-2 text-lg font-semibold text-slate-900 dark:text-zinc-100">
                      {live ? "Подключено к преподавателю" : "Ещё не подключено"}
                    </div>
                    <div className="mt-2 text-sm text-slate-500 dark:text-white/60">
                      {live
                        ? "Медиа передаётся по WebRTC. Анализ эмоций в реальном времени (без записи видео)."
                        : "На вкладке «Подготовка» пройдите проверку камеры и нажмите «Начать»."}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {mlResult && (
                      <>
                        <Badge className="bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/20">
                          {mlResult.emotion} ({(mlResult.confidence * 100).toFixed(0)}%)
                        </Badge>
                        <Badge className={mlResult.state === "NORMAL" ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/20" : "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/20"}>
                          {mlResult.state}
                        </Badge>
                        <Badge className="bg-white/10 text-white/80 ring-1 ring-white/10">Risk: {(mlResult.risk * 100).toFixed(0)}%</Badge>
                      </>
                    )}
                    {shouldRunMl && !mlResult && mlActive && <Badge className="bg-white/10 text-white/60">Анализ…</Badge>}
                    {live && !shouldRunMl && mlApiAvailable && <Badge className="bg-white/10 text-white/60">Согласие нужно для анализа</Badge>}
                    {live && !mlApiAvailable && <Badge className="bg-white/10 text-white/60">ML сервис недоступен</Badge>}
                    {live && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setLive(false);
                          setTab("prepare");
                        }}
                      >
                        Выйти из сессии
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 mt-4">
                  <div className="space-y-2">
                    <div className="text-xs text-slate-500 dark:text-white/60">Ваша камера</div>
                    <div className="relative aspect-video rounded-2xl border border-slate-200/70 bg-slate-950/90 overflow-hidden dark:border-white/10 dark:bg-black/25">
                      <video ref={localVideoRef} className="h-full w-full object-cover" playsInline muted />
                      {!live && (
                        <div className="absolute inset-0 grid place-items-center text-xs text-slate-400 dark:text-white/60">
                          Запустите подключение на вкладке «Подготовка».
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-white/60">
                      <span>Видео преподавателя</span>
                      <span>{participants.length ? "Подключён" : "Ожидание…"}</span>
                    </div>
                    <div className="relative aspect-video rounded-2xl border border-slate-200/70 bg-slate-950/90 overflow-hidden dark:border-white/10 dark:bg-black/25">
                      <video ref={remoteVideoRef} className="h-full w-full object-cover" playsInline />
                      {!remoteStream && (
                        <div className="absolute inset-0 grid place-items-center text-xs text-slate-400 dark:text-white/60">
                          Откройте эту же сессию как преподаватель для связи.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-400 dark:text-white/45 mt-2">
                  WebRTC: комната {roomId ? `${roomId.slice(0, 8)}…` : "—"} · участников: {participants.length} · удалённое видео: {remoteStream ? "да" : "нет"}. Бэкенд (порт 4000) должен быть запущен.
                </p>

                {/* Чат сессии для студента */}
                <div className="mt-4">
                  <SessionChatPanel
                    sessionId={roomId}
                    role="student"
                    type={session.type === "exam" ? "exam" : "lecture"}
                  />
                </div>
              </Card>
              </Reveal>
            )}
          </Section>
        </>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm text-white/60">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
