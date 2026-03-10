# ELAS Design System

Краткий справочник токенов и компонентов для единообразного UI в стиле Notion / Stripe / Linear.

## Токены (globals.css)

### Цвета
- **Фоны:** `--bg`, `--surface`, `--surface-subtle`, `--surface-soft`, `--surface-hover`
- **Границы:** `--border`, `--border-strong`
- **Текст:** `--text`, `--muted`, `--muted-2`
- **Акцент:** `--primary`, `--primary-hover`, `--primary-muted`, `--ring`
- **Семантика:** `--success`, `--warning`, `--error`, `--danger` (RGB для Tailwind)

### Радиусы
- `--radius` (10px), `--radius-sm` (6px), `--radius-lg` (14px), `--radius-xl` (20px), `--radius-pill`

### Отступы
- `--space-1` … `--space-12` (4px … 48px). В Tailwind: `elas-1` … `elas-12`.

### Типографика
- Шрифт: `--font-sans`
- Размеры: `--text-xs` … `--text-3xl`
- Веса: `--font-medium`, `--font-semibold`, `--font-bold`
- Межстрочный: `--leading-tight`, `--leading-normal`, `--leading-relaxed`

### Тени
- `--shadow-soft`, `--shadow-card`, `--shadow-elevated`

## Компоненты

### Button
- Варианты: `primary`, `outline`, `ghost`, `danger`
- Размеры: `sm`, `md`, `lg`
- Всегда: `focus-visible:ring-2`, `disabled:opacity-50`

### Card
- Варианты: `default`, `outline`, `subtle`, `elevated`
- Опционально: `interactive` (hover lift)
- CardHeader, CardContent — отступы через классы.

### Alert
- Варианты: `info`, `success`, `warning`, `error`
- Пропсы: `title`, `children`, `action` (ReactNode), `onDismiss`
- Использовать для ошибок загрузки и предупреждений (согласие, недоступность API).

### Modal
- `open`, `onClose`, `title`, `footer`
- Закрытие: Escape, клик по overlay, кнопка «Закрыть» (aria-label)
- Заголовок в `<h2 id="modal-title">` для aria-labelledby.

### Input
- Высота 44px (tap target), ring вместо border, placeholder через `--muted-2`.

### Skeleton
- `bg-surface-subtle`, `rounded-elas-lg`, `animate-pulse`, `aria-hidden`.

### EmptyState
- Пропсы: `title`, `text`, `action?`, `icon?`, `className?`
- Стиль: Card variant="subtle", центрированный текст, опциональная CTA.

### Table
- Обёртка: `overflow-x-auto`, `rounded-elas-lg`, `ring-1`, для мобильных — горизонтальный скролл.
- THead, TBody, TRow, TH, TCell, TMuted.

### Badge
- Варианты: default, success, warning, error. Размеры через классы.

## Правила UX

1. **Загрузка** — скелетон или спиннер, не пустой экран.
2. **Ошибка** — Alert с понятным текстом и кнопкой «Повторить» где уместно.
3. **Пусто** — EmptyState с пояснением и CTA (например, «Создать первую сессию»).
4. **Деструктивные действия** — модалка подтверждения (завершить сессию, отклонить приглашение, исключить из группы).
5. **Язык** — интерфейс на русском; избегать английских фраз в UI.
6. **Доступность** — aria-label у иконок без текста, семантичные заголовки (h1/h2), focus-visible у кнопок и полей.

## Tailwind

В `tailwind.config.ts` подключены:
- `colors`: bg, surface, surface-subtle, fg, muted, primary, success, warning, error, ring
- `borderRadius`: elas, elas-sm, elas-lg, elas-xl, elas-pill
- `boxShadow`: soft, card, elevated, glow
- `spacing`: elas-1 … elas-12
- `maxWidth`: elas-page (1200px)

Использовать токены через классы (например `bg-surface`, `text-muted`, `rounded-elas-lg`), а не произвольные Tailwind-цвета.
