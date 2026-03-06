"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

type Props = {
  /** Сообщаем родителю, готова ли камера как gate для старта сессии */
  onReadyChange?: (ready: boolean) => void;
  /** Вызывается, когда пользователь хочет перейти в live */
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
  const fps = 2;

  const ready = permission === "granted" && running;

  useEffect(() => {
    onReadyChange?.(ready);
  }, [ready, onReadyChange]);

  async function start() {
    try {
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

      // UI mock signals — позже будет реальный ML
      window.setTimeout(() => setFace("detected"), 800);
      window.setTimeout(() => setLighting("good"), 1200);
    } catch {
      setPermission("denied");
      setRunning(false);
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
    <Card variant="elevated">
      <CardContent className="p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted">
              Camera readiness
            </div>
            <div className="mt-2 text-lg font-semibold text-fg">Pre-join check</div>
            <div className="mt-2 max-w-md text-sm text-muted">
              Мы не сохраняем raw-видео. Для аналитики позже используются только
              анонимные метаданные и агрегаты.
            </div>
          </div>

          <div className="flex gap-2">
            <Badge className="bg-surface-subtle text-xs">FPS {fps}</Badge>
            <Badge className="bg-surface-subtle text-xs">
              {permission === "granted"
                ? "Permission OK"
                : permission === "denied"
                ? "Denied"
                : "Not requested"}
            </Badge>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="overflow-hidden rounded-elas-lg bg-surface-subtle/80 ring-1 ring-[color:var(--border)]/20">
            <div className="flex items-center justify-between border-b border-[color:var(--border)]/30 px-4 py-3">
              <div className="text-sm text-muted">Preview</div>

              <div className="flex gap-2">
                <Badge
                  className={
                    face === "detected"
                      ? "bg-primary/10 text-[rgb(var(--primary))]"
                      : "bg-surface text-muted"
                  }
                >
                  Face: {face}
                </Badge>

                <Badge
                  className={
                    lighting === "good"
                      ? "bg-primary/10 text-[rgb(var(--primary))]"
                      : "bg-surface text-muted"
                  }
                >
                  Lighting: {lighting}
                </Badge>
              </div>
            </div>

            <div className="relative aspect-video bg-black">
              <video
                ref={videoRef}
                className="h-full w-full object-cover opacity-90"
                playsInline
                muted
              />

              {!running && (
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-sm text-white/70">Камера остановлена</div>
                </div>
              )}

              {running && (
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute left-4 top-4 rounded-2xl border border-white/15 bg-black/45 px-3 py-2 text-[11px] uppercase tracking-wider text-white/80">
                    Live preview
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <Signal
              label="Camera permission"
              value={
                permission === "granted"
                  ? "Granted"
                  : permission === "denied"
                  ? "Denied"
                  : "Not requested"
              }
            />
            <Signal
              label="Face detection"
              value={face === "detected" ? "Detected" : "Not detected"}
            />
            <Signal label="Lighting" value={lighting} />
            <Signal label="FPS target" value={`${fps} fps`} />

            <div className="flex flex-wrap gap-2 pt-2">
              {!running ? (
                <Button onClick={start}>Start camera</Button>
              ) : (
                <Button variant="outline" onClick={stop}>
                  Stop camera
                </Button>
              )}

              <Button onClick={() => onStart?.()} disabled={!ready}>
                Continue to live
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-elas-lg bg-surface-subtle/70 px-4 py-3 ring-1 ring-[color:var(--border)]/20">
      <div className="text-sm text-muted">{label}</div>
      <div className="text-sm font-medium text-fg">{value}</div>
    </div>
  );
}