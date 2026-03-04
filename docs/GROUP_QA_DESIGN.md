# ELAS Group Q&A — подробная логика

Этот документ описывает, **как именно** должно работать Q&A в пространстве группы (Group Space) для ELAS, поверх уже существующих моделей и UI.

Цель: сделать структурированный Q&A вместо «диcкорд‑чата», при этом не ломая текущие страницы и использовать уже добавленную модель `GroupMessage`.

---

## 1. Модель данных Q&A (на основе `GroupMessage`)

База: в `backend/prisma/schema.prisma` уже есть:

```prisma
model GroupMessage {
  id        String   @id @default(uuid())
  groupId   String
  senderId  String
  type      String   // "message" | "announcement" | "question" | "answer" | "system"
  text      String
  replyToId String?  // thread parent
  qaStatus  String?  // for questions: "open" | "answered" | "resolved"
  pinnedAt  DateTime?
  createdAt DateTime @default(now())
  editedAt  DateTime?
  deletedAt DateTime?

  group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  sender User @relation("GroupMessageSender", fields: [senderId], references: [id], onDelete: Cascade)

  reads MessageRead[]

  @@index([groupId])
  @@index([senderId])
  @@index([type])
  @@index([createdAt])
}
```

### 1.1 Типы сообщений

- `type = "question"` — корневое сообщение вопроса.
  - `qaStatus` обязательно: `"open" | "answered" | "resolved"`.
  - `replyToId = null` (вопрос — вершина треда).
- `type = "answer"` — ответ преподавателя/ассистента на вопрос.
  - `replyToId = question.id`.
  - `qaStatus = null` (статус меняется на корневом вопросе).
- `type = "system"` — системные заметки по Q&A (например, «вопрос закрыт»).
- `type = "message"` — произвольные групповые сообщения (если включим общий чат).
- `type = "announcement"` — объявления (уже используются во вкладке Announcements).

### 1.2 Статусы вопроса (`qaStatus`)

Статусы только на `type="question"`:

- `open` — студент задал вопрос, ответа ещё нет / не принят.
- `answered` — преподаватель дал ответ (есть хотя бы один `answer`), но вопрос ещё не «закрыт».
- `resolved` — преподаватель/ассистент пометили вопрос как закрытый (ответ принят).

Переходы:

- `null → open` — при создании вопроса (по умолчанию `qaStatus="open"`).
- `open → answered` — автоматом, когда создаётся первый `answer` на этот вопрос.
- `answered ↔ open` — опционально можно вернуть в `open`, если ответ удалён/отклонён (MVP можно не реализовывать).
- `answered → resolved` — явное действие teacher/assistant: «Отметить как решён».

### 1.3 Права изменения статуса

- Создать `question` может только:
  - `User.role === "student"` и при этом он `GroupMember` этой группы.
- Создать `answer` может:
  - `User.role === "teacher"` и `group.teacherId === user.userId`,
  - или `GroupMember.role === "assistant"` (если в будущем будет такая роль).
- Перевести `answered → resolved` может:
  - только `teacher` (владелец группы) или `assistant`.

---

## 2. HTTP API для Q&A

Все методы живут рядом с уже существующими group‑роутами.

### 2.1 Загрузка Q&A списка

Используем уже реализованный эндпоинт:

- `GET /groups/:id/messages?tab=qa`

Фильтрация:

- `WHERE groupId = :id AND type IN ("question","answer")`
- Сортировка:
  - по `createdAt ASC` внутри каждого треда,
  - на уровне фронта собираем вопросы (`type="question"`) и их ответы (`replyToId = question.id`).

Фронтенд:

- На `teacher/group/[id]/page.tsx` добавить таб `Q&A`.
- Вызов `getGroupMessages(id, "qa")` (функция уже есть в `lib/api/teacher.ts` и легко расширяется).
- На клиенте строим структуру:
  - `questions = messages.filter(m => m.type==="question")`
  - `answersByQuestionId = messages.filter(m => m.type==="answer").groupBy(replyToId)`.

### 2.2 Создание вопроса студентом

- `POST /groups/:id/messages` с телом:
  ```json
  { "type": "question", "text": "Можно ли использовать шпаргалку?" }
  ```
- Бэкенд в `chat.ts` уже проверяет:
  - пользователь принадлежит группе (через `GroupMember`),
  - `type === "question" && user.role === "student"` (иначе 403),
  - `qaStatus` ставит в `"open"`.

Фронтенд (student):

- На `student/group/[id]` (будущая страница) вкладка `Q&A`:
  - поле ввода вопроса,
  - список своих и чужих вопросов (read‑only статусы).

### 2.3 Ответ преподавателя

- `POST /groups/:id/messages`:
  ```json
  { "type": "answer", "text": "Нет, шпаргалки нельзя.", "replyToId": "<questionId>" }
  ```
- Проверки на бэкенде:
  - только teacher (владелец группы) или assistant,
  - `replyToId` должен ссылаться на существующий `GroupMessage` с `type="question"`.
- Логика после сохранения:
  - если у вопроса `qaStatus="open"`, обновляем его на `"answered"`.

Фронтенд (teacher):

- В Q&A‑списке для каждого вопроса показываем кнопку «Ответить»:
  - открывает inline textarea или модальное окно,
  - после отправки UI добавляет `answer` в соответствующий тред и меняет статус вопроса на `answered`.

### 2.4 Смена статуса на resolved

Новый эндпоинт:

- `POST /groups/:id/qa/:questionId/status`
  - body: `{ "status": "resolved" }` (на будущее можно поддержать `"open"`, `"answered"`).
  - Права: только teacher/assistant, проверка принадлежности к группе.
  - Логика:
    - находим `GroupMessage` с `id = :questionId` и `type="question"`;
    - обновляем `qaStatus` на `"resolved"`.
    - опционально создаём `system`‑сообщение с `replyToId=:questionId` вида «Вопрос помечен как решён».
  - По WebSocket:
    - шлём в `group_{groupId}` событие `qa:status_update` внутри `chat-event`.

Фронтенд:

- Teacher в Q&A‑карточке видит кнопку «Отметить как решён» для `qaStatus="answered"`.
- После клика:
  - вызывает `POST /groups/:id/qa/:questionId/status`,
  - локально обновляет статус вопроса на `resolved`.

---

## 3. UX Q&A — Teacher vs Student

### 3.1 Teacher view (на `teacher/group/[id]`)

**Q&A tab** показывает список вопросов в виде карточек:

- Заголовок:
  - текст вопроса (обрезанный/многострочный),
  - метка статуса (badge: Open / Answered / Resolved),
  - время создания и имя студента.
- Тело:
  - ответы (в хронологическом порядке),
  - опционально system‑сообщения (например «вопрос решён»).
- Контролы:
  - фильтры по статусу (All, Open, Answered, Resolved),
  - кнопка «Ответить» (для Open/Answered),
  - кнопка «Отметить как решён» (для Answered),
  - при hover/меню — возможность удалить свой ответ или скрыть некорректный вопрос (soft delete → `deletedAt`).

### 3.2 Student view (на `student/group/[id]`)

**Q&A tab**:

- Вверху: форма «Задать вопрос» (textarea + кнопка «Отправить»).
- Ниже: список всех вопросов группы:
  - собственные вопросы помечены, например, badge «Ваш вопрос»,
  - статусы Open/Answered/Resolved видны всем.
- Student не может:
  - менять статусы,
  - удалять вопросы других студентов (только скрытие своих, если очень нужно).

UX деталь: если вопрос ещё `open`, но есть ответ, студент всё равно видит ответ — статус `answered`/`resolved` нужен больше для фильтрации и приоритизации для teacher.

---

## 4. WebSocket события для Q&A

Уже есть `broadcastChatEvent(room, { type: \"chat-event\", room, event })` в `chat-ws/handlers.ts`.

Для Q&A будем слать события вида:

- При создании вопроса:
  ```json
  {
    "scope": "group",
    "kind": "message:new",
    "message": { "...": "GroupMessage question" }
  }
  ```
- При создании ответа:
  ```json
  {
    "scope": "group",
    "kind": "message:new",
    "message": { "...": "GroupMessage answer" }
  }
  ```
- При смене статуса:
  ```json
  {
    "scope": "group",
    "kind": "qa:status_update",
    "questionId": "<id>",
    "qaStatus": "resolved"
  }
  ```

Фронтенд в `ChatClient`/Group Q&A UI:

- по `message:new` добавляет вопрос/ответ в локальный список;
- по `qa:status_update` обновляет `qaStatus` у соответствующего вопроса.

---

## 5. Связь с Announcements и общим чатом

Важно, чтобы UI Q&A **не смешивался** с обычным чатом, но использовал ту же таблицу:

- Announcements уже используют `GroupMessage` (`type="announcement"`); отображаются во вкладке **Объявления**.
- Q&A используют `type="question" | "answer"` и отдельный таб **Q&A**.\n- Общий чат (если будет включён) использует `type="message"` и таб **Chat**.

Таким образом:

- одна модель `GroupMessage`,
- разные `tab`‑фильтры и разные компоненты отображения,
- чёткая UX‑разделённость: Announcements / Q&A / Chat.

