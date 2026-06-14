// Integration with emotion-ml-service:
// - GET  /health
// - POST /analyze

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
  t: number;
  ts?: string;
  faceId?: string;
  engagement?: number;
  stress?: number;
  fatigue?: number;
  emotion?: MlEmotionLabel;
  confidence?: number;
  attentionDrop?: boolean;
  meta?: Record<string, unknown>;
};

export type MlGroupSnapshot = {
  engagement: number;
  stress: number;
  fatigue: number;
  tzState: MlTzState;
  groupState: MlGroupState;
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
  metrics: {
    avgEngagement: number;
    avgStress: number;
    avgFatigue: number;
    stability: number;
  };
  dominantEmotion: MlEmotionLabel;
  group: MlGroupSnapshot;
  attentionDrops: MlAttentionDropEvent[];
};

export type MlSessionEventsResponse = {
  sessionId: MlSessionId;
  events: MlPerFrameEvent[];
};

export type MlStartSessionPayload = {
  sessionId: MlSessionId;
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

export async function mlStartSession(
    payload: MlStartSessionPayload
): Promise<MlStartSessionResponse> {
  return {
    sessionId: payload.sessionId,
    state: "starting",
  };
}

export async function mlStopSession(
    sessionId: MlSessionId
): Promise<MlStopSessionResponse> {
  return {
    sessionId,
    state: "stopping",
  };
}

export async function mlGetSessionSummary(
    sessionId: MlSessionId
): Promise<MlSessionSummary | null> {
  if (typeof window === "undefined") return null;

  const { getApiBaseUrl, getToken } = await import("./client");
  const base = getApiBaseUrl();
  const token = getToken();

  if (!base || !token) return null;

  try {
    const response = await fetch(
        `${base.replace(/\/$/, "")}/sessions/${sessionId}/analytics/summary`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
    );

    if (!response.ok) return null;

    const data = (await response.json()) as MlSessionSummary;

    return {
      sessionId: data.sessionId ?? sessionId,
      startedAt: data.startedAt ?? new Date().toISOString(),
      endedAt: data.endedAt ?? new Date().toISOString(),
      durationSeconds: data.durationSeconds ?? 0,
      metrics: data.metrics,
      dominantEmotion: data.dominantEmotion ?? "neutral",
      group: data.group,
      attentionDrops: Array.isArray(data.attentionDrops)
          ? data.attentionDrops
          : [],
    };
  } catch {
    return null;
  }
}

export async function mlGetSessionEvents(
    sessionId: MlSessionId
): Promise<MlSessionEventsResponse> {
  return {
    sessionId,
    events: [],
  };
}

export type MlStreamCallbacks = {
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: unknown) => void;
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
  return {
    close() {
      // Reserved for a future realtime ML channel.
    },
  };
}

/**
 * Backend accepts approximately 1–2 FPS per browser.
 * 1000 ms leaves enough margin and avoids constant HTTP 429 responses.
 */
export const ML_INTERVAL = 1000;

/**
 * Wait longer after a 429 response instead of repeatedly overloading the service.
 */
export const ML_429_PAUSE_MS = 5000;

const configuredMlUrl =
    process.env.NEXT_PUBLIC_ML_API_URL?.trim() ?? "";

/**
 * Never fall back to the visitor's localhost in production.
 *
 * In local development only, localhost:8000 remains convenient.
 */
const ML_API_BASE =
    configuredMlUrl ||
    (process.env.NODE_ENV === "development"
        ? "http://localhost:8000"
        : "");

export function getMlApiBaseUrl(): string {
  return ML_API_BASE.replace(/\/+$/, "");
}

export function isMlApiConfigured(): boolean {
  return Boolean(getMlApiBaseUrl());
}

export type MlAnalyzeResponse = {
  state?:
      | "NORMAL"
      | "SUSPICIOUS"
      | "POTENTIAL THREAT"
      | "NO_FACE";
  risk?: number;
  dominant_emotion?: string;
  confidence?: number;
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
  /**
   * Cloud-hosted TensorFlow services can be slow during a cold start.
   */
  timeoutMs?: number;
};

type MlRequestError = Error & {
  status?: number;
  retryAfterMs?: number;
};

let browserClientId: string | null = null;

function getMlClientId(): string {
  if (browserClientId) return browserClientId;

  if (typeof window === "undefined") {
    browserClientId = "server";
    return browserClientId;
  }

  const storageKey = "konilai_ml_client_id";

  try {
    const stored = sessionStorage.getItem(storageKey);
    if (stored) {
      browserClientId = stored;
      return stored;
    }

    const generated =
        typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `ml-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    sessionStorage.setItem(storageKey, generated);
    browserClientId = generated;
    return generated;
  } catch {
    browserClientId = `ml-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
    return browserClientId;
  }
}

function createRequestError(
    message: string,
    status?: number,
    retryAfterMs?: number
): MlRequestError {
  const error = new Error(message) as MlRequestError;
  error.status = status;
  error.retryAfterMs = retryAfterMs;
  return error;
}

function parseRetryAfterMs(response: Response): number | undefined {
  const raw = response.headers.get("retry-after");
  if (!raw) return undefined;

  const seconds = Number(raw);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  const date = Date.parse(raw);
  if (Number.isFinite(date)) {
    return Math.max(0, date - Date.now());
  }

  return undefined;
}

function isValidAnalyzeResponse(
    value: unknown
): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}

export async function checkMlHealth(
    opts: AnalyzeOptions = {}
): Promise<boolean> {
  const base = getMlApiBaseUrl();
  if (!base) return false;

  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const timeout = window.setTimeout(
      () => controller.abort(),
      timeoutMs
  );

  const onAbort = () => controller.abort();

  try {
    if (opts.signal) {
      if (opts.signal.aborted) return false;
      opts.signal.addEventListener("abort", onAbort, {
        once: true,
      });
    }

    const response = await fetch(`${base}/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
    opts.signal?.removeEventListener("abort", onAbort);
  }
}

export async function mlAnalyzeFrame(
    image: number[][],
    opts: AnalyzeOptions = {}
): Promise<MlAnalyzeResponse | null> {
  const base = getMlApiBaseUrl();

  if (!base) {
    return null;
  }

  /**
   * 1.5 seconds was too short for TensorFlow cold starts on Render.
   */
  const timeoutMs = opts.timeoutMs ?? 12_000;

  const controller = new AbortController();
  const timeout = window.setTimeout(
      () => controller.abort(),
      timeoutMs
  );

  const onAbort = () => controller.abort();

  try {
    if (opts.signal) {
      if (opts.signal.aborted) return null;

      opts.signal.addEventListener("abort", onAbort, {
        once: true,
      });
    }

    const clientId = getMlClientId();

    const response = await fetch(`${base}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ML-Client-Id": clientId,
      },
      body: JSON.stringify({
        image,
        client_id: clientId,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (response.status === 429) {
      throw createRequestError(
          "RATE_LIMIT",
          429,
          parseRetryAfterMs(response)
      );
    }

    if (!response.ok) {
      throw createRequestError(
          `ML_HTTP_${response.status}`,
          response.status
      );
    }

    const data: unknown = await response.json().catch(() => null);

    if (!isValidAnalyzeResponse(data)) {
      return null;
    }

    const state =
        data.state === "NORMAL" ||
        data.state === "SUSPICIOUS" ||
        data.state === "POTENTIAL THREAT" ||
        data.state === "NO_FACE"
            ? data.state
            : undefined;

    const output: MlAnalyzeResponse = {
      state,
      risk:
          typeof data.risk === "number"
              ? data.risk
              : undefined,
      dominant_emotion:
          typeof data.dominant_emotion === "string"
              ? data.dominant_emotion
              : undefined,
      confidence:
          typeof data.confidence === "number"
              ? data.confidence
              : undefined,
      emotion:
          typeof data.emotion === "string"
              ? data.emotion
              : undefined,
      engagement:
          typeof data.engagement === "number"
              ? data.engagement
              : undefined,
      stress:
          typeof data.stress === "number"
              ? data.stress
              : undefined,
      fatigue:
          typeof data.fatigue === "number"
              ? data.fatigue
              : undefined,
      timestamp:
          typeof data.timestamp === "number"
              ? data.timestamp
              : undefined,
      face_detected:
          typeof data.face_detected === "boolean"
              ? data.face_detected
              : state === "NO_FACE"
                  ? false
                  : undefined,
      input_width:
          typeof data.input_width === "number"
              ? data.input_width
              : undefined,
      input_height:
          typeof data.input_height === "number"
              ? data.input_height
              : undefined,
    };

    /**
     * NO_FACE is a valid response, not an ML failure.
     */
    const hasUsefulResult =
        output.state !== undefined ||
        output.face_detected !== undefined ||
        output.risk !== undefined ||
        output.dominant_emotion !== undefined ||
        output.confidence !== undefined ||
        output.emotion !== undefined ||
        output.engagement !== undefined ||
        output.stress !== undefined ||
        output.fatigue !== undefined;

    return hasUsefulResult ? output : null;
  } catch (error) {
    const requestError = error as MlRequestError;

    if (
        requestError.status === 429 ||
        requestError.message === "RATE_LIMIT"
    ) {
      throw requestError;
    }

    if (
        requestError.name !== "AbortError"
    ) {
      console.warn(
          "ML analyze request failed:",
          requestError.message
      );
    }

    return null;
  } finally {
    window.clearTimeout(timeout);
    opts.signal?.removeEventListener("abort", onAbort);
  }
}

export function startMlLoop(params: {
  getFrame: () => number[][] | null;
  onResult: (result: MlAnalyzeResponse) => void;
  onTickError?: () => void;
  shouldSend?: () => boolean;
}) {
  let stopped = false;
  let running = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const controller = new AbortController();

  const schedule = (delay: number) => {
    if (stopped) return;

    timer = setTimeout(() => {
      void tick();
    }, delay);
  };

  const tick = async () => {
    if (stopped || running) return;

    if (params.shouldSend && !params.shouldSend()) {
      schedule(ML_INTERVAL);
      return;
    }

    const frame = params.getFrame();

    if (!frame) {
      schedule(ML_INTERVAL);
      return;
    }

    running = true;

    try {
      const result = await mlAnalyzeFrame(frame, {
        signal: controller.signal,
      });

      if (result) {
        params.onResult(result);
      } else {
        params.onTickError?.();
      }

      schedule(ML_INTERVAL);
    } catch (error) {
      const requestError = error as MlRequestError;

      if (requestError.status === 429) {
        schedule(
            requestError.retryAfterMs ??
            ML_429_PAUSE_MS
        );
      } else {
        params.onTickError?.();
        schedule(ML_INTERVAL);
      }
    } finally {
      running = false;
    }
  };

  schedule(0);

  return {
    stop() {
      stopped = true;
      controller.abort();

      if (timer) {
        clearTimeout(timer);
      }
    },
  };
}

let canvas: HTMLCanvasElement | null = null;
let context: CanvasRenderingContext2D | null = null;

export function captureSquareFrameGrayscale(
    video: HTMLVideoElement,
    size = 192
): number[][] | null {
  if (
      video.readyState < 2 ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
  ) {
    return null;
  }

  if (!canvas) {
    canvas = document.createElement("canvas");
    context = canvas.getContext("2d", {
      willReadFrequently: true,
    });
  }

  if (!canvas || !context) return null;

  if (canvas.width !== size) canvas.width = size;
  if (canvas.height !== size) canvas.height = size;

  const sourceSize = Math.min(
      video.videoWidth,
      video.videoHeight
  );

  const sourceX = Math.max(
      0,
      (video.videoWidth - sourceSize) / 2
  );

  const sourceY = Math.max(
      0,
      (video.videoHeight - sourceSize) / 2
  );

  context.drawImage(
      video,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      size,
      size
  );

  const imageData = context.getImageData(
      0,
      0,
      size,
      size
  );

  const pixels = imageData.data;
  const output: number[][] = [];

  for (let y = 0; y < size; y += 1) {
    const row: number[] = [];

    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];

      row.push(
          Math.round(
              0.299 * red +
              0.587 * green +
              0.114 * blue
          )
      );
    }

    output.push(row);
  }

  return output;
}

export function captureFrame64x64Grayscale(
    video: HTMLVideoElement
): number[][] | null {
  return captureSquareFrameGrayscale(video, 64);
}
