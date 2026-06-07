from dataclasses import dataclass
from typing import Dict, Optional

from temporal.buffer import TemporalEmotionBuffer
from analytics.stability import StabilityMetrics, compute_stability_metrics


@dataclass
class EngagementResult:
    """
    Engagement model focused on *behaviour over time*, not single frames.

    The score is designed for educational interpretation:
    - high neutral/sad dominance → likely disengagement;
    - balanced positive / surprise with some variability → good engagement;
    - extremely volatile emotions → unstable / distracted engagement.
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
    if score < 0.35:
        return "LOW"
    if score < 0.65:
        return "MEDIUM"
    return "HIGH"


def compute_engagement(
    buffer: TemporalEmotionBuffer,
    stability_metrics: Optional[StabilityMetrics] = None,
) -> EngagementResult:
    """
    Compute engagement from a temporal buffer of emotions.

    Parameters
    ----------
    buffer:
        Sliding window of recent emotional observations.
    stability_metrics:
        Optional pre‑computed stability metrics for reuse across analytics.

    Returns
    -------
    EngagementResult
        Normalised engagement score with explanation of the main factors.
    """
    if stability_metrics is None:
        stability_metrics = compute_stability_metrics(buffer)

    dist = stability_metrics.emotion_distribution
    if not dist:
        return EngagementResult(
            score=0.0,
            level="LOW",
            reasoning="Нет достаточного количества данных для оценки вовлечённости.",
            components={"data_coverage": 0.0},
        )

    # ----- Feature Extraction (Interpretable Components) -----
    # Group emotions into three categories based on educational engagement research:
    #
    # 1. Positive emotions (Happy, Surprise):
    #    - Associated with interest, curiosity, active learning
    #    - Research: Pekrun et al. (2002) - positive emotions facilitate learning
    positive = dist.get("Happy", 0.0) + dist.get("Surprise", 0.0)

    # 2. Passive emotions (Neutral, Sad):
    #    - Associated with disengagement, boredom, lack of interest
    #    - Research: D'Mello & Graesser (2012) - boredom correlates with low engagement
    passive = dist.get("Neutral", 0.0) + dist.get("Sad", 0.0)

    # 3. Negative high-arousal emotions (Angry, Fear, Disgust):
    #    - Associated with stress, anxiety, emotional interference
    #    - Research: Pekrun et al. (2011) - negative emotions can impede learning
    negative = (
        dist.get("Angry", 0.0)
        + dist.get("Fear", 0.0)
        + dist.get("Disgust", 0.0)
    )

    # ----- Volatility Analysis -----
    # Research rationale: Optimal engagement requires moderate emotional variability.
    # - Too low volatility (monotony): may indicate apathy or fatigue
    # - Too high volatility (chaos): may indicate distraction or instability
    # - Optimal range: 0.4-0.6 (moderate variability indicates active processing)
    #
    # Reference: D'Mello et al. (2014) - engagement requires dynamic emotional states
    volatility = stability_metrics.volatility
    # Penalty increases as volatility deviates from optimal (0.5)
    volatility_penalty = abs(volatility - 0.5)  # 0 when volatility ≈ 0.5

    # ----- Component 1: Active Share -----
    # Measures the proportion of emotional mass in active (non-passive) states.
    # Rationale: Engagement requires active emotional involvement, not apathy.
    # Formula: active_share = 1 - passive_share
    active_share = max(0.0, 1.0 - passive)

    # ----- Component 2: Valence Balance -----
    # Measures the balance between positive and negative emotions.
    # Rationale: Positive emotions facilitate learning, negative emotions impede it.
    # Formula: valence_balance = positive_share - negative_share
    # Clamped to [-1, 1] to prevent extreme values from dominating
    valence_balance = positive - negative

    # ----- Final Engagement Score (Linear Fusion) -----
    # Formula: engagement = 0.5 * active_share
    #                    + 0.3 * max(valence_balance, -1.0)
    #                    + 0.2 * (1.0 - volatility_penalty)
    #
    # Weight Rationale:
    # - 0.5 active_share: Primary indicator (engagement requires active involvement)
    # - 0.3 valence_balance: Secondary indicator (positive emotions boost engagement)
    # - 0.2 volatility_term: Tertiary indicator (moderate variability is optimal)
    #
    # All weights sum to 1.0, ensuring the score remains interpretable.
    # The formula is linear and fully explainable (no hidden transformations).
    score = (
        0.5 * active_share
        + 0.3 * max(valence_balance, -1.0)
        + 0.2 * (1.0 - volatility_penalty)
    )

    # Normalise to [0, 1]
    score = max(0.0, min(1.0, score))
    level = _level_from_score(score)

    # ----- textual reasoning -----
    reasons = []
    if passive > 0.6:
        reasons.append("доминируют нейтральные/печальные эмоции")
    if positive > 0.3:
        reasons.append("наблюдаются устойчивые положительные реакции")
    if negative > 0.3:
        reasons.append("существенная доля тревоги/раздражения")
    if volatility_penalty > 0.35:
        reasons.append("эмоциональная динамика либо слишком стабильна, либо чрезмерно хаотична")

    if not reasons:
        reasoning = "Эмоциональный профиль сбалансирован, признаков выраженной дезактивации не обнаружено."
    else:
        reasoning = "; ".join(reasons)

    components = {
        "active_share": active_share,
        "positive_share": positive,
        "passive_share": passive,
        "negative_share": negative,
        "volatility": volatility,
        "volatility_penalty": volatility_penalty,
    }

    return EngagementResult(
        score=score,
        level=level,
        reasoning=reasoning,
        components=components,
    )

