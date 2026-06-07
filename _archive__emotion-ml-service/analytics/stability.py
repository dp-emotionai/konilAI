from dataclasses import dataclass
from typing import Dict, List, Tuple

from temporal.buffer import TemporalEmotionBuffer


@dataclass
class StabilityMetrics:
    """
    Collection of temporal stability indicators derived from the emotion buffer.

    This layer is deliberately simple and interpretable:
    - we only use counts, proportions and transition rates;
    - no opaque ML is used here.
    """

    stability: float
    """Share of the dominant emotion in the buffer \(\in [0, 1]\)."""

    volatility: float
    """Inverse of stability, emphasising how quickly emotions change."""

    switch_rate: float
    """Fraction of adjacent emotion pairs where the emotion label changes."""

    entropy: float
    """
    Normalised Shannon entropy of the emotion distribution \(\in [0, 1]\).
    0 – one emotion dominates, 1 – emotions are uniformly distributed.
    """

    dominant_emotion: str
    """Emotion with the highest (non‑decayed) frequency in the buffer."""

    emotion_distribution: Dict[str, float]
    """Relative frequency of each emotion in the current window."""

    def to_dict(self) -> Dict:
        return {
            "stability": round(self.stability, 3),
            "volatility": round(self.volatility, 3),
            "switch_rate": round(self.switch_rate, 3),
            "entropy": round(self.entropy, 3),
            "dominant_emotion": self.dominant_emotion,
            "emotion_distribution": dict(self.emotion_distribution),
        }


def _extract_sequence(buffer: TemporalEmotionBuffer) -> List[Tuple[str, float, float]]:
    """
    Convert buffer snapshot into a simple list representation.

    The `TemporalEmotionBuffer` already stores events as
    (emotion, confidence, timestamp), we reuse this structure here.
    """
    return [
        (item["emotion"], float(item["confidence"]), float(item["timestamp"]))
        for item in buffer.snapshot()
    ]


def compute_stability_metrics(buffer: TemporalEmotionBuffer) -> StabilityMetrics:
    """
    Compute interpretable temporal stability indicators from the buffer.

    The design follows three pedagogically meaningful questions:
    1. Is one emotion clearly dominating the recent history?
    2. How often does the emotional state switch between adjacent frames?
    3. How diverse is the emotional repertoire overall?
    """
    seq = _extract_sequence(buffer)

    if not seq:
        return StabilityMetrics(
            stability=0.0,
            volatility=0.0,
            switch_rate=0.0,
            entropy=0.0,
            dominant_emotion="None",
            emotion_distribution={},
        )

    # ----- distribution (non‑decayed, purely frequency based) -----
    counts: Dict[str, int] = {}
    for emotion, _, _ in seq:
        counts[emotion] = counts.get(emotion, 0) + 1

    total = sum(counts.values())
    dist = {e: c / total for e, c in counts.items()} if total > 0 else {}

    dominant_emotion = max(dist, key=dist.get)
    stability = dist[dominant_emotion] if dist else 0.0

    # ----- switch rate (temporal volatility) -----
    switches = 0
    for (e1, _, _), (e2, _, _) in zip(seq[:-1], seq[1:]):
        if e1 != e2:
            switches += 1

    switch_rate = switches / max(len(seq) - 1, 1)

    # ----- entropy (diversity of emotions) -----
    import math

    if dist:
        raw_entropy = -sum(p * math.log(p + 1e-9) for p in dist.values())
        max_entropy = math.log(len(dist))
        entropy = raw_entropy / max(max_entropy, 1e-9)
    else:
        entropy = 0.0

    # volatility is a complementary view on stability and switch rate
    volatility = 0.5 * (1.0 - stability) + 0.5 * switch_rate

    return StabilityMetrics(
        stability=float(stability),
        volatility=float(volatility),
        switch_rate=float(switch_rate),
        entropy=float(entropy),
        dominant_emotion=dominant_emotion,
        emotion_distribution=dist,
    )

