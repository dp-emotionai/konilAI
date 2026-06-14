import math
import os
import threading
import time

EMOTION_WEIGHTS = {
    "Angry": 1.0,
    "Fear": 0.8,
    "Surprise": 0.6,
    "Sad": 0.3,
    "Disgust": 0.4,
    "Neutral": 0.0,
    "Happy": 0.0,
}

DECAY_LAMBDA = 0.9

EmotionEntry = tuple[str, float, float]


def evaluate_risk(
    emotion_buffer: list[EmotionEntry],
    now: float | None = None,
) -> tuple[str, float]:
    """
    emotion_buffer: list of (emotion, confidence, timestamp)
    returns: (state, risk_score)
    """

    if not emotion_buffer:
        return "NORMAL", 0.0

    current_time = time.time() if now is None else now
    weighted_sum = 0.0
    weight_total = 0.0

    for emotion, conf, timestamp in emotion_buffer:
        decay = math.exp(
            -DECAY_LAMBDA * (current_time - timestamp)
        )
        weighted_sum += (
            EMOTION_WEIGHTS.get(emotion, 0.0)
            * conf
            * decay
        )
        weight_total += decay

    risk = weighted_sum / max(weight_total, 1e-6)

    if risk > 0.6:
        state = "POTENTIAL THREAT"
    elif risk > 0.35:
        state = "SUSPICIOUS"
    else:
        state = "NORMAL"

    return state, risk


def _dominant_emotion_from_buffer(
    emotion_buffer: list[EmotionEntry],
    max_entries: int = 30,
) -> str:
    """Доминантная эмоция по последним записям (по весу)."""
    if not emotion_buffer:
        return "Neutral"

    recent = emotion_buffer[-max_entries:]
    scores: dict[str, float] = {}

    for emotion, conf, _ in recent:
        scores[emotion] = scores.get(emotion, 0.0) + conf

    return max(scores, key=scores.get) if scores else "Neutral"


class EmotionStateRegistry:
    """
    Stores a separate temporal emotion buffer for each session/client key.

    The CNN model remains shared. Only the small temporal buffers are
    separated so one browser or lesson cannot affect another one's risk.
    """

    def __init__(
        self,
        buffer_max: int = 120,
        ttl_seconds: float = 600.0,
        time_fn=None,
    ):
        if buffer_max <= 0:
            raise ValueError("buffer_max must be greater than zero")
        if ttl_seconds <= 0:
            raise ValueError("ttl_seconds must be greater than zero")

        self._buffer_max = buffer_max
        self._ttl_seconds = ttl_seconds
        self._time_fn = time_fn or time.time
        self._buffers: dict[str, list[EmotionEntry]] = {}
        self._last_seen: dict[str, float] = {}
        self._lock = threading.Lock()

    def _cleanup_locked(self, now: float) -> None:
        stale_keys = [
            state_key
            for state_key, last_seen in self._last_seen.items()
            if now - last_seen > self._ttl_seconds
        ]

        for state_key in stale_keys:
            self._buffers.pop(state_key, None)
            self._last_seen.pop(state_key, None)

    def record_and_evaluate(
        self,
        state_key: str,
        emotion: str,
        confidence: float,
        timestamp: float | None = None,
    ) -> tuple[str, float, str]:
        if not state_key:
            raise ValueError("state_key is required")

        now = (
            float(self._time_fn())
            if timestamp is None
            else float(timestamp)
        )

        entry: EmotionEntry = (
            str(emotion),
            float(confidence),
            now,
        )

        with self._lock:
            self._cleanup_locked(now)

            emotion_buffer = self._buffers.setdefault(
                state_key,
                [],
            )
            emotion_buffer.append(entry)

            if len(emotion_buffer) > self._buffer_max:
                del emotion_buffer[:-self._buffer_max]

            self._last_seen[state_key] = now
            snapshot = list(emotion_buffer)

        state, risk = evaluate_risk(
            snapshot,
            now=now,
        )
        dominant = _dominant_emotion_from_buffer(
            snapshot
        )

        return state, risk, dominant

    def active_state_count(self) -> int:
        now = float(self._time_fn())

        with self._lock:
            self._cleanup_locked(now)
            return len(self._buffers)


class EmotionRiskModel:
    """
    Shared CNN inference wrapper.

    Temporal state is intentionally stored in EmotionStateRegistry, not
    in this model instance, so predictions from different users are not
    mixed together.
    """

    EMOTION_NAMES = list(EMOTION_WEIGHTS.keys())

    def __init__(self, model_path: str | None = None):
        self.model_path = model_path
        self._emotion_model = None

        if not model_path:
            raise ValueError(
                "model_path is required (e.g. 'emotion_model.h5')"
            )
        if not os.path.isfile(model_path):
            raise FileNotFoundError(
                f"Emotion model file not found: {model_path}"
            )

        # Use repository's inference engine.
        from inference.emotion_model import EmotionModel

        self._emotion_model = EmotionModel(
            model_path=model_path,
            input_size=(64, 64),
            grayscale=True,
        )

    def predict_emotion(self, frame) -> tuple[str, float]:
        """
        Predict a single face crop without storing user/session history.
        """
        res = self._emotion_model.predict(frame)
        emotion = str(res.get("emotion") or "Neutral")
        confidence = float(res.get("confidence") or 0.0)
        return emotion, confidence
