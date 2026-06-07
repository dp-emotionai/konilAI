import time
import math
import os

EMOTION_WEIGHTS = {
    "Angry": 1.0,
    "Fear": 0.8,
    "Surprise": 0.6,
    "Sad": 0.3,
    "Disgust": 0.4,
    "Neutral": 0.0,
    "Happy": 0.0
}

DECAY_LAMBDA = 0.9


def evaluate_risk(emotion_buffer):
    """
    emotion_buffer: list of (emotion, confidence, timestamp)
    returns: (state, risk_score)
    """

    if not emotion_buffer:
        return "NORMAL", 0.0

    now = time.time()
    weighted_sum = 0.0
    weight_total = 0.0

    for emotion, conf, t in emotion_buffer:
        decay = math.exp(-DECAY_LAMBDA * (now - t))
        weighted_sum += EMOTION_WEIGHTS.get(emotion, 0.0) * conf * decay
        weight_total += decay

    risk = weighted_sum / max(weight_total, 1e-6)

    if risk > 0.6:
        state = "POTENTIAL THREAT"
    elif risk > 0.35:
        state = "SUSPICIOUS"
    else:
        state = "NORMAL"

    return state, risk


def _dominant_emotion_from_buffer(emotion_buffer, max_entries=30):
    """Доминантная эмоция по последним записям (по весу)."""
    if not emotion_buffer:
        return "Neutral"
    recent = emotion_buffer[-max_entries:]
    scores = {}
    for emotion, conf, _ in recent:
        scores[emotion] = scores.get(emotion, 0.0) + conf
    return max(scores, key=scores.get) if scores else "Neutral"


class EmotionRiskModel:
    """
    Обёртка: инференс эмоции + буфер + оценка риска.

    Правильный путь для этого репозитория: загрузка модели через `inference/emotion_model.py`
    (класс `EmotionModel`), а не через "ручной" keras.load_model здесь.
    """

    EMOTION_NAMES = list(EMOTION_WEIGHTS.keys())

    def __init__(self, model_path: str | None = None):
        self.model_path = model_path
        self._emotion_model = None
        self._emotion_buffer: list[tuple[str, float, float]] = []  # (emotion, confidence, timestamp)
        self._buffer_max = 120  # хранить последние N записей

        if not model_path:
            raise ValueError("model_path is required (e.g. 'emotion_model.h5')")
        if not os.path.isfile(model_path):
            raise FileNotFoundError(f"Emotion model file not found: {model_path}")

        # Use repository's inference engine
        from inference.emotion_model import EmotionModel

        # EmotionModel already applies preprocessing (CLAHE, resize, grayscale) and loads the .h5 model
        self._emotion_model = EmotionModel(model_path=model_path, input_size=(64, 64), grayscale=True)

    def predict_emotion(self, frame):
        """
        frame: numpy array (64, 64) grayscale.
        Returns: (emotion_name: str, confidence: float)
        """
        now = time.time()

        # EmotionModel.predict() returns dict with emotion/confidence/distribution
        res = self._emotion_model.predict(frame)
        emotion = str(res.get("emotion") or "Neutral")
        conf = float(res.get("confidence") or 0.0)
        self._emotion_buffer.append((emotion, conf, now))

        self._emotion_buffer = self._emotion_buffer[-self._buffer_max:]
        return emotion, conf

    def evaluate_risk(self):
        """
        Returns: (state: str, risk: float, dominant_emotion: str)
        """
        state, risk = evaluate_risk(self._emotion_buffer)
        dominant = _dominant_emotion_from_buffer(self._emotion_buffer)
        return state, risk, dominant
