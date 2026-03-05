"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Reveal from "@/components/common/Reveal";
import Section from "@/components/common/Section";

import { Card, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

import { mockSessions } from "@/lib/mock/sessions";
import { getSessionLiveMetrics, postSessionMessage, type SessionLiveMetrics } from "@/lib/api/teacher";
import { getApiBaseUrl, hasAuth } from "@/lib/api/client";

import { TeacherSessionTabs } from "@/components/session/TeacherSessionTabs";
import CameraCheck from "@/components/session/CameraCheck";
import { SessionChatPanel } from "@/components/chat/SessionChatPanel";

import { SignalingClient } from "@/lib/webrtc/signalingClient";
import { PeerConnectionManager } from "@/lib/webrtc/peerConnectionManager";
import type { Participant } from "@/lib/webrtc/types";

import { getWsBaseUrl } from "@/lib/env";
import { Activity, Users, Video, AlertTriangle, Send, LogOut, Share2, Flag, Clock } from "lucide-react";

type SessionPhase = "preflight" | "live" | "ended";

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-elas-lg bg-surface-subtle px-3 py-2">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="text-sm font-semibold text-fg">{value}</div>
    </div>
  );
}

function formatPct01(x?: number) {
  if (typeof x !== "number" || Number.isNaN(x)) return "—";
  return `${Math.round(x * 100)}%`;
}

export default function TeacherLiveMonitorPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params?.id ?? "";

  const session = useMemo(
    () => mockSessions.find((s) => s.id === sessionId) ?? mockSessions[0],
    [sessionId]
  );

  const [phase, setPhase] = useState<SessionPhase>("preflight");
  const [liveSeconds, setLiveSeconds] = useState(0);

  // WebRTC
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Metrics
  const [liveMetrics, setLiveMetrics] = useState<SessionLiveMetrics | null>(null);
  const [polling, setPolling] = useState(false);

  // Gates / readiness
  const apiAvailable = Boolean(getApiBaseUrl() && hasAuth());
  const wsUrl = getWsBaseUrl();
  const [cameraReady, setCameraReady] = useState(false);

  const roomId = sessionId || session.id;
  const isLive = phase === "live";

  // Live timer
  useEffect(() => {
    if (!isLive) return;
    const id = window.setInterval(() => setLiveSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [isLive]);

  // WebRTC connect
  useEffect(() => {
    if (!isLive || !roomId) return;

    const signaling = new SignalingClient(`${wsUrl}/ws`);
    const manager = new PeerConnectionManager(signaling, roomId, "teacher", {
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
  }, [isLive, roomId, wsUrl]);

  useEffect(() => {
    if (!remoteVideoRef.current || !remoteStream) return;
    remoteVideoRef.current.srcObject = remoteStream;
    remoteVideoRef.current.play().catch(() => {});
  }, [remoteStream]);

  // Safe polling live metrics (no overlap)
  useEffect(() => {
    if (!isLive || !roomId || !apiAvailable) {
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

  // Derived
  const hasMl = Boolean(liveMetrics?.participants?.length);
  const avgRisk = liveMetrics?.avgRisk ?? 0;
  const avgConfidence = liveMetrics?.avgConfidence ?? 0;

  const gates = {
    backend: apiAvailable,
    ws: Boolean(wsUrl),
    camera: cameraReady,
  };
  const criticalOk = gates.backend && gates.ws && gates.camera;

  const liveLabel = phase === "ended" ? "Ended" : isLive ? "Live" : "Preflight";

  const timerLabel = new Date(liveSeconds * 1000).toISOString().substring(11, 19);

  return (
    <div className="pb-12 space-y-6">
      <Breadcrumbs
        items={[
          { label: "Преподаватель", href: "/teacher/dashboard" },
          { label: "Сессии", href: "/teacher/sessions" },
          { label: session.title },
        ]}
      />

      <Link href="/teacher/sessions" className="inline-flex text-sm text-muted hover:text-fg transition-colors">
        ← К списку сессий
      </Link>

      <PageHero
        overline="Преподаватель · Live-монитор"
        title={session.title}
        subtitle="Live-видео + метрики группы. Используется только для улучшения урока, не для оценивания личности."
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-surface-subtle">Type: {session.type === "exam" ? "Exam" : "Lecture"}</Badge>
            <Badge className={isLive ? "bg-primary/10 text-[rgb(var(--primary))]" : "bg-surface-subtle"}>
              <span className="inline-flex h-2 w-2 rounded-full mr-1 bg-[rgb(var(--success))] animate-pulse" />
              {liveLabel}
            </Badge>
          </div>
        }
      />

      <TeacherSessionTabs sessionId={session.id} />

      {/* Sticky command bar */}
      <Section spacing="none" className="mt-4">
        <div className="rounded-elas-lg bg-surface-subtle/80 ring-1 ring-[color:var(--border)]/30 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Badge className={isLive ? "bg-primary/10 text-[rgb(var(--primary))]" : "bg-surface-subtle text-muted"}>
              {liveLabel}
            </Badge>
            <div className="inline-flex items-center gap-1 text-xs text-muted">
              <Clock size={14} />
              <span>{timerLabel}</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted">
              <span>Room:</span>
              <span className="font-mono text-[11px]">{roomId ? `${roomId.slice(0, 8)}…` : "—"}</span>
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
              onClick={() => {
                setPhase("ended");
              }}
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

      {/* Preflight: checklist + camera check */}
      {phase === "preflight" && (
        <Section spacing="none" className="mt-6">
          <Reveal>
            <div className="grid gap-6 lg:grid-cols-12 items-start">
              <div className="lg:col-span-5 space-y-4">
                <Card variant="elevated">
                  <CardContent className="p-6 md:p-7 space-y-4">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wider text-muted">Preflight checklist</div>
                      <div className="mt-2 text-lg font-semibold text-fg">Проверьте перед стартом</div>
                      <div className="mt-1 text-sm text-muted">
                        Пока критические проверки не зелёные — сессия не запустится.
                      </div>
                    </div>

                    <div className="space-y-3 text-sm">
                      <ChecklistItem label="Backend / Auth" ok={gates.backend} hint={apiAvailable ? "API доступен" : "Нет API URL или токена"} />
                      <ChecklistItem label="WS signaling" ok={gates.ws} hint={wsUrl || "WS URL не настроен"} />
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

                    {!criticalOk && (
                      <div className="rounded-elas-lg bg-surface-subtle/80 px-3 py-2 text-xs text-muted">
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

      {/* Live command center */}
      {phase === "live" && (
        <Section spacing="none" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-12 items-start">
            {/* Left: видео + чат */}
            <Reveal className="lg:col-span-5">
              <Card variant="elevated">
                <CardContent className="p-6 md:p-7 space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm text-muted">Групповой звонок</div>
                      <div className="mt-2 text-lg font-semibold text-fg">WebRTC эфир</div>
                      <div className="mt-2 text-sm text-muted">
                        Студенты подключаются к этой же комнате. Видео не сохраняется.
                      </div>
                    </div>
                    <Badge variant="success" className="gap-1.5">
                      <span className="inline-flex h-1.5 w-1.5 rounded-full bg-[rgb(var(--success))] animate-pulse" />
                      LIVE
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-fg">Ваша камера</div>
                        <div className="text-xs text-muted">
                          {participants.length ? "Студенты подключены" : "Ожидание студентов…"}
                        </div>
                      </div>
                      <div className="relative aspect-video rounded-elas-lg overflow-hidden bg-black">
                        <video ref={localVideoRef} className="h-full w-full object-cover" playsInline muted />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-fg">Видео студентов</div>
                        <div className="text-xs text-muted">
                          {remoteStream ? `${participants.length} peers` : "Нет удалённого видео"}
                        </div>
                      </div>
                      <div className="relative aspect-video rounded-elas-lg overflow-hidden bg-surface-subtle">
                        <video ref={remoteVideoRef} className="h-full w-full object-cover" playsInline />
                        {!remoteStream && (
                          <div className="absolute inset-0 grid place-items-center text-sm text-muted text-center px-6">
                            Пока нет удалённого видео. Откройте эту же сессию как студент для связи.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-4">
                    <StatusPill label="Room" value={roomId ? `${roomId.slice(0, 8)}…` : "—"} />
                    <StatusPill label="Peers" value={`${participants.length}`} />
                    <StatusPill label="Remote video" value={remoteStream ? "Да" : "Нет"} />
                    <StatusPill label="Polling" value={apiAvailable ? (polling ? "On" : "Idle") : "Off"} />
                  </div>

                  {/* Chat как часть командного центра */}
                  <SessionChatPanel
                    sessionId={roomId}
                    role="teacher"
                    type={session.type === "exam" ? "exam" : "lecture"}
                  />

                  <div className="rounded-elas-lg bg-surface-subtle p-4 flex items-start gap-3">
                    <Activity className="mt-0.5 text-[rgb(var(--primary))]" size={18} />
                    <div className="text-sm text-muted leading-relaxed">
                      Метрики отображаются только для студентов, которые дали согласие. В систему не сохраняется raw-видео.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Reveal>

            {/* Center: timeline / events */}
            <Reveal className="lg:col-span-3">
              <Card variant="elevated">
                <CardContent className="p-6 md:p-7 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm text-muted">События</div>
                      <div className="mt-2 text-lg font-semibold text-fg">Timeline</div>
                      <div className="mt-2 text-sm text-muted">
                        Поток join/leave, consent, alerts и маркеров (будет заполнен с WS).
                      </div>
                    </div>
                    <Badge className="bg-surface-subtle text-xs">Stream</Badge>
                  </div>

                  <div className="rounded-elas-lg bg-surface-subtle/80 ring-1 ring-[color:var(--border)]/20 p-4 text-sm text-muted">
                    Пока события приходят только частично. В проде здесь будет общий event stream с отметками времени
                    и маркерами преподавателя.
                  </div>
                </CardContent>
              </Card>
            </Reveal>

            {/* Right: participants + агрегаты + alerts + подсказка */}
            <Reveal className="lg:col-span-4">
              <div className="space-y-6">
                <Card variant="elevated">
                  <CardContent className="p-6 md:p-7 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm text-muted">Участники</div>
                        <div className="mt-2 text-lg font-semibold text-fg">Список и ML-метрики</div>
                        <div className="mt-2 text-sm text-muted">
                          Кто в онлайне, кто дал consent и когда были последние метрики.
                        </div>
                      </div>
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-elas-lg bg-surface-subtle text-[rgb(var(--primary))]">
                        <Users size={18} />
                      </div>
                    </div>

                    {!hasMl ? (
                      <div className="rounded-elas-lg bg-surface-subtle p-4 text-sm text-muted">
                        Пока нет ML-данных. Студенты должны: дать consent → включить камеру → открыть урок.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-80 overflow-y-auto">
                        {liveMetrics!.participants.map((p) => (
                          <div key={p.userId} className="rounded-elas-lg bg-surface-subtle p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-semibold text-fg truncate">
                                  {p.name || p.email || p.userId}
                                </div>
                                <div className="mt-1 text-xs text-muted">
                                  last metric {new Date(p.updatedAt).toLocaleTimeString()}
                                </div>
                              </div>

                              <Badge className="bg-primary/10">
                                {p.emotion} • {(p.confidence * 100).toFixed(0)}%
                              </Badge>
                            </div>

                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <Badge variant={p.state === "NORMAL" ? "success" : "warning"}>{p.state}</Badge>
                              <Badge className="bg-surface">Risk {(p.risk * 100).toFixed(0)}%</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card variant="elevated">
                  <CardContent className="p-6 md:p-7 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm text-muted">Состояние группы</div>
                        <div className="mt-2 text-lg font-semibold text-fg">Средние агрегаты</div>
                        <div className="mt-2 text-sm text-muted">
                          На основе текущих участников с ML-метриками.
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        disabled={!hasMl || !apiAvailable}
                        onClick={() => {
                          if (!hasMl || !apiAvailable) return;
                          const riskPct = (avgRisk * 100).toFixed(0);
                          const text = `⚠ Средний риск сейчас ${riskPct}% (по текущим ML-метрикам группы).`;
                          postSessionMessage(roomId, { type: "system", text, channel: "public" }).catch(() => {});
                        }}
                      >
                        <Send size={14} />
                        В чат
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <StatusPill label="Avg risk" value={hasMl ? formatPct01(avgRisk) : "—"} />
                      <StatusPill label="Avg confidence" value={hasMl ? formatPct01(avgConfidence) : "—"} />
                    </div>

                    {!apiAvailable && (
                      <div className="text-xs text-muted">
                        Сейчас mock-режим: backend/auth недоступен, live metrics не опрашиваются.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card variant="elevated">
                  <CardContent className="p-6 md:p-7 space-y-3">
                    <div>
                      <div className="text-sm text-muted">Провалы внимания</div>
                      <div className="mt-2 text-lg font-semibold text-fg">Alerts</div>
                      <div className="mt-2 text-sm text-muted">
                        Здесь будут события по таймлайну (через ML/WS stream).
                      </div>
                    </div>

                    <div className="rounded-elas-lg bg-surface-subtle p-4 text-sm text-muted flex items-start gap-3">
                      <AlertTriangle size={18} className="mt-0.5 text-[rgb(var(--warning))]" />
                      Пока нет событий. После подключения потоковых событий появятся метки провалов.
                    </div>
                  </CardContent>
                </Card>

                <Card variant="elevated">
                  <CardContent className="p-6 md:p-7 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm text-muted">Подсказка</div>
                        <div className="mt-2 text-lg font-semibold text-fg">Что показать на защите</div>
                        <div className="mt-2 text-sm text-muted">
                          Запустите LIVE → подключите студента → покажите participants + avg risk + чат → завершите и
                          экспортируйте отчёт (после интеграции).
                        </div>
                      </div>
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-elas-lg bg-surface-subtle text-[rgb(var(--primary))]">
                        <Video size={18} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </Reveal>
          </div>
        </Section>
      )}

      {phase === "ended" && (
        <Section spacing="none" className="mt-6">
          <Reveal>
            <Card variant="elevated">
              <CardContent className="p-6 md:p-8 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-muted">Session summary (mock)</div>
                    <div className="mt-2 text-lg font-semibold text-fg">Сессия завершена</div>
                    <div className="mt-2 text-sm text-muted">
                      Здесь позже появится отчёт: длительность, участники, средняя вовлечённость, alerts и markers.
                    </div>
                  </div>
                  <Badge className="bg-surface-subtle">Duration {timerLabel}</Badge>
                </div>
                <Button size="sm" variant="outline" className="mt-2" disabled>
                  Экспорт отчёта (скоро)
                </Button>
              </CardContent>
            </Card>
          </Reveal>
        </Section>
      )}
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
        <div className="text-muted mt-0.5">{hint}</div>
      </div>
    </div>
  );
}

