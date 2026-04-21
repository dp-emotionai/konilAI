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


/**
 * Fetch summary JSON for a finished session.
 * Uses GET /sessions/{id}/analytics/summary when backend and auth are available.
 */
export async function mlGetSessionSummary(sessionId: MlSessionId): Promise<MlSessionSummary | null> {
  if (typeof window === "undefined") return null;
  const { getApiBaseUrl, getToken } = await import("./client");
  const base = getApiBaseUrl();
  const token = getToken();
  if (!base || !token) return null;
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/sessions/${sessionId}/analytics/summary`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as MlSessionSummary;
    return {
      sessionId: data.sessionId ?? sessionId,
      startedAt: data.startedAt ?? new Date().toISOString(),
      endedAt: data.endedAt ?? new Date().toISOString(),
      durationSeconds: data.durationSeconds ?? 0,
      metrics: data.metrics,
      dominantEmotion: data.dominantEmotion ?? "neutral",
      group: data.group,
      attentionDrops: Array.isArray(data.attentionDrops) ? data.attentionDrops : [],
    };
  } catch {
    return null;
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

/** Send at most 1 frame per second to avoid 429 from ML service. */
export const ML_INTERVAL = 1000;

/** Pause duration (ms) after 429 before retrying. */
export const ML_429_PAUSE_MS = 3000;

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
  // Variant 2: risk/state
  state?: "NORMAL" | "SUSPICIOUS" | "POTENTIAL THREAT";
  risk?: number;
  dominant_emotion?: string;
  confidence?: number;

  // Variant 1: per-frame educational metrics
  emotion?: string;
  engagement?: number;
  stress?: number;
  fatigue?: number;
  timestamp?: number;
  face_detected?: boolean;
  input_width?: number;
  input_height?: number;
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

    if (res.status === 429) {
      const e = new Error("RATE_LIMIT") as Error & { status?: number };
      e.status = 429;
      throw e;
    }

    if (!res.ok) return null;

    const data = await res.json().catch(() => null);
    if (!data || (data as any).error) return null;

    const d = data as Record<string, unknown>;

    // Accept both shapes (and future combined shape).
    const out: MlAnalyzeResponse = {
      state:
        d.state === "NORMAL" || d.state === "SUSPICIOUS" || d.state === "POTENTIAL THREAT"
          ? (d.state as MlAnalyzeResponse["state"])
          : undefined,
      risk: typeof d.risk === "number" ? d.risk : undefined,
      dominant_emotion: typeof d.dominant_emotion === "string" ? d.dominant_emotion : undefined,
      confidence: typeof d.confidence === "number" ? d.confidence : undefined,

      emotion: typeof d.emotion === "string" ? d.emotion : undefined,
      engagement: typeof d.engagement === "number" ? d.engagement : undefined,
      stress: typeof d.stress === "number" ? d.stress : undefined,
      fatigue: typeof d.fatigue === "number" ? d.fatigue : undefined,
      timestamp: typeof d.timestamp === "number" ? d.timestamp : undefined,
      face_detected: typeof d.face_detected === "boolean" ? d.face_detected : undefined,
      input_width: typeof d.input_width === "number" ? d.input_width : undefined,
      input_height: typeof d.input_height === "number" ? d.input_height : undefined,
    };

    // If it's completely empty, treat as invalid.
    const hasAny =
      out.state != null ||
      out.risk != null ||
      out.dominant_emotion != null ||
      out.confidence != null ||
      out.emotion != null ||
      out.engagement != null ||
      out.stress != null ||
      out.fatigue != null;
    if (!hasAny) return null;

    return out;
  } catch (err) {
    const e = err as Error & { status?: number };
    if (e?.status === 429 || e?.message === "RATE_LIMIT") throw err;
    return null;
  } finally {
    clearTimeout(timeout);
    opts.signal?.removeEventListener("abort", onAbort);
  }
}

/**
 * ML polling loop using setInterval.
 * Limits to 1 frame per second (ML_INTERVAL). On 429, pauses ML_429_PAUSE_MS before continuing.
 * captureFrame64x64Grayscale (or getFrame) must only be invoked inside the interval tick.
 */
export function startMlLoop(params: {
  getFrame: () => number[][] | null;
  onResult: (r: MlAnalyzeResponse) => void;
  onTickError?: () => void;
  shouldSend?: () => boolean;
}) {
  let stopped = false;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  const controller = new AbortController();
  let pausedUntil = 0;

  const tick = async () => {
    if (stopped) return;
    if (Date.now() < pausedUntil) return;

    try {
      if (params.shouldSend && !params.shouldSend()) return;

      const frame = params.getFrame();
      if (!frame) return;

      const result = await mlAnalyzeFrame(frame, {
        signal: controller.signal,
        timeoutMs: 1500,
      });

      if (result) params.onResult(result);
      else params.onTickError?.();
    } catch (err) {
      const e = err as Error & { status?: number };
      if (e?.status === 429 || e?.message === "RATE_LIMIT") {
        pausedUntil = Date.now() + ML_429_PAUSE_MS;
      }
      params.onTickError?.();
    }
  };

  intervalId = setInterval(tick, ML_INTERVAL);

  return {
    stop() {
      stopped = true;
      controller.abort();
      if (intervalId) clearInterval(intervalId);
    },
  };
}

/**
 * Capture one frame from a video element as 64×64 grayscale (0–255).
 * Optimized: reuses a single canvas to avoid allocations.
 */
let _canvas: HTMLCanvasElement | null = null;
let _ctx: CanvasRenderingContext2D | null = null;

export function captureSquareFrameGrayscale(
  video: HTMLVideoElement,
  size = 64
): number[][] | null {
  if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return null;

  if (!_canvas) {
    _canvas = document.createElement("canvas");
    _ctx = _canvas.getContext("2d", { willReadFrequently: true });
  }

  const ctx = _ctx;
  if (!ctx || !_canvas) return null;

  if (_canvas.width !== size) _canvas.width = size;
  if (_canvas.height !== size) _canvas.height = size;

  const sourceSize = Math.min(video.videoWidth, video.videoHeight);
  const sx = Math.max(0, (video.videoWidth - sourceSize) / 2);
  const sy = Math.max(0, (video.videoHeight - sourceSize) / 2);

  ctx.drawImage(video, sx, sy, sourceSize, sourceSize, 0, 0, size, size);

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

export function captureFrame64x64Grayscale(
  video: HTMLVideoElement
): number[][] | null {
  return captureSquareFrameGrayscale(video, 64);
}
