"""
Утилиты для системы анализа эмоциональной вовлечённости.

Модули:
- validation: валидация и обработка граничных случаев
- data_export: экспорт данных для анализа
"""

from .validation import (
    SmoothingFilter,
    ConfidenceHandler,
    DataQualityValidator,
    BufferStateValidator,
)

from .data_export import (
    export_session_to_json,
    export_temporal_data_to_json,
    export_summary_report,
)

__all__ = [
    "SmoothingFilter",
    "ConfidenceHandler",
    "DataQualityValidator",
    "BufferStateValidator",
    "export_session_to_json",
    "export_temporal_data_to_json",
    "export_summary_report",
]
