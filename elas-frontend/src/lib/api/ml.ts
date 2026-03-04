// Integration with emotion-ml-service (backend/app.py).
// - POST /analyze — send 64×64 grayscale frame, get emotion, risk, state.
// Plus facade types for future session/stream API.

export type MlSessionId = string;

export type MlSessionState = "idle" | "starting" | "live" | "stopping" | "stopped" | "error";

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
export async function mlStopSession(sessionId: MlSessionId): Promise<MlStopSessionResponse> {
  return {
    sessionId,
    state: "stopping",
  };
}

/**
 * Fetch summary JSON for a finished session.
 * Later: GET /sessions/{id}/summary.
 */
export async function mlGetSessionSummary(_sessionId: MlSessionId): Promise<MlSessionSummary> {
  // Simple placeholder for wiring UI; numbers are arbitrary mock.
  return {
    sessionId: _sessionId,
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
 *
 * The callback-based shape keeps UI pages decoupled from concrete WS client.
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

// --- emotion-ml-service backend/app.py contract ---

const ML_API_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_ML_API_URL) ||
  "http://localhost:8000";

export function getMlApiBaseUrl(): string {
  if (typeof window === "undefined") return "";
  return ML_API_BASE.replace(/\/$/, "");
}

export type MlAnalyzeResponse = {
  state: "NORMAL" | "SUSPICIOUS" | "POTENTIAL THREAT";
  risk: number;
  emotion: string;
  confidence: number;
  dominant_emotion: string;
};

/**
 * Send a 64×64 grayscale frame to emotion-ml-service POST /analyze.
 * Returns null on network error or invalid response.
 */
export async function mlAnalyzeFrame(image: number[][]): Promise<MlAnalyzeResponse | null> {
  const base = getMlApiBaseUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image }),
    });
    const data = await res.json();
    if (!res.ok || data.error) return null;
    return data as MlAnalyzeResponse;
  } catch {
    return null;
  }
}

/**
 * Capture one frame from a video element as 64×64 grayscale (0–255).
 * Returns null if video not ready or dimensions invalid.
 */
export function captureFrame64x64Grayscale(video: HTMLVideoElement): number[][] | null {
  if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) return null;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
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
      row.push(Math.min(255, Math.max(0, gray)));
    }
    out.push(row);
  }
  return out;
}

