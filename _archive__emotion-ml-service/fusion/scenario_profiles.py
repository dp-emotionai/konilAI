"""
Scenario profiles for the high‑level fusion layer.

Each profile specifies:
- how different signals contribute to the final fused risk;
- how to interpret engagement levels in the given context.

This file is intentionally declarative so that scenario assumptions can be
discussed and tuned during the diploma defence.
"""

SCENARIOS = {
    "PUBLIC": {
        # Emotion‑driven risk is dominant, motion provides additional evidence.
        "weights": {
            "emotion_risk": 0.55,
            "motion_risk": 0.20,
            "stress": 0.15,
            "fatigue": 0.05,
            "instability": 0.05,
        },
        "risk_thresholds": {"suspicious": 0.35, "threat": 0.6},
        "engagement_thresholds": {"low": 0.35, "high": 0.65},
    },
    "SCHOOL": {
        # Для образовательной среды чуть выше вес вовлечённости/стресса.
        "weights": {
            "emotion_risk": 0.45,
            "motion_risk": 0.15,
            "stress": 0.20,
            "fatigue": 0.15,
            "instability": 0.05,
        },
        "risk_thresholds": {"suspicious": 0.30, "threat": 0.55},
        "engagement_thresholds": {"low": 0.4, "high": 0.7},
    },
    "TRANSPORT": {
        # В транспорте важнее движение и быстрые негативные реакции.
        "weights": {
            "emotion_risk": 0.40,
            "motion_risk": 0.35,
            "stress": 0.15,
            "fatigue": 0.05,
            "instability": 0.05,
        },
        "risk_thresholds": {"suspicious": 0.40, "threat": 0.65},
        "engagement_thresholds": {"low": 0.35, "high": 0.65},
    },
}

