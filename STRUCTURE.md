# Структура проекта ELAS

Полная структура фронтенда, бэкенда и Python ML-сервиса (исходный код и ключевые артефакты).

---

## Корень репозитория

```
elas/
├── elas-frontend/     # Next.js фронтенд
├── backend/           # Node.js + Express + Prisma бэкенд
├── emotion-ml-service/ # Python ML-сервис (эмоции, риск, аналитика)
└── STRUCTURE.md       # этот файл
```

---

## 1. Фронтенд (elas-frontend)

**Стек:** Next.js (App Router), React, TypeScript.

### Исходники (src/)

```
elas-frontend/src/
├── app/
│   ├── favicon.ico
│   ├── globals.css
│   ├── layout.tsx
│   ├── not-found.tsx
│   ├── page.tsx
│   ├── (public)/
│   │   ├── page.tsx
│   │   ├── ethics/
│   │   │   └── page.tsx
│   │   └── privacy/
│   │       └── page.tsx
│   ├── 403/
│   │   └── page.tsx
│   ├── admin/
│   │   ├── audit/
│   │   │   └── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── group/
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── groups/
│   │   │   └── page.tsx
│   │   ├── model/
│   │   │   └── page.tsx
│   │   ├── storage/
│   │   │   └── page.tsx
│   │   └── users/
│   │       └── page.tsx
│   ├── auth/
│   │   ├── forgot-password/
│   │   │   └── page.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── consent/
│   │   ├── ConsentClient.tsx
│   │   └── page.tsx
│   ├── profile/
│   │   └── page.tsx
│   ├── student/
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── group/
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── groups/
│   │   │   └── page.tsx
│   │   ├── session/
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── sessions/
│   │   │   └── page.tsx
│   │   └── summary/
│   │       └── page.tsx
│   └── teacher/
│       ├── compare/
│       │   └── page.tsx
│       ├── dashboard/
│       │   └── page.tsx
│       ├── group/
│       │   └── [id]/
│       │       └── page.tsx
│       ├── groups/
│       │   └── page.tsx
│       ├── reports/
│       │   └── page.tsx
│       ├── session/
│       │   └── [id]/
│       │       ├── page.tsx
│       │       ├── analytics/
│       │       │   └── page.tsx
│       │       └── exam-analytics/
│       │           └── page.tsx
│       ├── sessions/
│       │   ├── page.tsx
│       │   └── new/
│       │       └── page.tsx
│       └── (все страницы перечислены выше)
├── components/
│   ├── charts/
│   │   ├── chartTheme.ts
│   │   ├── EngagementChart.tsx
│   │   └── StressChart.tsx
│   ├── chat/
│   │   └── SessionChatPanel.tsx
│   ├── common/
│   │   ├── DonutMini.tsx
│   │   ├── EmptyState.tsx
│   │   ├── Glow.tsx
│   │   ├── MiniChart.tsx
│   │   ├── PageHero.tsx
│   │   ├── PageTitle.tsx
│   │   ├── Reveal.tsx
│   │   ├── Section.tsx
│   │   ├── SectionDark.tsx
│   │   ├── SectionLightStrip.tsx
│   │   ├── SparkArea.tsx
│   │   ├── StatCard.tsx
│   │   └── TableSkeleton.tsx
│   ├── layout/
│   │   ├── AuthRestore.tsx
│   │   ├── Breadcrumbs.tsx
│   │   ├── Footer.tsx
│   │   ├── Providers.tsx
│   │   ├── QuickSearch.tsx
│   │   ├── RoleGuard.tsx
│   │   ├── RoleSwitcher.tsx
│   │   ├── Shell.tsx
│   │   ├── ThemeProvider.tsx
│   │   └── TopNav.tsx
│   ├── session/
│   │   ├── CameraCheck.tsx
│   │   ├── NotesTimeline.tsx
│   │   ├── SessionCodeCard.tsx
│   │   ├── StudentSessionTabs.tsx
│   │   └── TeacherSessionTabs.tsx
│   └── ui/
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── GlassCard.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       ├── Skeleton.tsx
│       ├── Stack.tsx
│       ├── Table.tsx
│       └── Toast.tsx
├── hooks/
│   ├── useSearch.ts
│   └── useTeacherLiveSession.ts
├── lib/
│   ├── cn.ts
│   ├── env.ts
│   ├── nav.ts
│   ├── roles.ts
│   ├── routes.ts
│   ├── types.ts
│   ├── api/
│   │   ├── admin.ts
│   │   ├── client.ts
│   │   ├── ml.ts
│   │   ├── reports.ts
│   │   ├── search.ts
│   │   ├── student.ts
│   │   └── teacher.ts
│   ├── mock/
│   │   ├── events.ts
│   │   ├── groups.ts
│   │   ├── groupSessions.ts
│   │   ├── participants.ts
│   │   ├── reports.ts
│   │   ├── sessionLifecycle.ts
│   │   ├── sessions.ts
│   │   └── users.ts
│   ├── store/
│   │   └── uiStore.ts
│   ├── utils/
│   │   ├── analytics.ts
│   │   └── metrics.ts
│   ├── webrtc/
│   │   ├── peerConnectionManager.ts
│   │   ├── signalingClient.ts
│   │   └── types.ts
│   └── ws/
│       └── chatClient.ts
└── (остальные файлы перечислены выше)
```

### Конфигурация в корне фронта

- `package.json`, `tsconfig.json`, `next.config.*`, `tailwind.config.*`, `postcss.config.*`, `components.json` (если есть) — в корне `elas-frontend/`.

---

## 2. Бэкенд (backend)

**Стек:** Node.js, Express, TypeScript, Prisma (БД).

### Исходники и конфигурация

```
backend/
├── .env
├── package.json
├── package-lock.json
├── tsconfig.json
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   ├── migrations/
│   │   ├── migration_lock.toml
│   │   ├── 20260306013133_init/
│   │   │   └── migration.sql
│   │   └── 20260306204209_add_session_analytics_summary/
│   │       └── migration.sql
│   └── migrations-backup/
│       └── 20260227025027_chat/
│           └── migration.sql
├── src/
│   ├── index.ts
│   ├── audit.ts
│   ├── config.ts
│   ├── db.ts
│   ├── chat-ws/
│   │   ├── handlers.ts
│   │   ├── rooms.ts
│   │   └── types.ts
│   ├── http/
│   │   ├── audit.ts
│   │   ├── auth.ts
│   │   ├── chat.ts
│   │   ├── groups.ts
│   │   ├── invitations.ts
│   │   ├── middleware.ts
│   │   ├── ratelimit.ts
│   │   ├── routes.ts
│   │   ├── search.ts
│   │   ├── security.ts
│   │   ├── sessions.ts
│   │   └── (все перечислены)
│   ├── signaling/
│   │   ├── handlers.ts
│   │   ├── rooms.ts
│   │   └── types.ts
│   └── ws/
│       └── security.ts
└── dist/                 # скомпилированный JS (генерируется)
    ├── index.js
    ├── audit.js
    ├── config.js
    ├── db.js
    ├── chat-ws/
    ├── http/
    ├── signaling/
    └── ws/
```

---

## 3. Python ML-сервис (emotion-ml-service)

**Стек:** Python, FastAPI (app.py), TensorFlow/Keras (модель эмоций), OpenCV, логика риска и аналитики.

### Исходный код и артефакты (без venv и __pycache__)

```
emotion-ml-service/
├── app.py                          # FastAPI приложение (HTTP API)
├── main.py                         # Точка входа (например, запуск пайплайна)
├── main_realtime.py                # Realtime-пайплайн (камера → эмоции → риск)
├── analyze_logs.py                 # Анализ логов
├── requirements.txt
├── haarcascade_frontalface_default.xml  # OpenCV детектор лиц
├── emotion_model.h5                # Модель эмоций (Keras)
├── emotion_model_custom.h5         # Кастомная модель эмоций
├── events_log.csv
├── events_log_old.csv
├── events_log_temporal.csv
├── INTEGRATION_BACKEND.md          # Интеграция с бэкендом
├── RUN_ML_SERVICE.md               # Как запускать ML-сервис
├── session_*.json                  # Отчёты по сессиям (генерируются)
├── session_report_*.txt            # Текстовые отчёты (генерируются)
│
├── analytics/
│   ├── attention_drops.py
│   ├── confidence.py
│   ├── engagement.py
│   ├── fatigue.py
│   ├── group_engagement.py
│   ├── session_analyzer.py
│   ├── stability.py
│   └── stress.py
├── api/
│   └── api.py
├── backend/                        # Логика «бэкенда» внутри ML-сервиса
│   ├── __init__.py
│   ├── api.py
│   ├── app.py
│   ├── model_logic.py
│   ├── risk_engine.py
│   └── utils.py
├── config/
│   ├── __init__.py
│   ├── participant_registry.py
│   └── tz_emotion_mapping.py
├── demo/
│   ├── main.py
│   ├── test_buffer.py
│   ├── test_multiface.py
│   └── test_risk.py
├── docs/
│   ├── AGENT_BRIEFING.md
│   ├── MODEL_STRUCTURE_DETAILED.md
│   ├── TZ_ALIGNMENT.md
│   └── V0_PROMPT.md
├── event_logging/
│   ├── __init__.py
│   └── event_logger.py
├── explain/
│   ├── explainer.py
│   └── explanation_schema.py
├── fusion/
│   ├── fusion_engine.py
│   └── scenario_profiles.py
├── inference/
│   ├── emotion_model.py
│   └── face_processor.py
├── metrics/
│   ├── __init__.py
│   ├── evaluator.py
│   └── runtime_metrics.py
├── motion/
│   ├── face_motion.py
│   ├── hand_motion.py
│   └── motion_metrics.py
├── risk/
│   ├── __init__.py
│   ├── behavior.py
│   ├── risk_engine.py
│   └── state_machine.py
├── scripts/
│   └── push_session_summary_to_backend.py   # Отправка сводки сессии в backend
├── temporal/
│   ├── __init__.py
│   ├── buffer.py
│   └── decay.py
├── tracking/
│   ├── __init__.py
│   └── face_tracker.py
├── training/
│   ├── train_model.py
│   └── data/
│       ├── train/
│       │   ├── angry/
│       │   ├── disgust/
│       │   ├── fear/
│       │   ├── happy/
│       │   ├── neutral/
│       │   ├── sad/
│       │   └── surprise/
│       └── test/
│           ├── angry/
│           ├── disgust/
│           ├── fear/
│           ├── happy/
│           ├── neutral/
│           ├── sad/
│           └── surprise/
└── venv/                # Виртуальное окружение (не в git / не разворачивать в прод)
```

В каждой папке `training/data/train/<emotion>/` и `training/data/test/<emotion>/` лежат изображения лиц (например, `.jpg`) для обучения/теста модели эмоций.

---

## Сводка по частям

| Часть              | Технологии                    | Назначение |
|--------------------|--------------------------------|------------|
| **elas-frontend**  | Next.js, React, TS             | SPA: студент/преподаватель/админ, сессии, чат, WebRTC, согласие, отчёты |
| **backend**        | Node, Express, Prisma          | REST API, авторизация, сессии, чат, группы, метрики, WebSocket/сигналинг |
| **emotion-ml-service** | Python, FastAPI, TF/Keras, OpenCV | Детекция лиц, эмоции, риск, аналитика сессии, отправка сводки в backend |

Файл `STRUCTURE.md` можно обновлять при добавлении новых модулей или папок.
