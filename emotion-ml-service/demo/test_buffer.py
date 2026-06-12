import time
from temporal.buffer import TemporalEmotionBuffer

buf = TemporalEmotionBuffer()

buf.push("Angry", 0.8)
time.sleep(0.2)
buf.push("Angry", 0.7)
time.sleep(0.2)
buf.push("Neutral", 0.9)

print("Weighted:", buf.weighted_emotions())
print("Dominant:", buf.dominant_emotion())
print("Stability:", round(buf.stability(), 3))
