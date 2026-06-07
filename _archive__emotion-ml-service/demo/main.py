from risk.risk_engine import RiskEngine

engine = RiskEngine(scenario="PUBLIC")

# внутри цикла камеры
engine.push_emotion(emotion, confidence, time.time())
result = engine.compute_risk()

risk = result["risk"]
state = result["state"]
dominant = result["dominant_emotion"]
trend = result["trend"]
