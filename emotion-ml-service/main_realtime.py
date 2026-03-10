import time
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np

from analytics.group_engagement import GroupEngagementAnalyzer
from analytics.session_analyzer import SessionAnalyzer
from event_logging.event_logger import init_logs, log_face_state
from fusion.fusion_engine import FusionEngine
from fusion.scenario_profiles import SCENARIOS as FUSION_SCENARIOS
from inference.emotion_model import EmotionModel
from inference.face_processor import FaceProcessor, crop_face_with_margin
from metrics.runtime_metrics import RuntimeMetrics
from tracking.face_tracker import FaceTracker
from utils.validation import (
    SmoothingFilter,
    ConfidenceHandler,
    DataQualityValidator,
    BufferStateValidator,
)
from utils.data_export import export_session_to_json, export_summary_report
from utils.text_renderer import (
    translate_justification_for_display,
    get_english_state_name,
    get_english_pattern_name,
    get_english_tz_state_label,
)
from config.participant_registry import ParticipantRegistry
from config.tz_emotion_mapping import map_to_tz_state, get_tz_state_summary
from analytics.attention_drops import AttentionDropDetector

CAMERA_INDEX = 0
SCENARIO = "SCHOOL" 
WINDOW_TITLE = "Emotion Engagement Analytics – Realtime"

ANALYSIS_INTERVAL_SEC = 0.5
FACE_CROP_MARGIN = 0.15
FACE_DETECTOR = "haar"

FONT = cv2.FONT_HERSHEY_SIMPLEX
FONT_SCALE_SMALL = 0.45
FONT_SCALE_MEDIUM = 0.5
FONT_SCALE_LARGE = 0.6

RISK_COLORS = {
    "NORMAL": (0, 220, 0),  # Green
    "SUSPICIOUS": (0, 170, 255),  # Orange
    "POTENTIAL THREAT": (0, 0, 255),  # Red
}

ENGAGEMENT_COLORS = {
    "ENGAGED": (0, 255, 100), 
    "TENSE_INVOLVEMENT": (0, 200, 255),
    "FATIGUED": (0, 150, 255),
    "OVERLOADED": (0, 100, 255), 
    "DISENGAGED": (150, 150, 150), 
    "NEUTRAL": (200, 200, 200), 
}

STRESS_COLORS = {
    "LOW": (0, 255, 0), 
    "MEDIUM": (0, 200, 255), 
    "HIGH": (0, 0, 255), 
}

def draw_face_panel(
    frame,
    face_id: int,
    box: Tuple[int, int, int, int],
    fused: Dict,
) -> None:
    """
    Render a comprehensive analytics panel for a single student.

    The panel prioritizes educational metrics (engagement, stress, fatigue)
    while keeping risk indicators visible for research purposes.

    Layout:
    - Line 1: Student ID and engagement state (primary)
    - Line 2: Engagement score with visual bar
    - Line 3: Stress and fatigue indicators
    - Line 4: Dominant emotion and stability
    - Line 5: TZ state (по ТЗ п. 4.2.1)
    - Line 6: Risk metrics (for research/analysis)
    """
    x, y, w, h = box

    engagement_state = fused.get("engagement_state", "NEUTRAL")
    engagement = fused.get("engagement", 0.0)
    stress = fused.get("stress", 0.0)
    fatigue = fused.get("fatigue", 0.0)
    dominant = fused.get("dominant_emotion", "none")
    stability = fused.get("stability", 0.0)
    tz_state = fused.get("tz_state", "")
    emotion_risk = fused.get("risk", 0.0)
    fused_risk = fused.get("fused_risk", 0.0)
    motion_risk = fused.get("motion_risk", 0.0)

    primary_color = ENGAGEMENT_COLORS.get(
        engagement_state, (200, 200, 200)
    )
    risk_color = RISK_COLORS.get(fused.get("state", "NORMAL"), (255, 255, 255))

    cv2.rectangle(frame, (x, y), (x + w, y + h), primary_color, 2)

    panel_h = 152
    panel_y1 = max(0, y - panel_h)

    overlay = frame[panel_y1:y, x : x + w].copy()
    cv2.rectangle(frame, (x, panel_y1), (x + w, y), (0, 0, 0), -1)
    frame[panel_y1:y, x : x + w] = cv2.addWeighted(
        frame[panel_y1:y, x : x + w], 0.55, overlay, 0.45, 0
    )

    engagement_state_en = get_english_state_name(engagement_state)
    line_y = panel_y1 + 20
    cv2.putText(
        frame,
        f"Student {face_id} | {engagement_state_en}",
        (x + 6, line_y),
        FONT,
        FONT_SCALE_SMALL,
        primary_color,
        1,
        cv2.LINE_AA,
    )

    line_y += 22
    eng_text = f"Engagement: {engagement:.2f}"
    cv2.putText(
        frame,
        eng_text,
        (x + 6, line_y),
        FONT,
        FONT_SCALE_SMALL,
        primary_color,
        1,
        cv2.LINE_AA,
    )
    bar_x = x + 6
    bar_y = line_y + 5
    bar_w = int(w * 0.7)
    bar_h = 4
    cv2.rectangle(
        frame,
        (bar_x, bar_y),
        (bar_x + bar_w, bar_y + bar_h),
        (50, 50, 50),
        -1,
    )
    filled_w = int(bar_w * engagement)
    if filled_w > 0:
        cv2.rectangle(
            frame,
            (bar_x, bar_y),
            (bar_x + filled_w, bar_y + bar_h),
            primary_color,
            -1,
        )

    line_y += 22
    stress_level = "HIGH" if stress > 0.6 else "MEDIUM" if stress > 0.3 else "LOW"
    stress_color = STRESS_COLORS.get(stress_level, (200, 200, 200))
    cv2.putText(
        frame,
        f"Stress: {stress:.2f} | Fatigue: {fatigue:.2f}",
        (x + 6, line_y),
        FONT,
        FONT_SCALE_SMALL,
        stress_color,
        1,
        cv2.LINE_AA,
    )

    line_y += 22
    cv2.putText(
        frame,
        f"Emotion: {dominant} | Stability: {stability:.2f}",
        (x + 6, line_y),
        FONT,
        FONT_SCALE_SMALL,
        (200, 200, 200),
        1,
        cv2.LINE_AA,
    )

    line_y += 22
    tz_label_en = get_english_tz_state_label(tz_state)
    cv2.putText(
        frame,
        f"TZ: {tz_label_en}",
        (x + 6, line_y),
        FONT,
        0.4,
        (180, 220, 255),
        1,
        cv2.LINE_AA,
    )

    line_y += 22
    cv2.putText(
        frame,
        f"Risk: E={emotion_risk:.2f} M={motion_risk:.2f} F={fused_risk:.2f}",
        (x + 6, line_y),
        FONT,
        0.4,
        risk_color,
        1,
        cv2.LINE_AA,
    )


def draw_global_hud(
    frame,
    fps: float,
    faces_count: int,
    group_state: Dict,
) -> None:
    """
    Draw a comprehensive global HUD with runtime and group-level analytics.

    The HUD prioritizes educational metrics and group dynamics over
    technical details, suitable for academic presentation.
    """
    panel_h = 110 if group_state else 50
    cv2.rectangle(frame, (0, 0), (500, panel_h), (0, 0, 0), -1)

    cv2.putText(
        frame,
        f"FPS: {int(fps)} | Active Students: {faces_count}",
        (10, 25),
        FONT,
        FONT_SCALE_MEDIUM,
        (255, 255, 255),
        2,
    )

    if group_state and group_state.get("group_size", 0) > 0:
        group_state_name = get_english_state_name(
            group_state.get("group_state", "UNKNOWN")
        )
        group_color = ENGAGEMENT_COLORS.get(group_state_name, (200, 200, 200))
        avg_engagement = group_state.get("avg_engagement", 0.0)
        avg_stress = group_state.get("avg_stress", 0.0)

        text1 = (
            f"Group State: {group_state_name} | "
            f"Avg Engagement: {avg_engagement:.2f} | "
            f"Avg Stress: {avg_stress:.2f}"
        )
        cv2.putText(
            frame,
            text1,
            (10, 50),
            FONT,
            FONT_SCALE_SMALL,
            group_color,
            1,
        )

        group_pattern = get_english_pattern_name(
            group_state.get("group_pattern", "UNKNOWN")
        )
        heterogeneity = group_state.get("heterogeneity_level", "UNKNOWN")
        avg_fatigue = group_state.get("avg_fatigue", 0.0)

        text2 = (
            f"Pattern: {group_pattern} | "
            f"Heterogeneity: {heterogeneity} | "
            f"Avg Fatigue: {avg_fatigue:.2f}"
        )
        cv2.putText(
            frame,
            text2,
            (10, 72),
            FONT,
            FONT_SCALE_SMALL,
            (180, 180, 180),
            1,
        )

        justification_ru = group_state.get("justification", "")
        if justification_ru:
            justification_en = translate_justification_for_display(justification_ru)
            max_len = 80
            if len(justification_en) > max_len:
                justification_en = justification_en[:max_len] + "..."
            cv2.putText(
                frame,
                justification_en,
                (10, 94),
                FONT,
                0.4,
                (150, 150, 150),
                1,
            )

def process_frame(
    frame,
    gray,
    faces: List[Tuple[int, int, int, int]],
    tracker: FaceTracker,
    emotion_model: EmotionModel,
    fusion_engine: FusionEngine,
    participant_registry: Optional[ParticipantRegistry] = None,
    attention_detectors: Optional[Dict[int, AttentionDropDetector]] = None,
) -> Tuple[List[Tuple[int, Tuple[int, int, int, int], Dict]], Dict]:
    """
    High‑level orchestration for a single video frame.

    Returns:
        - list of (face_id, box, fused_state) for per‑student panels;
        - group‑level analytics dictionary.
    """
    tracked = tracker.update(faces)
    per_face_states: List[Tuple[int, Tuple[int, int, int, int], Dict]] = []

    if not hasattr(tracker, "_last_emotion_time"):
        tracker._last_emotion_time = {}
    now_sec = time.time()

    for face_id, (x, y, w, h) in tracked:
        face_img = crop_face_with_margin(gray, (x, y, w, h), margin=FACE_CROP_MARGIN)
        if face_img.size == 0:
            continue

        engine = tracker.get_engine(face_id)
        do_analyze = (now_sec - tracker._last_emotion_time.get(face_id, 0)) >= ANALYSIS_INTERVAL_SEC
        if do_analyze:
            tracker._last_emotion_time[face_id] = now_sec
            em_pred = emotion_model.predict(face_img)
            emotion = em_pred["emotion"]
            confidence = float(em_pred["confidence"])
            if not hasattr(tracker, "_confidence_handlers"):
                tracker._confidence_handlers = {}
            if face_id not in tracker._confidence_handlers:
                tracker._confidence_handlers[face_id] = ConfidenceHandler()
            confidence_handler = tracker._confidence_handlers[face_id]
            processed_emotion, processed_confidence, confidence_flags = (
                confidence_handler.process_prediction(emotion, confidence)
            )
            engine.push_emotion(processed_emotion, processed_confidence)
        else:
            confidence_flags = {}

        risk_state = engine.compute_risk()
        buffer_size = engine.buffer.size()
        data_quality = BufferStateValidator.get_data_quality_flag(buffer_size)
        risk_state["data_quality"] = data_quality
        risk_state["confidence_flags"] = confidence_flags

        motion_analyzer = tracker.get_motion_analyzer(face_id)
        motion_risk = motion_analyzer.compute_risk()

        if not hasattr(tracker, "_smoothing_filters"):
            tracker._smoothing_filters = {}
        if face_id not in tracker._smoothing_filters:
            tracker._smoothing_filters[face_id] = {
                "engagement": SmoothingFilter(alpha=0.3),
                "stress": SmoothingFilter(alpha=0.3),
                "fatigue": SmoothingFilter(alpha=0.3),
                "motion_risk": SmoothingFilter(alpha=0.4),
            }
        
        filters = tracker._smoothing_filters[face_id]

        smoothed_engagement = filters["engagement"].update(risk_state["engagement"])
        smoothed_stress = filters["stress"].update(risk_state["stress"])
        smoothed_fatigue = filters["fatigue"].update(risk_state.get("fatigue", 0.0))
        smoothed_motion_risk = filters["motion_risk"].update(motion_risk)

        risk_state["engagement"] = smoothed_engagement
        risk_state["stress"] = smoothed_stress
        risk_state["fatigue"] = smoothed_fatigue

        fusion = fusion_engine.fuse(
            emotion_risk=risk_state["risk"],
            motion_risk=smoothed_motion_risk,
            stability=risk_state["stability"],
            engagement=smoothed_engagement,
            stress=smoothed_stress,
            fatigue=smoothed_fatigue,
        ).to_dict()

        risk_state["motion_risk"] = smoothed_motion_risk
        risk_state["motion_metrics"] = motion_analyzer.get_metrics()

        fused_state: Dict = {**risk_state, **fusion}

        tz_state, tz_state_label_ru = map_to_tz_state(
            fused_state.get("dominant_emotion", "Neutral"),
            fused_state.get("engagement", 0.0),
            fused_state.get("stress", 0.0),
            fused_state.get("stability", 0.0),
        )
        fused_state["tz_state"] = tz_state
        fused_state["tz_state_label_ru"] = tz_state_label_ru
        fused_state["participant_label"] = (
            participant_registry.get_display_label(face_id)
            if participant_registry else f"Participant {face_id}"
        )


        if attention_detectors is not None:
            if face_id not in attention_detectors:
                attention_detectors[face_id] = AttentionDropDetector(
                    engagement_threshold=0.4,
                    min_duration_sec=5.0,
                )
            drop = attention_detectors[face_id].update(
                face_id,
                fused_state.get("engagement", 0.0),
                timestamp=time.time(),
                participant_label=fused_state.get("participant_label"),
            )
            if drop:
                fused_state["last_attention_drop"] = {
                    "duration_sec": round(drop.duration_sec, 1),
                    "min_engagement": round(drop.min_engagement, 3),
                }

        is_valid, error_msg = DataQualityValidator.validate_state_dict(fused_state)
        if not is_valid:
            fused_state = DataQualityValidator.sanitize_state_dict(fused_state)
            fused_state["validation_warning"] = error_msg
        
        per_face_states.append((face_id, (x, y, w, h), fused_state))

    group_analyzer = GroupEngagementAnalyzer()
    group_input = [state for _, _, state in per_face_states]
    group_state = group_analyzer.analyze(group_input) if group_input else {}

    if group_input:
        group_state["tz_state_distribution"] = get_tz_state_summary(group_input)

    return per_face_states, group_state


def main() -> None:

    init_logs()
    fps_metrics = RuntimeMetrics(window=30)


    session_id = str(uuid.uuid4())
    session_name = f"Session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    session_analyzer = SessionAnalyzer(
        session_id=session_id,
        session_name=f"Realtime Analysis - {SCENARIO}"
    )
    print(f"📊 Начата сессия: {session_name} (ID: {session_id})")

    cap = cv2.VideoCapture(CAMERA_INDEX)
    if not cap.isOpened():
        print("❌ Камера не открылась")
        return

    face_processor = FaceProcessor(detector=FACE_DETECTOR, min_face_size=(80, 80))
    emotion_model = EmotionModel("emotion_model.h5", use_clahe=True)
    tracker = FaceTracker(scenario=SCENARIO)
    fusion_profile = FUSION_SCENARIOS[SCENARIO]
    fusion_engine = FusionEngine(fusion_profile)
    participant_registry = ParticipantRegistry()
    attention_detectors: Dict[int, AttentionDropDetector] = {}

    prev_time = time.time()
    frame_count = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_processor.detect(gray, use_gray=True)

        per_face_states, group_state = process_frame(
            frame,
            gray,
            faces,
            tracker,
            emotion_model,
            fusion_engine,
            participant_registry=participant_registry,
            attention_detectors=attention_detectors,
        )

        for face_id, box, fused_state in per_face_states:
            draw_face_panel(frame, face_id, box, fused_state)

        curr_time = time.time()
        fps = 1 / max(curr_time - prev_time, 1e-6)
        prev_time = curr_time
        fps_metrics.update(fps)

        draw_global_hud(frame, fps, len(per_face_states), group_state)

        cv2.imshow(WINDOW_TITLE, frame)

        for face_id, _, fused_state in per_face_states:
            log_face_state(face_id, fps, fused_state)

        if frame_count % 5 == 0:
            frame_data_for_session = {
                "frame_number": frame_count,
                "timestamp": datetime.now().isoformat(),
                "fps": fps,
                "faces": [
                    {
                        "face_id": face_id,
                        "engagement": state.get("engagement", 0.0),
                        "stress": state.get("stress", 0.0),
                        "fatigue": state.get("fatigue", 0.0),
                        "confidence": state.get("confidence", 0.0),
                        "risk": state.get("risk", 0.0),
                        "fused_risk": state.get("fused_risk", 0.0),
                        "stability": state.get("stability", 0.0),
                        "dominant_emotion": state.get("dominant_emotion", "none"),
                        "engagement_state": state.get("engagement_state", "UNKNOWN"),
                        "tz_state": state.get("tz_state", "neutral"),
                        "participant_label": state.get("participant_label", f"Participant {face_id}"),
                    }
                    for face_id, _, state in per_face_states
                ],
                "group_state": group_state,
            }
            session_analyzer.add_frame(frame_data_for_session)
        
        frame_count += 1

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    print("\n📊 Завершение сессии и вычисление метрик...")

    all_attention_drops = []
    for fid, det in attention_detectors.items():
        for drop in det.get_all_drops():
            all_attention_drops.append({
                "face_id": fid,
                "participant_label": participant_registry.get_display_label(fid),
                "start_time": drop.start_time,
                "duration_sec": round(drop.duration_sec, 1),
                "min_engagement": round(drop.min_engagement, 3),
            })
    session_metrics = session_analyzer.end_session(attention_drops=all_attention_drops)
    
    json_path = export_session_to_json(session_metrics)
    report_path = export_summary_report(session_metrics)
    
    print(f"✅ Сессия завершена!")
    print(f"   - JSON экспорт: {json_path}")
    print(f"   - Отчёт: {report_path}")
    print(f"   - Длительность: {session_metrics.duration_seconds:.1f} сек")
    print(f"   - Средняя вовлечённость: {session_metrics.avg_engagement:.3f}")
    print(f"   - Средний стресс: {session_metrics.avg_stress:.3f}")

    face_processor.close()
    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()

