from fastapi import FastAPI
from pydantic import BaseModel
import numpy as np

from backend.model_logic import EmotionRiskModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Emotion Risk API",
    version="1.0.0",
    description="Emotion-based risk assessment service",
)

emotion_engine = EmotionRiskModel("emotion_model.h5")

# CORS: разрешаем frontend как локальный, так и продовый (Vercel).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://elasweb.vercel.app",
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
    frame = np.array(data.image, dtype=np.uint8)

    if frame.shape != (64, 64):
        return {"error": "Frame must be 64x64 grayscale"}

    emotion, conf = emotion_engine.predict_emotion(frame)
    state, risk, dominant = emotion_engine.evaluate_risk()

    return {
        "state": state,
        "risk": risk,
        "emotion": emotion,
        "confidence": round(conf, 3),
        "dominant_emotion": dominant
    }