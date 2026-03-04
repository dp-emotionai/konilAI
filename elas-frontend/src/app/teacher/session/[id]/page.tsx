"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Reveal from "@/components/common/Reveal";
import {Card} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { mockSessions } from "@/lib/mock/sessions";
import { getSessionLiveMetrics, postSessionMessage, type SessionLiveMetrics } from "@/lib/api/teacher";
import { getApiBaseUrl, hasAuth } from "@/lib/api/client";
import { TeacherSessionTabs } from "@/components/session/TeacherSessionTabs";
import CameraCheck from "@/components/session/CameraCheck";
import { SignalingClient } from "@/lib/webrtc/signalingClient";
import { PeerConnectionManager } from "@/lib/webrtc/peerConnectionManager";
import type { Participant } from "@/lib/webrtc/types";
import { SessionChatPanel } from "@/components/chat/SessionChatPanel";

function ChartMock({ title }: { title: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm text-white/60">{title}</div>
        <Badge className="rounded-full bg-white/10 text-xs">Пример</Badge>
      </div>
      <div className="mt-4 h-44 rounded-2xl border border-white/10 bg-gradient-to-b from-purple-500/15 to-transparent" />
      <div className="mt-3 text-xs text-white/45">Графики подключатся к реальным метрикам (ML/WS).</div>
    </div>
  );
}

export default function TeacherLectureAnalyticsPage() {
  const params = useParams<{ id: string }>();
  const session = useMemo(() => mockSessions.find((s) => s.id === params.id) ?? mockSessions[0], [params.id]);
  const [live, setLive] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [liveMetrics, setLiveMetrics] = useState<SessionLiveMetrics | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const apiAvailable = getApiBaseUrl() && hasAuth();

  // Комната WebRTC = sessionId из URL, чтобы преподаватель и студент попали в одну и ту же комнату
  const roomId = (params?.id as string) || session.id;

  useEffect(() => {
    if (!live || !roomId) return;
    const signaling = new SignalingClient("ws://localhost:4000/ws");
    const manager = new PeerConnectionManager(signaling, roomId, "teacher", {
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

  // Опрос live-метрик с бэкенда каждые 2 с (только когда в эфире и API доступен)
  useEffect(() => {
    if (!live || !roomId || !apiAvailable) {
      setLiveMetrics(null);
      return;
    }
    const poll = async () => {
      const data = await getSessionLiveMetrics(roomId);
      if (data) setLiveMetrics(data);
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [live, roomId, apiAvailable]);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: "Преподаватель", href: "/teacher/dashboard" },
          { label: "Сессии", href: "/teacher/sessions" },
          { label: session.title },
        ]}
      />
      <div className="flex items-center gap-2 mb-2">
        <Link
          href="/teacher/sessions"
          className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition"
        >
          ← К списку сессий
        </Link>
      </div>
      <PageHero
        overline="Преподаватель · Live-монитор"
        title={session.title}
        subtitle="Таймлайн вовлечённости, провалы внимания, распределение эмоций. Результаты не для оценивания."
        right={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline">Итоговая сводка</Button>
            <Button>Экспорт отчёта</Button>
          </div>
        }
      />

      <TeacherSessionTabs sessionId={session.id} />

      <Reveal>
        <CameraCheck onStart={() => setLive(true)} />
      </Reveal>

      {live && (
        <>
          <Reveal>
            <Card className="p-6 md:p-7 space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-sm text-white/60">Групповой звонок</div>
                  <div className="mt-2 text-lg font-semibold text-zinc-100">
                    Подключение по WebRTC. Студенты подключаются к этой сессии.
                  </div>
                  <div className="mt-2 text-sm text-white/60">
                    WebSocket + WebRTC для медиа. Аналитика эмоций — по кадрам 1–2 fps (видео не сохраняется).
                  </div>
                </div>
                <Badge className="bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/20">В эфире</Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-xs text-white/60">Ваша камера</div>
                  <div className="relative aspect-video rounded-2xl border border-white/10 bg-black/25 overflow-hidden">
                    <video ref={localVideoRef} className="h-full w-full object-cover" playsInline muted />
                    {!participants.length && (
                      <div className="absolute inset-0 grid place-items-center text-xs text-white/60">
                        Ожидание подключения студентов…
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>Видео студентов</span>
                    <span>{participants.length} подключено</span>
                  </div>
                  <div className="relative aspect-video rounded-2xl border border-white/10 bg-black/25 overflow-hidden">
                    <video ref={remoteVideoRef} className="h-full w-full object-cover" playsInline />
                    {!remoteStream && (
                      <div className="absolute inset-0 grid place-items-center text-xs text-white/60">
                        Откройте эту же сессию как студент для связи.
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-white/45 mt-2">
                WebRTC: комната {roomId.slice(0, 8)}… · участников: {participants.length} · удалённое видео: {remoteStream ? "да" : "нет"}. Запустите бэкенд (порт 4000) для signaling.
              </p>
            </Card>
          </Reveal>

          {/* Участники + состояние группы + провалы внимания (ТЗ: live monitor) */}
          <div className="grid lg:grid-cols-3 gap-4 mt-6">
            <Reveal>
              <Card className="p-6 md:p-7">
                <div className="text-sm text-white/60 mb-3">Участники</div>
                <div className="text-lg font-semibold text-zinc-100">Метрики по студентам (ML)</div>
                <p className="mt-2 text-sm text-white/60">
                  {liveMetrics?.participants.length
                    ? `Студенты с согласием на анализ: эмоция, состояние, риск. Обновление каждые 2 с.`
                    : "Данные появятся, когда студенты начнут отправлять метрики (камера + согласие + ML)."}
                </p>
                <ul className="mt-4 space-y-2">
                  <li className="text-sm text-zinc-300">Вы (преподаватель)</li>
                  {!liveMetrics?.participants.length ? (
                    <li className="text-sm text-white/50">Пока нет данных с ML</li>
                  ) : (
                    liveMetrics.participants.map((p) => (
                      <li key={p.userId} className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-zinc-300 font-medium">{p.name || p.email || p.userId}</span>
                        <Badge className="bg-white/10 text-white/80 text-xs">{p.emotion} ({(p.confidence * 100).toFixed(0)}%)</Badge>
                        <Badge className={p.state === "NORMAL" ? "bg-emerald-500/15 text-emerald-200 text-xs" : "bg-amber-500/15 text-amber-200 text-xs"}>{p.state}</Badge>
                        <span className="text-white/50">Risk {(p.risk * 100).toFixed(0)}%</span>
                        <span className="text-white/40 text-xs">{new Date(p.updatedAt).toLocaleTimeString()}</span>
                      </li>
                    ))
                  )}
                </ul>
              </Card>
            </Reveal>
            <Reveal>
              <Card className="p-6 md:p-7 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-white/60 mb-1">Состояние группы</div>
                    <div className="text-lg font-semibold text-zinc-100">Средний риск / уверенность ML</div>
                    <p className="mt-1 text-sm text-white/60">Агрегаты по участникам с метриками в реальном времени.</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!liveMetrics || !liveMetrics.participants.length || !apiAvailable}
                    onClick={() => {
                      if (!liveMetrics || !apiAvailable) return;
                      const riskPct = (liveMetrics.avgRisk * 100).toFixed(0);
                      const text = `⚠ Средний риск сейчас ${riskPct}% (на основе текущих ML-метрик группы).`;
                      postSessionMessage(roomId, { type: "system", text, channel: "public" }).catch((e) =>
                        console.error("postSessionMessage(system)", e)
                      );
                    }}
                  >
                    Отправить в чат
                  </Button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-white/50">Средний риск</div>
                    <div className="text-2xl font-semibold text-amber-300">
                      {liveMetrics?.participants.length ? `${(liveMetrics.avgRisk * 100).toFixed(0)}%` : "—"}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-white/50">Средняя уверенность</div>
                    <div className="text-2xl font-semibold text-emerald-300">
                      {liveMetrics?.participants.length ? `${(liveMetrics.avgConfidence * 100).toFixed(0)}%` : "—"}
                    </div>
                  </div>
                </div>
              </Card>
            </Reveal>
            <Reveal>
              <Card className="p-6 md:p-7">
                <div className="text-sm text-white/60 mb-3">Провалы внимания</div>
                <div className="text-lg font-semibold text-zinc-100">Alert'ы по таймлайну</div>
                <p className="mt-2 text-sm text-white/60">Например: «23–30 мин — у 68% скука».</p>
                <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200/90">
                  Пока нет событий. После подключения ML появятся метки провалов внимания.
                </div>
              </Card>
            </Reveal>
          </div>

          {/* Чат сессии (Lecture/Exam) */}
          <div className="mt-6 grid lg:grid-cols-3 gap-4">
            <Reveal className="lg:col-span-2">
              <SessionChatPanel sessionId={roomId} role="teacher" type={session.type === "exam" ? "exam" : "lecture"} />
            </Reveal>
          </div>
        </>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <Reveal><Kpi title="Средняя вовлечённость" value="68%" hint="За сессию (пример)" /></Reveal>
        <Reveal><Kpi title="Провалы внимания" value="9" hint="Маркеры (пример)" /></Reveal>
        <Reveal><Kpi title="Качество данных" value={session.quality} hint="По камере" /></Reveal>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Reveal><ChartMock title="Вовлечённость по времени" /></Reveal>
        <Reveal><ChartMock title="Фокус (тепловая полоса)" /></Reveal>
        <Reveal><ChartMock title="Распределение эмоций" /></Reveal>
        <Reveal><ChartMock title="Стресс (опционально)" /></Reveal>
      </div>

      <Reveal>
        <Card className="p-6 md:p-7">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm text-white/60">Рекомендации</div>
              <div className="mt-2 text-lg font-semibold text-zinc-100">Авто-подсказки (пример)</div>
              <div className="mt-2 text-sm text-white/60">
                Позже: на основе ML-пайплайна и логов событий.
              </div>
            </div>
            <Button variant="outline">Обновить</Button>
          </div>

          <div className="mt-5 grid md:grid-cols-3 gap-3">
            <Insight title="23–30 мин: спад вовлечённости" text="Переключитесь на интерактив или Q&A." />
            <Insight title="Низкое качество камер" text="Попросите улучшить освещение и положение камеры." />
            <Insight title="Разброс по группе" text="Смешанная вовлечённость; можно разбить на подгруппы." />
          </div>
        </Card>
      </Reveal>
    </div>
  );
}

function Kpi({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <Card className="p-6 md:p-7">
      <div className="text-sm text-white/60">{title}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      <div className="mt-2 text-sm text-white/50">{hint}</div>
    </Card>
  );
}

function Insight({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-4 hover:bg-white/5 transition">
      <div className="font-semibold">{title}</div>
      <div className="mt-2 text-sm text-white/60">{text}</div>
    </div>
  );
}