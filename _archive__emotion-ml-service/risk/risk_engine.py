from temporal.buffer import TemporalEmotionBuffer
from analytics.stability import compute_stability_metrics
from analytics.engagement import compute_engagement
from analytics.stress import compute_stress
from analytics.fatigue import compute_fatigue
from analytics.confidence import compute_confidence


SCENARIOS = {
    "PUBLIC": {
        "thresholds": {"suspicious": 0.35, "threat": 0.6},
        "emotion_weights": {
            "Angry": 1.0,
            "Fear": 0.8,
            "Surprise": 0.6,
            "Sad": 0.3,
            "Disgust": 0.4,
            "Neutral": 0.0,
            "Happy": 0.0,
        },
    },
    "SCHOOL": {
        "thresholds": {"suspicious": 0.30, "threat": 0.55},
        "emotion_weights": {
            "Angry": 1.0,
            "Fear": 0.9,
            "Surprise": 0.7,
            "Sad": 0.4,
            "Disgust": 0.5,
            "Neutral": 0.0,
            "Happy": 0.0,
        },
    },
    "TRANSPORT": {
        "thresholds": {"suspicious": 0.40, "threat": 0.65},
        "emotion_weights": {
            "Angry": 1.1,
            "Fear": 0.9,
            "Surprise": 0.7,
            "Sad": 0.2,
            "Disgust": 0.4,
            "Neutral": 0.0,
            "Happy": 0.0,
        },
    },
}


# ================== RISK ENGINE ==================
class RiskEngine:
    def __init__(self, scenario="PUBLIC"):
        self.scenario = scenario
        self.config = SCENARIOS[scenario]
        self.buffer = TemporalEmotionBuffer()
        self.risk_history = []

    def push_emotion(self, emotion, confidence, timestamp=None):
        """
        Добавление одного эмоционального события
        """
        self.buffer.push(emotion, confidence, timestamp)

    def compute_risk(self):
        """
        Основной аналитический метод.

        На этом уровне мы оцениваем ТОЛЬКО эмоциональный риск, основанный
        на истории эмоций, а также вычисляем производные образовательные
        показатели (вовлечённость, стресс, усталость).

        Интеграция с другими сигналами (движение, контекст сессии) должна
        выполняться на более высоком уровне через FusionEngine.
        """
        scores = self.buffer.weighted_emotions()
        weights = self.config["emotion_weights"]

        # нет данных
        if not scores:
            return self._result(
                risk=0.0,
                state="NORMAL",
                dominant="none",
                trend=0.0,
                stability=0.0,
                engagement=0.0,
                stress=0.0,
                fatigue=0.0,
                confidence=0.0,
            )

        # ----- RISK -----
        weighted_risk = 0.0
        total = 0.0

        for emotion, value in scores.items():
            w = weights.get(emotion, 0.0)
            weighted_risk += value * w
            total += value

        risk = weighted_risk / max(total, 1e-6)
        dominant = max(scores, key=scores.get)

        # ----- TREND -----
        self.risk_history.append(risk)
        trend = self._trend()

        # ----- STATE -----
        state = self._state(risk)

        # ----- STABILITY (детализированные показатели) -----
        stability_metrics = compute_stability_metrics(self.buffer)
        stability = stability_metrics.stability

        # ----- EDUCATIONAL METRICS (ENGAGEMENT / STRESS / FATIGUE) -----
        engagement_res = compute_engagement(self.buffer, stability_metrics)
        stress_res = compute_stress(self.buffer, stability_metrics)
        fatigue_res = compute_fatigue(self.buffer, stability_metrics)
        confidence = compute_confidence(
            stress_res.score, stability, engagement_res.score
        )

        return self._result(
            risk=risk,
            state=state,
            dominant=dominant,
            trend=trend,
            stability=stability,
            engagement=engagement_res.score,
            stress=stress_res.score,
            fatigue=fatigue_res.score,
            confidence=confidence,
            stability_metrics=stability_metrics.to_dict(),
            engagement_details=engagement_res.to_dict(),
            stress_details=stress_res.to_dict(),
            fatigue_details=fatigue_res.to_dict(),
        )

    # ================== INTERNAL ==================
    def _trend(self):
        if len(self.risk_history) < 2:
            return 0.0
        return self.risk_history[-1] - self.risk_history[0]

    def _state(self, risk):
        th = self.config["thresholds"]
        if risk > th["threat"]:
            return "POTENTIAL THREAT"
        elif risk > th["suspicious"]:
            return "SUSPICIOUS"
        return "NORMAL"

    def _result(
        self,
        risk,
        state,
        dominant,
        trend,
        stability,
        engagement,
        stress,
        fatigue,
        confidence=0.0,
        stability_metrics=None,
        engagement_details=None,
        stress_details=None,
        fatigue_details=None,
    ):
        """
        Собирает результирующую структуру для одного лица.

        Структура разделена на:
        - базовые численные показатели (для оперативных алгоритмов);
        - подробные словари с объяснениями (для отчётов и визуализации).
        """
        result = {
            "risk": round(risk, 3),  # эмоциональный риск
            "state": state,
            "dominant_emotion": dominant,
            "trend": round(trend, 3),
            "stability": round(stability, 3),
            "engagement": round(engagement, 3),
            "stress": round(stress, 3),
            "fatigue": round(fatigue, 3),
            "confidence": round(confidence, 3),  # ТЗ: уверенность/спокойствие
            "scenario": self.scenario,
        }

        if stability_metrics is not None:
            result["stability_metrics"] = stability_metrics
        if engagement_details is not None:
            result["engagement_details"] = engagement_details
        if stress_details is not None:
            result["stress_details"] = stress_details
        if fatigue_details is not None:
            result["fatigue_details"] = fatigue_details

        return result
