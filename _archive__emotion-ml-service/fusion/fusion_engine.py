from dataclasses import dataclass
from typing import Dict


@dataclass
class FusionResult:
    """
    Result of the multi‑signal fusion for a single learner.

    The goal is to keep the aggregation fully transparent:
    we expose both the fused score and the contribution of each component.
    """

    fused_risk: float
    state: str
    engagement_state: str
    explanation: str
    components: Dict[str, float]

    def to_dict(self) -> Dict:
        return {
            "fused_risk": round(self.fused_risk, 3),
            "state": self.state,
            "engagement_state": self.engagement_state,
            "explanation": self.explanation,
            "components": {k: round(v, 3) for k, v in self.components.items()},
        }


class FusionEngine:
    """
    Context-aware fusion of heterogeneous signals for educational assessment.

    Research Design:
    ----------------
    This module implements a linear, interpretable fusion model that combines
    multiple behavioral and emotional indicators into a unified assessment.

    Inputs (all ∈ [0, 1]):
    - emotion_risk:  Risk score based on negative emotion prevalence
                     (computed from TemporalEmotionBuffer via RiskEngine)
    - motion_risk:   Behavioral risk from face movement patterns
                     (computed from bounding box displacement via FaceMotionAnalyzer)
    - stability:     Temporal stability of emotional state
                     (computed from emotion distribution entropy)
    - engagement:   Educational engagement score
                     (computed from active/passive emotion balance)
    - stress:        Stress level indicator
                     (computed from high-arousal negative emotion persistence)
    - fatigue:       Fatigue/overload indicator
                     (computed from neutral/sad dominance + monotony)

    Fusion Formula:
    ---------------
    fused_risk = Σ(w_i * x_i) for i in {emotion_risk, motion_risk, stress, fatigue, instability}

    where:
    - w_i are scenario-specific weights (sum to 1.0)
    - instability = 1.0 - stability (complementary measure)
    - All weights and thresholds are explicitly defined in scenario_profiles.py

    Rationale for Linear Fusion:
    ---------------------------
    1. Interpretability: Each component's contribution is transparent
    2. Academic defensibility: Weights can be justified from literature
    3. No black-box ML: Avoids opaque neural network fusion
    4. Scenario adaptation: Different contexts (SCHOOL vs PUBLIC) use different weights

    The fusion is *linear and explainable*: no hidden layers, only
    weighted sums and explicit thresholds defined in `scenario_profiles`.
    """

    def __init__(self, scenario_profile: Dict):
        """
        Initialize fusion engine with scenario-specific profile.

        Parameters
        ----------
        scenario_profile : Dict
            Profile from scenario_profiles.py containing:
            - weights: Dict[str, float] - component weights
            - risk_thresholds: Dict[str, float] - state classification thresholds
            - engagement_thresholds: Dict[str, float] - engagement level thresholds
        """
        self.profile = scenario_profile

    # ------------------------------------------------------------------
    # Core fusion
    # ------------------------------------------------------------------
    def fuse(
        self,
        *,
        emotion_risk: float,
        motion_risk: float,
        stability: float,
        engagement: float,
        stress: float,
        fatigue: float,
    ) -> FusionResult:
        """
        Fuse multiple signals into unified assessment.

        Mathematical Model:
        ------------------
        Let:
          x = [emotion_risk, motion_risk, stress, fatigue, instability]
          w = [w_emotion, w_motion, w_stress, w_fatigue, w_instability]

        Then:
          fused_risk = w^T · x = Σ(w_i * x_i)

        where instability = 1.0 - stability (inverse relationship).

        State Classification:
        --------------------
        The fused_risk is mapped to discrete states using thresholds:
        - NORMAL:           fused_risk ≤ threshold_suspicious
        - SUSPICIOUS:       threshold_suspicious < fused_risk ≤ threshold_threat
        - POTENTIAL THREAT: fused_risk > threshold_threat

        Engagement State Classification:
        --------------------------------
        Combines engagement, stress, and fatigue into educational states:
        - ENGAGED:          high engagement, low stress
        - TENSE_INVOLVEMENT: high engagement, high stress
        - DISENGAGED:       low engagement, low stress/fatigue
        - FATIGUED:         low engagement, high fatigue
        - OVERLOADED:       low engagement, high stress
        - NEUTRAL:          moderate engagement

        Parameters
        ----------
        emotion_risk : float
            Emotion-based risk ∈ [0, 1]
        motion_risk : float
            Motion-based risk ∈ [0, 1]
        stability : float
            Temporal stability ∈ [0, 1] (1 = very stable)
        engagement : float
            Engagement score ∈ [0, 1]
        stress : float
            Stress level ∈ [0, 1]
        fatigue : float
            Fatigue level ∈ [0, 1]

        Returns
        -------
        FusionResult
            Complete fusion result with:
            - fused_risk: unified risk score
            - state: security-oriented state
            - engagement_state: educational state
            - explanation: natural language justification
            - components: per-component contributions
        """
        weights = self.profile["weights"]

        # Instability is the complement of stability
        # Rationale: High instability (frequent emotion changes) is a risk factor
        instability = 1.0 - stability

        components = {
            "emotion_risk": emotion_risk,
            "motion_risk": motion_risk,
            "stress": stress,
            "fatigue": fatigue,
            "instability": instability,
        }

        # Linear weighted sum: fused_risk = Σ(w_i * x_i)
        # This is the ONLY place where signals are combined.
        # All weights sum to 1.0 (enforced in scenario_profiles.py)
        fused_risk = 0.0
        for key, value in components.items():
            fused_risk += weights.get(key, 0.0) * value

        # Clamp to valid range
        fused_risk = max(0.0, min(1.0, fused_risk))

        # --- risk state ---
        r_th = self.profile["risk_thresholds"]
        if fused_risk > r_th["threat"]:
            state = "POTENTIAL THREAT"
        elif fused_risk > r_th["suspicious"]:
            state = "SUSPICIOUS"
        else:
            state = "NORMAL"

        # --- engagement state (educational perspective) ---
        e_th = self.profile["engagement_thresholds"]
        if engagement < e_th["low"]:
            if fatigue > 0.6:
                engagement_state = "FATIGUED"
            elif stress > 0.6:
                engagement_state = "OVERLOADED"
            else:
                engagement_state = "DISENGAGED"
        elif engagement > e_th["high"]:
            if stress > 0.6:
                engagement_state = "TENSE_INVOLVEMENT"
            else:
                engagement_state = "ENGAGED"
        else:
            engagement_state = "NEUTRAL"

        # --- natural‑language explanation (educational focus) ---
        parts = []
        if components["emotion_risk"] > 0.5:
            parts.append(
                "преобладают негативные эмоциональные реакции "
                "(тревога, раздражение, страх), что может указывать на "
                "эмоциональный дискомфорт в процессе обучения"
            )
        if components["motion_risk"] > 0.5:
            parts.append(
                "наблюдается повышенная двигательная активность "
                "(частые движения головы, суетливость), что может "
                "свидетельствовать о снижении концентрации внимания"
            )
        if stress > 0.5:
            parts.append(
                "выявлен повышенный уровень стресса, что может "
                "затруднять усвоение учебного материала"
            )
        if fatigue > 0.5:
            parts.append(
                "обнаружены признаки накопленной усталости и "
                "снижения когнитивной активности"
            )
        if instability > 0.5:
            parts.append(
                "эмоциональное состояние нестабильно во времени, "
                "что может указывать на трудности с поддержанием "
                "устойчивой вовлечённости"
            )

        if not parts:
            explanation = (
                "Эмоциональное и поведенческое состояние находится "
                "в пределах нормы; признаки устойчивой вовлечённости "
                "в учебный процесс."
            )
        else:
            explanation = "; ".join(parts)

        return FusionResult(
            fused_risk=float(fused_risk),
            state=state,
            engagement_state=engagement_state,
            explanation=explanation,
            components=components,
        )
