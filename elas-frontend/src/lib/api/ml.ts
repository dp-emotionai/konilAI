// Integration with emotion-ml-service (backend/app.py).
// - POST /analyze — send 64×64 grayscale frame, get emotion, risk, state.
// Plus facade types for future session/stream API.

export type MlSessionId = string;

export type MlSessionState =
  | "idle"
  | "starting"
  | "live"
  | "stopping"
  | "stopped"
  | "error";

export type MlEmotionLabel =
  | "angry"
  | "disgust"
  | "fear"
  | "happy"
  | "sad"
  | "surprise"
  | "neutral";

export type MlTzState =
  | "stable"
  | "overloaded"
  | "underloaded"
  | "fatigued"
  | "uncertain";

export type MlGroupState =
  | "cohesive"
  | "fragmented"
  | "mixed"
  | "high_engagement"
  | "low_engagement";

export type MlPerFrameEvent = {
  /** Monotonic timestamp in seconds from session start */
  t: number;
  /** Optional wall-clock ISO timestamp from backend */
  ts?: string;
  /** Face / participant identifier if available */
  faceId?: string;
  /** Per-face engagement 0..1 */
  engagement?: number;
  /** Per-face stress 0..1 */
  stress?: number;
  /** Per-face fatigue 0..1 */
  fatigue?: number;
  /** Dominant emotion label from model */
  emotion?: MlEmotionLabel;
  /** Model confidence 0..1 (after smoothing/validation) */
  confidence?: number;
  /** Attention drop flag for this frame/window */
  attentionDrop?: boolean;
  /** Additional raw payload from backend if needed */
  meta?: Record<string, unknown>;
};

export type MlGroupSnapshot = {
  /** Aggregated engagement 0..1 for group */
  engagement: number;
  /** Aggregated stress 0..1 for group */
  stress: number;
  /** Aggregated fatigue 0..1 for group */
  fatigue: number;
  /** High-level technical state from FusionEngine */
  tzState: MlTzState;
  /** Group-level descriptor (heterogeneity, cohesion) */
  groupState: MlGroupState;
  /** Distribution by dominant emotion label */
  emotionDistribution: Partial<Record<MlEmotionLabel, number>>;
};

export type MlAttentionDropEvent = {
  t: number;
  duration: number;
  severity: "mild" | "moderate" | "severe";
  note?: string;
};

export type MlSessionSummary = {
  sessionId: MlSessionId;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  /** Aggregate metrics for demo dashboards */
  metrics: {
    avgEngagement: number;
    avgStress: number;
    avgFatigue: number;
    stability: number;
  };
  /** Most common emotion during the session */
  dominantEmotion: MlEmotionLabel;
  /** Group-level fusion snapshot for last segment */
  group: MlGroupSnapshot;
  /** Attention drops timeline for analytics pages */
  attentionDrops: MlAttentionDropEvent[];
};

export type MlSessionEventsResponse = {
  sessionId: MlSessionId;
  events: MlPerFrameEvent[];
};

export type MlStartSessionPayload = {
  sessionId: MlSessionId;
  /** Optional metadata to send to Python service (group id, role, etc.) */
  meta?: Record<string, unknown>;
};

export type MlStartSessionResponse = {
  sessionId: MlSessionId;
  state: MlSessionState;
};

export type MlStopSessionResponse = {
  sessionId: MlSessionId;
  state: MlSessionState;
};

/**
 * Start ML analytics for given session.
 * Later this will POST to Python backend: POST /sessions/start.
 */
export async function mlStartSession(
  _payload: MlStartSessionPayload
): Promise<MlStartSessionResponse> {
  // For now this is a pure frontend mock: integration will be wired later.
  return {
    sessionId: _payload.sessionId,
    state: "starting",
  };
}

/**
 * Stop ML analytics for given session.
 * Later this will POST /sessions/stop.
 */
export async function mlStopSession(
  sessionId: MlSessionId
): Promise<MlStopSessionResponse> {
  return {
    sessionId,
    state: "stopping",
  };
}

/** Fallback mock when backend is unavailable. */
function mockSessionSummary(sessionId: MlSessionId): MlSessionSummary {
  return {
    sessionId,
    startedAt: new Date().toISOString(),
    endedAt: new Date().toISOString(),
    durationSeconds: 45 * 60,
    metrics: {
      avgEngagement: 0.68,
      avgStress: 0.41,
      avgFatigue: 0.29,
      stability: 0.82,
    },
    dominantEmotion: "neutral",
    group: {
      engagement: 0.7,
      stress: 0.4,
      fatigue: 0.3,
      tzState: "stable",
      groupState: "high_engagement",
      emotionDistribution: {
        neutral: 0.5,
        happy: 0.3,
        sad: 0.1,
        fear: 0.1,
      },
    },
    attentionDrops: [
      { t: 420, duration: 20, severity: "moderate", note: "Mid-lecture drop (mock)" },
    ],
  };
}

/**
 * Fetch summary JSON for a finished session.
 * Uses GET /sessions/{id}/analytics/summary when backend and auth are available; otherwise returns mock.
 */
export async function mlGetSessionSummary(sessionId: MlSessionId): Promise<MlSessionSummary> {
  if (typeof window === "undefined") return mockSessionSummary(sessionId);
  const { getApiBaseUrl, getToken } = await import("./client");
  const base = getApiBaseUrl();
  const token = getToken();
  if (!base || !token) return mockSessionSummary(sessionId);
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/sessions/${sessionId}/analytics/summary`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return mockSessionSummary(sessionId);
    const data = (await res.json()) as MlSessionSummary;
    return {
      sessionId: data.sessionId ?? sessionId,
      startedAt: data.startedAt ?? new Date().toISOString(),
      endedAt: data.endedAt ?? new Date().toISOString(),
      durationSeconds: data.durationSeconds ?? 0,
      metrics: data.metrics ?? mockSessionSummary(sessionId).metrics,
      dominantEmotion: data.dominantEmotion ?? "neutral",
      group: data.group ?? mockSessionSummary(sessionId).group,
      attentionDrops: Array.isArray(data.attentionDrops) ? data.attentionDrops : [],
    };
  } catch {
    return mockSessionSummary(sessionId);
  }
}

/**
 * Fetch raw temporal events for log playback / advanced analytics.
 * Later: GET /sessions/{id}/events.
 */
export async function mlGetSessionEvents(
  _sessionId: MlSessionId
): Promise<MlSessionEventsResponse> {
  return {
    sessionId: _sessionId,
    events: [],
  };
}

/**
 * Connect to realtime WebSocket stream with per-frame + group snapshots.
 * Later this will open WS /sessions/{id}/stream.
 */
export type MlStreamCallbacks = {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (err: unknown) => void;
  onFrame?: (event: MlPerFrameEvent) => void;
  onGroupSnapshot?: (snapshot: MlGroupSnapshot) => void;
};

export type MlStreamConnection = {
  close: () => void;
};

export function mlConnectStream(
  _sessionId: MlSessionId,
  _callbacks: MlStreamCallbacks
): MlStreamConnection {
  // Placeholder: later will hold WebSocket instance.
  return {
    close() {
      // no-op in mock
    },
  };
}

// -------------------------------
// emotion-ml-service backend/app.py contract
// -------------------------------

/**
 * NOTE:
 * In Next.js, NEXT_PUBLIC_* variables are inlined into client bundle.
 * So we can safely read `process.env.NEXT_PUBLIC_ML_API_URL` here.
 */
const ML_API_BASE = process.env.NEXT_PUBLIC_ML_API_URL || "http://localhost:8000";

export function getMlApiBaseUrl(): string {
  return (ML_API_BASE || "").replace(/\/$/, "");
}

export type MlAnalyzeResponse = {
  state: "NORMAL" | "SUSPICIOUS" | "POTENTIAL THREAT";
  risk: number;
  emotion: string;
  confidence: number;
  dominant_emotion: string;
};

type AnalyzeOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

/**
 * Send a 64×64 grayscale frame to emotion-ml-service POST /analyze.
 * - supports AbortSignal
 * - has internal timeout to avoid hung requests
 * Returns null on network error or invalid response.
 */
export async function mlAnalyzeFrame(
  image: number[][],
  opts: AnalyzeOptions = {}
): Promise<MlAnalyzeResponse | null> {
  const base = getMlApiBaseUrl();
  if (!base) return null;

  const timeoutMs = opts.timeoutMs ?? 1500;

  // internal controller to enforce timeout + allow chaining abort
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const onAbort = () => controller.abort();

  try {
    if (opts.signal) {
      if (opts.signal.aborted) return null;
      opts.signal.addEventListener("abort", onAbort, { once: true });
    }

    const res = await fetch(`${base}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image }),
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data = await res.json().catch(() => null);
    if (!data || (data as any).error) return null;

    return data as MlAnalyzeResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    opts.signal?.removeEventListener("abort", onAbort);
  }
}

/**
 * Safe ML polling loop (no overlap).
 * Waits for each request to finish before scheduling the next tick.
 */
export function startMlLoop(params: {
  fps?: number; // default ~1.5 fps
  getFrame: () => number[][] | null;
  onResult: (r: MlAnalyzeResponse) => void;
  onTickError?: () => void;
  shouldSend?: () => boolean;
}) {
  const fps = params.fps ?? 1.5;
  const intervalMs = Math.max(250, Math.round(1000 / fps));

  let stopped = false;
  let timer: number | null = null;
  const controller = new AbortController();

  const tick = async () => {
    if (stopped) return;

    try {
      if (params.shouldSend && !params.shouldSend()) {
        timer = window.setTimeout(tick, intervalMs);
        return;
      }

      const frame = params.getFrame();
      if (!frame) {
        timer = window.setTimeout(tick, intervalMs);
        return;
      }

      const result = await mlAnalyzeFrame(frame, {
        signal: controller.signal,
        timeoutMs: 1500,
      });

      if (result) params.onResult(result);
      else params.onTickError?.();
    } catch {
      params.onTickError?.();
    } finally {
      if (!stopped) timer = window.setTimeout(tick, intervalMs);
    }
  };

  timer = window.setTimeout(tick, intervalMs);

  return {
    stop() {
      stopped = true;
      controller.abort();
      if (timer) window.clearTimeout(timer);
    },
  };
}

/**
 * Capture one frame from a video element as 64×64 grayscale (0–255).
 * Optimized: reuses a single canvas to avoid allocations.
 */
let _canvas: HTMLCanvasElement | null = null;
let _ctx: CanvasRenderingContext2D | null = null;

export function captureFrame64x64Grayscale(
  video: HTMLVideoElement
): number[][] | null {
  if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return null;

  const size = 64;

  if (!_canvas) {
    _canvas = document.createElement("canvas");
    _canvas.width = size;
    _canvas.height = size;
    _ctx = _canvas.getContext("2d");
  }

  const ctx = _ctx;
  if (!ctx || !_canvas) return null;

  ctx.drawImage(video, 0, 0, size, size);

  const imageData = ctx.getImageData(0, 0, size, size);
  const data = imageData.data;

  const out: number[][] = [];
  for (let y = 0; y < size; y++) {
    const row: number[] = [];
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      row.push(gray);
    }
    out.push(row);
  }
  return out;
}