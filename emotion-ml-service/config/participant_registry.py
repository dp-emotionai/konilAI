"""
Реестр участников: привязка face_id к отображаемому имени/метке.

По ТЗ: групповая аналитика анонимизирована. Для личной статистики
и для удобства преподавателя (например, на экзамене) можно опционально
указать метку участника: имя, номер в списке, id из LMS и т.д.

Использование:
- set_participant_label(face_id, "Иван И.")  — опционально, при согласии
- set_participant_label(face_id, "Студент 42") — анонимная метка
- get_display_label(face_id) -> "Иван И." или "Participant 4"
"""

from typing import Dict, Optional


class ParticipantRegistry:
    """
    Хранит опциональные метки для face_id.

    По умолчанию отображаемый вид: "Participant {face_id}".
    Можно задать label (имя, номер, id из системы) — тогда он будет
    использоваться в экспорте и отчётах при необходимости.
    """

    def __init__(self):
        self._labels: Dict[int, str] = {}

    def set_participant_label(self, face_id: int, label: str) -> None:
        """Установить отображаемую метку для участника."""
        self._labels[face_id] = str(label).strip()

    def get_display_label(self, face_id: int) -> str:
        """
        Получить метку для отображения.
        Если метка не задана — "Participant {face_id}".
        """
        return self._labels.get(face_id, f"Participant {face_id}")

    def get_all_labels(self) -> Dict[int, str]:
        """Все заданные метки (face_id -> label)."""
        return dict(self._labels)

    def clear_label(self, face_id: int) -> None:
        """Удалить метку для face_id."""
        self._labels.pop(face_id, None)

    def clear_all(self) -> None:
        """Очистить все метки."""
        self._labels.clear()
