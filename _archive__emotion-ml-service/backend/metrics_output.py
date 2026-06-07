"""
Per-frame metrics output for /analyze.

- Maps raw CNN emotion to system spec: ENGAGED, NEUTRAL, CONFUSED, BORED, STRESSED, HIGH_RISK.
- Computes per-frame engagement, stress, fatigue from single prediction (no aggregation).
- No frame storage; no analytics aggregation (aggregation belongs to backend).
"""

import time

# System spec emotion states (exact values for API contract)
EMOTION_STATES = (
    "ENGAGED",
    "NEUTRAL",
    "CONFUSED",
    "BORED",
    "STRESSED",
    "HIGH_RISK",
)

# Raw CNN emotions
POSITIVE = {"Happy", "Surprise"}
PASSIVE = {"Neutral", "Sad"}
HIGH_AROUSAL_NEGATIVE = {"Angry", "Fear", "Disgust"}


def _map_emotion_to_state(emotion: str, confidence: float) -> str:
    """
    Map raw CNN emotion + confidence to one of the 6 system states.
    """
    if emotion == "Uncertain" or emotion == "Error" or confidence < 0.35:
        return "CONFUSED"
    if emotion in POSITIVE:
        return "ENGAGED"
    if emotion == "Neutral":
        return "NEUTRAL"
    if emotion == "Sad":
        return "BORED"
    if emotion in HIGH_AROUSAL_NEGATIVE:
        return "HIGH_RISK" if confidence >= 0.65 else "STRESSED"
    return "NEUTRAL"


def _engagement_per_frame(emotion: str, confidence: float) -> float:
    """Per-frame engagement [0, 1] from single prediction. No temporal aggregation."""
    if emotion in POSITIVE:
        return min(1.0, 0.5 + confidence * 0.5)
    if emotion == "Neutral":
        return 0.4 * confidence
    if emotion == "Sad":
        return 0.2 * (1.0 - confidence * 0.5)
    if emotion in HIGH_AROUSAL_NEGATIVE:
        return 0.15
    return 0.3


def _stress_per_frame(emotion: str, confidence: float) -> float:
    """Per-frame stress [0, 1] from single prediction. No temporal aggregation."""
    if emotion in HIGH_AROUSAL_NEGATIVE:
        return min(1.0, 0.3 + confidence * 0.7)
    if emotion == "Surprise":
        return 0.2 * confidence
    return 0.0


def _fatigue_per_frame(emotion: str, confidence: float) -> float:
    """Per-frame fatigue indicator [0, 1] from single prediction. No temporal aggregation."""
    if emotion == "Neutral":
        return 0.4 * confidence
    if emotion == "Sad":
        return min(1.0, 0.4 + confidence * 0.5)
    if emotion in POSITIVE:
        return 0.1
    return 0.25


def compute_per_frame_metrics(
    emotion: str, confidence: float, timestamp: float | None = None
) -> dict:
    """
    Compute per-frame metrics only. No aggregation, no buffer.

    Returns dict with: emotion (system state), engagement, stress, fatigue, timestamp.
    """
    ts = timestamp if timestamp is not None else time.time()
    state = _map_emotion_to_state(emotion, confidence)
    engagement = round(_engagement_per_frame(emotion, confidence), 3)
    stress = round(_stress_per_frame(emotion, confidence), 3)
    fatigue = round(_fatigue_per_frame(emotion, confidence), 3)

    return {
        "emotion": state,
        "engagement": engagement,
        "stress": stress,
        "fatigue": fatigue,
        "timestamp": ts,
    }
