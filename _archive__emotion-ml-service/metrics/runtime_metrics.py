from collections import deque
import time

class RuntimeMetrics:
    def __init__(self, window=10):
        self.values = deque(maxlen=window)
        self.timestamps = deque(maxlen=window)

    def update(self, value):
        self.values.append(value)
        self.timestamps.append(time.time())

    def stability(self):
        if len(self.values) < 2:
            return 0.0
        diffs = [abs(self.values[i] - self.values[i-1]) for i in range(1, len(self.values))]
        return round(1 / (1 + sum(diffs)), 3)

    def trend(self):
        if len(self.values) < 2:
            return 0.0
        return round(self.values[-1] - self.values[0], 3)

    def reaction_time(self):
        if len(self.timestamps) < 2:
            return 0.0
        return round(self.timestamps[-1] - self.timestamps[0], 3)

    def reset(self):
        self.values.clear()
        self.timestamps.clear()
