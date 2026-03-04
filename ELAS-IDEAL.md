# ELAS — идеальная продуктовая и техническая спецификация (SaaS для диплома)

Один документ: как должен работать сайт ELAS целиком (продуктовая логика, страницы, роли, приглашения, группы, сессии, звонки, аналитика, backend/ML).

---

## 1) Продуктовая логика в одном абзаце

**ELAS** — платформа для проведения лекций, экзаменов и консультаций (групповые и 1:1 сессии) с реалтайм-аналитикой эмоций, вовлечённости и стресса. Видео не хранится; анализ идёт по кадрам 1–2 fps; требуется явное согласие. Преподаватель видит групповую аналитику и отчёты по своим сессиям; студент — только свои доступные сессии и приватные настройки. Мульти-аккаунтный SaaS: много преподавателей и студентов со строгой изоляцией по ролям.

---

## 2) Роли и доступ

| Роль | Видит | Может |
|------|--------|--------|
| **Admin** | Все пользователи, группы, audit | CRUD пользователей/ролей, группы, настройки модели, retention, audit log |
| **Teacher** | Только свои группы и сессии этих групп, аналитика по ним | Создавать группы, приглашать студентов, создавать сессии (lecture/exam), Start/End, 1:1 call, экспорт отчётов |
| **Student** | Только группы, где он член; приглашения ему; сессии этих групп | Accept/Decline приглашения, Join сессию только при LIVE + consent, личная сводка (если разрешено) |

---

## 3) Главные сущности

- **Users** — role (student | teacher | admin), email, name, status.
- **Groups** — name, teacherId; членство в **group_members** (M:N).
- **Invitations** — groupId, invitee (email или userId), status (pending | accepted | declined | expired), token для email-link.
- **Sessions** — groupId (nullable для 1:1), type (lecture | exam | consultation), status (scheduled | live | ended), join_code, invite_link, consent_required, analysis_fps.
- **Participants** (в сессии) — sessionId, userId, joinedAt, leftAt, consentAt.
- **EmotionSamples** — метаданные 1–2 fps: эмоция, engagement, stress, stability, quality flags (видео не хранить).
- **Aggregates / Reports** — по сессии для преподавателя; экспорт pdf/json/csv.

---

## 4) Приглашения (ideal flow)

1. Teacher: Groups → группа → **Invite Students** (email или username, список через запятую).
2. Backend: если пользователь найден → in-app invite; иначе → email invite (token).
3. Student: Dashboard — блок **Invitations (N)**; Accept / Decline.
4. Accept → добавление в group_members → группа появляется в /student/groups, студент видит сессии этой группы.

**Endpoints:**  
`POST /groups/:id/invitations`, `GET /invitations` (student), `POST /invitations/:id/accept`, `POST /invitations/:id/decline`.

---

## 5) Групповые сессии (lecture/exam)

1. **Создание:** Teacher в группе → Create Session (type, title, scheduled, consent_required, fps) → join_code + invite_link.
2. **Start:** Teacher → Start → status=live, signaling room, realtime metrics (WS).
3. **Вход студента:** только если session=live и consent дан; иначе redirect /consent или disabled.
4. **Во время:** WebRTC + кадры 1–2 fps в ML; teacher видит group state, participants, attention drops, live charts.
5. **End:** Teacher → End → aggregates сохраняются, analytics + export report.

---

## 6) Личные звонки (1:1 Teacher ↔ Student)

- Session с type=consultation или exam, participants=2, groupId опционально (null или мини-группа).
- Создание: из списка участников группы или профиля студента — «Start 1:1 consultation» / «Schedule 1:1 exam».
- Аналитика: фокус на exam metrics (стресс, пики, уверенность start/middle/end).

---

## 7) Структура страниц (Web UI)

**Public:** Landing, Ethics, Privacy, FAQ.  
**Auth:** Login, Register, Forgot/Reset.  
**Consent:** /consent (Agree & Continue, returnUrl).

**Student:**  
- /student/dashboard — next session, Invitations, consent status, My Groups / My Sessions.  
- /student/groups — список групп (где член).  
- /student/group/[id] — инфо группы, список сессий (join только live + consent).  
- /student/session/[id] — Join UI, camera check; если ended → summary link.  
- /student/summary — личная сводка; /student/privacy — политика, согласие, удаление.

**Teacher:**  
- /teacher/dashboard — KPI, live now, alerts.  
- /teacher/groups — список своих групп.  
- /teacher/group/[id] — members + Invite, sessions + Create session.  
- /teacher/sessions — все сессии, Start/End, фильтры.  
- /teacher/session/[id] — Live Monitor (participants, group state, timeline, alerts, End, Export).  
- /teacher/session/[id]/analytics — Overview, Timeline, Attention drops, Export.  
- /teacher/session/[id]/exam-analytics — стресс, confidence, timeline.  
- /teacher/compare — сравнение лекций.  
- /teacher/reports — список экспортов, скачать.

**Admin:**  
- /admin/dashboard — users, active sessions, storage, model alerts.  
- /admin/users, /admin/groups, /admin/model, /admin/storage, /admin/audit.

---

## 8) Backend (идеальная архитектура)

- **API:** Auth, Roles, Groups, GroupMembers, Invitations, Sessions, Participants, Consent, Analytics, Reports, Admin (model, storage, audit).
- **WebSocket:** realtime updates для teacher (metrics, alerts).
- **Signaling:** отдельный WS для WebRTC.
- **ML (Python FastAPI):** приём кадров 1–2 fps, расчёт метрик, стрим в backend; логирование качества; итоговая сводка.

**Ключевые эндпоинты:**  
Invites: POST /groups/:id/invitations, GET /invitations, POST /invitations/:id/accept|decline.  
Groups: GET/POST/PATCH /groups, GET /groups/:id, GET /groups/:id/members.  
Sessions: POST /sessions, POST /sessions/:id/start|end, GET /sessions/:id/join-info, POST /sessions/:id/join|leave.  
Analytics: GET /analytics/sessions/:id/overview|timeline|attention-drops|exam.  
Reports: POST /reports, GET /reports/:id/download.

---

## 9) Итоговый промпт для продолжения разработки

```
Я делаю дипломный проект ELAS — Emotion-Aware Learning Analytics System. Это платформа онлайн-сессий (lecture/exam/consultation) с аналитикой эмоций/вовлечённости/стресса. Должно быть много преподавателей и много студентов. Доступ строгий: teacher видит только свои группы/сессии и аналитику по ним; student видит только группы, где он член, и только доступные ему сессии/приглашения.
Нужна система групп: teacher создаёт группы и приглашает студентов по email или username/ID. Для этого сделать invitations: pending/accepted/declined/expired. Student в dashboard видит invitations и может accept/decline; после accept студент добавляется в group_members, группа появляется у студента и открывает доступ к её сессиям.
Сессии: lecture/exam + 1:1 teacher↔student. Сессия имеет lifecycle scheduled/live/ended; join доступен только при LIVE и consent=true. Consent обязателен, видео не хранить; анализ по кадрам 1–2 fps, хранить только метаданные. Teacher получает realtime live monitor и post-session analytics (timeline, attention drops, compare, exam stress). Export reports (pdf/json/csv).
Backend: Auth, Groups, Invitations, Sessions, Participants, Analytics, Reports, Admin model/storage/audit. Realtime: WS /ws/sessions/:id. WebRTC signaling отдельным WS. Python ML (FastAPI) — кадры/фичи 1–2 fps, стрим метрик.
Frontend: Next.js App Router + TS + Tailwind v4, премиум-SaaS UI (black/white/purple, glass, glow), light mode toggle. Не упрощать существующие файлы, изменения внедрять аккуратно.
```

---

*Документ можно вставить в диплом как описание целевой продуктовой и технической модели ELAS.*
