import time
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import numpy as np

from backend.model_logic import EmotionRiskModel
from backend.metrics_output import compute_per_frame_metrics
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Emotion Risk API",
    version="1.0.0",
    description="Emotion-based risk assessment service",
)

emotion_engine = EmotionRiskModel("emotion_model.h5")

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
    image: list  # grayscale 2D array (64x64)


@app.post("/analyze")
def analyze_frame(data: FrameRequest):
    global _last_processed_time

    # Validate shape before any processing
    frame = np.array(data.image, dtype=np.uint8)
    if frame.shape != (64, 64):
        raise HTTPException(status_code=400, detail="Frame must be 64x64 grayscale")

    # Limit to 1–2 FPS: skip inference if called too soon
    now = time.time()
    if now - _last_processed_time < MIN_FRAME_INTERVAL:
        raise HTTPException(
            status_code=429,
            detail="Rate limit: max 1–2 FPS",
            headers={"Retry-After": str(int(MIN_FRAME_INTERVAL))},
        )

    # Process frame in memory only; never store the frame
    emotion_raw, conf = emotion_engine.predict_emotion(frame)
    _last_processed_time = time.time()

    # Per-frame metrics only; no aggregation (aggregation belongs to backend)
    out = compute_per_frame_metrics(emotion_raw, conf, timestamp=_last_processed_time)

    return {
        "emotion": out["emotion"],
        "engagement": out["engagement"],
        "stress": out["stress"],
        "fatigue": out["fatigue"],
        "timestamp": out["timestamp"],
    }