import csv
import os
from datetime import datetime
from typing import Dict, Any


GLOBAL_LOG_FILE = "events_log.csv"
TEMPORAL_LOG_FILE = "events_log_temporal.csv"


def init_logs() -> None:
    """
    Initialise CSV files used for later offline analysis.

    There are two complementary logs:
    - events_log.csv          – редкие агрегированные события (переходы состояний);
    - events_log_temporal.csv – покадровая (или почти покадровая) динамика по лицам.
    """
    if not os.path.exists(GLOBAL_LOG_FILE):
        with open(GLOBAL_LOG_FILE, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(
                [
                    "timestamp",
                    "state",
                    "risk",
                    "stability",
                    "trend",
                    "reaction_time_sec",
                    "fps",
                ]
            )

    if not os.path.exists(TEMPORAL_LOG_FILE):
        with open(TEMPORAL_LOG_FILE, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(
                [
                    "timestamp",
                    "face_id",
                    "scenario",
                    "state",
                    "engagement_state",
                    "emotion_risk",
                    "motion_risk",
                    "fused_risk",
                    "engagement",
                    "stress",
                    "fatigue",
                    "stability",
                    "volatility",
                    "dominant_emotion",
                    "fps",
                ]
            )


def log_global_event(
    state: str,
    risk: float,
    stability: float,
    trend: float,
    reaction_time_sec: float,
    fps: float,
) -> None:
    """
    Log aggregated state transitions (e.g. confirmed threat interval).
    """
    with open(GLOBAL_LOG_FILE, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                state,
                round(risk, 3),
                round(stability, 3),
                round(trend, 3),
                round(reaction_time_sec, 3),
                int(fps),
            ]
        )


def log_face_state(face_id: int, fps: float, state: Dict[str, Any]) -> None:
    """
    Log per‑face temporal state for offline educational analysis.

    Expected keys in `state`:
    - scenario, state, engagement_state,
    - risk (emotion_risk), motion_risk, fused_risk,
    - engagement, stress, fatigue,
    - stability, stability_metrics[volatility], dominant_emotion.
    """
    stability_metrics = state.get("stability_metrics", {})

    with open(TEMPORAL_LOG_FILE, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                face_id,
                state.get("scenario", "N/A"),
                state.get("state", "UNKNOWN"),
                state.get("engagement_state", "UNKNOWN"),
                state.get("risk", 0.0),  # emotion_risk
                state.get("motion_risk", 0.0),  # motion-based risk
                state.get("fused_risk", 0.0),
                state.get("engagement", 0.0),
                state.get("stress", 0.0),
                state.get("fatigue", 0.0),
                state.get("stability", 0.0),
                stability_metrics.get("volatility", 0.0),
                state.get("dominant_emotion", "none"),
                int(fps),
            ]
        )

