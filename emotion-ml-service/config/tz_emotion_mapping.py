"""
Маппинг эмоций модели на состояния из ТЗ (п. 4.2.1).

ТЗ требует минимальный набор состояний:
- нейтральное состояние
- скука / низкая вовлечённость
- интерес / внимание
- фрустрация
- стресс / тревожность
- уверенность / спокойствие

Наша CNN выдаёт 7 эмоций: Angry, Disgust, Fear, Happy, Sad, Surprise, Neutral.
Этот модуль переводит сырые эмоции и производные метрики в состояния ТЗ
для отчётов и визуализации.
"""

from typing import Dict, Tuple

# Коды состояний по ТЗ (латиница для кода и логов)
TZ_STATES = [
    "neutral",           # нейтральное
    "boredom",           # скука / низкая вовлечённость
    "interest",          # интерес / внимание
    "frustration",       # фрустрация
    "stress_anxiety",    # стресс / тревожность
    "confidence_calm",   # уверенность / спокойствие
]

# Человекочитаемые названия (русский)
TZ_STATE_LABELS_RU = {
    "neutral": "нейтральное состояние",
    "boredom": "скука / низкая вовлечённость",
    "interest": "интерес / внимание",
    "frustration": "фрустрация",
    "stress_anxiety": "стресс / тревожность",
    "confidence_calm": "уверенность / спокойствие",
}

# Маппинг доминантной эмоции CNN -> приоритетное состояние ТЗ
# (при необходимости учитываем также engagement/stress)
EMOTION_TO_TZ = {
    "Neutral": "neutral",
    "Sad": "boredom",      # или low engagement
    "Happy": "interest",   # или confidence_calm при высокой стабильности
    "Surprise": "interest",
    "Angry": "frustration",
    "Disgust": "frustration",
    "Fear": "stress_anxiety",
    "Uncertain": "neutral",
    "Error": "neutral",
}


def map_to_tz_state(
    dominant_emotion: str,
    engagement: float,
    stress: float,
    stability: float,
) -> Tuple[str, str]:
    """
    Определить состояние по ТЗ по эмоции и метрикам.

    Логика (интерпретируемая):
    - Высокий стресс -> stress_anxiety
    - Низкая вовлечённость + Neutral/Sad -> boredom
    - Высокая вовлечённость + низкий стресс + стабильность -> confidence_calm
    - Happy/Surprise при высокой вовлечённости -> interest
    - Angry/Disgust -> frustration

    Parameters
    ----------
    dominant_emotion : str
        Доминантная эмоция из CNN
    engagement : float
        Оценка вовлечённости [0, 1]
    stress : float
        Оценка стресса [0, 1]
    stability : float
        Стабильность [0, 1]

    Returns
    -------
    Tuple[str, str]
        (код_состояния_тз, русское_название)
    """
    base = EMOTION_TO_TZ.get(dominant_emotion, "neutral")

    # Уточнение по метрикам
    if stress >= 0.55:
        state = "stress_anxiety"
    elif base == "neutral" and engagement < 0.4:
        state = "boredom"
    elif base in ("Happy", "interest") and engagement >= 0.6 and stress < 0.4 and stability >= 0.6:
        state = "confidence_calm"
    elif base == "interest" or (dominant_emotion in ("Happy", "Surprise") and engagement >= 0.45):
        state = "interest"
    elif base == "frustration":
        state = "frustration"
    elif base == "boredom" or (dominant_emotion in ("Neutral", "Sad") and engagement < 0.45):
        state = "boredom"
    else:
        state = base

    return state, TZ_STATE_LABELS_RU.get(state, state)


def get_tz_state_summary(per_face_states: list) -> Dict[str, float]:
    """
    Доля каждого состояния ТЗ в группе (для отчёта «на 23–30 минуте у 68% — скука»).

    Parameters
    ----------
    per_face_states : list
        Список словарей состояния по каждому лицу (engagement, stress, stability, dominant_emotion).

    Returns
    -------
    Dict[str, float]
        Доля каждого TZ-состояния, например {"boredom": 0.68, "interest": 0.2, ...}
    """
    if not per_face_states:
        return {}

    counts = {s: 0 for s in TZ_STATES}
    for st in per_face_states:
        state, _ = map_to_tz_state(
            st.get("dominant_emotion", "Neutral"),
            st.get("engagement", 0.0),
            st.get("stress", 0.0),
            st.get("stability", 0.0),
        )
        counts[state] = counts.get(state, 0) + 1

    n = len(per_face_states)
    return {s: round(counts[s] / n, 3) for s in TZ_STATES if counts[s] > 0}
