# ELAS Session Chat Policy & Moderation — дизайн

Этот документ описывает, как должны работать режимы чата сессии (`SessionChatPolicy`) и мьюты (`ChatMute`) в ELAS, чтобы поддерживать разные сценарии: лекция, экзамен, консультация.

Основа: уже есть таблицы в `backend/prisma/schema.prisma`:

```prisma
model SessionChatPolicy {
  sessionId    String   @id
  mode         String   @default("lecture_open") // "lecture_open" | "questions_only" | "locked" | "exam_help_only"
  slowmodeSec  Int      @default(0)
  updatedAt    DateTime @updatedAt

  session Session @relation(fields: [sessionId], references: [id], onDelete: Cascade)
}

model ChatMute {
  id           String   @id @default(uuid())
  scope        String   // "group" | "session"
  scopeId      String   // groupId or sessionId
  targetUserId String
  mutedUntil   DateTime
  createdById  String
  createdAt    DateTime @default(now())

  creator User @relation("ChatMuteCreator", fields: [createdById], references: [id], onDelete: Cascade)

  @@index([scope, scopeId])
  @@index([targetUserId])
}
```

---

## 1. Режимы SessionChatPolicy

### 1.1 Набор режимов

- `lecture_open` — базовый режим лекции:
  - Public chat включён.
  - Все участники (teacher, assistant, student) могут отправлять сообщения в `channel="public"`.
  - Help‑канал не используется (или только по отдельной кнопке).
- `questions_only` — лекция в режиме «только вопросы»:
  - Public chat остаётся, но **только сообщения с `type="question"`** разрешены для студентов.
  - Teacher/assistant могут писать `type="message"` и `type="answer"`.
- `locked` — чат сессии заблокирован:
  - Отправка любых сообщений студентами запрещена.
  - Teacher/assistant могут отправлять только служебные/модерационные сообщения (`type="system"`, `type="moderation"`).
- `exam_help_only` — экзаменационный режим:
  - Нет публичного чата.
  - Разрешён только help‑канал `channel="help"`, в котором:
    - студент видит только свои сообщения и ответы teacher/assistant,
    - преподаватель может выбирать `helpStudentId` для просмотра отдельных «нитей помощи».

### 1.2 Mapping режимов → поведение endpoint‑ов

Эндпоинт `POST /sessions/:id/messages` должен учитывать `SessionChatPolicy.mode`:

- `lecture_open`:
  - `channel`:
    - если не указан → `"public"`;
    - `"help"` можно либо игнорировать (привести к `"public"`), либо оставить как доп. функциональность.
  - Разрешённые отправители:
    - все участники (teacher/admin + студенты), если не замьючены и не нарушают slowmode.
- `questions_only`:
  - Student:
    - `type` должен быть `"question"` или `"reaction"`; иначе 403.
  - Teacher/admin:
    - могут отправлять любые типы (`message`, `answer`, `system`, `moderation`, `reaction`).
  - Channel — по‑прежнему `"public"`.
- `locked`:
  - Student:
    - любые попытки `POST /sessions/:id/messages` → 403 `Chat locked`.
  - Teacher/admin:
    - разрешены `type="system"`, `type="moderation"`, при `channel="public"`.
- `exam_help_only`:
  - Student:
    - channel принудительно `"help"` независимо от переданного значения.
    - отправка сообщений разрешена, но только в help‑канал.
    - helpStudentId принудительно `= userId`.
  - Teacher/admin:
    - могут отправлять сообщения в help‑канал:
      - либо с `helpStudentId` (целевой студент),
      - либо broadcast‑системные сообщения в `channel="public"` (если нужно).
  - Фронтенд по умолчанию показывает только help‑панель; public‑чат скрыт.

---

## 2. Endpoints и использование policy

### 2.1 Получение и установка политики

Новые HTTP‑эндпоинты:

- `GET /sessions/:id/chat-policy`
  - Возвращает: `{ sessionId, mode, slowmodeSec }`.
  - Права: teacher (создатель) или admin.
- `PATCH /sessions/:id/chat-policy`
  - Body: `{ mode?: string, slowmodeSec?: number }`.
  - Права: teacher (создатель) или admin.
  - Валидация: `mode` ∈ (`lecture_open`,`questions_only`,`locked`,`exam_help_only`), `slowmodeSec >= 0`.

Реализация:

- При первом вызове, если записи нет, можно:
  - создать `SessionChatPolicy` с `mode="lecture_open"`, `slowmodeSec=0`,
  - вернуть её.

### 2.2 Проверка policy при отправке сообщения

Внутри `POST /sessions/:id/messages` (см. `backend/src/http/chat.ts`):

1. Найти/создать `SessionChatPolicy` для сессии.
2. Применить правила в зависимости от `mode` (см. п. 1.2).
3. Применить **slowmode** и **mutes** (см. ниже).

Важно: проверка **должна выполняться и для HTTP, и для WS‑слоя**, если когда‑нибудь появится прямого WS‑эндпоинта `sendMessage`. Сейчас все сообщения идут через REST и уже потом дублируются в WS‑комнату через `broadcastChatEvent`, поэтому достаточно проверять в HTTP.

---

## 3. Slowmode (anti‑spam)

Цель: ограничить частоту сообщений от одного пользователя в конкретной сессии.

### 3.1 Правило

- Если `SessionChatPolicy.slowmodeSec > 0`, то:
  - для каждого `(sessionId, userId)` храним timestamp последнего отправленного **успешного** сообщения.
  - при новом `POST /sessions/:id/messages`:
    - если `now - lastSentAt < slowmodeSec`, возвращаем 429/400 с ошибкой `"Slowmode active"` и не создаём сообщение.

### 3.2 Где хранить lastSentAt

Для MVP достаточно **in‑memory** на backend:

- структура вида:
  ```ts
  const sessionSlowmodeMap = new Map<string, Map<string, number>>();
  // sessionId -> (userId -> lastSentTimestampMs)
  ```
- При рестарте backend slowmode «забывается» — это ок для dev/диплома.

При желании позже можно сделать таблицу `ChatActivity` в БД, но это не критично.

---

## 4. Мьюты (ChatMute)

Чат‑мьют — это временный (или постоянный) запрет писать в чат группы/сессии.

### 4.1 Правила

- Действует **на все типы сообщений** (кроме, возможно, system/moderation от teacher).
- Различаем scope:
  - `scope="session"` + `scopeId=sessionId` — мьют только в этой сессии.
  - `scope="group"` + `scopeId=groupId` — мьют во всех сессиях этой группы (и group chat).
- Если `mutedUntil > now`, пользователь не может отправлять сообщения в чате соответствующего scope.

### 4.2 Endpoints

Минимальный набор:

- `POST /sessions/:id/mutes`
  - Body: `{ targetUserId: string, durationSec: number }`
  - Создаёт запись `ChatMute` с `scope="session"`, `scopeId=sessionId`, `mutedUntil = now + durationSec`.
  - Права: teacher (создатель сессии) или admin.
- `GET /sessions/:id/mutes`
  - Для UI модерации (teacher видит список замьюченных).

Аналогично можно добавить:

- `POST /groups/:id/mutes` / `GET /groups/:id/mutes` (для group chat и Q&A).

В UI:

- В списке участников сессии (teacher) добавить меню:
  - «Mute 10 мин», «Mute 1 час», «Mute до конца сессии».

### 4.3 Применение

В `POST /sessions/:id/messages`:

1. Найти все `ChatMute` с:
   - `scope="session" AND scopeId=sessionId AND targetUserId=userId AND mutedUntil > now`,\n   - или `scope="group" AND scopeId=session.groupId AND targetUserId=userId AND mutedUntil > now`.\n2. Если хоть одна запись активна → 403 `User muted`.

---

## 5. Влияние на фронтенд (SessionChatPanel и страницы)

### 5.1 Teacher UI (`teacher/session/[id]`)

- Добавить в будущем:
  - селектор режима чата:
    - `lecture_open`, `questions_only`, `locked`, `exam_help_only` (для `type="exam"`).
    - UI: выпадающий список или toggle‑группа в блоке «Состояние группы» или рядом с чатом.
    - При смене вызов `PATCH /sessions/:id/chat-policy`.
  - индикацию slowmode (`slowmodeSec`), возможность включить/отключить (`0` / `10` / `30` сек).
  - управление mute для конкретного участника (через participants list).

- `SessionChatPanel` должен:
  - читать policy (через дополнительный hook или пропсы, полученные от родительской страницы),
  - при `mode="locked"` отображать сообщение «Чат закрыт преподавателем» и блокировать textarea,
  - при `mode="exam_help_only"` скрывать public‑чат и показывать только help‑канал (уже частично есть через проп `type`).

### 5.2 Student UI (`student/session/[id]`)

- `SessionChatPanel`:
  - при `mode="lecture_open"` — обычный чат лекции (как сейчас),
  - при `mode="questions_only"` — можно отправлять только вопросы (UI может добавлять префикс «Вопрос: » и на бэкенде помечать `type="question"`),
  - при `mode="locked"` — панель read‑only с подписью «Чат временно закрыт преподавателем»,
  - при `mode="exam_help_only"` — help‑панель (уже фактически так работает для `type="exam"`).

---

## 6. Резюме

- **SessionChatPolicy** задаёт high‑level режим поведения чата сессии:
  - лекция открыта / только вопросы / закрыто / экзамен с help‑каналом.\n- **ChatMute** и **slowmode** решают две отдельные задачи:
  - точечная модерация (mute конкретного пользователя),
  - защита от флуда (ограничение частоты сообщений).
- Реализация строится **поверх уже существующих эндпоинтов и компонентов**:\n  - дорабатывается только логика внутри `POST /sessions/:id/messages` и новые endpoints для чтения/записи policy/mutes;\n  - UI постепенно подхватывает эти режимы через props/hook’и, без слома текущего UX.\n","*** End Patch"}"/>
