"""
Валидация и обработка граничных случаев для системы анализа эмоций.

Этот модуль обеспечивает:
- Обработку низкой уверенности модели
- Валидацию входных данных
- Сглаживание резких изменений (smoothing)
- Graceful degradation при проблемах

Все функции спроектированы для академической обоснованности:
каждое решение имеет явное обоснование.
"""

from typing import Dict, Optional, Tuple
from collections import deque
import numpy as np


class SmoothingFilter:
    """
    Экспоненциальное сглаживание для предотвращения резких скачков метрик.
    
    Используется для:
    - engagement, stress, fatigue scores
    - motion_risk
    
    Формула: y_t = α * x_t + (1 - α) * y_{t-1}
    где α (alpha) - коэффициент сглаживания [0, 1]
    
    Research rationale:
    - Резкие изменения могут быть артефактами, а не реальными изменениями состояния
    - Сглаживание улучшает стабильность визуализации
    - α = 0.3 означает, что новое значение имеет вес 30%, предыдущее - 70%
    """
    
    def __init__(self, alpha: float = 0.3, initial_value: float = 0.5):
        """
        Parameters
        ----------
        alpha : float
            Коэффициент сглаживания. Меньше = более плавное изменение.
            Рекомендуемые значения:
            - 0.2-0.3 для engagement/stress (медленные изменения)
            - 0.4-0.5 для motion_risk (быстрее реагирует)
        initial_value : float
            Начальное значение для фильтра
        """
        self.alpha = alpha
        self.current_value = initial_value
        self.initialized = False
    
    def update(self, new_value: float) -> float:
        """
        Обновить фильтр новым значением и вернуть сглаженное.
        
        Parameters
        ----------
        new_value : float
            Новое измеренное значение
            
        Returns
        -------
        float
            Сглаженное значение
        """
        if not self.initialized:
            self.current_value = new_value
            self.initialized = True
            return new_value
        
        # Экспоненциальное сглаживание
        self.current_value = (
            self.alpha * new_value + (1 - self.alpha) * self.current_value
        )
        return self.current_value
    
    def reset(self):
        """Сбросить фильтр к начальному состоянию."""
        self.initialized = False


class ConfidenceHandler:
    """
    Обработка случаев низкой уверенности модели.
    
    Стратегия:
    1. Если confidence < threshold → использовать предыдущее значение или "Neutral"
    2. Отслеживать частоту "Uncertain" для диагностики
    3. Предоставлять флаги для фронтенда (low_confidence, uncertain_emotion)
    """
    
    def __init__(self, threshold: float = 0.3):
        """
        Parameters
        ----------
        threshold : float
            Порог уверенности ниже которого эмоция считается неопределённой
        """
        self.threshold = threshold
        self.last_valid_emotion: Optional[str] = None
        self.last_valid_confidence: float = 0.0
        self.uncertain_count = 0
        self.total_count = 0
    
    def process_prediction(
        self,
        emotion: str,
        confidence: float
    ) -> Tuple[str, float, Dict[str, bool]]:
        """
        Обработать предсказание эмоции с учётом уверенности.
        
        Parameters
        ----------
        emotion : str
            Предсказанная эмоция (может быть "Uncertain")
        confidence : float
            Уверенность модели
            
        Returns
        -------
        Tuple[str, float, Dict]
            (обработанная_эмоция, скорректированная_уверенность, флаги)
        """
        self.total_count += 1
        
        flags = {
            "low_confidence": confidence < self.threshold,
            "uncertain_emotion": emotion == "Uncertain",
        }
        
        # Если уверенность низкая или эмоция "Uncertain"
        if confidence < self.threshold or emotion == "Uncertain":
            self.uncertain_count += 1
            
            # Использовать последнюю валидную эмоцию, если есть
            if self.last_valid_emotion is not None:
                # Снизить уверенность пропорционально
                adjusted_confidence = min(
                    confidence,
                    self.last_valid_confidence * 0.7  # Снижение на 30%
                )
                return (
                    self.last_valid_emotion,
                    adjusted_confidence,
                    flags
                )
            else:
                # Если нет истории, использовать "Neutral" с низкой уверенностью
                return ("Neutral", 0.2, flags)
        
        # Валидное предсказание - сохранить для будущего использования
        self.last_valid_emotion = emotion
        self.last_valid_confidence = confidence
        
        return (emotion, confidence, flags)
    
    def get_uncertainty_rate(self) -> float:
        """Получить долю неопределённых предсказаний."""
        if self.total_count == 0:
            return 0.0
        return self.uncertain_count / self.total_count
    
    def reset(self):
        """Сбросить статистику."""
        self.last_valid_emotion = None
        self.last_valid_confidence = 0.0
        self.uncertain_count = 0
        self.total_count = 0


class DataQualityValidator:
    """
    Валидация качества входных данных и метрик.
    
    Проверяет:
    - Корректность диапазонов значений (0-1 для scores)
    - Наличие необходимых полей
    - Разумность значений (NaN, inf)
    """
    
    @staticmethod
    def validate_state_dict(state: Dict) -> Tuple[bool, Optional[str]]:
        """
        Валидировать словарь состояния студента.
        
        Parameters
        ----------
        state : Dict
            Словарь состояния от RiskEngine/FusionEngine
            
        Returns
        -------
        Tuple[bool, Optional[str]]
            (валидно, сообщение_об_ошибке)
        """
        required_fields = [
            "risk", "engagement", "stress", "fatigue",
            "stability", "dominant_emotion"
        ]
        
        # Проверка наличия полей
        missing = [f for f in required_fields if f not in state]
        if missing:
            return False, f"Missing required fields: {missing}"
        
        # Проверка диапазонов для численных полей
        score_fields = ["risk", "engagement", "stress", "fatigue", "stability"]
        for field in score_fields:
            value = state.get(field)
            if value is None:
                return False, f"Field {field} is None"
            
            # Проверка на NaN или inf
            if isinstance(value, float):
                if np.isnan(value) or np.isinf(value):
                    return False, f"Field {field} has invalid value: {value}"
                
                # Проверка диапазона [0, 1]
                if not (0.0 <= value <= 1.0):
                    return False, f"Field {field} out of range [0,1]: {value}"
        
        return True, None
    
    @staticmethod
    def sanitize_state_dict(state: Dict) -> Dict:
        """
        Очистить словарь состояния от некорректных значений.
        
        Заменяет:
        - NaN → 0.0
        - inf → 1.0 (для scores) или 0.0 (для risk)
        - значения вне [0,1] → clamp к границам
        
        Parameters
        ----------
        state : Dict
            Исходный словарь состояния
            
        Returns
        -------
        Dict
            Очищенный словарь состояния
        """
        sanitized = state.copy()
        
        score_fields = ["risk", "engagement", "stress", "fatigue", "stability"]
        for field in score_fields:
            if field in sanitized:
                value = sanitized[field]
                if isinstance(value, (int, float)):
                    # Обработка NaN и inf
                    if np.isnan(value):
                        sanitized[field] = 0.0
                    elif np.isinf(value):
                        sanitized[field] = 1.0 if field != "risk" else 0.0
                    else:
                        # Clamp к [0, 1]
                        sanitized[field] = max(0.0, min(1.0, float(value)))
        
        return sanitized


class BufferStateValidator:
    """
    Валидация состояния временных буферов.
    
    Проверяет достаточность данных для достоверной аналитики.
    """
    
    MIN_BUFFER_SIZE = 5  # Минимум наблюдений для достоверной аналитики
    
    @staticmethod
    def is_sufficient(buffer_size: int) -> bool:
        """
        Проверить, достаточно ли данных в буфере.
        
        Parameters
        ----------
        buffer_size : int
            Размер буфера
            
        Returns
        -------
        bool
            True если данных достаточно для аналитики
        """
        return buffer_size >= BufferStateValidator.MIN_BUFFER_SIZE
    
    @staticmethod
    def get_data_quality_flag(buffer_size: int) -> Dict[str, any]:
        """
        Получить флаги качества данных на основе размера буфера.
        
        Returns
        -------
        Dict
            {
                "sufficient_data": bool,
                "buffer_size": int,
                "quality_level": "HIGH" | "MEDIUM" | "LOW"
            }
        """
        sufficient = BufferStateValidator.is_sufficient(buffer_size)
        
        if buffer_size >= 20:
            quality = "HIGH"
        elif buffer_size >= 10:
            quality = "MEDIUM"
        else:
            quality = "LOW"
        
        return {
            "sufficient_data": sufficient,
            "buffer_size": buffer_size,
            "quality_level": quality
        }
