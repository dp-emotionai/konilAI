from dataclasses import dataclass
from typing import Dict, Optional

from temporal.buffer import TemporalEmotionBuffer
from analytics.stability import StabilityMetrics, compute_stability_metrics


@dataclass
class FatigueResult:
    """
    Temporal fatigue / overload model.

    Intuition:
    - long dominance of Neutral/Sad with low variability → возможная усталость
      или сниженная вовлечённость;
    - occasional positive or high‑arousal episodes снижают вероятность
      чистой усталости.
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


def compute_fatigue(
    buffer: TemporalEmotionBuffer,
    stability_metrics: Optional[StabilityMetrics] = None,
) -> FatigueResult:
    """
    Compute fatigue / overload indicators from the temporal buffer.

    We explicitly avoid using risk directly here to keep the interpretation
    distinct from the security‑oriented risk score.
    """
    if stability_metrics is None:
        stability_metrics = compute_stability_metrics(buffer)

    dist = stability_metrics.emotion_distribution
    if not dist:
        return FatigueResult(
            score=0.0,
            level="LOW",
            reasoning="Нет достаточного количества данных для оценки усталости.",
            components={"data_coverage": 0.0},
        )

    neutral = dist.get("Neutral", 0.0)
    sad = dist.get("Sad", 0.0)
    passive_share = neutral + sad

    positive = dist.get("Happy", 0.0) + dist.get("Surprise", 0.0)

    # High fatigue is associated with:
    # - strong dominance of passive emotions,
    # - low volatility (монотонность эмоционального профиля).
    volatility = stability_metrics.volatility
    monotony = 1.0 - volatility

    raw_score = 0.6 * passive_share + 0.3 * monotony - 0.2 * positive
    score = max(0.0, min(1.0, raw_score))
    level = _level_from_score(score)

    reasons = []
    if passive_share > 0.6:
        reasons.append("преобладают нейтральные/печальные состояния")
    if monotony > 0.5:
        reasons.append("эмоциональный профиль мало меняется во времени")
    if positive > 0.25:
        reasons.append("регулярные положительные реакции частично компенсируют признаки усталости")

    if not reasons:
        reasoning = "Чётких признаков накопленной усталости не обнаружено."
    else:
        reasoning = "; ".join(reasons)

    components = {
        "neutral_share": neutral,
        "sad_share": sad,
        "passive_share": passive_share,
        "positive_share": positive,
        "volatility": volatility,
        "monotony": monotony,
    }

    return FatigueResult(
        score=score,
        level=level,
        reasoning=reasoning,
        components=components,
    )

