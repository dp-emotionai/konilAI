"""
Face motion analysis for educational engagement assessment.

This module computes motion-based risk indicators from face bounding box
displacement over time. The goal is to detect:
- excessive fidgeting (high jitter, low engagement)
- sudden movements (attention shifts, potential distraction)
- stillness patterns (possible fatigue or deep focus)

The approach is deliberately simple and interpretable:
- no machine learning, only geometric and temporal statistics
- all thresholds are explicit and can be justified academically
"""

import math
import time
from collections import deque
from typing import Tuple, Dict, Optional


class FaceMotionAnalyzer:
    """
    Analyzes face motion patterns from bounding box trajectories.

    The analyzer maintains a sliding window of recent positions and computes:
    1. Displacement velocity (pixels per second)
    2. Acceleration (change in velocity)
    3. Jitter (high-frequency small movements)
    4. Motion risk score [0, 1]

    Research rationale:
    - Moderate motion is normal (natural head movements)
    - Excessive motion can indicate distraction or restlessness
    - Very low motion can indicate fatigue or disengagement
    - Sudden accelerations may signal attention shifts
    """

    def __init__(
        self,
        window_size: int = 15,
        jitter_threshold: float = 2.0,
        high_velocity_threshold: float = 50.0,
        acceleration_threshold: float = 200.0,
    ):
        """
        Initialize the motion analyzer.

        Parameters
        ----------
        window_size : int
            Number of recent positions to track for temporal analysis.
        jitter_threshold : float
            Displacement threshold (pixels) below which movement is
            considered "jitter" rather than intentional motion.
        high_velocity_threshold : float
            Velocity threshold (pixels/sec) above which motion is
            considered potentially distracting.
        acceleration_threshold : float
            Acceleration threshold (pixels/sec²) above which motion
            is considered sudden/abrupt.
        """
        self.window_size = window_size
        self.jitter_threshold = jitter_threshold
        self.high_velocity_threshold = high_velocity_threshold
        self.acceleration_threshold = acceleration_threshold

        # Position history: (centroid_x, centroid_y, timestamp)
        self.position_history: deque = deque(maxlen=window_size)

    def update(self, box: Tuple[int, int, int, int]) -> float:
        """
        Update motion analysis with a new face bounding box.

        Parameters
        ----------
        box : Tuple[int, int, int, int]
            Face bounding box as (x, y, width, height).

        Returns
        -------
        float
            Motion risk score ∈ [0, 1], where:
            - 0.0 = minimal motion (possibly fatigue or deep focus)
            - 0.5 = normal, moderate motion
            - 1.0 = excessive motion (distraction, restlessness)
        """
        centroid = self._centroid(box)
        timestamp = time.time()

        self.position_history.append((centroid[0], centroid[1], timestamp))

        if len(self.position_history) < 3:
            # Not enough data for meaningful analysis
            return 0.0

        return self.compute_risk()

    def compute_risk(self) -> float:
        """
        Compute motion risk from the current position history.

        The risk score combines:
        1. Average velocity magnitude
        2. Acceleration spikes
        3. Jitter ratio (high-frequency small movements)

        Returns
        -------
        float
            Motion risk ∈ [0, 1]
        """
        if len(self.position_history) < 3:
            return 0.0

        positions = list(self.position_history)
        velocities = []
        accelerations = []

        # Compute velocities (displacement per second)
        for i in range(1, len(positions)):
            px, py, pt = positions[i - 1]
            cx, cy, ct = positions[i]

            dt = max(ct - pt, 1e-6)  # Avoid division by zero
            dx = cx - px
            dy = cy - py
            displacement = math.sqrt(dx * dx + dy * dy)
            velocity = displacement / dt

            velocities.append(velocity)

            # Compute acceleration (change in velocity)
            if i >= 2:
                prev_velocity = velocities[i - 2] if i >= 2 else 0.0
                acceleration = abs(velocity - prev_velocity) / dt
                accelerations.append(acceleration)

        if not velocities:
            return 0.0

        # --- Component 1: Average velocity ---
        avg_velocity = sum(velocities) / len(velocities)
        # Normalize: high_velocity_threshold maps to risk ~0.7
        velocity_risk = min(avg_velocity / self.high_velocity_threshold, 1.0)

        # --- Component 2: Acceleration spikes ---
        if accelerations:
            max_acceleration = max(accelerations)
            # Normalize: acceleration_threshold maps to risk ~0.8
            acceleration_risk = min(
                max_acceleration / self.acceleration_threshold, 1.0
            )
        else:
            acceleration_risk = 0.0

        # --- Component 3: Jitter detection ---
        # Count small displacements (likely jitter)
        jitter_count = sum(1 for v in velocities if v < self.jitter_threshold)
        jitter_ratio = jitter_count / len(velocities) if velocities else 0.0
        # High jitter ratio indicates restlessness
        jitter_risk = jitter_ratio * 0.5  # Moderate weight

        # --- Final fusion: weighted combination ---
        # Research-based weights:
        # - velocity: primary indicator of overall motion level
        # - acceleration: captures sudden attention shifts
        # - jitter: captures restlessness patterns
        motion_risk = (
            0.5 * velocity_risk + 0.3 * acceleration_risk + 0.2 * jitter_risk
        )

        # Clamp to [0, 1]
        return max(0.0, min(1.0, motion_risk))

    def get_metrics(self) -> Dict[str, float]:
        """
        Return detailed motion metrics for analysis and explanation.

        Returns
        -------
        Dict[str, float]
            Dictionary with:
            - motion_risk: overall risk score
            - avg_velocity: average displacement velocity (px/sec)
            - max_acceleration: peak acceleration (px/sec²)
            - jitter_ratio: fraction of small movements
        """
        if len(self.position_history) < 3:
            return {
                "motion_risk": 0.0,
                "avg_velocity": 0.0,
                "max_acceleration": 0.0,
                "jitter_ratio": 0.0,
            }

        positions = list(self.position_history)
        velocities = []
        accelerations = []

        for i in range(1, len(positions)):
            px, py, pt = positions[i - 1]
            cx, cy, ct = positions[i]

            dt = max(ct - pt, 1e-6)
            dx = cx - px
            dy = cy - py
            displacement = math.sqrt(dx * dx + dy * dy)
            velocity = displacement / dt

            velocities.append(velocity)

            if i >= 2:
                prev_velocity = velocities[i - 2] if i >= 2 else 0.0
                acceleration = abs(velocity - prev_velocity) / dt
                accelerations.append(acceleration)

        avg_velocity = sum(velocities) / len(velocities) if velocities else 0.0
        max_acceleration = max(accelerations) if accelerations else 0.0
        jitter_count = sum(
            1 for v in velocities if v < self.jitter_threshold
        )
        jitter_ratio = jitter_count / len(velocities) if velocities else 0.0

        return {
            "motion_risk": self.compute_risk(),
            "avg_velocity": round(avg_velocity, 2),
            "max_acceleration": round(max_acceleration, 2),
            "jitter_ratio": round(jitter_ratio, 3),
        }

    @staticmethod
    def _centroid(box: Tuple[int, int, int, int]) -> Tuple[int, int]:
        """Compute centroid of a bounding box."""
        x, y, w, h = box
        return (x + w // 2, y + h // 2)
