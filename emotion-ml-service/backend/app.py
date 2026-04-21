import time
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np

from backend.model_logic import EmotionRiskModel
from backend.metrics_output import compute_per_frame_metrics
from inference.face_processor import FaceProcessor, crop_face_with_margin
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Emotion Risk API",
    version="1.0.0",
    description="Emotion-based risk assessment service",
)

emotion_engine = EmotionRiskModel("emotion_model.h5")
face_processor = FaceProcessor(detector="haar", min_face_size=(24, 24))

# 1–2 FPS: min interval between processing frames (seconds)
MIN_FRAME_INTERVAL = 0.5
_last_processed_time: float = 0.0

# CORS: разрешаем frontend как локальный, так и продовый (Vercel).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://elasweb.vercel.app",
        "https://www.konilai.space",
        "https://konilai.space",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


class FrameRequest(BaseModel):
    image: list  # grayscale 2D array (cropped face 64x64 or larger square frame)


def _pick_face_crop(frame: np.ndarray) -> tuple[np.ndarray | None, bool]:
    """
    Prefer the largest detected face crop.
    Backward-compatibility rule:
    - small legacy inputs (<96 px) are assumed to already be a face crop
    - larger web frames require an actual detected face
    """
    if frame.ndim != 2:
        raise HTTPException(status_code=400, detail="Frame must be a 2D grayscale array")

    if min(frame.shape[:2]) < 96:
        return frame, True

    faces = face_processor.detect(frame, use_gray=True)
    if faces:
        largest = max(faces, key=lambda box: box[2] * box[3])
        return crop_face_with_margin(frame, largest, margin=0.18), True

    return None, False


@app.post("/analyze")
def analyze_frame(data: FrameRequest):
    global _last_processed_time

    # Validate shape before any processing
    frame = np.array(data.image, dtype=np.uint8)
    if frame.ndim != 2:
        raise HTTPException(status_code=400, detail="Frame must be a 2D grayscale array")
    if frame.shape[0] < 64 or frame.shape[1] < 64:
        raise HTTPException(status_code=400, detail="Frame must be at least 64x64 grayscale")

    # Limit to 1–2 FPS: skip inference if called too soon
    now = time.time()
    if now - _last_processed_time < MIN_FRAME_INTERVAL:
        raise HTTPException(
            status_code=429,
            detail="Rate limit: max 1–2 FPS",
            headers={"Retry-After": str(int(MIN_FRAME_INTERVAL))},
        )

    # Process frame in memory only; never store the frame.
    # If a larger web frame is provided, require a detected face crop.
    frame_for_model, face_detected = _pick_face_crop(frame)
    if frame_for_model is None:
        _last_processed_time = now
        return {
            "state": "NO_FACE",
            "risk": None,
            "dominant_emotion": None,
            "confidence": None,
            "emotion": None,
            "engagement": None,
            "stress": None,
            "fatigue": None,
            "timestamp": _last_processed_time,
            "face_detected": False,
            "input_width": int(frame.shape[1]),
            "input_height": int(frame.shape[0]),
        }

    emotion_raw, conf = emotion_engine.predict_emotion(frame_for_model)
    _last_processed_time = time.time()

    # Temporal risk from internal buffer (backward-compatible extension)
    state, risk, dominant = emotion_engine.evaluate_risk()

    # Per-frame metrics only; no aggregation (aggregation belongs to backend)
    out = compute_per_frame_metrics(emotion_raw, conf, timestamp=_last_processed_time)

    return {
        # Variant 2 (frontend/back-end expected keys)
        "state": state,
        "risk": float(round(risk, 6)),
        "dominant_emotion": dominant,
        "confidence": float(conf),

        # Variant 1 (educational per-frame metrics)
        "emotion": out["emotion"],
        "engagement": out["engagement"],
        "stress": out["stress"],
        "fatigue": out["fatigue"],
        "timestamp": out["timestamp"],
        "face_detected": face_detected,
        "input_width": int(frame.shape[1]),
        "input_height": int(frame.shape[0]),
    }
