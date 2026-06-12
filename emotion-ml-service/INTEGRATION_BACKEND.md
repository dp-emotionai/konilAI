# Связка ML-сервиса с ELAS backend

## Сохранение сводки аналитики в БД

Бэкенд ELAS сохраняет сводку по сессии в поле `Session.analyticsSummary`:

1. **Автоматически** — при завершении сессии (преподаватель нажимает «Завершить»): текущие live-метрики сохраняются в БД.
2. **Вручную из Python** — скрипт отправляет готовый отчёт (после `main_realtime.py` или из файла `session_*.json`) на бэкенд.

## Отправка отчёта из emotion-ml-service в backend

После того как демо `main_realtime.py` завершило сессию и создало файл `session_<session_id>_<timestamp>.json`.

**Важно:** подставляй реальный UUID сессии и реальный JWT без угловых скобок. В PowerShell символы `<` и `>` зарезервированы.

### Windows (PowerShell)

Из папки `emotion-ml-service` (уже в ней — не набирай `cd emotion-ml-service`):

```powershell
# Активировать venv (если ещё не активен)
.\venv\Scripts\Activate.ps1

# Переменные: подставь свой URL бэкенда и свой JWT (без < и >)
$env:ELAS_BACKEND_URL = "http://localhost:4000"
$env:ELAS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Отправить отчёт — подставь реальный UUID сессии (как в session_id в JSON)
python scripts/push_session_summary_to_backend.py 83e90f89-2e11-4ee6-8533-c31c2c3cb112
```

С указанием файла:

```powershell
python scripts/push_session_summary_to_backend.py 83e90f89-2e11-4ee6-8533-c31c2c3cb112 session_83e90f89-2e11-4ee6-8533-c31c2c3cb112_20260227_065739.json
```

### Linux / macOS (bash)

```bash
export ELAS_BACKEND_URL="http://localhost:4000"
export ELAS_TOKEN="твой_jwt_токен"
python scripts/push_session_summary_to_backend.py 83e90f89-2e11-4ee6-8533-c31c2c3cb112
```

Скрипт преобразует формат Python-экспорта в формат API `POST /sessions/:id/analytics/ingest` и отправляет запрос. После этого страница аналитики сессии на фронте (и `GET /sessions/:id/analytics/summary`) будет отдавать сохранённую сводку из БД.

## Как взять JWT

Зайди на фронт под учёткой преподавателя или admin → открой DevTools (F12) → Application (или Storage) → Local Storage → ключ `elas_auth_v1` → скопируй значение поля `token` (длинная строка без кавычек).

## API бэкенда

- **GET /sessions/:id/analytics/summary** — возвращает сводку: из БД (`analyticsSummary`), если есть, иначе из текущих live-метрик.
- **POST /sessions/:id/analytics/ingest** — сохранить сводку в БД (teacher/admin, JWT). Тело: `sessionId`, `startedAt`, `endedAt`, `durationSeconds`, `metrics`, `dominantEmotion`, `group`, `attentionDrops`.
