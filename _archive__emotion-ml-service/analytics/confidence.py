"""
Метрика «уверенность / спокойствие» (ТЗ п. 4.2.1 и 4.4).

Уверенность в начале / середине / конце ответа — для экзаменов и защит.
Интерпретируемая формула: низкий стресс + высокая стабильность + не-негативная эмоция.
"""

from typing import Dict


def compute_confidence(stress: float, stability: float, engagement: float) -> float:
    """
    Уверенность ∈ [0, 1]: комбинация низкого стресса и стабильности.

    Формула (линейная, объяснимая):
    confidence = 0.5 * (1 - stress) + 0.3 * stability + 0.2 * min(engagement, 0.8)

    Parameters
    ----------
    stress : float
        Уровень стресса [0, 1]
    stability : float
        Эмоциональная стабильность [0, 1]
    engagement : float
        Вовлечённость [0, 1]

    Returns
    -------
    float
        Оценка уверенности [0, 1]
    """
    c = 0.5 * (1.0 - stress) + 0.3 * stability + 0.2 * min(engagement, 0.8)
    return max(0.0, min(1.0, round(c, 3)))


def confidence_segments(
    segment_metrics: Dict[str, Dict[str, float]]
) -> Dict[str, float]:
    """
    Уверенность по сегментам (начало / середина / конец).

    segment_metrics: {"start": {stress, stability, engagement}, "middle": {...}, "end": {...}}

    Returns
    -------
    Dict[str, float]
        {"start": 0.7, "middle": 0.5, "end": 0.6}
    """
    return {
        seg: compute_confidence(
            m.get("stress", 0.0),
            m.get("stability", 0.0),
            m.get("engagement", 0.0),
        )
        for seg, m in segment_metrics.items()
    }
