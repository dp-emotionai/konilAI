# Интеграция ELAS с Emotion-ML-Service

**Для агента:** при интеграции фронта/бэкенда сайта с ML-анализом эмоций используйте **единственный источник правды** — описание сервиса и контрактов API:

- **`emotion-ml-service/docs/AGENT_BRIEFING.md`** — полное описание папки `emotion-ml-service`, двух API (app.py vs api.py), форматов запросов/ответов, 6 состояний ТЗ, метрик, ограничений и запуска.

**Расположение ML-сервиса в проекте:**

```
elas/
├── backend/              # Node/Express API сайта (сессии, группы, auth)
├── elas-frontend/        # Next.js фронт
├── emotion-ml-service/   # Python ML: эмоции, риск, вовлечённость
│   ├── docs/
│   │   └── AGENT_BRIEFING.md   ← читать первым
│   ├── backend/
│   │   ├── app.py        # POST /analyze — кадр 64×64 → emotion, risk, state
│   │   └── api.py        # POST /analyze — буфер эмоций → risk, state
│   └── ...
└── docs/
    └── ML_INTEGRATION.md # этот файл
```

**Запуск ML-API (для стыковки с камерой на фронте):**  
Из корня `emotion-ml-service`: `uvicorn backend.app:app --host 0.0.0.0 --port 8000`.  
Нужны файлы `emotion_model.h5` и (для app.py) `haarcascade_frontalface_default.xml` в рабочей директории.

**Фронт (elas-frontend):**  
- На странице «Студент → Сессия → В эфире» при включённой камере и данном согласии раз в ~0.6 с захватывается кадр 64×64 grayscale и отправляется в `POST {ML_API}/analyze`. Результат (emotion, state, risk, confidence) отображается бейджами.  
- Переменная окружения: `NEXT_PUBLIC_ML_API_URL` (по умолчанию `http://localhost:8000`). Если ML на другом порту/хосте — задать в `.env.local`.  
- CORS: в `emotion-ml-service/backend/app.py` по умолчанию `allow_origins=["http://localhost:3000"]`. Если Next.js на другом порту — добавить его в список или `["*"]` для разработки.

**Не смешивать:** `backend/app.py` и `backend/api.py` — два разных FastAPI-приложения с разными контрактами. Для отправки кадров с сайта используется **app.py**.
