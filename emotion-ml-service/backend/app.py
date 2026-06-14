
from __future__ import annotations

import os
import threading
import time
from pathlib import Path
from typing import Any

import numpy as np
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.metrics_output import compute_per_frame_metrics
from backend.model_logic import (
    EmotionRiskModel,
    EmotionStateRegistry,
)
from inference.face_processor import FaceProcessor, crop_face_with_margin

BASE_DIR = Path(__file__).resolve().parents[1]
MODEL_PATH = Path(
    os.getenv(
        "EMOTION_MODEL_PATH",
        str(BASE_DIR / "emotion_model_custom.h5"),
    )
).resolve()

# Один браузер отправляет не чаще 1–2 кадров в секунду.
MIN_FRAME_INTERVAL = float(
    os.getenv("MIN_FRAME_INTERVAL", "0.75")
)

# Через сколько секунд удалять неактивные client_id.
CLIENT_TTL_SECONDS = float(
    os.getenv("CLIENT_TTL_SECONDS", "600")
)

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        ",".join(
            [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "https://elasweb.vercel.app",
                "https://www.konilai.space",
                "https://konilai.space",
            ]
        ),
    ).split(",")
    if origin.strip()
]


app = FastAPI(
    title="Emotion Risk API",
    version="1.1.0",
    description="Emotion-based risk assessment service",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


if not MODEL_PATH.exists():
    raise RuntimeError(
        f"Emotion model file was not found: {MODEL_PATH}"
    )


emotion_engine = EmotionRiskModel(str(MODEL_PATH))
emotion_states = EmotionStateRegistry(
    buffer_max=120,
    ttl_seconds=CLIENT_TTL_SECONDS,
)

face_processor = FaceProcessor(
    detector="haar",
    min_face_size=(24, 24),
)

# TensorFlow/Keras inference лучше не запускать одновременно
# из нескольких потоков на маленьком Render-инстансе.
_inference_lock = threading.Lock()

# Rate limit теперь отдельный для каждого браузера,
# а не один глобальный на всех пользователей.
_last_processed_by_client: dict[str, float] = {}
_rate_limit_lock = threading.Lock()


class FrameRequest(BaseModel):
    image: list[list[int]] = Field(
        ...,
        description="Grayscale 2D image array.",
    )

    client_id: str | None = Field(
        default=None,
        max_length=128,
        description=(
            "Stable browser identifier used for per-client throttling."
        ),
    )

    session_id: str | None = Field(
        default=None,
        max_length=128,
        description=(
            "Lesson/session identifier used to isolate temporal state."
        ),
    )


def _cleanup_old_clients(now: float) -> None:
    stale_client_ids = [
        client_id
        for client_id, last_seen
        in _last_processed_by_client.items()
        if now - last_seen > CLIENT_TTL_SECONDS
    ]

    for client_id in stale_client_ids:
        _last_processed_by_client.pop(
            client_id,
            None,
        )


def _resolve_client_id(
    data: FrameRequest,
    request: Request,
) -> str:
    if data.client_id and data.client_id.strip():
        return data.client_id.strip()

    header_client_id = request.headers.get(
        "x-ml-client-id",
        "",
    ).strip()

    if header_client_id:
        return header_client_id[:128]

    host = (
        request.client.host
        if request.client
        else "unknown"
    )

    return f"ip:{host}"


def _resolve_state_key(
    data: FrameRequest,
    client_id: str,
) -> str:
    session_id = (data.session_id or "").strip()

    if session_id:
        return f"session:{session_id}:client:{client_id}"

    # Backward compatibility for callers that do not send session_id yet.
    return f"legacy:client:{client_id}"


def _enforce_rate_limit(
    client_id: str,
    now: float,
) -> None:
    with _rate_limit_lock:
        _cleanup_old_clients(now)

        previous = _last_processed_by_client.get(
            client_id
        )

        if previous is not None:
            elapsed = now - previous

            if elapsed < MIN_FRAME_INTERVAL:
                retry_after = max(
                    0.05,
                    MIN_FRAME_INTERVAL - elapsed,
                )

                raise HTTPException(
                    status_code=429,
                    detail=(
                        "Rate limit: send no more than "
                        "1–2 frames per second"
                    ),
                    headers={
                        "Retry-After": f"{retry_after:.2f}"
                    },
                )

        # Сразу резервируем временной слот для клиента,
        # чтобы параллельные запросы не прошли одновременно.
        _last_processed_by_client[client_id] = now


def _pick_face_crop(
    frame: np.ndarray,
) -> tuple[np.ndarray | None, bool]:
    """
    Выбирает самое крупное найденное лицо.

    Совместимость:
    - кадры меньше 96 px считаются уже обрезанным лицом;
    - в более крупных кадрах лицо должно быть обнаружено.
    """
    if frame.ndim != 2:
        raise HTTPException(
            status_code=400,
            detail="Frame must be a 2D grayscale array",
        )

    if min(frame.shape[:2]) < 96:
        return frame, True

    faces = face_processor.detect(
        frame,
        use_gray=True,
    )

    if not faces:
        return None, False

    largest_face = max(
        faces,
        key=lambda box: box[2] * box[3],
    )

    face_crop = crop_face_with_margin(
        frame,
        largest_face,
        margin=0.18,
    )

    return face_crop, True


def _safe_float(value: Any) -> float | None:
    if value is None:
        return None

    try:
        number = float(value)
    except (TypeError, ValueError):
        return None

    if not np.isfinite(number):
        return None

    return number


@app.get("/")
def root() -> dict[str, str]:
    return {
        "service": "emotion-risk-api",
        "status": "ok",
        "version": "1.1.0",
    }


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "model_loaded": True,
        "model_path": MODEL_PATH.name,
        "min_frame_interval": MIN_FRAME_INTERVAL,
    }


@app.post("/analyze")
def analyze_frame(
    data: FrameRequest,
    request: Request,
) -> dict[str, Any]:
    try:
        frame = np.asarray(
            data.image,
            dtype=np.uint8,
        )
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=400,
            detail="Image contains invalid grayscale values",
        ) from exc

    if frame.ndim != 2:
        raise HTTPException(
            status_code=400,
            detail="Frame must be a 2D grayscale array",
        )

    height, width = frame.shape[:2]

    if height < 64 or width < 64:
        raise HTTPException(
            status_code=400,
            detail="Frame must be at least 64x64 grayscale",
        )

    if height > 512 or width > 512:
        raise HTTPException(
            status_code=400,
            detail=(
                "Frame is too large; "
                "maximum supported size is 512x512"
            ),
        )

    now = time.time()

    client_id = _resolve_client_id(
        data,
        request,
    )

    _enforce_rate_limit(
        client_id,
        now,
    )

    state_key = _resolve_state_key(
        data,
        client_id,
    )

    frame_for_model, face_detected = _pick_face_crop(
        frame
    )

    if frame_for_model is None:
        return {
            "state": "NO_FACE",
            "risk": None,
            "dominant_emotion": None,
            "confidence": None,
            "emotion": None,
            "engagement": None,
            "stress": None,
            "fatigue": None,
            "timestamp": now,
            "face_detected": False,
            "input_width": int(width),
            "input_height": int(height),
        }

    try:
        with _inference_lock:
            emotion_raw, confidence = (
                emotion_engine.predict_emotion(
                    frame_for_model
                )
            )

        state, risk, dominant = (
            emotion_states.record_and_evaluate(
                state_key,
                emotion_raw,
                confidence,
            )
        )

    except Exception as exc:
        print(
            f"ML inference failed: {exc!r}",
            flush=True,
        )

        raise HTTPException(
            status_code=503,
            detail=(
                "ML inference is temporarily unavailable"
            ),
        ) from exc

    processed_at = time.time()

    metrics = compute_per_frame_metrics(
        emotion_raw,
        confidence,
        timestamp=processed_at,
    )

    metric_timestamp = _safe_float(
        metrics.get("timestamp")
    )

    return {
        "state": state,
        "risk": _safe_float(
            round(float(risk), 6)
        ),
        "dominant_emotion": dominant,
        "confidence": _safe_float(confidence),
        "emotion": metrics.get("emotion"),
        "engagement": _safe_float(
            metrics.get("engagement")
        ),
        "stress": _safe_float(
            metrics.get("stress")
        ),
        "fatigue": _safe_float(
            metrics.get("fatigue")
        ),
        "timestamp": (
            metric_timestamp
            if metric_timestamp is not None
            else processed_at
        ),
        "face_detected": face_detected,
        "input_width": int(width),
        "input_height": int(height),
    }
