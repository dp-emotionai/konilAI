# Письма-подтверждения через Resend (инструкция для бэкенда)

Домен **konilai.space** уже верифицирован в Resend. Письма должны отправляться с адреса **noreply@konilai.space** (или elas@konilai.space).

---

## 1. Переменные окружения (.env)

Добавить в `.env` бэкенда (backend-main / тот, что отдаёт `admin/users` и `admin/users/:id/approve`):

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx   # ключ из Resend → API Keys (Sending access)
RESEND_FROM_EMAIL=noreply@konilai.space
RESEND_FROM_NAME=ELAS
ADMIN_EMAIL=konil@konilai.space      # куда слать уведомление о новой заявке (или calmdownurba@gmail.com)
```

`ADMIN_EMAIL` — кому отправлять письмо «Новый преподаватель зарегистрировался».

---

## 2. Пакет Resend

В проекте бэкенда (Node.js):

```bash
npm install resend
```

Документация: https://resend.com/docs/send-with-nodejs

---

## 3. Какие письма отправлять

### A. Уведомление админу о новой заявке преподавателя

**Когда:** после успешной регистрации пользователя с ролью **teacher** (POST register или аналог).

**Кому:** `ADMIN_EMAIL`.

**Тема и текст (пример):**
- Тема: `ELAS: новая заявка преподавателя`
- Текст: `Зарегистрировался новый преподаватель: {email}. Имя: {name}. Одобрите или отклоните в админ-панели.`

Вызов отправки — сразу после создания пользователя в БД, если `role === 'teacher'` и задан `ADMIN_EMAIL`.

---

### B. Подтверждение пользователю после одобрения

**Когда:** после успешного выполнения **PUT admin/users/:id/approve** (статус пользователя сменился на approved).

**Кому:** `user.email` (того пользователя, которого одобрили).

**Тема и текст (пример):**
- Тема: `Ваш аккаунт ELAS одобрен`
- Текст: `Здравствуйте! Ваш аккаунт на ELAS одобрен. Вы можете войти в личный кабинет и пользоваться платформой.`

Вызов отправки — сразу после обновления статуса в БД в обработчике approve.

---

## 4. Пример кода (Node.js)

Общий хелпер отправки (один раз в проекте, например `lib/email.ts` или `services/email.js`):

```ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const from = `${process.env.RESEND_FROM_NAME ?? "ELAS"} <${process.env.RESEND_FROM_EMAIL}>`;

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skip email");
    return false;
  }
  try {
    const { error } = await resend.emails.send({ from, to, subject, html });
    if (error) {
      console.error("Resend error:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("Send email failed:", e);
    return false;
  }
}
```

**В обработчике регистрации (teacher):**
```ts
if (user.role === "teacher" && process.env.ADMIN_EMAIL) {
  await sendEmail(
    process.env.ADMIN_EMAIL,
    "ELAS: новая заявка преподавателя",
    `Зарегистрировался новый преподаватель: ${user.email}. Имя: ${user.name ?? "—"}. Одобрите в админ-панели.`
  );
}
```

**В обработчике PUT admin/users/:id/approve (после смены статуса):**
```ts
await sendEmail(
  user.email,
  "Ваш аккаунт ELAS одобрен",
  "Здравствуйте! Ваш аккаунт на ELAS одобрен. Вы можете войти в личный кабинет и пользоваться платформой."
);
```

Письма можно сделать в HTML (передавать `html` с разметкой) или оставить plain text — Resend принимает и то и другое.

---

## 5. Чеклист

- [ ] В .env добавлены `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME`, `ADMIN_EMAIL`
- [ ] Установлен пакет `resend`
- [ ] Реализована отправка письма админу при регистрации teacher
- [ ] Реализована отправка письма пользователю при одобрении (approve)
- [ ] На проде (Render и т.д.) переменные окружения прописаны в настройках сервиса

После этого «подтверждения» будут уходить с noreply@konilai.space через Resend.
