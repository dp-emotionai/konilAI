import cv2
import time
import numpy as np
import tensorflow as tf
from collections import deque
from datetime import datetime
import csv
import os
import math
from metrics.runtime_metrics import RuntimeMetrics
from event_logging.event_logger import init_log, log_event

# ================== GLOBAL CONFIG ==================
MODE = "REALTIME"        # REALTIME | SIMULATION
SCENARIO = "PUBLIC"      # PUBLIC | SCHOOL | TRANSPORT

# ================== EMOTIONS ==================
EMOTIONS = ["Angry", "Disgust", "Fear", "Happy", "Sad", "Surprise", "Neutral"]

EMOTION_WEIGHTS = {
    "Angry": 1.0,
    "Fear": 0.8,
    "Surprise": 0.6,
    "Sad": 0.3,
    "Disgust": 0.4,
    "Neutral": 0.0,
    "Happy": 0.0
}

# ================== SCENARIO PRESETS ==================
SCENARIO_THRESHOLDS = {
    "PUBLIC": {"suspicious": 0.35, "threat": 0.6},
    "SCHOOL": {"suspicious": 0.30, "threat": 0.55},
    "TRANSPORT": {"suspicious": 0.40, "threat": 0.65}
}

TH = SCENARIO_THRESHOLDS[SCENARIO]

# ================== PARAMETERS ==================
BUFFER_SIZE = 25
STATE_CONFIRM_FRAMES = 6
DECAY_LAMBDA = 0.9
LOG_FILE = "events_log.csv"

# ================== LOGGING ==================
def init_log():
    if not os.path.exists(LOG_FILE):
        with open(LOG_FILE, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow([
                "timestamp",
                "mode",
                "scenario",
                "state",
                "risk_score",
                "risk_trend",
                "explanation",
                "fps"
            ])

def log_event(state, risk, trend, explanation, fps):
    with open(LOG_FILE, "a", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            MODE,
            SCENARIO,
            state,
            round(risk, 3),
            round(trend, 3),
            explanation,
            int(fps)
        ])

# ================== RISK ENGINE ==================
def evaluate_risk(emotion_buffer):
    if not emotion_buffer:
        return 0.0, {}

    now = time.time()
    weighted_sum = 0.0
    weight_total = 0.0
    emotion_contrib = {}

    for emotion, conf, t in emotion_buffer:
        decay = math.exp(-DECAY_LAMBDA * (now - t))
        value = EMOTION_WEIGHTS.get(emotion, 0.0) * conf * decay
        weighted_sum += value
        weight_total += decay
        emotion_contrib[emotion] = emotion_contrib.get(emotion, 0) + value

    risk = weighted_sum / max(weight_total, 1e-6)
    dominant_emotion = max(emotion_contrib, key=emotion_contrib.get)

    explanation = {
        "dominant_emotion": dominant_emotion,
        "buffer_size": len(emotion_buffer)
    }

    return risk, explanation

# ================== STATE DECISION ==================
def determine_state(risk):
    if risk > TH["threat"]:
        return "POTENTIAL THREAT"
    elif risk > TH["suspicious"]:
        return "SUSPICIOUS"
    else:
        return "NORMAL"

# ================== MAIN ==================
def main():
    init_log()

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Камера не открылась")
        return

    face_cascade = cv2.CascadeClassifier(
        "haarcascade_frontalface_default.xml"
    )

    emotion_model = tf.keras.models.load_model(
        "emotion_model.h5", compile=False
    )

    emotion_buffer = deque(maxlen=BUFFER_SIZE)
    risk_history = deque(maxlen=10)

    last_state = "NORMAL"
    state_counter = 0

    prev_time = time.time()

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        curr_time = time.time()
        fps = 1 / max(curr_time - prev_time, 1e-6)
        prev_time = curr_time

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        faces = face_cascade.detectMultiScale(
            gray, 1.2, 5, minSize=(80, 80)
        )

        # ===== MAIN FACE =====
        if len(faces) > 0:
            (x, y, w, h) = faces[0]
            face = gray[y:y+h, x:x+w]
            face = cv2.resize(face, (64, 64))
            face = face.astype("float32") / 255.0
            face = np.expand_dims(face, axis=(0, -1))

            preds = emotion_model.predict(face, verbose=0)[0]
            eid = np.argmax(preds)

            emotion_buffer.append(
                (EMOTIONS[eid], preds[eid], time.time())
            )

        # ===== RISK =====
        risk, explanation = evaluate_risk(emotion_buffer)
        risk_history.append(risk)

        trend = 0.0
        if len(risk_history) >= 2:
            trend = risk_history[-1] - risk_history[0]

        state = determine_state(risk)

        # ===== ANTI-Bounce =====
        if state == last_state:
            state_counter += 1
        else:
            state_counter = 1
            last_state = state

        if state_counter == STATE_CONFIRM_FRAMES and state != "NORMAL":
            log_event(
                state,
                risk,
                trend,
                explanation["dominant_emotion"],
                fps
            )

        # ===== VISUAL =====
        color = (0, 255, 0)
        if state == "SUSPICIOUS":
            color = (0, 165, 255)
        elif state == "POTENTIAL THREAT":
            color = (0, 0, 255)

        if len(faces) > 0:
            cv2.rectangle(frame, (x, y), (x+w, y+h), color, 3)

        cv2.putText(
            frame,
            f"{state} | risk={risk:.2f}",
            (10, 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            color,
            3
        )

        cv2.putText(
            frame,
            f"Trend: {trend:+.2f}",
            (10, 80),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (200, 200, 200),
            2
        )

        cv2.putText(
            frame,
            f"FPS: {int(fps)}",
            (10, 120),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (255, 255, 255),
            2
        )

        cv2.imshow("Public Safety AI – Emotion Risk Engine", frame)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
