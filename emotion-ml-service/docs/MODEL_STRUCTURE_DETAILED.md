# Детальное описание структуры Python-модели (emotion-ml-service)

Документ для защиты/презентации: что где лежит и за что отвечает каждый файл.

---

## 1. Общая схема пайплайна

```
Кадр с камеры
    → Детекция лиц (FaceProcessor)
    → Вырезка лица 64×64 (crop_face_with_margin)
    → CNN эмоций (EmotionModel) → 7 эмоций + confidence
    → Буфер по времени (TemporalEmotionBuffer)
    → RiskEngine: risk, engagement, stress, fatigue, stability, confidence
    → FaceMotionAnalyzer: motion_risk по движению бокса
    → FusionEngine: объединение в fused_risk и engagement_state
    → Маппинг в 6 состояний ТЗ (tz_emotion_mapping)
    → Групповая аналитика (GroupEngagementAnalyzer)
    → Сессионная аналитика (SessionAnalyzer), провалы внимания (AttentionDropDetector)
    → Экспорт / логи / API
```

---

## 2. Корень проекта

| Файл | Назначение |
|------|------------|
| **main_realtime.py** | Главный десктопный демо: цикл «камера → детекция лиц → эмоции → трекинг по ID → RiskEngine + FusionEngine → отрисовка панелей в OpenCV». Запуск сессии, сбор кадров в SessionAnalyzer, детектор провалов внимания, экспорт JSON/отчёт по завершении. Константы: SCENARIO (PUBLIC/SCHOOL/TRANSPORT), ANALYSIS_INTERVAL_SEC (0.5 = 2 кадра/с), FACE_DETECTOR (haar/mediapipe). |
| **main.py** | Упрощённый демо-скрипт: камера + детекция + эмоции без полного пайплайна (для быстрой проверки). |
| **emotion_model.h5** | Обученная Keras CNN (7 классов эмоций). Загружается в `inference/emotion_model.py` и в `backend/model_logic.py`. Без этого файла сервис не стартует. |

---

## 3. inference/ — распознавание эмоций по лицу

| Файл | Что внутри |
|------|------------|
| **emotion_model.py** | Класс **EmotionModel**: загрузка `emotion_model.h5`, препроцессинг кадра (grayscale, опционально CLAHE для освещения, resize 64×64, нормализация [0,1]), `predict(face_img)` → словарь `{emotion, confidence, distribution}`. 7 эмоций: Angry, Disgust, Fear, Happy, Sad, Surprise, Neutral. При confidence < порога возвращает "Uncertain". Есть `predict_batch()` для нескольких лиц. |
| **face_processor.py** | Класс **FaceProcessor**: детекция лиц в кадре. Режимы — **Haar** (OpenCV, каскад из `cv2.data.haarcascades`) и **MediaPipe**. Возвращает список боксов (x, y, width, height). Функция **crop_face_with_margin(gray, box, margin=0.15)** — вырезает область лица с отступом 15% для подачи в CNN; по ТЗ видео не хранится, только вырез под анализ. |

---

## 4. config/ — конфигурация и маппинг под ТЗ

| Файл | Что внутри |
|------|------------|
| **tz_emotion_mapping.py** | Маппинг выхода CNN и метрик в **6 состояний ТЗ**: neutral, boredom, interest, frustration, stress_anxiety, confidence_calm. Функция **map_to_tz_state(dominant_emotion, engagement, stress, stability)** возвращает (код_состояния, русское_название). Уточнение по метрикам: высокий стресс → stress_anxiety; низкая вовлечённость + Neutral/Sad → boredom; высокая вовлечённость + низкий стресс + стабильность → confidence_calm и т.д. **get_tz_state_summary(per_face_states)** — доли состояний по группе для отчётов («у 68% — скука»). |
| **participant_registry.py** | Класс **ParticipantRegistry**: привязка face_id к отображаемой метке (Participant N или кастом: «Иван И.», «Студент 42»). Методы: set_participant_label, get_display_label, clear_label. Для анонимной аналитики и опциональной персонализации. |
| **config/__init__.py** | Пустой/служебный для импортов. |

---

## 5. temporal/ — временной буфер эмоций

| Файл | Что внутри |
|------|------------|
| **buffer.py** | Класс **TemporalEmotionBuffer**: скользящее окно (emotion, confidence, timestamp). Параметры: max_size, decay_lambda (экспоненциальное затухание по времени), min_confidence. Методы: push(), clear(), size(), **weighted_emotions()** (взвешенная по времени сумма по эмоциям), **dominant_emotion()**, **stability()** (доля доминантной эмоции), **snapshot()** для экспорта. Основа для всех последующих аналитик. |

---

## 6. risk/ — эмоциональный риск и производные метрики

| Файл | Что внутри |
|------|------------|
| **risk_engine.py** | Класс **RiskEngine**: внутри один TemporalEmotionBuffer на лицо. **push_emotion(emotion, confidence, timestamp)** — добавление события. **compute_risk()** — основной метод: по взвешенным эмоциям и сценарию (PUBLIC/SCHOOL/TRANSPORT) считает эмоциональный risk, state (NORMAL/SUSPICIOUS/POTENTIAL THREAT), trend, stability (через analytics.stability), engagement (analytics.engagement), stress (analytics.stress), fatigue (analytics.fatigue), confidence (analytics.confidence). Возвращает один большой словарь на лицо со всеми метриками и деталями (stability_metrics, engagement_details и т.д.). Словарь SCENARIOS задаёт веса эмоций и пороги по сценариям. |
| **state_machine.py** | Класс **RiskStateMachine**: сглаживание смены состояний — новое состояние подтверждается после 3 подряд одинаковых оценок, иначе остаётся NORMAL. Пороги: 0.35 (suspicious), 0.65 (threat). |
| **behavior.py** | (При наличии) — доп. поведенческие эвристики; в основном пайплайне используется motion/face_motion. |

---

## 7. analytics/ — образовательные метрики (интерпретируемые)

| Файл | Что внутри |
|------|------------|
| **stability.py** | **StabilityMetrics** (dataclass): stability (доля доминантной эмоции), volatility, switch_rate (частота смены эмоции между кадрами), entropy распределения, dominant_emotion, emotion_distribution. **compute_stability_metrics(buffer)** — считает всё по снимку буфера. Без скрытой ML, только частоты и переходы. |
| **engagement.py** | **compute_engagement(buffer, stability_metrics)** → EngagementResult (score [0,1], level LOW/MEDIUM/HIGH, reasoning, components). Формула: active_share (1 − passive), valence_balance (positive − negative), volatility_penalty; линейная комбинация с весами 0.5, 0.3, 0.2. Пассивные = Neutral+Sad, положительные = Happy+Surprise, негативные = Angry+Fear+Disgust. |
| **stress.py** | **compute_stress(buffer, stability_metrics)** → StressResult. Учитывает долю высоко-активационных негативных эмоций (Angry, Fear, Disgust, Surprise), recency (последние события в окне), volatility. Формула: 0.55×high_arousal_share + 0.3×recent_share + 0.15×volatility. |
| **fatigue.py** | **compute_fatigue(buffer, stability_metrics)** → FatigueResult. Доминирование Neutral+Sad, монотонность (1−volatility), минус доля положительных. Формула: 0.6×passive_share + 0.3×monotony − 0.2×positive. |
| **confidence.py** | **compute_confidence(stress, stability, engagement)** — одна оценка уверенности [0,1]: 0.5×(1−stress) + 0.3×stability + 0.2×min(engagement, 0.8). **confidence_segments(segment_metrics)** — уверенность по сегментам (start/middle/end) для экзаменов (ТЗ 4.4). |
| **attention_drops.py** | Класс **AttentionDropDetector**: порог engagement (по умолчанию 0.4), min_duration_sec (5 с). **update(face_id, engagement, timestamp)** — при выходе вовлечённости выше порога после достаточной длительности возвращает **AttentionDrop** (start_time, end_time, duration_sec, min_engagement). Нужно для отчётов «провалы внимания» (ТЗ 4.3). |
| **group_engagement.py** | Класс **GroupEngagementAnalyzer**: по списку индивидуальных состояний считает avg_engagement/stress/fatigue, std (неоднородность), group_state (ENGAGED/DISENGAGED/FATIGUED/OVERLOADED и т.д.), group_pattern (COLLECTIVE_DISENGAGEMENT, STRESS_CONTAGION, MIXED_ENGAGEMENT и т.д.), collective_disengagement (большинство с низкой вовлечённостью), stress_spike, justification текстом. |
| **session_analyzer.py** | Класс **SessionAnalyzer**: привязка к session_id/session_name. **add_frame(frame_data)** — накопление кадров (faces + group_state). **end_session(attention_drops)** / **compute_session_metrics(attention_drops)** — агрегаты по сессии: средние, начальные/конечные 20%, изменения, engagement_trend (INCREASING/DECREASING/STABLE/FLUCTUATING), stress_peaks, disengagement_periods, student_metrics по каждому face_id, attention_drops, confidence_segments (start/middle/end). Dataclass **SessionMetrics** с to_dict() для JSON. |

---

## 8. fusion/ — объединение сигналов

| Файл | Что внутри |
|------|------------|
| **fusion_engine.py** | Класс **FusionEngine**: линейная интерпретируемая формула. Входы: emotion_risk, motion_risk, stability, engagement, stress, fatigue (все [0,1]). instability = 1 − stability. **fuse(...)** считает fused_risk = Σ(weight_i × component_i), веса из сценария. Классификация state (NORMAL/SUSPICIOUS/POTENTIAL THREAT) и engagement_state (ENGAGED, TENSE_INVOLVEMENT, DISENGAGED, FATIGUED, OVERLOADED, NEUTRAL). Формирует текстовое explanation (рус.) для отчётов. **FusionResult** (dataclass): fused_risk, state, engagement_state, explanation, components. |
| **scenario_profiles.py** | Словарь **SCENARIOS**: PUBLIC, SCHOOL, TRANSPORT. Для каждого: weights (emotion_risk, motion_risk, stress, fatigue, instability), risk_thresholds (suspicious, threat), engagement_thresholds (low, high). SCHOOL — выше вес стресса/усталости для образовательного контекста. |

---

## 9. motion/ — движение лица (поведенческий риск)

| Файл | Что внутри |
|------|------------|
| **face_motion.py** | Класс **FaceMotionAnalyzer**: скользящее окно позиций центроида бокса (x,y,w,h). **update(box)** — добавление кадра, возврат motion_risk [0,1]. **compute_risk()**: скорость перемещения, ускорение, доля «джиттера» (мелких движений). Итог: взвешенная комбинация velocity_risk, acceleration_risk, jitter_risk. Без ML, только геометрия и пороги. **get_metrics()** — motion_risk, avg_velocity, max_acceleration, jitter_ratio. |
| **hand_motion.py** | (При использовании) — анализ движения рук; в основном пайплайне main_realtime задействован face_motion. |

---

## 10. tracking/ — трекинг лиц по ID

| Файл | Что внутри |
|------|------------|
| **face_tracker.py** | Класс **FaceTracker**: сопоставление боксов между кадрами по расстоянию между центроидами (max_distance, ttl_frames). Для каждого face_id хранится RiskEngine и FaceMotionAnalyzer. **update(detections)** возвращает список (face_id, box). **get_engine(face_id)**, **get_motion_analyzer(face_id)** — доступ к движкам по ID. Так обеспечивается персональная временная история по каждому лицу. |

---

## 11. backend/ — HTTP API для веба

| Файл | Что внутри |
|------|------------|
| **app.py** | FastAPI: один эндпоинт **POST /analyze**. Тело: **FrameRequest** с полем `image` — список (grayscale 64×64). Загружает **EmotionRiskModel** из model_logic (модель + внутренний буфер). По кадру вызывает predict_emotion → добавляет в буфер, evaluate_risk → state, risk, dominant. Ответ: state, risk, emotion, confidence, dominant_emotion. CORS для localhost:3000. Для стыковки с фронтом (отправка кадров с камеры) используется именно app.py. |
| **api.py** | Отдельное FastAPI-приложение: **POST /analyze** принимает **RiskRequest** — список `{emotion, confidence, timestamp}` (без изображения). Вызов **evaluate_risk** из risk_engine (backend) — взвешенная сумма с decay по времени. Ответ: risk, state (NORMAL/SUSPICIOUS/POTENTIAL THREAT), dominant_emotion. Вариант, когда эмоции считаются на клиенте и на сервер передаётся только временной ряд. |
| **model_logic.py** | Класс **EmotionRiskModel**: обёртка над inference.emotion_model.EmotionModel. Загрузка emotion_model.h5, внутренний буфер _emotion_buffer (последние 120 записей). **predict_emotion(frame)** — предсказание через EmotionModel, добавление (emotion, conf, timestamp) в буфер, возврат (emotion, conf). **evaluate_risk()** — вызов backend.evaluate_risk по буферу, возврат (state, risk, dominant_emotion). |
| **risk_engine.py** | Функция **evaluate_risk(buffer)**: buffer = [(emotion, confidence, timestamp), ...]. Взвешенная сумма с экспоненциальным decay (DECAY_LAMBDA=0.9), веса эмоций (Angry=1.0, Fear=0.8, …). Возврат (risk, dominant). Используется в api.py и в model_logic.evaluate_risk. |
| **utils.py** | Вспомогательные функции бэкенда (если есть). |

---

## 12. event_logging/ — логи для анализа

| Файл | Что внутри |
|------|------------|
| **event_logger.py** | **init_logs()** — создаёт CSV при первом запуске: events_log.csv (агрегированные события), events_log_temporal.csv (покадровая динамика по face_id). **log_face_state(face_id, fps, state)** — запись строки в temporal-лог (timestamp, face_id, scenario, state, engagement_state, risk, motion_risk, fused_risk, engagement, stress, fatigue, stability, volatility, dominant_emotion, fps). **log_global_event(...)** — редкие глобальные события. |

---

## 13. utils/ — экспорт, валидация, отображение

| Файл | Что внутри |
|------|------------|
| **data_export.py** | **export_session_to_json(session_metrics, output_path)** — сохранение SessionMetrics в JSON. **export_temporal_data_to_json(frame_data, output_path)** — экспорт временных рядов. **export_summary_report(...)** — сводный отчёт (например, текстовый/маркдаун). |
| **validation.py** | **SmoothingFilter** — экспоненциальное сглаживание (alpha) для engagement/stress/fatigue/motion_risk. **ConfidenceHandler** — обработка низкой уверенности модели. **DataQualityValidator** — проверка входных данных. **BufferStateValidator** — проверка состояния буфера. Нужны для устойчивости и обоснования в дипломе. |
| **text_renderer.py** | Перевод русских подписей в английские для OpenCV (get_english_state_name, get_english_pattern_name, get_english_tz_state_label и т.д.), translate_justification_for_display. |
| **utils/__init__.py** | Служебный. |

---

## 14. explain/ — объяснимость

| Файл | Что внутри |
|------|------------|
| **explanation_schema.py** | Dataclass **RiskExplanation**: emotion_risk, motion_risk, stability, dominant_emotion, trend и метод **as_dict()** для включения в отчёты. Единый формат объяснений риска. |

---

## 15. metrics/ — служебные метрики времени выполнения

| Файл | Что внутри |
|------|------------|
| **runtime_metrics.py** | Класс **RuntimeMetrics**: окно последних значений (например, FPS). Методы: update(value), stability(), trend(), reaction_time(), reset(). Для мониторинга производительности демо. |

---

## 16. training/ — обучение CNN

| Файл | Что внутри |
|------|------------|
| **train_model.py** | Загрузка данных из data/train и data/test (ImageDataGenerator с аугментацией). Модель: Sequential CNN (Conv2D 32→64→128, BatchNorm, MaxPool, Dropout, Dense 256, выход 7 классов). Обучение, сохранение в emotion_model.h5. Отдельный скрипт для переобучения/дообучения модели. |

---

## 17. demo/ — тестовые скрипты

| Файл | Назначение |
|------|------------|
| **main.py** | Упрощённый демо (камера + эмоции). |
| **test_multiface.py** | Тест мультилица. |
| **test_risk.py** | Тест RiskEngine. |
| **test_buffer.py** | Тест буфера. |

---

## 18. Как это связано в main_realtime.py (по шагам)

1. Загрузка модели (EmotionModel), FaceProcessor, FaceTracker (сценарий SCENARIO), FusionEngine (профиль из scenario_profiles), GroupEngagementAnalyzer, SessionAnalyzer, AttentionDropDetector, ParticipantRegistry, логи, экспорт.
2. Цикл: чтение кадра → FaceProcessor.detect() → для каждого бокса crop_face_with_margin → EmotionModel.predict() → FaceTracker.update() даёт (face_id, box).
3. Для каждого (face_id, box): RiskEngine (из трекера).push_emotion(); engine.compute_risk() → emotion_risk, engagement, stress, fatigue, stability и т.д.; FaceMotionAnalyzer.update(box) → motion_risk; FusionEngine.fuse(...) → fused_risk, state, engagement_state, explanation; map_to_tz_state() → tz_state для ТЗ.
4. Собранные по кадру данные по лицам передаются в GroupEngagementAnalyzer.analyze() → group_state, group_pattern, justification; SessionAnalyzer.add_frame(); AttentionDropDetector.update() по каждому лицу.
5. Отрисовка: панели по каждому лицу (engagement, stress, fatigue, TZ state, risk), групповое состояние, FPS. Логирование log_face_state при необходимости.
6. По завершении сессии: SessionAnalyzer.end_session(attention_drops), export_session_to_json, export_summary_report.

---

## 19. Два API (важно для интеграции)

- **backend/app.py** — приём **кадра 64×64** (grayscale), возврат emotion, risk, state, confidence, dominant_emotion. Для веб-клиента с камерой. Запуск: `uvicorn backend.app:app --host 0.0.0.0 --port 8000` из корня emotion-ml-service; нужен emotion_model.h5 в текущей директории.
- **backend/api.py** — приём **списка {emotion, confidence, timestamp}**, возврат risk, state, dominant_emotion. Для варианта, когда эмоции считаются на клиенте и на бэкенд передаётся только история.

Использовать один из двух в зависимости от того, кто считает эмоции: сервер (app.py) или клиент (api.py).

---

Этот файл можно отдать преподу как полное описание: что в каком файле лежит и как данные проходят от кадра до отчёта и API.
