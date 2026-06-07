"""
Утилиты для рендеринга текста в OpenCV.

OpenCV не поддерживает Unicode (кириллицу) через cv2.putText(),
поэтому этот модуль предоставляет функции для перевода русского
текста в английский для визуализации.

Русский текст остаётся в данных (JSON, логи) для дипломной работы.
"""


def translate_justification_for_display(justification_ru: str) -> str:
    """
    Перевести русское обоснование в английское для отображения в OpenCV.
    
    Parameters
    ----------
    justification_ru : str
        Русский текст обоснования
        
    Returns
    -------
    str
        Английский текст для визуализации
    """
    if not justification_ru:
        return ""
    
    # Простой словарь переводов ключевых фраз
    translations = {
        "Общее состояние группы:": "Group state:",
        "FATIGUED": "FATIGUED",
        "DISENGAGED": "DISENGAGED",
        "ENGAGED": "ENGAGED",
        "STRESSED": "STRESSED",
        "OVERLOADED": "OVERLOADED",
        "Доминирующий паттерн:": "Pattern:",
        "большинство студентов демонстрируют низкую вовлечённость": (
            "most students show low engagement"
        ),
        "наблюдается коллективный всплеск стресса": (
            "collective stress spike detected"
        ),
        "преобладают признаки накопленной усталости": (
            "signs of accumulated fatigue dominate"
        ),
        "группа неоднородна: значительный разброс в уровнях вовлечённости между студентами": (
            "group is heterogeneous: significant variance in engagement levels"
        ),
        "высокий средний уровень вовлечённости в учебный процесс": (
            "high average engagement in learning process"
        ),
        "группа демонстрирует стабильное эмоциональное состояние": (
            "group shows stable emotional state"
        ),
        "Средние показатели:": "Averages:",
        "вовлечённость=": "eng=",
        "стресс=": "stress=",
        "усталость=": "fatigue=",
        "Высокая неоднородность группы требует дифференцированного подхода к обучению": (
            "High heterogeneity requires differentiated teaching approach"
        ),
        "Нет данных для анализа группы.": "No data for group analysis.",
    }
    
    # Заменить известные фразы
    result = justification_ru
    for ru_phrase, en_phrase in translations.items():
        result = result.replace(ru_phrase, en_phrase)
    
    return result


def get_english_state_name(state_ru: str) -> str:
    """
    Получить английское название состояния для отображения.
    
    Parameters
    ----------
    state_ru : str
        Название состояния (может быть на русском или английском)
        
    Returns
    -------
    str
        Английское название
    """
    # Состояния уже на английском, но на всякий случай
    state_map = {
        "FATIGUED": "FATIGUED",
        "DISENGAGED": "DISENGAGED",
        "ENGAGED": "ENGAGED",
        "STRESSED": "STRESSED",
        "OVERLOADED": "OVERLOADED",
        "TENSE_INVOLVEMENT": "TENSE_INVOLVEMENT",
        "NEUTRAL": "NEUTRAL",
        "NORMAL": "NORMAL",
        "SUSPICIOUS": "SUSPICIOUS",
        "POTENTIAL THREAT": "POTENTIAL THREAT",
    }
    
    return state_map.get(state_ru, state_ru)


# Состояния по ТЗ (п. 4.2.1) — английские подписи для OpenCV
TZ_STATE_LABELS_EN = {
    "neutral": "neutral",
    "boredom": "boredom / low engagement",
    "interest": "interest / attention",
    "frustration": "frustration",
    "stress_anxiety": "stress / anxiety",
    "confidence_calm": "confidence / calm",
}


def get_english_tz_state_label(tz_state: str) -> str:
    """
    Английская подпись состояния по ТЗ для отображения в OpenCV (кириллица не поддерживается).
    """
    return TZ_STATE_LABELS_EN.get(tz_state, tz_state or "—")


def get_english_pattern_name(pattern_ru: str) -> str:
    """
    Получить английское название паттерна для отображения.
    
    Parameters
    ----------
    pattern_ru : str
        Название паттерна
        
    Returns
    -------
    str
        Английское название
    """
    pattern_map = {
        "COLLECTIVE_DISENGAGEMENT": "COLLECTIVE_DISENGAGEMENT",
        "STRESS_CONTAGION": "STRESS_CONTAGION",
        "COLLECTIVE_FATIGUE": "COLLECTIVE_FATIGUE",
        "MIXED_ENGAGEMENT": "MIXED_ENGAGEMENT",
        "HIGH_ENGAGEMENT": "HIGH_ENGAGEMENT",
        "STABLE": "STABLE",
    }
    
    return pattern_map.get(pattern_ru, pattern_ru)
