"""
Экспорт данных для анализа и визуализации.

Этот модуль предоставляет функции для экспорта:
- Данных сессий в JSON
- Агрегированной статистики
- Временных рядов для графиков

Формат данных оптимизирован для фронтенда и анализа.
"""

import json
import csv
from typing import Dict, List, Optional
from datetime import datetime
from pathlib import Path

from analytics.session_analyzer import SessionMetrics


def export_session_to_json(
    session_metrics: SessionMetrics,
    output_path: Optional[str] = None
) -> str:
    """
    Экспортировать метрики сессии в JSON.
    
    Parameters
    ----------
    session_metrics : SessionMetrics
        Метрики сессии для экспорта
    output_path : Optional[str]
        Путь для сохранения файла. Если None, генерируется автоматически.
        
    Returns
    -------
    str
        Путь к сохранённому файлу
    """
    if output_path is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = f"session_{session_metrics.session_id}_{timestamp}.json"
    
    data = session_metrics.to_dict()
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    return output_path


def export_temporal_data_to_json(
    frame_data: List[Dict],
    output_path: Optional[str] = None
) -> str:
    """
    Экспортировать временные данные (кадры) в JSON.
    
    Parameters
    ----------
    frame_data : List[Dict]
        Список данных кадров
    output_path : Optional[str]
        Путь для сохранения файла
        
    Returns
    -------
    str
        Путь к сохранённому файлу
    """
    if output_path is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = f"temporal_data_{timestamp}.json"
    
    export_data = {
        "metadata": {
            "export_time": datetime.now().isoformat(),
            "total_frames": len(frame_data),
            "format_version": "1.0",
        },
        "frames": frame_data,
    }
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(export_data, f, indent=2, ensure_ascii=False)
    
    return output_path


def export_summary_report(
    session_metrics: SessionMetrics,
    output_path: Optional[str] = None
) -> str:
    """
    Экспортировать текстовый отчёт по сессии.
    
    Parameters
    ----------
    session_metrics : SessionMetrics
        Метрики сессии
    output_path : Optional[str]
        Путь для сохранения файла
        
    Returns
    -------
    str
        Путь к сохранённому файлу
    """
    if output_path is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = f"session_report_{session_metrics.session_id}_{timestamp}.txt"
    
    metrics = session_metrics.to_dict()
    
    report_lines = [
        "=" * 60,
        f"ОТЧЁТ ПО СЕССИИ: {metrics['session_name']}",
        "=" * 60,
        "",
        f"ID сессии: {metrics['session_id']}",
        f"Начало: {metrics['start_time']}",
        f"Конец: {metrics['end_time']}",
        f"Длительность: {metrics['duration_seconds']:.1f} секунд ({metrics['duration_seconds']/60:.1f} минут)",
        f"Всего студентов: {metrics['total_students']}",
        "",
        "-" * 60,
        "СРЕДНИЕ ПОКАЗАТЕЛИ ЗА СЕССИЮ",
        "-" * 60,
        f"Вовлечённость: {metrics['averages']['engagement']:.3f}",
        f"Стресс: {metrics['averages']['stress']:.3f}",
        f"Усталость: {metrics['averages']['fatigue']:.3f}",
        f"Риск: {metrics['averages']['risk']:.3f}",
        f"Стабильность: {metrics['averages']['stability']:.3f}",
        "",
        "-" * 60,
        "ИЗМЕНЕНИЯ ЗА СЕССИЮ",
        "-" * 60,
        f"Вовлечённость: {metrics['changes']['engagement']:+.3f} "
        f"({metrics['initial']['engagement']:.3f} → {metrics['final']['engagement']:.3f})",
        f"Стресс: {metrics['changes']['stress']:+.3f} "
        f"({metrics['initial']['stress']:.3f} → {metrics['final']['stress']:.3f})",
        f"Усталость: {metrics['changes']['fatigue']:+.3f} "
        f"({metrics['initial']['fatigue']:.3f} → {metrics['final']['fatigue']:.3f})",
        "",
        "-" * 60,
        "ПАТТЕРНЫ ПОВЕДЕНИЯ",
        "-" * 60,
        f"Тренд вовлечённости: {metrics['patterns']['engagement_trend']}",
        f"Пиков стресса: {metrics['patterns']['stress_peaks']}",
        f"Периодов дезактивации: {metrics['patterns']['disengagement_periods']}",
        "",
    ]
    
    # Добавить метрики по студентам
    if metrics['student_metrics']:
        report_lines.extend([
            "-" * 60,
            "МЕТРИКИ ПО СТУДЕНТАМ",
            "-" * 60,
        ])
        
        for student_id, student_data in metrics['student_metrics'].items():
            report_lines.append(
                f"{student_id}: "
                f"Eng={student_data['avg_engagement']:.3f}, "
                f"Stress={student_data['avg_stress']:.3f}, "
                f"Fatigue={student_data['avg_fatigue']:.3f}, "
                f"Frames={student_data['total_frames']}"
            )
    
    report_lines.append("")
    report_lines.append("=" * 60)
    
    report_text = "\n".join(report_lines)
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(report_text)
    
    return output_path
