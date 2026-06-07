class RiskStateMachine:
    def __init__(self):
        self.state = "NORMAL"
        self.counter = 0

    def update(self, risk):
        new_state = self._determine(risk)

        if new_state == self.state:
            self.counter += 1
        else:
            self.counter = 1
            self.state = new_state

        if self.counter >= 3:
            return self.state

        return "NORMAL"

    def _determine(self, risk):
        if risk > 0.65:
            return "POTENTIAL THREAT"
        elif risk > 0.35:
            return "SUSPICIOUS"
        return "NORMAL"
