from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

from .risk_engine import evaluate_risk

app = FastAPI(title="Emotion Risk API")

# 🔥 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # для разработки
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class EmotionFrame(BaseModel):
    emotion: str
    confidence: float
    timestamp: float

class RiskRequest(BaseModel):
    frames: List[EmotionFrame]

class RiskResponse(BaseModel):
    risk: float
    state: str
    dominant_emotion: str

@app.post("/analyze", response_model=RiskResponse)
def analyze_risk(data: RiskRequest):
    buffer = [
        (f.emotion, f.confidence, f.timestamp)
        for f in data.frames
    ]

    risk, dominant = evaluate_risk(buffer)

    if risk > 0.6:
        state = "POTENTIAL THREAT"
    elif risk > 0.35:
        state = "SUSPICIOUS"
    else:
        state = "NORMAL"

    return {
        "risk": round(risk, 3),
        "state": state,
        "dominant_emotion": dominant
    }
