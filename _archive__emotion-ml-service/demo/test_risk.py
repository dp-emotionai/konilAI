import time
from risk.risk_engine import RiskEngine

engine = RiskEngine(scenario="PUBLIC")

events = [
    ("Neutral", 0.6),
    ("Neutral", 0.6),
    ("Angry", 0.8),
    ("Angry", 0.9),
    ("Angry", 0.85),
]

for emotion, conf in events:
    engine.push_emotion(emotion, conf)
    result = engine.compute_risk()
    print(result)
    time.sleep(0.3)
