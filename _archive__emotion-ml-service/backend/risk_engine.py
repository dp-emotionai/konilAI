import math
import time

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

def evaluate_risk(buffer):
    if not buffer:
        return 0.0, "Neutral"

    now = time.time()
    weighted_sum = 0.0
    weight_total = 0.0
    emotion_scores = {}

    for emotion, conf, ts in buffer:
        decay = math.exp(-DECAY_LAMBDA * (now - ts))
        score = EMOTION_WEIGHTS.get(emotion, 0.0) * conf * decay

        weighted_sum += score
        weight_total += decay
        emotion_scores[emotion] = emotion_scores.get(emotion, 0) + score

    risk = weighted_sum / max(weight_total, 1e-6)
    dominant = max(emotion_scores, key=emotion_scores.get)

    return risk, dominant
