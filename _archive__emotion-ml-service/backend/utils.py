import math
import time

def exponential_decay(delta_t: float, lambda_: float = 0.9) -> float:
    return math.exp(-lambda_ * delta_t)


def current_timestamp() -> float:
    return time.time()
