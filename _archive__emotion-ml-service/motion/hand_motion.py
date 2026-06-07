import math
import time
from collections import deque

class HandMotionAnalyzer:
    def __init__(self):
        self.prev_pos = None
        self.prev_time = None
        self.speed_buffer = deque(maxlen=10)

    def update(self, pos):
        now = time.time()
        if self.prev_pos is None:
            self.prev_pos = pos
            self.prev_time = now
            return 0.0

        dx = pos[0] - self.prev_pos[0]
        dy = pos[1] - self.prev_pos[1]
        dt = now - self.prev_time

        speed = math.sqrt(dx*dx + dy*dy) / max(dt, 1e-6)
        self.speed_buffer.append(speed)

        self.prev_pos = pos
        self.prev_time = now

        return self.compute_risk()

    def compute_risk(self):
        if not self.speed_buffer:
            return 0.0
        avg_speed = sum(self.speed_buffer) / len(self.speed_buffer)
        return min(avg_speed / 1.5, 1.0)
