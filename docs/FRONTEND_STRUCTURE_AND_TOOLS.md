# Фронтенд ELAS: полная структура и используемые инструменты

Детальное описание репозитория **elas-frontend** — дерево файлов и все технологии/инструменты с назначением и версиями.

---

## 1. Технологический стек (кратко)

| Категория | Технология | Версия | Назначение |
|-----------|------------|--------|------------|
| Фреймворк | **Next.js** | 16.x | React-фреймворк, App Router, SSR/SSG, API routes не используются (backend отдельно) |
| UI | **React** | 19.x | Компоненты, хуки, клиентский рендер |
| Язык | **TypeScript** | 5.x | Типизация, пути `@/*` → `./src/*` |
| Стили | **Tailwind CSS** | 4.x | Утилитарные классы, дизайн-токены, тёмная тема (`class`) |
| Иконки | **lucide-react** | 0.574.x | Иконки (Video, LogOut, Mic, Settings и т.д.) |
| Графики | **Chart.js** + **react-chartjs-2** | 4.5 / 5.3 | Графики вовлечённости, стресса (EngagementChart, StressChart) |
| Утилиты классов | **clsx** + **tailwind-merge** | 2.1 / 3.4 | `cn()` для условных и слияния Tailwind-классов |
| ID | **nanoid** | 5.1 | Генерация коротких уникальных id при необходимости |
| Сборка/стили | **PostCSS** | 8.x | Плагин `@tailwindcss/postcss` для Tailwind v4 |
| Линтер | **ESLint** | 9.x | Правила `eslint-config-next` (core-web-vitals, TypeScript) |
| Сборка | **Webpack** (через Next) | — | `next dev --webpack`, бандлинг и HMR |

**Внешние сервисы (без npm-пакетов):**

- **REST API** — свой backend (Node.js/Express), базовый URL через `NEXT_PUBLIC_API_URL`.
- **WebSocket** — сигналинг и чат: `NEXT_PUBLIC_WS_BASE_URL` или fallback (localhost:10000 / wss://elas-backend.onrender.com).
- **ML API** — emotion-ml-service (FastAPI), URL через `NEXT_PUBLIC_ML_API_URL` (вызовы из `lib/api/ml.ts`).

---

## 2. Конфигурационные файлы (корень elas-frontend)

| Файл | Назначение |
|------|------------|
| **package.json** | Зависимости (dependencies, devDependencies), скрипты: `dev`, `build`, `start`, `lint`. |
| **package-lock.json** | Фиксация версий зависимостей. |
| **tsconfig.json** | TypeScript: target ES2017, strict, paths `@/*` → `./src/*`, плагин Next.js. |
| **next.config.ts** | Next.js: разрешённые домены для `next/image` (например images.unsplash.com). |
| **tailwind.config.ts** | Tailwind: darkMode `class`, content (app, components, lib), кастомные цвета/радиусы/тени из CSS-переменных. |
| **postcss.config.js** | PostCSS: один плагин `@tailwindcss/postcss`. |
| **eslint.config.mjs** | ESLint: конфиг Next (core-web-vitals, TypeScript), игноры .next, out, build. |
| **.env / .env.local** | Переменные окружения (не в git): `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_BASE_URL`, `NEXT_PUBLIC_ML_API_URL`. |

---

## 3. Полная структура исходного кода (src/)

```
src/
├── app/                                    # Next.js App Router
│   ├── favicon.ico
│   ├── globals.css                         # Дизайн-токены, Tailwind @import, темы light/dark
│   ├── layout.tsx                          # Корневой layout (провайдеры, Shell, стили)
│   ├── not-found.tsx                       # Страница 404
│   ├── page.tsx                            # Главная (/)
│   │
│   ├── (public)/                           # Группа маршрутов без изменения URL
│   │   ├── page.tsx
│   │   ├── ethics/page.tsx
│   │   └── privacy/page.tsx
│   │
│   ├── 403/page.tsx                        # Доступ запрещён
│   │
│   ├── auth/
│   │   ├── forgot-password/page.tsx
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   │
│   ├── consent/
│   │   ├── ConsentClient.tsx               # Клиентская часть страницы согласия
│   │   └── page.tsx
│   │
│   ├── profile/page.tsx
│   │
│   ├── admin/
│   │   ├── audit/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── group/[id]/page.tsx
│   │   ├── groups/page.tsx
│   │   ├── model/page.tsx
│   │   ├── storage/page.tsx
│   │   └── users/page.tsx
│   │
│   ├── student/
│   │   ├── dashboard/page.tsx
│   │   ├── group/[id]/page.tsx
│   │   ├── groups/page.tsx
│   │   ├── session/[id]/page.tsx           # Страница сессии студента (видео, чат, ML)
│   │   ├── sessions/page.tsx
│   │   └── summary/page.tsx
│   │
│   └── teacher/
│       ├── compare/page.tsx
│       ├── dashboard/page.tsx
│       ├── group/[id]/page.tsx
│       ├── groups/page.tsx
│       ├── reports/page.tsx
│       ├── session/[id]/page.tsx           # Live-монитор сессии (видео, чат, метрики)
│       ├── session/[id]/analytics/page.tsx
│       ├── session/[id]/exam-analytics/page.tsx
│       ├── sessions/page.tsx
│       └── sessions/new/page.tsx          # Создание новой сессии
│
├── components/
│   ├── charts/
│   │   ├── chartTheme.ts                   # Тема для Chart.js (цвета, шрифты)
│   │   ├── EngagementChart.tsx             # График вовлечённости (Chart.js)
│   │   └── StressChart.tsx                 # График стресса (Chart.js)
│   │
│   ├── chat/
│   │   └── SessionChatPanel.tsx            # Чат сессии (сообщения, ввод, политика)
│   │
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
│   │
│   ├── layout/
│   │   ├── AuthRestore.tsx                 # Восстановление auth из localStorage
│   │   ├── Breadcrumbs.tsx
│   │   ├── Footer.tsx
│   │   ├── Providers.tsx                  # React-контекст (UI state, consent и т.д.)
│   │   ├── QuickSearch.tsx
│   │   ├── RoleGuard.tsx                   # Защита маршрутов по роли
│   │   ├── RoleSwitcher.tsx
│   │   ├── Shell.tsx                       # Оболочка страницы (TopNav + дети)
│   │   ├── ThemeProvider.tsx               # Тема (light/dark)
│   │   └── TopNav.tsx                      # Верхняя навигация, меню
│   │
│   ├── session/
│   │   ├── CameraCheck.tsx                 # Проверка камеры перед сессией
│   │   ├── NotesTimeline.tsx
│   │   ├── SessionCodeCard.tsx
│   │   ├── StudentSessionTabs.tsx          # Табы студента (подготовка / live)
│   │   └── TeacherSessionTabs.tsx         # Табы преподавателя (live, analytics, reports)
│   │
│   └── ui/                                 # Переиспользуемые UI-компоненты
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
│
├── hooks/
│   ├── useSearch.ts
│   └── useTeacherLiveSession.ts
│
└── lib/
    ├── cn.ts                               # cn() = clsx + tailwind-merge
    ├── env.ts                              # getWsBaseUrl() — URL WebSocket
    ├── nav.ts                              # Конфиг навигации (меню, ссылки)
    ├── roles.ts
    ├── routes.ts                           # Пути приложения (login, dashboard и т.д.)
    ├── types.ts
    │
    ├── api/                                # Клиенты к backend и ML
    │   ├── client.ts                       # getApiBaseUrl, getToken, setAuth, hasAuth, request, isRealSessionId
    │   ├── admin.ts
    │   ├── ml.ts                           # ML API: captureFrame64x64Grayscale, mlAnalyzeFrame, sendSessionMetrics
    │   ├── reports.ts
    │   ├── search.ts
    │   ├── student.ts                      # getSessionJoinInfo, recordSessionConsent, sendSessionMetrics
    │   └── teacher.ts                      # Сессии, группы, чат, getSessionMessages, postSessionMessage, live-metrics
    │
    ├── mock/                               # Мок-данные для разработки
    │   ├── events.ts
    │   ├── groups.ts
    │   ├── groupSessions.ts
    │   ├── participants.ts
    │   ├── reports.ts
    │   ├── sessionLifecycle.ts
    │   ├── sessions.ts
    │   └── users.ts
    │
    ├── store/
    │   └── uiStore.ts                      # Состояние UI (consent, тема и т.п.)
    │
    ├── utils/
    │   ├── analytics.ts
    │   └── metrics.ts
    │
    ├── webrtc/                             # WebRTC для видеозвонков в сессии
    │   ├── peerConnectionManager.ts        # Управление RTCPeerConnection, потоки
    │   ├── signalingClient.ts              # WebSocket-клиент сигналинга
    │   └── types.ts
    │
    └── ws/
        └── chatClient.ts                   # WebSocket-клиент чата (join session, message:new)
```

---

## 4. Инструменты по назначению (детально)

### 4.1. Сборка и разработка

| Инструмент | Версия | Где используется | Назначение |
|------------|--------|------------------|------------|
| **Next.js** | 16.1.6 | Вся сборка | App Router, серверный и клиентский рендер, роутинг по папкам `app/`. |
| **React** | 19.2.3 | Все компоненты | Декларативный UI, хуки (useState, useEffect, useRef и т.д.). |
| **react-dom** | 19.2.3 | Точка входа | Рендер в DOM. |
| **TypeScript** | ^5 | Все .ts/.tsx | Строгая типизация, пути `@/*`. |
| **Webpack** | (в составе Next) | `next dev --webpack` | Бандлинг, HMR. |

### 4.2. Стили и темизация

| Инструмент | Версия | Где используется | Назначение |
|------------|--------|------------------|------------|
| **Tailwind CSS** | ^4 | globals.css, все компоненты | Утилитарные классы (flex, gap, rounded-elas-lg, bg-surface, text-fg и т.д.). |
| **@tailwindcss/postcss** | 4.1.18 | postcss.config.js | Обработка Tailwind в PostCSS. |
| **PostCSS** | 8.5.6 | Сборка стилей | Подключение плагина Tailwind. |
| **globals.css** | — | app/globals.css | CSS-переменные (--bg, --surface, --primary, --radius), темы :root и :root.dark. |
| **tailwind.config.ts** | — | Конфиг | darkMode: "class", расширение theme (colors, borderRadius, boxShadow) из переменных. |

### 4.3. UI и визуал

| Инструмент | Версия | Где используется | Назначение |
|------------|--------|------------------|------------|
| **lucide-react** | 0.574.0 | Кнопки, навбар, сессии | Иконки: Video, LogOut, Mic, PhoneOff, Settings, Share2, Activity, Users и др. |
| **clsx** | 2.1.1 | lib/cn.ts, компоненты | Условное объединение классов. |
| **tailwind-merge** | 3.4.1 | lib/cn.ts | Слияние Tailwind-классов без конфликтов. |
| **Chart.js** | 4.5.1 | components/charts/* | Движок графиков (линейные, doughnut). |
| **react-chartjs-2** | 5.3.1 | EngagementChart, StressChart | React-обёртка над Chart.js. |

### 4.4. Сеть и данные

| Инструмент / подход | Где используется | Назначение |
|---------------------|------------------|------------|
| **fetch** (нативный) | lib/api/client.ts | REST-запросы к backend (get, post, patch, delete) с заголовком Authorization: Bearer. |
| **WebSocket** (нативный) | lib/webrtc/signalingClient.ts, lib/ws/chatClient.ts | Сигналинг WebRTC и события чата (message:new). |
| **WebRTC** (нативный) | lib/webrtc/peerConnectionManager.ts | getUserMedia, RTCPeerConnection, передача видео/аудио в сессии. |
| **localStorage** | lib/api/client.ts (AUTH_KEY) | Хранение JWT и роли (elas_auth_v1). |
| **env** | lib/env.ts, lib/api/client.ts, lib/api/ml.ts | NEXT_PUBLIC_WS_BASE_URL, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_ML_API_URL. |

### 4.5. Вспомогательные библиотеки

| Инструмент | Версия | Где используется | Назначение |
|------------|--------|------------------|------------|
| **nanoid** | 5.1.6 | При необходимости уникальных id | Генерация коротких id. |

### 4.6. Линтинг и типы

| Инструмент | Версия | Назначение |
|------------|--------|------------|
| **ESLint** | ^9 | Линтинг JS/TS. |
| **eslint-config-next** | 16.1.6 | Правила Next.js (core-web-vitals, TypeScript). |
| **@types/node** | ^20 | Типы Node (process.env и т.д.). |
| **@types/react** / **@types/react-dom** | ^19 | Типы для React 19. |

---

## 5. Переменные окружения (фронтенд)

| Переменная | Назначение | Пример |
|------------|------------|--------|
| **NEXT_PUBLIC_API_URL** | Базовый URL REST API backend | `http://localhost:4000` |
| **NEXT_PUBLIC_WS_BASE_URL** | Базовый URL WebSocket (сигналинг, чат) | `ws://localhost:10000` или `wss://...` |
| **NEXT_PUBLIC_ML_API_URL** | URL ML-сервиса (анализ кадров) | `http://localhost:8000` |

Используются в браузере (префикс `NEXT_PUBLIC_`). Fallback для WS описан в `lib/env.ts` (localhost → 10000, иначе wss://elas-backend.onrender.com).

---

## 6. Скрипты package.json

| Скрипт | Команда | Назначение |
|--------|--------|------------|
| **dev** | `next dev --webpack` | Режим разработки с hot reload. |
| **build** | `next build` | Продакшен-сборка. |
| **start** | `next start` | Запуск собранного приложения. |
| **lint** | `eslint` | Проверка кода линтером. |

---

## 7. Итоговая сводка по инструментам

- **Фреймворк и UI:** Next.js 16, React 19, TypeScript 5.  
- **Стили:** Tailwind CSS 4, PostCSS, дизайн-токены в CSS и tailwind.config.  
- **Иконки и графики:** lucide-react, Chart.js + react-chartjs-2.  
- **Утилиты:** clsx, tailwind-merge (через cn), nanoid.  
- **Сеть:** нативный fetch (REST), WebSocket (сигналинг + чат), WebRTC (видео в сессиях).  
- **Конфиг:** next.config.ts, tailwind.config.ts, postcss.config.js, tsconfig.json, eslint.config.mjs.  
- **Состояние и данные:** React state + контекст (Providers, uiStore), localStorage (auth), моки в lib/mock для разработки.

Все перечисленные файлы и зависимости соответствуют текущему состоянию репозитория **elas-frontend**.
