"""
Сессионная аналитика для агрегации данных по учебным сессиям.

Этот модуль предоставляет:
- Агрегацию метрик по сессии (лекция, экзамен, практика)
- Сравнение начала/конца сессии
- Выявление паттернов (когда engagement падал/рос)
- Статистику для отчётов и визуализации

Все метрики интерпретируемы и подходят для академического анализа.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
from datetime import datetime
import numpy as np

from analytics.confidence import compute_confidence


@dataclass
class SessionMetrics:
    """
    Агрегированные метрики по сессии.
    
    Содержит:
    - Средние значения за всю сессию
    - Значения в начале и конце сессии
    - Динамику изменений
    - Паттерны поведения
    """
    
    session_id: str
    session_name: str
    start_time: str
    end_time: str
    duration_seconds: float
    
    # Агрегированные метрики по всем студентам
    avg_engagement: float
    avg_stress: float
    avg_fatigue: float
    avg_risk: float
    avg_stability: float
    
    # Метрики в начале сессии (первые 20% времени)
    initial_engagement: float
    initial_stress: float
    initial_fatigue: float
    
    # Метрики в конце сессии (последние 20% времени)
    final_engagement: float
    final_stress: float
    final_fatigue: float
    
    # Изменения (final - initial)
    engagement_change: float
    stress_change: float
    fatigue_change: float
    
    # Паттерны
    engagement_trend: str  # "INCREASING" | "DECREASING" | "STABLE" | "FLUCTUATING"
    stress_peaks: int  # Количество пиков стресса
    disengagement_periods: int  # Количество периодов низкой вовлечённости
    
    # Статистика по студентам
    total_students: int
    student_metrics: Dict[str, Dict]  # per-student агрегация

    # ТЗ: провалы внимания (п. 4.3) и уверенность по сегментам (п. 4.4)
    attention_drops: List[Dict]
    confidence_segments: Dict[str, float]  # start, middle, end

    def to_dict(self) -> Dict:
        """Преобразовать в словарь для JSON экспорта."""
        return {
            "session_id": self.session_id,
            "session_name": self.session_name,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "duration_seconds": round(self.duration_seconds, 2),
            "averages": {
                "engagement": round(self.avg_engagement, 3),
                "stress": round(self.avg_stress, 3),
                "fatigue": round(self.avg_fatigue, 3),
                "risk": round(self.avg_risk, 3),
                "stability": round(self.avg_stability, 3),
            },
            "initial": {
                "engagement": round(self.initial_engagement, 3),
                "stress": round(self.initial_stress, 3),
                "fatigue": round(self.initial_fatigue, 3),
            },
            "final": {
                "engagement": round(self.final_engagement, 3),
                "stress": round(self.final_stress, 3),
                "fatigue": round(self.final_fatigue, 3),
            },
            "changes": {
                "engagement": round(self.engagement_change, 3),
                "stress": round(self.stress_change, 3),
                "fatigue": round(self.fatigue_change, 3),
            },
            "patterns": {
                "engagement_trend": self.engagement_trend,
                "stress_peaks": self.stress_peaks,
                "disengagement_periods": self.disengagement_periods,
            },
            "total_students": self.total_students,
            "student_metrics": self.student_metrics,
            "attention_drops": self.attention_drops,
            "confidence_segments": self.confidence_segments,
        }


class SessionAnalyzer:
    """
    Анализатор сессий для агрегации и анализа данных по учебным сессиям.
    
    Использование:
    1. Создать анализатор: analyzer = SessionAnalyzer()
    2. Добавлять данные кадров: analyzer.add_frame(frame_data)
    3. Завершить сессию: metrics = analyzer.compute_session_metrics()
    """
    
    def __init__(self, session_id: str, session_name: str = "Unnamed Session"):
        """
        Parameters
        ----------
        session_id : str
            Уникальный идентификатор сессии
        session_name : str
            Название сессии (например, "Лекция по машинному обучению")
        """
        self.session_id = session_id
        self.session_name = session_name
        self.start_time = datetime.now().isoformat()
        self.end_time: Optional[str] = None
        
        # Хранилище данных кадров
        self.frame_data: List[Dict] = []
        
        # Кэш для быстрого доступа
        self._student_data: Dict[int, List[Dict]] = {}
    
    def add_frame(self, frame_data: Dict):
        """
        Добавить данные одного кадра в сессию.
        
        Parameters
        ----------
        frame_data : Dict
            Данные кадра, содержащие:
            - timestamp (опционально)
            - faces: List[Dict] - данные по каждому студенту
            - group_state: Dict - групповые метрики
        """
        if "timestamp" not in frame_data:
            frame_data["timestamp"] = datetime.now().isoformat()
        
        self.frame_data.append(frame_data)
        
        # Обновить кэш по студентам
        if "faces" in frame_data:
            for face_data in frame_data["faces"]:
                face_id = face_data.get("face_id")
                if face_id is not None:
                    if face_id not in self._student_data:
                        self._student_data[face_id] = []
                    self._student_data[face_id].append(face_data)
    
    def end_session(
        self,
        attention_drops: Optional[List[Dict]] = None,
    ) -> SessionMetrics:
        """
        Завершить сессию и вычислить агрегированные метрики.
        
        Parameters
        ----------
        attention_drops : Optional[List[Dict]]
            Список провалов внимания (ТЗ 4.3), собранный из AttentionDropDetector.
        
        Returns
        -------
        SessionMetrics
            Полные метрики сессии
        """
        self.end_time = datetime.now().isoformat()
        return self.compute_session_metrics(attention_drops=attention_drops or [])
    
    def compute_session_metrics(
        self,
        attention_drops: Optional[List[Dict]] = None,
    ) -> SessionMetrics:
        """
        Вычислить агрегированные метрики по всей сессии.
        attention_drops — список провалов внимания (ТЗ 4.3), опционально.
        """
        if not self.frame_data:
            return self._empty_metrics()
        
        # Вычислить длительность
        start_dt = datetime.fromisoformat(self.start_time)
        end_dt = datetime.fromisoformat(self.end_time) if self.end_time else datetime.now()
        duration = (end_dt - start_dt).total_seconds()
        
        # Агрегировать метрики по всем кадрам
        all_engagements = []
        all_stresses = []
        all_fatigues = []
        all_risks = []
        all_stabilities = []
        
        for frame in self.frame_data:
            if "faces" in frame:
                for face_data in frame["faces"]:
                    all_engagements.append(face_data.get("engagement", 0.0))
                    all_stresses.append(face_data.get("stress", 0.0))
                    all_fatigues.append(face_data.get("fatigue", 0.0))
                    all_risks.append(face_data.get("fused_risk", face_data.get("risk", 0.0)))
                    all_stabilities.append(face_data.get("stability", 0.0))
        
        # Средние значения
        avg_engagement = np.mean(all_engagements) if all_engagements else 0.0
        avg_stress = np.mean(all_stresses) if all_stresses else 0.0
        avg_fatigue = np.mean(all_fatigues) if all_fatigues else 0.0
        avg_risk = np.mean(all_risks) if all_risks else 0.0
        avg_stability = np.mean(all_stabilities) if all_stabilities else 0.0
        
        # Начальные и конечные значения (первые/последние 20% кадров)
        initial_window = max(1, int(len(self.frame_data) * 0.2))
        final_window = max(1, int(len(self.frame_data) * 0.2))
        
        initial_frames = self.frame_data[:initial_window]
        final_frames = self.frame_data[-final_window:]
        
        initial_metrics = self._aggregate_frames(initial_frames)
        final_metrics = self._aggregate_frames(final_frames)
        
        # Изменения
        engagement_change = final_metrics["engagement"] - initial_metrics["engagement"]
        stress_change = final_metrics["stress"] - initial_metrics["stress"]
        fatigue_change = final_metrics["fatigue"] - initial_metrics["fatigue"]
        
        # Паттерны
        engagement_trend = self._detect_engagement_trend()
        stress_peaks = self._count_stress_peaks()
        disengagement_periods = self._count_disengagement_periods()
        
        # Метрики по студентам
        student_metrics = self._compute_student_metrics()
        
        # ТЗ 4.4: уверенность в начале / середине / конце ответа
        middle_window = max(1, int(len(self.frame_data) * 0.4))
        mid_start = (len(self.frame_data) - middle_window) // 2
        middle_frames = self.frame_data[mid_start : mid_start + middle_window]
        middle_metrics = self._aggregate_frames(middle_frames)
        confidence_segments = {
            "start": compute_confidence(
                initial_metrics["stress"],
                initial_metrics["stability"],
                initial_metrics["engagement"],
            ),
            "middle": compute_confidence(
                middle_metrics["stress"],
                middle_metrics["stability"],
                middle_metrics["engagement"],
            ),
            "end": compute_confidence(
                final_metrics["stress"],
                final_metrics["stability"],
                final_metrics["engagement"],
            ),
        }
        
        return SessionMetrics(
            session_id=self.session_id,
            session_name=self.session_name,
            start_time=self.start_time,
            end_time=self.end_time or datetime.now().isoformat(),
            duration_seconds=duration,
            avg_engagement=float(avg_engagement),
            avg_stress=float(avg_stress),
            avg_fatigue=float(avg_fatigue),
            avg_risk=float(avg_risk),
            avg_stability=float(avg_stability),
            initial_engagement=initial_metrics["engagement"],
            initial_stress=initial_metrics["stress"],
            initial_fatigue=initial_metrics["fatigue"],
            final_engagement=final_metrics["engagement"],
            final_stress=final_metrics["stress"],
            final_fatigue=final_metrics["fatigue"],
            engagement_change=engagement_change,
            stress_change=stress_change,
            fatigue_change=fatigue_change,
            engagement_trend=engagement_trend,
            stress_peaks=stress_peaks,
            disengagement_periods=disengagement_periods,
            total_students=len(self._student_data),
            student_metrics=student_metrics,
            attention_drops=attention_drops or [],
            confidence_segments=confidence_segments,
        )
    
    def _aggregate_frames(self, frames: List[Dict]) -> Dict[str, float]:
        """Агрегировать метрики по списку кадров."""
        engagements = []
        stresses = []
        fatigues = []
        stabilities = []
        
        for frame in frames:
            if "faces" in frame:
                for face_data in frame["faces"]:
                    engagements.append(face_data.get("engagement", 0.0))
                    stresses.append(face_data.get("stress", 0.0))
                    fatigues.append(face_data.get("fatigue", 0.0))
                    stabilities.append(face_data.get("stability", 0.5))
        
        return {
            "engagement": float(np.mean(engagements)) if engagements else 0.0,
            "stress": float(np.mean(stresses)) if stresses else 0.0,
            "fatigue": float(np.mean(fatigues)) if fatigues else 0.0,
            "stability": float(np.mean(stabilities)) if stabilities else 0.5,
        }
    
    def _detect_engagement_trend(self) -> str:
        """Определить тренд вовлечённости за сессию."""
        if len(self.frame_data) < 3:
            return "STABLE"
        
        # Вычислить среднюю engagement для каждой трети сессии
        third = len(self.frame_data) // 3
        first_third = self._aggregate_frames(self.frame_data[:third])
        middle_third = self._aggregate_frames(self.frame_data[third:2*third])
        last_third = self._aggregate_frames(self.frame_data[2*third:])
        
        e1 = first_third["engagement"]
        e2 = middle_third["engagement"]
        e3 = last_third["engagement"]
        
        # Определить тренд
        if e3 > e1 + 0.1:
            return "INCREASING"
        elif e3 < e1 - 0.1:
            return "DECREASING"
        elif abs(e2 - e1) > 0.15 or abs(e3 - e2) > 0.15:
            return "FLUCTUATING"
        else:
            return "STABLE"
    
    def _count_stress_peaks(self) -> int:
        """Подсчитать количество пиков стресса (stress > 0.6)."""
        peaks = 0
        in_peak = False
        
        for frame in self.frame_data:
            if "group_state" in frame:
                avg_stress = frame["group_state"].get("avg_stress", 0.0)
                if avg_stress > 0.6 and not in_peak:
                    peaks += 1
                    in_peak = True
                elif avg_stress <= 0.5:
                    in_peak = False
        
        return peaks
    
    def _count_disengagement_periods(self) -> int:
        """Подсчитать количество периодов низкой вовлечённости (engagement < 0.4)."""
        periods = 0
        in_period = False
        
        for frame in self.frame_data:
            if "group_state" in frame:
                avg_engagement = frame["group_state"].get("avg_engagement", 0.0)
                if avg_engagement < 0.4 and not in_period:
                    periods += 1
                    in_period = True
                elif avg_engagement >= 0.5:
                    in_period = False
        
        return periods
    
    def _compute_student_metrics(self) -> Dict[str, Dict]:
        """Вычислить агрегированные метрики по каждому студенту."""
        student_metrics = {}
        
        for face_id, data_list in self._student_data.items():
            if not data_list:
                continue
            
            engagements = [d.get("engagement", 0.0) for d in data_list]
            stresses = [d.get("stress", 0.0) for d in data_list]
            fatigues = [d.get("fatigue", 0.0) for d in data_list]
            risks = [d.get("fused_risk", d.get("risk", 0.0)) for d in data_list]
            
            student_metrics[f"student_{face_id}"] = {
                "avg_engagement": round(float(np.mean(engagements)), 3),
                "avg_stress": round(float(np.mean(stresses)), 3),
                "avg_fatigue": round(float(np.mean(fatigues)), 3),
                "avg_risk": round(float(np.mean(risks)), 3),
                "total_frames": len(data_list),
                "engagement_std": round(float(np.std(engagements)), 3),
                "stress_std": round(float(np.std(stresses)), 3),
            }
        
        return student_metrics
    
    def _empty_metrics(self) -> SessionMetrics:
        """Вернуть пустые метрики для пустой сессии."""
        return SessionMetrics(
            session_id=self.session_id,
            session_name=self.session_name,
            start_time=self.start_time,
            end_time=self.end_time or datetime.now().isoformat(),
            duration_seconds=0.0,
            avg_engagement=0.0,
            avg_stress=0.0,
            avg_fatigue=0.0,
            avg_risk=0.0,
            avg_stability=0.0,
            initial_engagement=0.0,
            initial_stress=0.0,
            initial_fatigue=0.0,
            final_engagement=0.0,
            final_stress=0.0,
            final_fatigue=0.0,
            engagement_change=0.0,
            stress_change=0.0,
            fatigue_change=0.0,
            engagement_trend="STABLE",
            stress_peaks=0,
            disengagement_periods=0,
            total_students=0,
            student_metrics={},
            attention_drops=[],
            confidence_segments={"start": 0.0, "middle": 0.0, "end": 0.0},
        )
