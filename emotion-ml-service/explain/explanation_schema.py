from dataclasses import dataclass

@dataclass
class RiskExplanation:
    emotion_risk: float
    motion_risk: float
    stability: float
    dominant_emotion: str
    trend: float

    def as_dict(self):
        return {
            "emotion_risk": round(self.emotion_risk, 3),
            "motion_risk": round(self.motion_risk, 3),
            "stability": round(self.stability, 3),
            "dominant_emotion": self.dominant_emotion,
            "risk_trend": round(self.trend, 3),
        }
