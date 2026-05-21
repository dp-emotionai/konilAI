import PageTitle from "@/components/common/PageTitle";
import { Card } from "@/components/ui/Card";

const FAQ = [
  {
    q: "Сохраняется ли видео с камеры?",
    a: "Нет. Система работает с кадрами для анализа и хранит только агрегированные метрики и события.",
  },
  {
    q: "Можно ли отказаться от аналитики?",
    a: "Да. Аналитика включается только после согласия и может быть отозвана.",
  },
  {
    q: "Для чего нужна аналитика вовлечённости?",
    a: "Чтобы поддержать преподавателя: увидеть динамику группы и вовремя заметить падение внимания.",
  },
] as const;

export default function FaqPage() {
  return (
    <div className="space-y-8">
      <PageTitle
        overline="Публичный раздел"
        title="FAQ"
        subtitle="Ответы на частые вопросы о приватности, согласии и работе платформы."
      />

      <div className="grid gap-4">
        {FAQ.map((x) => (
          <Card key={x.q} className="p-6">
            <div className="text-base font-semibold text-fg">{x.q}</div>
            <div className="mt-2 text-sm text-muted leading-relaxed">{x.a}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

