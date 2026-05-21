# ELAS — Emotion-ML-Service: полное описание для агента интеграции

**Назначение документа:** передать другому агенту (например, в Cursor-проекте с веб-сайтом) папку `emotion-ml-service` вместе с этим файлом, чтобы агент корректно интегрировал бэкенд с фронтендом без ошибочных выводов о структуре, API и возможностях.

**Проект:** Emotion-Aware Learning Analytics System (ELAS) — дипломный проект. Анализ эмоциональной вовлечённости студентов по видеопотоку с веб-камеры во время онлайн-лекций и экзаменов. Результаты не используются для выставления оценок, только как аналитический инструмент (см. ТЗ в `docs/TZ_ALIGNMENT.md` и приложенное ТЗ).

---

## 1. Структура папки (только релевантные для интеграции; venv не передавать)

```
emotion-ml-service/
├── main_realtime.py          # Главный десктопный демо: камера + детекция + эмоции + панели OpenCV
├── main.py                   # Упрощённый демо-скрипт (камера + эмоции)
├── requirements.txt          # Зависимости Python
├── emotion_model.h5          # Файл модели Keras (CNN эмоций) — ОБЯЗАТЕЛЬНО должен быть в корне при запуске
├── docs/
│   ├── AGENT_BRIEFING.md     # Этот файл
│   ├── TZ_ALIGNMENT.md       # Соответствие ТЗ и реализации
│   └── V0_PROMPT.md          # Промпты для генерации UI (v0.dev)
├── inference/                # Детекция лиц и модель эмоций
│   ├── emotion_model.py      # Загрузка Keras-модели, препроцессинг, predict(face_img)
│   └── face_processor.py     # FaceProcessor (Haar/MediaPipe), crop_face_with_margin()
├── tracking/
│   └── face_tracker.py       # Трекинг лиц по ID между кадрами (centroid-based)
├── risk/
│   └── risk_engine.py        # Временной буфер эмоций, расчёт risk/engagement/stress/fatigue (полный пайплайн)
├── temporal/
│   └── buffer.py             # TemporalEmotionBuffer — буфер (emotion, confidence, timestamp)
├── fusion/
│   ├── fusion_engine.py       # Объединение emotion_risk, motion_risk, stress, fatigue в fused_risk и engagement_state
│   └── scenario_profiles.py  # Веса и пороги по сценариям: PUBLIC, SCHOOL, TRANSPORT
├── analytics/
│   ├── engagement.py         # compute_engagement()
│   ├── stress.py              # compute_stress()
│   ├── fatigue.py            # compute_fatigue()
│   ├── stability.py          # compute_stability_metrics()
│   ├── confidence.py         # compute_confidence() — уверенность по сегментам (ТЗ 4.4)
│   ├── attention_drops.py    # AttentionDropDetector — провалы внимания (ТЗ 4.3)
│   ├── group_engagement.py   # GroupEngagementAnalyzer — групповая аналитика
│   └── session_analyzer.py   # SessionAnalyzer — агрегация сессии, SessionMetrics, end_session()
├── motion/
│   └── face_motion.py        # FaceMotionAnalyzer — движение бокса лица → motion_risk
├── config/
│   ├── tz_emotion_mapping.py # 6 состояний ТЗ (neutral, boredom, interest, frustration, stress_anxiety, confidence_calm)
│   └── participant_registry.py # Метки участников (Participant N или кастомная метка)
├── event_logging/
│   └── event_logger.py       # Логи в events_log.csv, events_log_temporal.csv
├── utils/
│   ├── data_export.py        # export_session_to_json(), export_summary_report()
│   ├── validation.py         # SmoothingFilter, ConfidenceHandler, DataQualityValidator
│   └── text_renderer.py      # Перевод русских подписей в английские для OpenCV
├── metrics/
│   └── runtime_metrics.py    # FPS и т.п.
├── backend/                  # FastAPI для веб-интеграции
│   ├── app.py                # API 1: POST /analyze — принимет кадр 64x64 grayscale (JSON), возвращает emotion, risk, state
│   ├── api.py                # API 2: POST /analyze — принимет список {emotion, confidence, timestamp}, возвращает risk, state, dominant_emotion
│   ├── model_logic.py        # EmotionRiskModel (загрузка emotion_model.h5, predict_emotion, evaluate_risk)
│   └── risk_engine.py        # evaluate_risk(buffer) → (risk, dominant)
├── demo/                     # Тесты (test_multiface, test_risk, test_buffer)
└── explain/
    └── explanation_schema.py # Схемы объяснений (для отчётов)
```

**Важно:** папку `venv/` при передаче сайту не копировать. У сайта свой окружение; бэкенд можно поднять отдельно (uvicorn) или вызывать как сервис.

---

## 2. Точки входа и что они делают

| Файл | Назначение | Использование для сайта |
|------|------------|---------------------------|
| `main_realtime.py` | Полный десктопный демо: OpenCV-окно, камера, детекция лиц, эмоции, трекинг, сессия, экспорт JSON/отчёт. Запуск: `python main_realtime.py`. | Не запускать с сайта. Использовать как эталон логики; для веба нужен API (см. backend). |
| `main.py` | Упрощённый цикл камера → лица → эмоции. | То же — только справка. |
| `backend/app.py` | FastAPI: один эндпоинт **POST /analyze** — приём одного кадра 64×64 (grayscale), ответ: emotion, risk, state, confidence, dominant_emotion. | **Да.** Поднять как отдельный сервис (uvicorn), фронт шлёт кадры. |
| `backend/api.py` | Другой FastAPI-приложение: **POST /analyze** — приём списка кадров эмоций `{emotion, confidence, timestamp}`, ответ: risk, state, dominant_emotion. Без камеры, только агрегация по истории. | Альтернативный API, если фронт сам считает эмоции и присылает только временной ряд. |

**Критично:** в проекте два разных `backend/app.py` и `backend/api.py` — это два разных приложения FastAPI. Для стыковки с камерой на фронте обычно нужен **app.py** (отправка кадров). Запуск: из корня проекта `uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000` (нужны `emotion_model.h5` и при необходимости `haarcascade_frontalface_default.xml` в cwd или путь в коде; в app.py каскад загружается из файла по имени).

---

## 3. API в деталях (для интеграции с сайтом)

### 3.1. `backend/app.py` — анализ по одному кадру изображения

- **URL:** `POST /analyze`
- **Request body (JSON):**
  ```json
  { "image": [[0,1,...], [...], ...] }
  ```
  - `image` — двумерный массив 64×64, grayscale, значения 0–255 (uint8). Порядок: строки (height), затем столбцы (width).
- **Response (200):**
  ```json
  {
    "state": "NORMAL" | "SUSPICIOUS" | "POTENTIAL THREAT",
    "risk": 0.42,
    "emotion": "Sad",
    "confidence": 0.87,
    "dominant_emotion": "Sad"
  }
  ```
- **Ошибка:** если `image` не 64×64 — в ответе `{"error": "Frame must be 64x64 grayscale"}`.
- **CORS:** в коде указан `allow_origins=["http://localhost:3000"]` — для другого порта/домена нужно изменить.
- **Зависимости:** приложение при старте загружает `emotion_model.h5` и `haarcascade_frontalface_default.xml` из текущей рабочей директории. Рабочая директория при запуске uvicorn должна быть корень `emotion-ml-service` (или пути к файлам прописать явно).

### 3.2. `backend/api.py` — анализ по буферу эмоций (без изображения)

- **URL:** `POST /analyze`
- **Request body (JSON):**
  ```json
  {
    "frames": [
      { "emotion": "Sad", "confidence": 0.8, "timestamp": 1234567890.5 },
      { "emotion": "Neutral", "confidence": 0.6, "timestamp": 1234567891.0 }
    ]
  }
  ```
  - `emotion` — одна из: `Angry`, `Disgust`, `Fear`, `Happy`, `Sad`, `Surprise`, `Neutral`.
  - `timestamp` — float, секунды (Unix time).
- **Response (200):**
  ```json
  {
    "risk": 0.25,
    "state": "NORMAL" | "SUSPICIOUS" | "POTENTIAL THREAT",
    "dominant_emotion": "Neutral"
  }
  ```
- **CORS:** `allow_origins=["*"]`.

---

## 4. Модель эмоций (inference) — что ожидает и что возвращает

- **Файл модели:** `emotion_model.h5` (Keras) в корне проекта. Без него ни `main_realtime.py`, ни `backend/app.py` не запустятся.
- **Вход:** один кадр лица — numpy-массив (H, W) или (H, W, 3), uint8. Внутри:
  - приводят к grayscale при необходимости;
  - применяют CLAHE (опционально);
  - resize до 64×64, нормализация [0, 1];
  - форма в модель: (1, 64, 64, 1).
- **Выход `EmotionModel.predict(face_img)`:** словарь:
  - `emotion`: строка — одна из `Angry`, `Disgust`, `Fear`, `Happy`, `Sad`, `Surprise`, `Neutral`, или `Uncertain` при низкой уверенности;
  - `confidence`: float [0, 1];
  - `distribution`: dict с ключами по всем 7 эмоциям, значения — вероятности.
- **Детекция лиц:** в десктопе используется `FaceProcessor` (inference/face_processor.py): либо Haar (OpenCV, каскад из `cv2.data.haarcascades`), либо MediaPipe. Возвращает список боксов `(x, y, width, height)`. Для вырезки под эмоции используется `crop_face_with_margin(gray, box, margin=0.15)` — тогда в модель подаётся область с отступом.

---

## 5. Состояния по ТЗ (6 состояний) — для отображения на сайте

Модель выдаёт 7 эмоций CNN; в пайплайне они маппятся в **6 состояний по ТЗ** (config/tz_emotion_mapping.py):

| Код (англ.)     | Русское название (для логов/отчётов)     |
|-----------------|------------------------------------------|
| `neutral`       | нейтральное состояние                    |
| `boredom`       | скука / низкая вовлечённость             |
| `interest`      | интерес / внимание                       |
| `frustration`   | фрустрация                               |
| `stress_anxiety`| стресс / тревожность                     |
| `confidence_calm` | уверенность / спокойствие             |

В состоянии по каждому лицу в `main_realtime` доступны поля:
- `tz_state` — код (например `boredom`);
- `tz_state_label_ru` — русская подпись (для отчётов/JSON).
Для отображения на сайте можно использовать либо код, либо словарь подписей из `config/tz_emotion_mapping.py`: `TZ_STATE_LABELS_RU` / в utils/text_renderer есть `TZ_STATE_LABELS_EN` для английского интерфейса.

---

## 6. Метрики и структуры данных (сессия, группа, лицо)

### 6.1. Состояние по одному лицу (per-face state) — то, что получается после пайплайна в main_realtime

В логах и при передаче на фронт могут фигурировать такие поля (все float — в [0, 1], если не указано иное):

- `engagement` — вовлечённость;
- `stress` — стресс;
- `fatigue` — усталость;
- `stability` — стабильность эмоций;
- `risk` — эмоциональный риск (из risk_engine);
- `motion_risk` — риск по движению лица;
- `fused_risk` — объединённый риск (fusion);
- `state` — безопасность: `NORMAL` | `SUSPICIOUS` | `POTENTIAL THREAT`;
- `engagement_state` — образовательное состояние: `ENGAGED` | `TENSE_INVOLVEMENT` | `FATIGUED` | `OVERLOADED` | `DISENGAGED` | `NEUTRAL`;
- `dominant_emotion` — сырая эмоция CNN (Angry, Sad, …);
- `tz_state` — код состояния по ТЗ (neutral, boredom, …);
- `tz_state_label_ru` — русская подпись состояния по ТЗ;
- `participant_label` — отображаемая метка (по умолчанию `Participant {face_id}`);
- `confidence`, `stability_metrics`, `engagement_details`, `stress_details`, `fatigue_details` — при необходимости для детализации.

### 6.2. Групповое состояние (group_state) — результат GroupEngagementAnalyzer.analyze(individuals)

- `group_size` — число лиц;
- `avg_engagement`, `avg_stress`, `avg_fatigue`, `avg_risk`, `avg_stability`;
- `group_state` — общее состояние (то же множество, что engagement_state);
- `group_pattern` — паттерн: например `COLLECTIVE_DISENGAGEMENT`, `STRESS_CONTAGION`, `MIXED_ENGAGEMENT`, `HIGH_ENGAGEMENT`, `STABLE`;
- `justification` — текст обоснования (на русском в коде);
- `heterogeneity_level` — `LOW` | `MEDIUM` | `HIGH`;
- `collective_disengagement`, `stress_spike` — булевы;
- `tz_state_distribution` — словарь долей по TZ-состояниям (например для отчёта «у 68% — скука»).

### 6.3. Сессия (SessionMetrics) — результат SessionAnalyzer.end_session()

Экспорт в JSON через `utils/data_export.export_session_to_json(session_metrics)`. Структура `session_metrics.to_dict()`:

- `session_id`, `session_name`, `start_time`, `end_time`, `duration_seconds`;
- `averages`: `engagement`, `stress`, `fatigue`, `risk`, `stability`;
- `initial` / `final`: метрики в начале и конце сессии;
- `changes`: разница final − initial по engagement, stress, fatigue;
- `patterns`: `engagement_trend` (INCREASING/DECREASING/STABLE/FLUCTUATING), `stress_peaks`, `disengagement_periods`;
- `total_students`, `student_metrics` — словарь по студентам (avg_engagement, avg_stress, avg_fatigue, total_frames, …);
- `attention_drops` — список провалов внимания (face_id, participant_label, start_time, duration_sec, min_engagement и т.д.);
- `confidence_segments` — `start`, `middle`, `end` (уверенность по сегментам сессии, ТЗ 4.4).

Эту же структуру разумно использовать на сайте для страниц «Сессия», «Отчёты», «Экспорт».

---

## 7. Конфигурация (сценарии, частоты, пути)

- **Сценарии (fusion):** в `fusion/scenario_profiles.py` заданы три профиля: `PUBLIC`, `SCHOOL`, `TRANSPORT` — разные веса (emotion_risk, motion_risk, stress, fatigue, instability) и пороги. В `main_realtime.py` в начале файла константа `SCENARIO = "SCHOOL"`. Для веб-сервиса сценарий можно передавать параметром или конфигом.
- **Частота анализа по ТЗ:** 1–2 кадра в секунду на лицо. В `main_realtime.py`: `ANALYSIS_INTERVAL_SEC = 0.5` (2 раза в секунду). На сайте при отправке кадров на `/analyze` желательно не чаще 1–2 раз в секунду на одного пользователя.
- **Детектор лиц:** `FACE_DETECTOR = "haar"` или `"mediapipe"`. MediaPipe опционален (`pip install mediapipe`).
- **Пути к файлам:** при запуске из корня `emotion-ml-service` ожидаются в текущей директории: `emotion_model.h5`; для backend/app.py также `haarcascade_frontalface_default.xml` (или заменить на загрузку из `cv2.data.haarcascades` по аналогии с inference/face_processor.py).

---

## 8. Что система умеет (краткий список возможностей)

- Детекция лиц в кадре (Haar или MediaPipe), трекинг по face_id между кадрами.
- Классификация эмоций по лицу (7 классов CNN → опционально 6 состояний ТЗ).
- Временной буфер эмоций и расчёт: эмоциональный риск, вовлечённость, стресс, усталость, стабильность, уверенность (confidence).
- Движение лица (смещение bbox) → motion_risk.
- Fusion: объединение рисков и пороги по сценарию → fused_risk, state, engagement_state.
- Провалы внимания: периоды низкой вовлечённости дольше N секунд (порог и длительность задаются).
- Групповая аналитика: средние, паттерны, неоднородность, обоснование.
- Сессионная аналитика: начальные/конечные метрики, тренды, пики стресса, периоды дезингажемента, confidence_segments (start/middle/end), attention_drops.
- Экспорт: JSON сессии, текстовый отчёт, CSV-логи (events_log.csv, events_log_temporal.csv).
- Реестр участников: привязка face_id к отображаемой метке (Participant N или кастом).
- Никакой записи видео: сохраняются только метаданные и метрики (ТЗ).

---

## 9. Ограничения и важные замечания для агента

1. **Два разных backend-приложения:** `backend/app.py` и `backend/api.py` — разные FastAPI-приложения (разные эндпоинты и контракты). Не смешивать. Для интеграции с камерой на фронте — app.py (отправка кадров 64×64).
2. **Размер кадра в API:** в app.py строго 64×64 grayscale. Фронт должен ресайзить и конвертировать в grayscale перед отправкой (или бэкенд можно доработать, чтобы принимать больший кадр и сам делать crop/resize — но сейчас контракт 64×64).
3. **Модель и каскад:** без `emotion_model.h5` сервис не стартует. Без каскада не стартует app.py (если в нём остаётся загрузка из файла). При переносе на другой сервер нужно копировать эти файлы и задать правильную рабочую директорию.
4. **Авторизация и роли:** в этом репозитории нет реализации авторизации (студент/преподаватель/админ). ТЗ предполагает роли — их нужно реализовывать на стороне сайта/бэкенда сайта.
5. **WebSocket:** в текущем коде нет WebSocket для стриминга метрик в реальном времени. Фронт может опрашивать POST /analyze с частотой 1–2 раза в секунду или при необходимости добавить WebSocket отдельно.
6. **Язык интерфейса:** в данных и отчётах встречается русский текст (justification, отчёты); для UI на английском использовать `utils/text_renderer` (TZ_STATE_LABELS_EN и т.д.) или свои ключи перевода.
7. **CORS:** при размещении фронта на другом порту/домене нужно обновить `allow_origins` в backend/app.py.

---

## 10. Зависимости (requirements.txt)

- Python 3.10+
- opencv-python, numpy, tensorflow, fastapi, uvicorn, pydantic. Опционально: mediapipe (для детектора лиц MediaPipe).

Установка: `pip install -r requirements.txt`. Запуск API: из корня проекта `uvicorn backend.app:app --host 0.0.0.0 --port 8000`.

---

## 11. Документы в папке docs/

- **TZ_ALIGNMENT.md** — соответствие техническому заданию (эмоции, аналитика лекций/экзаменов, провалы внимания, уверенность, участники). Полезно для проверки, что сайт отображает все требуемые сущности.
- **V0_PROMPT.md** — промпты для генерации UI (v0.dev), не обязательны для интеграции, только справка по дизайну страниц.
- **AGENT_BRIEFING.md** — этот файл.

---

Используй этот документ и структуру папки как единственный источник правды о возможностях и контрактах emotion-ml-service при интеграции с сайтом. Не делай предположений о форматах или эндпоинтах без сверки с разделами 2–3 и 6.
