export type DashboardSession = {
  id: string;
  title: string;
  group: string;
  date: string;
  status: string;
  type: string;
  quality: "good" | "medium" | "poor" | string;
};

function hashTo01(str: string) {
  // детерминированный генератор 0..1 из строки (id)
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // 0..1
  return ((h >>> 0) % 1000) / 1000;
}

export type SessionMetrics = {
  engagement: number;     // 0..100
  stress: number;         // 0..100
  drops: number;          // int
  qualityScore: number;   // 0..100
  series: number[];       // 24 points 0..100
};

export function getSessionMetrics(s: DashboardSession): SessionMetrics {
  const base = hashTo01(String(s.id));

  // базовые метрики (детерминировано)
  const engagement = Math.round(55 + base * 35); // 55..90
  const stress = Math.round(25 + (1 - base) * 40); // 25..65
  const drops = Math.max(0, Math.round(base * 12 - 2)); // 0..10
  const qualityScore =
    s.quality === "good" ? Math.round(82 + base * 12) :
    s.quality === "medium" ? Math.round(62 + base * 16) :
    Math.round(42 + base * 14);

  // timeline series
  const series: number[] = [];
  let v = engagement - 10;
  for (let i = 0; i < 24; i++) {
    const jitter = (hashTo01(`${s.id}:${i}`) - 0.5) * 12;
    v = Math.max(20, Math.min(95, v + jitter));
    // если active — чуть “живее”
    if (s.status === "active") v = Math.max(25, Math.min(95, v + (hashTo01(`${s.id}:boost:${i}`) - 0.5) * 8));
    series.push(Math.round(v));
  }

  return { engagement, stress, drops, qualityScore, series };
}

export function isToday(date: string | number | Date) {
  const d = new Date(date);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

export function summarizeTeacherDashboard(sessions: DashboardSession[]) {
  const groups = new Set(sessions.map(s => s.group));
  const today = sessions.filter(s => isToday(s.date));
  const live = sessions.filter(s => s.status === "active");

  const m = sessions.map(getSessionMetrics);
  const avgEng = m.length ? Math.round(m.reduce((a, x) => a + x.engagement, 0) / m.length) : 0;
  const totalDrops = m.reduce((a, x) => a + x.drops, 0);

  return {
    activeGroups: groups.size,
    sessionsToday: today.length,
    avgEngagement: avgEng,
    attentionAlerts: totalDrops,
    live,
    today,
  };
}

export function buildInsightsFromSessions(sessions: DashboardSession[]) {
  const items: { title: string; text: string }[] = [];

  const anyLowQuality = sessions.find(s => s.quality === "poor");
  if (anyLowQuality) {
    items.push({
      title: "Низкое качество видео/связи",
      text: "Рекомендуется улучшить освещение и проверить стабильность сети перед стартом.",
    });
  }

  const anyExam = sessions.find(s => s.type === "exam");
  if (anyExam) {
    items.push({
      title: "Экзаменационный режим",
      text: "Добавьте короткую паузу каждые 20–25 минут, чтобы снизить стресс.",
    });
  }

  const live = sessions.find(s => s.status === "active");
  if (live) {
    items.push({
      title: "Live сейчас",
      text: "Откройте монитор, следите за таймлайном и фиксируйте события в чат.",
    });
  }

  // fallback
  if (!items.length) {
    items.push(
      { title: "Рекомендация по вовлечённости", text: "На 25–30 минуте добавьте интерактив: вопрос, мини-квиз или обсуждение." },
      { title: "Наблюдение по темпу", text: "Если видите падения внимания — смените формат: демонстрация, пример, практика." },
    );
  }

  return items.slice(0, 3);
}
