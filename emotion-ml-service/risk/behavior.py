
import numpy as np

class BehaviorAnalyzer:
    def __init__(self):
        self.window = []

    def evaluate(self, buffer):
        if len(buffer) < 5:
            return 0.0

        emotions = [e for e, _, _ in buffer]

        aggression = emotions.count("Angry") + emotions.count("Fear")
        instability = len(set(emotions[-5:]))

        score = (aggression * 0.15) + (instability * 0.1)
        return min(score, 1.0)
