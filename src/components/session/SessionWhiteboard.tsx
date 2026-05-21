"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, Loader2, RotateCcw } from "lucide-react";

import Button from "@/components/ui/Button";
import {
  getSessionWhiteboard,
  postWhiteboardOperation,
  type WhiteboardElement,
  type WhiteboardPoint,
} from "@/lib/api/whiteboard";
import { getStoredAuth, getToken } from "@/lib/api/client";
import { getWsBaseUrl } from "@/lib/env";
import { cn } from "@/lib/cn";

type Props = {
  sessionId: string;
  className?: string;
};

const COLOR = "#7448FF";
const STROKE_WIDTH = 3;

function drawElements(ctx: CanvasRenderingContext2D, elements: WhiteboardElement[], width: number, height: number) {
  ctx.clearRect(0, 0, width, height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  elements.forEach((element) => {
    const points = Array.isArray(element.points) ? element.points : [];
    if (points.length === 0) return;

    ctx.strokeStyle = element.color || COLOR;
    ctx.lineWidth = element.width || STROKE_WIDTH;
    ctx.beginPath();
    ctx.moveTo(points[0].x * width, points[0].y * height);

    points.slice(1).forEach((point) => {
      ctx.lineTo(point.x * width, point.y * height);
    });

    ctx.stroke();
  });
}

function makePoint(event: React.PointerEvent<HTMLCanvasElement>, canvas: HTMLCanvasElement): WhiteboardPoint {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
  };
}

export function SessionWhiteboard({ sessionId, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const elementsRef = useRef<WhiteboardElement[]>([]);
  const currentStrokeRef = useRef<WhiteboardElement | null>(null);
  const versionRef = useRef(1);
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const render = useCallback((nextElements = elementsRef.current) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    drawElements(ctx, nextElements, canvas.width, canvas.height);
  }, []);

  const syncElements = useCallback(
    (nextElements: WhiteboardElement[], nextVersion?: number) => {
      elementsRef.current = nextElements;
      if (typeof nextVersion === "number" && Number.isFinite(nextVersion)) {
        versionRef.current = nextVersion;
      }
      setElements(nextElements);
      requestAnimationFrame(() => render(nextElements));
    },
    [render]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const nextWidth = Math.max(320, Math.floor(rect.width * dpr));
      const nextHeight = Math.max(220, Math.floor(rect.height * dpr));

      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }

      render();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [render]);

  useEffect(() => {
    if (!sessionId) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    getSessionWhiteboard(sessionId, { signal: controller.signal })
      .then((snapshot) => {
        syncElements(snapshot?.elements ?? [], snapshot?.version ?? 1);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Не удалось загрузить доску");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [sessionId, syncElements]);

  useEffect(() => {
    const token = getToken();
    const wsBase = getWsBaseUrl();
    if (!token || !wsBase || !sessionId) return;

    const ws = new WebSocket(`${wsBase}/ws-chat`);

    ws.addEventListener("open", () => {
      ws.send(JSON.stringify({ type: "auth", token }));
    });

    ws.addEventListener("message", (event) => {
      let payload: any = null;
      try {
        payload = JSON.parse(String(event.data));
      } catch {
        return;
      }

      if (payload?.type === "auth-ok") {
        ws.send(JSON.stringify({ type: "subscribe", scope: "session", sessionId }));
        return;
      }

      if (payload?.sessionId !== sessionId) return;

      if (payload?.type === "whiteboard.snapshot") {
        const snapshot = payload.event;
        syncElements(
          Array.isArray(snapshot?.elements) ? snapshot.elements : [],
          typeof snapshot?.version === "number" ? snapshot.version : undefined
        );
      }

      if (payload?.type === "whiteboard.reset") {
        syncElements([], typeof payload.event?.version === "number" ? payload.event.version : undefined);
      }
    });

    return () => ws.close();
  }, [sessionId, syncElements]);

  const persist = useCallback(
    async (nextElements: WhiteboardElement[], kind: "draw_batch" | "reset" = "draw_batch") => {
      setSaving(true);
      setError(null);
      try {
        const result = await postWhiteboardOperation(sessionId, {
          kind,
          payload: kind === "reset" ? {} : { elements: nextElements },
        });
        if (result?.whiteboard) {
          syncElements(result.whiteboard.elements, result.whiteboard.version);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось сохранить доску");
      } finally {
        setSaving(false);
      }
    },
    [sessionId, syncElements]
  );

  const startStroke = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(event.pointerId);
    const auth = getStoredAuth();
    currentStrokeRef.current = {
      id: `stroke_${Date.now()}_${Math.random().toString(16).slice(2)}`,
      points: [makePoint(event, canvas)],
      color: COLOR,
      width: STROKE_WIDTH,
      createdAt: new Date().toISOString(),
      userId: auth?.id ?? null,
    };
  }, []);

  const continueStroke = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      const stroke = currentStrokeRef.current;
      if (!canvas || !stroke) return;

      stroke.points.push(makePoint(event, canvas));
      render([...elementsRef.current, stroke]);
    },
    [render]
  );

  const endStroke = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const stroke = currentStrokeRef.current;
      if (!stroke || stroke.points.length < 2) {
        currentStrokeRef.current = null;
        return;
      }

      const nextElements = [...elementsRef.current, stroke];
      currentStrokeRef.current = null;
      syncElements(nextElements, versionRef.current + 1);
      void persist(nextElements);

      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {}
    },
    [persist, syncElements]
  );

  return (
    <div className={cn("flex h-full min-h-[320px] flex-col overflow-hidden rounded-[24px] border border-slate-100 bg-white", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <div className="text-sm font-bold text-slate-900">Доска</div>
          <div className="text-xs font-medium text-slate-400">
            {loading ? "Загружаем..." : `${elements.length} штрихов`}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saving && <Loader2 size={16} className="animate-spin text-slate-400" />}
          <Button size="sm" variant="outline" onClick={() => void persist([], "reset")} disabled={saving}>
            <RotateCcw size={14} />
            Очистить
          </Button>
        </div>
      </div>

      <div className="relative flex-1 bg-slate-50">
        <canvas
          ref={canvasRef}
          className="h-full min-h-[280px] w-full touch-none cursor-crosshair bg-white"
          onPointerDown={startStroke}
          onPointerMove={continueStroke}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
        />

        {loading && (
          <div className="absolute inset-0 grid place-items-center bg-white/70 text-sm font-semibold text-slate-400">
            Загружаем доску...
          </div>
        )}

        {!loading && elements.length === 0 && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="flex items-center gap-2 rounded-full border border-slate-100 bg-white px-4 py-2 text-xs font-bold text-slate-400 shadow-sm">
              <Eraser size={14} />
              Можно рисовать
            </div>
          </div>
        )}
      </div>

      {error && <div className="border-t border-rose-100 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600">{error}</div>}
    </div>
  );
}

