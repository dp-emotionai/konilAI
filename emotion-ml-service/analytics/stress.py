from dataclasses import dataclass
from typing import Dict, Optional

from temporal.buffer import TemporalEmotionBuffer
from analytics.stability import StabilityMetrics, compute_stability_metrics


HIGH_AROUSAL_NEGATIVE = {"Angry", "Fear", "Disgust", "Surprise"}


@dataclass
class StressResult:
    """
    Temporal stress model.

    The goal is to capture *persistent high‑arousal negative states* rather than
    single spikes. We only use simple, explainable components:
    - proportion of high‑arousal negative emotions in the buffer;
    - recency (what happens in the last part of the window);
    - instability of the emotional trajectory.
    """

    score: float  # [0, 1]
    level: str  # LOW | MEDIUM | HIGH
    reasoning: str
    components: Dict[str, float]

    def to_dict(self) -> Dict:
        return {
            "score": round(self.score, 3),
            "level": self.level,
            "reasoning": self.reasoning,
            "components": {k: round(v, 3) for k, v in self.components.items()},
        }


def _level_from_score(score: float) -> str:
    if score < 0.3:
        return "LOW"
    if score < 0.6:
        return "MEDIUM"
    return "HIGH"


def compute_stress(
    buffer: TemporalEmotionBuffer,
    stability_metrics: Optional[StabilityMetrics] = None,
) -> StressResult:
    """
    Compute stress from the temporal buffer.

    The model emphasises:
    - how often the learner exhibits fear/anger/surprise/disgust,
    - whether these reactions are concentrated in the *recent* part of the
      window (recency),
    - whether the trajectory is unstable (frequent switches).
    """
    if stability_metrics is None:
        stability_metrics = compute_stability_metrics(buffer)

    dist = stability_metrics.emotion_distribution
    seq = [
        (item["emotion"], float(item["confidence"]), float(item["timestamp"]))
        for item in buffer.snapshot()
    ]

    if not seq:
        return StressResult(
            score=0.0,
            level="LOW",
            reasoning="Нет достаточного количества данных для оценки стресса.",
            components={"data_coverage": 0.0},
        )

    # ----- global proportion of high‑arousal negative emotions -----
    high_arousal_share = sum(
        dist.get(e, 0.0) for e in HIGH_AROUSAL_NEGATIVE
    )

    # ----- recency: how many of the last events are high‑arousal negative -----
    tail_len = min(8, len(seq))
    tail = seq[-tail_len:]
    if tail:
        recent_high = sum(1 for e, _, _ in tail if e in HIGH_AROUSAL_NEGATIVE)
        recent_share = recent_high / len(tail)
    else:
        recent_share = 0.0

    # ----- instability component -----
    volatility = stability_metrics.volatility

    # Final interpretable combination
    score = (
        0.55 * high_arousal_share
        + 0.3 * recent_share
        + 0.15 * volatility
    )
    score = max(0.0, min(1.0, score))
    level = _level_from_score(score)

    reasons = []
    if high_arousal_share > 0.4:
        reasons.append("значительная доля эмоций страха/гнева/раздражения")
    if recent_share > 0.4:
        reasons.append("негативные реакции концентрируются в последние секунды")
    if volatility > 0.5:
        reasons.append("наблюдаются частые эмоциональные колебания")

    if not reasons:
        reasoning = "Устойчивых признаков повышенного стресса не обнаружено."
    else:
        reasoning = "; ".join(reasons)

    components = {
        "high_arousal_share": high_arousal_share,
        "recent_high_arousal_share": recent_share,
        "volatility": volatility,
    }

    return StressResult(
        score=score,
        level=level,
        reasoning=reasoning,
        components=components,
    )

