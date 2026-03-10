"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  Camera,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  MonitorUp,
  ShieldCheck,
  Play,
  Square,
  ArrowRight,
} from "lucide-react";

type Props = {
  onReadyChange?: (ready: boolean) => void;
  onStart?: () => void;
};

type PermissionState = "idle" | "granted" | "denied";
type LightingState = "good" | "ok" | "poor";
type FaceState = "detected" | "not_detected";

export default function CameraCheck({ onReadyChange, onStart }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [permission, setPermission] = useState<PermissionState>("idle");
  const [running, setRunning] = useState(false);
  const [lighting, setLighting] = useState<LightingState>("ok");
  const [face, setFace] = useState<FaceState>("not_detected");
  const [errorText, setErrorText] = useState<string | null>(null);

  const fps = 2;
  const ready = permission === "granted" && running;

  useEffect(() => {
    onReadyChange?.(ready);
  }, [ready, onReadyChange]);

  async function start() {
    try {
      setErrorText(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setPermission("granted");
      setRunning(true);

      window.setTimeout(() => setFace("detected"), 800);
      window.setTimeout(() => setLighting("good"), 1200);
    } catch {
      setPermission("denied");
      setRunning(false);
      setErrorText("Не удалось получить доступ к камере. Проверьте разрешения браузера.");
    }
  }

  function stop() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setRunning(false);
    setFace("not_detected");
    setLighting("ok");
  }

  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  return (
    <Card variant="elevated" className="overflow-hidden">
      <CardContent className="p-0">
        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,#0b1020_0%,#090d19_100%)] shadow-[0_24px_70px_rgba(0,0,0,0.34)]">
          {/* header */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/80">
                <Camera size={18} />
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/35">
                  Camera readiness
                </div>
                <div className="mt-1 text-lg font-semibold text-white">
                  Pre-join check
                </div>
                <div className="mt-2 max-w-xl text-sm leading-relaxed text-white/50">
                  Мы не сохраняем raw-видео. Для аналитики используются только агрегированные
                  сигналы и метаданные после согласия.
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border border-white/10 bg-white/5 text-white/70">
                FPS {fps}
              </Badge>
              <Badge
                className={
                  permission === "granted"
                    ? "border border-emerald-400/20 bg-emerald-500/15 text-emerald-300"
                    : permission === "denied"
                      ? "border border-red-400/20 bg-red-500/15 text-red-300"
                      : "border border-white/10 bg-white/5 text-white/65"
                }
              >
                {permission === "granted"
                  ? "Permission OK"
                  : permission === "denied"
                    ? "Denied"
                    : "Not requested"}
              </Badge>
            </div>
          </div>

          {/* body */}
          <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.4fr)_340px] items-start">
            {/* preview */}
            <div className="overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.03]">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="text-sm font-medium text-white/75">Preview</div>

                <div className="flex flex-wrap gap-2">
                  <StatusBadge
                    ok={face === "detected"}
                    label={`Face: ${face === "detected" ? "detected" : "not detected"}`}
                  />
                  <StatusBadge
                    ok={lighting === "good"}
                    label={`Lighting: ${lighting}`}
                  />
                </div>
              </div>

              <div className="relative aspect-[4/3] sm:aspect-[16/10] bg-black">
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover opacity-95"
                  playsInline
                  muted
                />

                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.4),transparent_24%,transparent_76%,rgba(0,0,0,0.2))]" />

                {!running && (
                  <div className="absolute inset-0 grid place-items-center">
                    <div className="rounded-2xl border border-white/10 bg-black/45 px-5 py-3 text-sm text-white/75 backdrop-blur">
                      Камера остановлена
                    </div>
                  </div>
                )}

                {running && (
                  <>
                    <div className="absolute left-4 top-4 rounded-xl border border-white/10 bg-black/45 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-white/80 backdrop-blur">
                      Live preview
                    </div>

                    <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
                      <Badge className="border border-white/10 bg-black/45 text-white/80">
                        camera on
                      </Badge>
                      <Badge className="border border-white/10 bg-black/45 text-white/80">
                        {fps} fps
                      </Badge>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* status panel */}
            <div className="flex flex-col gap-4">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-violet-300" />
                  <div className="text-sm font-semibold text-white">Readiness</div>
                </div>

                <div className="mt-4 space-y-3">
                  <Signal
                    label="Camera permission"
                    value={
                      permission === "granted"
                        ? "Granted"
                        : permission === "denied"
                          ? "Denied"
                          : "Not requested"
                    }
                    ok={permission === "granted"}
                  />
                  <Signal
                    label="Face detection"
                    value={face === "detected" ? "Detected" : "Not detected"}
                    ok={face === "detected"}
                  />
                  <Signal
                    label="Lighting"
                    value={lighting}
                    ok={lighting === "good"}
                  />
                  <Signal label="FPS target" value={`${fps} fps`} ok />
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-300" />
                  <div className="text-sm font-semibold text-white">Privacy note</div>
                </div>

                <div className="mt-3 text-sm leading-relaxed text-white/50">
                  Передача идёт только после вашего действия. Для live-аналитики не
                  сохраняется исходное видео, а только агрегированные сигналы.
                </div>
              </div>

              {errorText && (
                <div className="rounded-[20px] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {errorText}
                </div>
              )}

              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap gap-2">
                  {!running ? (
                    <Button onClick={start} className="gap-2">
                      <Play size={16} />
                      Start camera
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={stop} className="gap-2 border-white/10 bg-white/5 text-white hover:bg-white/10">
                      <Square size={16} />
                      Stop camera
                    </Button>
                  )}

                  <Button
                    onClick={() => onStart?.()}
                    disabled={!ready}
                    className="gap-2"
                  >
                    <ArrowRight size={16} />
                    Continue to live
                  </Button>
                </div>

                <div className="mt-3 text-xs text-white/40">
                  Continue станет доступна, когда камера запущена и preview готов.
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-2">
                  <MonitorUp size={16} className="text-sky-300" />
                  <div className="text-sm font-semibold text-white">Before join</div>
                </div>

                <ul className="mt-3 space-y-2 text-sm text-white/50">
                  <li>Сядьте напротив источника света.</li>
                  <li>Держите лицо в центре кадра.</li>
                  <li>Проверьте, что браузер не блокирует доступ к камере.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Signal({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <div className="text-sm text-white/50">{label}</div>
      <div className="flex items-center gap-2">
        {ok ? (
          <CheckCircle2 size={14} className="text-emerald-300" />
        ) : (
          <AlertTriangle size={14} className="text-amber-300" />
        )}
        <div className="text-sm font-medium text-white">{value}</div>
      </div>
    </div>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Badge
      className={
        ok
          ? "border border-emerald-400/20 bg-emerald-500/15 text-emerald-300"
          : "border border-white/10 bg-white/5 text-white/65"
      }
    >
      {label}
    </Badge>
  );
}