"""
Детектор «провалов внимания» (ТЗ п. 4.3).

Точки, когда вовлечённость падает ниже порога и держится заданное время.
Нужно для: «На 23–30 минуте у 68% студентов зафиксировано состояние скука».
"""

from dataclasses import dataclass
from typing import List, Optional
import time


@dataclass
class AttentionDrop:
    """Один зафиксированный провал внимания."""
    start_time: float   # timestamp
    end_time: float
    duration_sec: float
    min_engagement: float
    face_id: Optional[int] = None
    participant_label: Optional[str] = None


class AttentionDropDetector:
    """
    Отслеживает периоды низкой вовлечённости по каждому лицу.

    Пороги задаются явно (обоснование для диплома):
    - engagement_threshold: ниже какого значения считаем «провал»
    - min_duration_sec: сколько секунд подряд должно держаться
    """

    def __init__(
        self,
        engagement_threshold: float = 0.4,
        min_duration_sec: float = 5.0,
    ):
        self.engagement_threshold = engagement_threshold
        self.min_duration_sec = min_duration_sec
        # face_id -> (start_time, min_engagement_seen)
        self._in_drop: dict = {}
        self._drops: List[AttentionDrop] = []

    def update(
        self,
        face_id: int,
        engagement: float,
        timestamp: Optional[float] = None,
        participant_label: Optional[str] = None,
    ) -> Optional[AttentionDrop]:
        """
        Обновить состояние. Если провал только что закончился — вернуть AttentionDrop.
        """
        ts = timestamp or time.time()

        if engagement < self.engagement_threshold:
            if face_id not in self._in_drop:
                self._in_drop[face_id] = (ts, engagement)
            else:
                start, min_eng = self._in_drop[face_id]
                self._in_drop[face_id] = (start, min(min_eng, engagement))
            return None

        # Вовлечённость поднялась выше порога
        if face_id not in self._in_drop:
            return None

        start_time, min_engagement = self._in_drop[face_id]
        del self._in_drop[face_id]
        duration_sec = ts - start_time

        if duration_sec < self.min_duration_sec:
            return None

        drop = AttentionDrop(
            start_time=start_time,
            end_time=ts,
            duration_sec=duration_sec,
            min_engagement=min_engagement,
            face_id=face_id,
            participant_label=participant_label,
        )
        self._drops.append(drop)
        return drop

    def get_all_drops(self) -> List[AttentionDrop]:
        """Все зафиксированные провалы за сессию."""
        return list(self._drops)

    def reset(self) -> None:
        """Сброс для новой сессии."""
        self._in_drop.clear()
        self._drops.clear()
