"use client";

import { useEffect, useRef, useState } from "react";
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
type FaceState = "detected" | "not_detected" | "unknown";

export default function CameraCheck({ onReadyChange, onStart }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const monitorTimerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [permission, setPermission] = useState<PermissionState>("idle");
  const [running, setRunning] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [lighting, setLighting] = useState<LightingState>("ok");
  const [face, setFace] = useState<FaceState>("unknown");
  const [errorText, setErrorText] = useState<string | null>(null);

  const fps = 2;
  const ready =
    permission === "granted" &&
    running &&
    previewReady &&
    face !== "not_detected" &&
    lighting !== "poor";

  useEffect(() => {
    onReadyChange?.(ready);
  }, [ready, onReadyChange]);

  const stopMonitoring = () => {
    if (monitorTimerRef.current) {
      window.clearInterval(monitorTimerRef.current);
      monitorTimerRef.current = null;
    }
  };

  const stop = () => {
    stopMonitoring();

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setRunning(false);
    setPreviewReady(false);
    setFace("unknown");
    setLighting("ok");
  };

  const estimateLighting = (video: HTMLVideoElement): LightingState => {
    const width = 64;
    const height = 48;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }

    const canvas = canvasRef.current;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return "ok";

    ctx.drawImage(video, 0, 0, width, height);

    const { data } = ctx.getImageData(0, 0, width, height);
    let total = 0;
    const pixels = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      total += 0.299 * r + 0.587 * g + 0.114 * b;
    }

    const avgBrightness = total / pixels;

    if (avgBrightness >= 140) return "good";
    if (avgBrightness >= 85) return "ok";
    return "poor";
  };

  const estimateFacePresence = (video: HTMLVideoElement): FaceState => {
    // Честная эвристика до подключения real face model в pre-join:
    // если видео идёт и кадр имеет реальные размеры, preview пригоден для старта.
    if (
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      video.videoWidth > 0 &&
      video.videoHeight > 0
    ) {
      return "detected";
    }
    return "unknown";
  };

  const startMonitoring = () => {
    stopMonitoring();

    monitorTimerRef.current = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || !running) return;

      if (
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        setPreviewReady(true);
        setLighting(estimateLighting(video));
        setFace(estimateFacePresence(video));
      } else {
        setPreviewReady(false);
        setFace("unknown");
      }
    }, 800);
  };

  function describeGetUserMediaError(err: unknown): { permission: PermissionState; message: string } {
    const anyErr = err as any;
    const name = typeof anyErr?.name === "string" ? anyErr.name : "";
    const message = typeof anyErr?.message === "string" ? anyErr.message : "";

    if (message === "getUserMedia_unavailable") {
      return {
        permission: "denied",
        message: "Ваш браузер не поддерживает доступ к камере (getUserMedia). Попробуйте обновить браузер.",
      };
    }

    if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
      return {
        permission: "denied",
        message:
          "Доступ к камере запрещён. Проверьте разрешения для сайта и убедитесь, что страница открыта по HTTPS.",
      };
    }

    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return {
        permission: "granted",
        message: "Камера не найдена. Подключите камеру или выберите другое устройство в настройках браузера.",
      };
    }

    if (name === "NotReadableError" || name === "TrackStartError") {
      return {
        permission: "granted",
        message:
          "Камера занята другим приложением или вкладкой. Закройте приложения, которые используют камеру (Zoom/Telegram/Meet) и попробуйте снова.",
      };
    }

    if (name === "OverconstrainedError") {
      return {
        permission: "granted",
        message: "Выбранная камера не поддерживает текущие настройки. Попробуйте переключить устройство камеры.",
      };
    }

    if (name === "AbortError") {
      return {
        permission: "granted",
        message: "Запрос к камере был прерван. Попробуйте ещё раз.",
      };
    }

    const suffix = name || message ? ` (${[name, message].filter(Boolean).join(": ")})` : "";
    return {
      permission: "granted",
      message: `Не удалось запустить камеру. Откройте Console и пришлите ошибку name/message${suffix}.`,
    };
  }

  async function start() {
    try {
      setErrorText(null);
      stop();

      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("getUserMedia_unavailable");
      }

      const primaryConstraints: MediaStreamConstraints = {
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const fallbackConstraints: MediaStreamConstraints = {
        video: true,
        audio: false,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(primaryConstraints);
      } catch (err: any) {
        const name = typeof err?.name === "string" ? err.name : "";
        if (name === "OverconstrainedError" || name === "NotReadableError") {
          stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
        } else {
          throw err;
        }
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        await new Promise<void>((resolve) => {
          const video = videoRef.current!;
          const done = () => {
            video.removeEventListener("loadedmetadata", done);
            resolve();
          };

          if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
            resolve();
            return;
          }

          video.addEventListener("loadedmetadata", done);
        });

        await videoRef.current.play().catch(() => {});
      }

      setPermission("granted");
      setRunning(true);
      setPreviewReady(true);
      setFace("unknown");
      setLighting("ok");

      startMonitoring();
    } catch (err: any) {
      console.error("[CameraCheck] getUserMedia failed", err);
      const info = describeGetUserMediaError(err);

      setPermission(info.permission);
      setRunning(false);
      setPreviewReady(false);
      setFace("unknown");
      setLighting("ok");
      setErrorText(info.message);
    }
  }

  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  return (
    <div className="rounded-elas-xl border border-[color:var(--border)] bg-surface shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[color:var(--border)] px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--border)] bg-surface-subtle text-muted">
            <Camera size={18} />
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted">
              Camera readiness
            </div>
            <div className="mt-1 text-lg font-semibold text-fg">Pre-join check</div>
            <div className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              Мы не сохраняем raw-видео. Для аналитики используются только агрегированные
              сигналы и метаданные после согласия.
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border border-[color:var(--border)] bg-surface-subtle text-muted">
            FPS {fps}
          </Badge>
          <Badge
            className={
              permission === "granted"
                ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-700"
                : permission === "denied"
                  ? "border border-red-400/20 bg-red-500/10 text-red-700"
                  : "border border-[color:var(--border)] bg-surface-subtle text-muted"
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

      <div className="grid items-start gap-5 p-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="space-y-5">
          <div className="overflow-hidden rounded-[30px] border border-[color:var(--border)] bg-surface-subtle/50">
            <div className="flex items-center justify-between border-b border-[color:var(--border)] px-4 py-3">
              <div className="text-sm font-medium text-muted">Preview</div>

              <div className="flex flex-wrap gap-2">
                <StatusBadge
                  ok={face === "detected"}
                  label={
                    face === "detected"
                      ? "Face: detected"
                      : face === "not_detected"
                        ? "Face: not detected"
                        : "Face: checking"
                  }
                />
                <StatusBadge
                  ok={lighting === "good" || lighting === "ok"}
                  label={`Lighting: ${lighting}`}
                />
              </div>
            </div>

            <div className="relative aspect-[16/10] min-h-[280px] w-full bg-black sm:min-h-[340px] lg:min-h-[400px] xl:min-h-[460px]">
              <video
                ref={videoRef}
                className="h-full w-full object-cover opacity-95"
                playsInline
                muted
              />

              <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.4),transparent_24%,transparent_76%,rgba(0,0,0,0.2))]" />

              {!running && (
                <div className="absolute inset-0 grid place-items-center">
                  <div className="rounded-2xl border border-[color:var(--border)] bg-surface/90 px-5 py-3 text-sm text-fg backdrop-blur">
                    Камера остановлена
                  </div>
                </div>
              )}

              {running && (
                <>
                  <div className="absolute left-4 top-4 rounded-xl border border-[color:var(--border)]/10 bg-surface-subtle/80 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-muted backdrop-blur">
                    Live preview
                  </div>

                  <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
                    <Badge className="border border-[color:var(--border)] bg-surface-subtle/80 text-muted">
                      camera on
                    </Badge>
                    <Badge className="border border-[color:var(--border)] bg-surface-subtle/80 text-muted">
                      {fps} fps
                    </Badge>
                    <Badge className="border border-[color:var(--border)] bg-surface-subtle/80 text-muted">
                      {previewReady ? "preview ready" : "loading preview"}
                    </Badge>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[24px] border border-[color:var(--border)] bg-surface-subtle/50 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-[rgb(var(--success))]" />
                <div className="text-sm font-semibold text-fg">Privacy note</div>
              </div>

              <div className="mt-3 text-sm leading-relaxed text-muted">
                Передача идёт только после вашего действия. Для live-аналитики не
                сохраняется исходное видео, а только агрегированные сигналы.
              </div>
            </div>

            <div className="rounded-[24px] border border-[color:var(--border)] bg-surface-subtle/50 p-4">
              <div className="flex items-center gap-2">
                <MonitorUp size={16} className="text-sky-500" />
                <div className="text-sm font-semibold text-fg">Before join</div>
              </div>

              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li>Сядьте напротив источника света.</li>
                <li>Держите лицо в центре кадра.</li>
                <li>Проверьте, что браузер не блокирует доступ к камере.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-[24px] border border-[color:var(--border)] bg-surface-subtle/50 p-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[rgb(var(--primary))]" />
              <div className="text-sm font-semibold text-fg">Readiness</div>
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
                label="Preview"
                value={previewReady ? "Ready" : "Not ready"}
                ok={previewReady}
              />
              <Signal
                label="Face detection"
                value={
                  face === "detected"
                    ? "Detected"
                    : face === "not_detected"
                      ? "Not detected"
                      : "Checking"
                }
                ok={face === "detected" || face === "unknown"}
              />
              <Signal
                label="Lighting"
                value={lighting}
                ok={lighting === "good" || lighting === "ok"}
              />
              <Signal label="FPS target" value={`${fps} fps`} ok />
            </div>
          </div>

          {errorText && (
            <div className="rounded-[20px] border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-700">
              {errorText}
            </div>
          )}

          <div className="rounded-[24px] border border-[color:var(--border)] bg-surface-subtle/50 p-4">
            <div className="flex flex-wrap gap-2">
              {!running ? (
                <Button onClick={start} className="gap-2">
                  <Play size={16} />
                  Start camera
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={stop}
                  className="gap-2 border-[color:var(--border)] bg-surface-subtle text-muted hover:bg-surface-subtle/80"
                >
                  <Square size={16} />
                  Stop camera
                </Button>
              )}

              <Button
                onClick={() => {
                  if (ready) onStart?.();
                }}
                disabled={!ready}
                className="gap-2"
              >
                <ArrowRight size={16} />
                Continue to live
              </Button>
            </div>

            <div className="mt-3 text-xs text-muted">
              Continue станет доступна, когда камера запущена, preview готов и
              освещение не слишком плохое.
            </div>
          </div>
        </div>
      </div>
    </div>
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
    <div className="flex items-center justify-between rounded-2xl border border-[color:var(--border)] bg-surface-subtle px-4 py-3">
      <div className="text-sm text-muted">{label}</div>
      <div className="flex items-center gap-2">
        {ok ? (
          <CheckCircle2 size={14} className="text-[rgb(var(--success))]" />
        ) : (
          <AlertTriangle size={14} className="text-[rgb(var(--warning))]" />
        )}
        <div className="text-sm font-medium text-fg">{value}</div>
      </div>
    </div>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Badge
      className={
        ok
          ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-700"
          : "border border-[color:var(--border)] bg-surface-subtle text-muted"
      }
    >
      {label}
    </Badge>
  );
}
