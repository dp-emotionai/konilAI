import PageTitle from "@/components/common/PageTitle";
import { Card } from "@/components/ui/Card";

export default function StatusPage() {
  return (
    <div className="space-y-8">
      <PageTitle
        overline="Публичный раздел"
        title="Статус сервисов"
        subtitle="Техническая страница для демонстрации. В продакшене можно подключить реальные health-check данные."
      />

      <Card className="p-6 space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted">Frontend</div>
          <div className="text-sm font-medium text-fg">OK</div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted">Backend API</div>
          <div className="text-sm font-medium text-fg">Проверяется по `NEXT_PUBLIC_API_URL`</div>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted">ML service</div>
          <div className="text-sm font-medium text-fg">Проверяется по `NEXT_PUBLIC_ML_API_URL`</div>
        </div>
      </Card>
    </div>
  );
}

