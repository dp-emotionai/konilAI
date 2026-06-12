import time
from tracking.face_tracker import FaceTracker

tracker = FaceTracker()

# имитация лиц в кадрах
frames = [
    [(100, 100, 60, 60)],                 # один человек
    [(105, 100, 60, 60)],                 # тот же
    [(110, 100, 60, 60), (300, 120, 60, 60)],  # появился второй
    [(305, 120, 60, 60)],                 # первый ушёл
]

for i, detections in enumerate(frames):
    tracked = tracker.update(detections)
    print(f"\nFrame {i+1}")

    for fid, box in tracked:
        engine = tracker.get_engine(fid)
        engine.push_emotion("Angry", 0.8)
        result = engine.compute_risk()
        print(f"Face {fid} → {result}")

    time.sleep(0.5)
