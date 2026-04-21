"use client";

export type CalendarCell = {
  date: Date;
  inCurrentMonth: boolean;
};

export function parseSessionTimestamp(value?: string | null): Date | null {
  if (!value || typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) return direct;

  const normalized = trimmed.replace(",", "");
  const fallback = new Date(normalized);
  if (!Number.isNaN(fallback.getTime())) return fallback;

  return null;
}

export function formatSessionDateTime(
  value?: string | null,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }
): string {
  const parsed = parseSessionTimestamp(value);
  if (!parsed) return "Дата не указана";
  return parsed.toLocaleString("ru-RU", options);
}

export function formatSessionTime(value?: string | null): string {
  const parsed = parseSessionTimestamp(value);
  if (!parsed) return "Время не указано";
  return parsed.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isSameCalendarDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function isToday(value: Date): boolean {
  return isSameCalendarDay(value, new Date());
}

export function buildMonthCells(currentDate: Date): CalendarCell[] {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

  const cells: CalendarCell[] = [];

  for (let offset = startOffset; offset > 0; offset -= 1) {
    cells.push({
      date: new Date(year, month, 1 - offset),
      inCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      date: new Date(year, month, day),
      inCurrentMonth: true,
    });
  }

  const remainder = cells.length % 7;
  if (remainder !== 0) {
    const extra = 7 - remainder;
    for (let day = 1; day <= extra; day += 1) {
      cells.push({
        date: new Date(year, month + 1, day),
        inCurrentMonth: false,
      });
    }
  }

  return cells;
}
