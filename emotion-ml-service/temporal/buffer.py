import time
import math
from collections import deque
from typing import Deque, Tuple, Dict, List


class TemporalEmotionBuffer:
    """
    Temporal buffer for emotion events with decay & stability logic.
    """

    def __init__(
        self,
        max_size: int = 30,
        decay_lambda: float = 0.9,
        min_confidence: float = 0.3
    ):
        self.max_size = max_size
        self.decay_lambda = decay_lambda
        self.min_confidence = min_confidence

        # (emotion, confidence, timestamp)
        self.buffer: Deque[Tuple[str, float, float]] = deque(maxlen=max_size)

    # --------------------------------------------------
    # Add emotion event
    # --------------------------------------------------
    def push(
        self,
        emotion: str,
        confidence: float,
        timestamp: float = None
    ):
        if confidence < self.min_confidence:
            return

        if timestamp is None:
            timestamp = time.time()

        self.buffer.append(
            (emotion, confidence, timestamp)
        )

    # --------------------------------------------------
    # Buffer state
    # --------------------------------------------------
    def clear(self):
        self.buffer.clear()

    def size(self) -> int:
        return len(self.buffer)

    # --------------------------------------------------
    # Weighted emotion aggregation
    # --------------------------------------------------
    def weighted_emotions(self) -> Dict[str, float]:
        """
        Returns emotion -> weighted value
        """
        now = time.time()
        result: Dict[str, float] = {}

        for emotion, conf, ts in self.buffer:
            dt = now - ts
            decay = math.exp(-self.decay_lambda * dt)
            value = conf * decay

            result[emotion] = result.get(emotion, 0.0) + value

        return result

    # --------------------------------------------------
    # Dominant emotion
    # --------------------------------------------------
    def dominant_emotion(self) -> str:
        if not self.buffer:
            return "None"

        weights = self.weighted_emotions()
        return max(weights, key=weights.get)

    # --------------------------------------------------
    # Stability score (how persistent emotion is)
    # --------------------------------------------------
    def stability(self) -> float:
        """
        Returns [0..1] stability score.
        1 = same emotion dominates buffer
        """
        if not self.buffer:
            return 0.0

        weights = self.weighted_emotions()
        total = sum(weights.values())

        if total == 0:
            return 0.0

        dominant = max(weights.values())
        return dominant / total

    # --------------------------------------------------
    # Export buffer snapshot
    # --------------------------------------------------
    def snapshot(self) -> List[Dict]:
        return [
            {
                "emotion": e,
                "confidence": c,
                "timestamp": t
            }
            for (e, c, t) in self.buffer
        ]
