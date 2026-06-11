"""
Group-level engagement and dynamics analysis.

This module analyzes collective patterns across multiple learners:
- average engagement, stress, fatigue
- collective disengagement detection
- stress spike detection
- heterogeneity (variance between students)

The goal is to provide educators with insights into classroom dynamics
beyond individual student metrics.
"""

from collections import defaultdict
from typing import Dict, List, Optional
import numpy as np


class GroupEngagementAnalyzer:
    """
    Analyzes collective emotional and engagement patterns across a group.

    Research focus:
    - Collective disengagement: when most students show low engagement
    - Stress contagion: when stress levels spike across the group
    - Heterogeneity: variance in engagement/stress (some engaged, some not)
    - Dominant group pattern: what characterizes the majority

    All metrics are interpretable and suitable for academic reporting.
    """

    def __init__(self, history_window: int = 10):
        """
        Initialize the group analyzer.

        Parameters
        ----------
        history_window : int
            Number of recent frames to consider for trend detection.
        """
        self.history: List[Dict] = []
        self.history_window = history_window

    def analyze(self, individuals: List[Dict]) -> Dict:
        """
        Analyze group-level patterns from individual student states.

        Parameters
        ----------
        individuals : List[Dict]
            List of per-student state dictionaries from RiskEngine/FusionEngine.
            Each dict should contain: risk, engagement, stress, fatigue,
            stability, dominant_emotion.

        Returns
        -------
        Dict
            Group-level analytics with:
            - group_size: number of students
            - avg_*: mean values across group
            - std_*: standard deviations (heterogeneity indicators)
            - group_state: overall state classification
            - group_pattern: dominant pattern description
            - justification: textual explanation of group state
            - emotion_distribution: frequency of dominant emotions
            - collective_disengagement: boolean flag
            - stress_spike: boolean flag
            - heterogeneity_level: LOW | MEDIUM | HIGH
        """
        if not individuals:
            return self._empty()

        # Extract metrics
        risks = [p.get("risk", 0.0) for p in individuals]
        engagement = [p.get("engagement", 0.0) for p in individuals]
        stress = [p.get("stress", 0.0) for p in individuals]
        fatigue = [p.get("fatigue", 0.0) for p in individuals]
        stability = [p.get("stability", 0.0) for p in individuals]

        # Compute aggregates
        avg_risk = float(np.mean(risks))
        avg_engagement = float(np.mean(engagement))
        avg_stress = float(np.mean(stress))
        avg_fatigue = float(np.mean(fatigue))
        avg_stability = float(np.mean(stability))

        # Compute heterogeneity (standard deviations)
        std_engagement = float(np.std(engagement))
        std_stress = float(np.std(stress))
        std_fatigue = float(np.std(fatigue))

        # Emotion distribution
        dominant_emotions = defaultdict(int)
        for p in individuals:
            emotion = p.get("dominant_emotion", "Unknown")
            dominant_emotions[emotion] += 1

        # Detect collective patterns
        collective_disengagement = self._detect_collective_disengagement(
            engagement, avg_engagement
        )
        stress_spike = self._detect_stress_spike(stress, avg_stress)
        heterogeneity_level = self._assess_heterogeneity(
            std_engagement, std_stress
        )

        # Determine group state
        group_state = self._group_state(
            avg_engagement, avg_stress, avg_fatigue
        )

        # Identify dominant pattern
        group_pattern = self._identify_pattern(
            avg_engagement,
            avg_stress,
            avg_fatigue,
            collective_disengagement,
            stress_spike,
            heterogeneity_level,
        )

        # Generate justification
        justification = self._generate_justification(
            group_state,
            group_pattern,
            avg_engagement,
            avg_stress,
            avg_fatigue,
            collective_disengagement,
            stress_spike,
            heterogeneity_level,
        )

        result = {
            "group_size": len(individuals),
            # Aggregates
            "avg_risk": round(avg_risk, 3),
            "avg_engagement": round(avg_engagement, 3),
            "avg_stress": round(avg_stress, 3),
            "avg_fatigue": round(avg_fatigue, 3),
            "avg_stability": round(avg_stability, 3),
            # Heterogeneity (variance between students)
            "std_engagement": round(std_engagement, 3),
            "std_stress": round(std_stress, 3),
            "std_fatigue": round(std_fatigue, 3),
            # Group patterns
            "group_state": group_state,
            "group_pattern": group_pattern,
            "justification": justification,
            "collective_disengagement": collective_disengagement,
            "stress_spike": stress_spike,
            "heterogeneity_level": heterogeneity_level,
            # Emotion distribution
            "emotion_distribution": dict(dominant_emotions),
        }

        self.history.append(result)
        # Keep only recent history
        if len(self.history) > self.history_window:
            self.history.pop(0)

        return result

    # ================== PATTERN DETECTION ==================

    def _detect_collective_disengagement(
        self, engagement: List[float], avg_engagement: float
    ) -> bool:
        """
        Detect if most students show low engagement.

        Threshold: >70% of students have engagement < 0.4.
        """
        low_engagement_count = sum(1 for e in engagement if e < 0.4)
        threshold = len(engagement) * 0.7
        return low_engagement_count >= threshold

    def _detect_stress_spike(
        self, stress: List[float], avg_stress: float
    ) -> bool:
        """
        Detect if stress levels spike across the group.

        Threshold: average stress > 0.6 AND >50% of students have stress > 0.5.
        """
        if avg_stress < 0.6:
            return False
        high_stress_count = sum(1 for s in stress if s > 0.5)
        threshold = len(stress) * 0.5
        return high_stress_count >= threshold

    def _assess_heterogeneity(
        self, std_engagement: float, std_stress: float
    ) -> str:
        """
        Assess heterogeneity level based on variance in engagement/stress.

        High heterogeneity means some students are engaged while others are not.
        """
        # Normalize std to [0, 1] range (assuming max std ~0.5)
        normalized_std = max(std_engagement, std_stress) / 0.5

        if normalized_std < 0.3:
            return "LOW"  # Homogeneous group
        elif normalized_std < 0.6:
            return "MEDIUM"
        else:
            return "HIGH"  # Very heterogeneous

    def _group_state(
        self, avg_engagement: float, avg_stress: float, avg_fatigue: float
    ) -> str:
        """
        Classify overall group state based on educational metrics.
        """
        if avg_engagement < 0.35 and avg_stress > 0.6:
            return "OVERLOADED"
        if avg_fatigue > 0.6:
            return "FATIGUED"
        if avg_engagement < 0.4:
            return "DISENGAGED"
        if avg_stress > 0.6:
            return "STRESSED"
        if avg_engagement > 0.65:
            return "ENGAGED"
        return "NEUTRAL"

    def _identify_pattern(
        self,
        avg_engagement: float,
        avg_stress: float,
        avg_fatigue: float,
        collective_disengagement: bool,
        stress_spike: bool,
        heterogeneity_level: str,
    ) -> str:
        """
        Identify the dominant group pattern for reporting.
        """
        if collective_disengagement:
            return "COLLECTIVE_DISENGAGEMENT"
        if stress_spike:
            return "STRESS_CONTAGION"
        if avg_fatigue > 0.6:
            return "COLLECTIVE_FATIGUE"
        if heterogeneity_level == "HIGH":
            return "MIXED_ENGAGEMENT"
        if avg_engagement > 0.7:
            return "HIGH_ENGAGEMENT"
        return "STABLE"

    def _generate_justification(
        self,
        group_state: str,
        group_pattern: str,
        avg_engagement: float,
        avg_stress: float,
        avg_fatigue: float,
        collective_disengagement: bool,
        stress_spike: bool,
        heterogeneity_level: str,
    ) -> str:
        """
        Generate human-readable justification for group state.
        """
        parts = []

        # State description
        parts.append(f"Общее состояние группы: {group_state}")

        # Pattern description
        pattern_descriptions = {
            "COLLECTIVE_DISENGAGEMENT": (
                "большинство студентов демонстрируют низкую вовлечённость"
            ),
            "STRESS_CONTAGION": (
                "наблюдается коллективный всплеск стресса"
            ),
            "COLLECTIVE_FATIGUE": (
                "преобладают признаки накопленной усталости"
            ),
            "MIXED_ENGAGEMENT": (
                "группа неоднородна: значительный разброс в уровнях "
                "вовлечённости между студентами"
            ),
            "HIGH_ENGAGEMENT": (
                "высокий средний уровень вовлечённости в учебный процесс"
            ),
            "STABLE": (
                "группа демонстрирует стабильное эмоциональное состояние"
            ),
        }
        parts.append(
            f"Доминирующий паттерн: {pattern_descriptions.get(group_pattern, group_pattern)}"
        )

        # Metrics summary
        parts.append(
            f"Средние показатели: вовлечённость={avg_engagement:.2f}, "
            f"стресс={avg_stress:.2f}, усталость={avg_fatigue:.2f}"
        )

        # Heterogeneity note
        if heterogeneity_level == "HIGH":
            parts.append(
                "Высокая неоднородность группы требует дифференцированного "
                "подхода к обучению"
            )

        return ". ".join(parts) + "."

    def _empty(self) -> Dict:
        """Return empty result when no students are present."""
        return {
            "group_size": 0,
            "avg_risk": 0.0,
            "avg_engagement": 0.0,
            "avg_stress": 0.0,
            "avg_fatigue": 0.0,
            "avg_stability": 1.0,
            "std_engagement": 0.0,
            "std_stress": 0.0,
            "std_fatigue": 0.0,
            "group_state": "NO_DATA",
            "group_pattern": "NO_DATA",
            "justification": "Нет данных для анализа группы.",
            "collective_disengagement": False,
            "stress_spike": False,
            "heterogeneity_level": "LOW",
            "emotion_distribution": {},
        }
