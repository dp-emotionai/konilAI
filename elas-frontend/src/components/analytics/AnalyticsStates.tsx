"use client";

import Button from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { AlertCircle, RefreshCw } from "lucide-react";

type Props = {
  loading: boolean;
  error: boolean;
  empty: boolean;
  onRetry: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  children: React.ReactNode;
};

/** Renders loading skeleton, error + retry, or empty state; otherwise children. */
export function AnalyticsStates({
  loading,
  error,
  empty,
  onRetry,
  emptyTitle = "Нет данных",
  emptyDescription = "Аналитика по этому разделу пока недоступна.",
  children,
}: Props) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-surface-subtle/60 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-surface-subtle/40 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <Card variant="elevated">
        <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgb(var(--error))]/15 text-[rgb(var(--error))]">
            <AlertCircle size={24} />
          </div>
          <p className="text-center text-fg">Не удалось загрузить аналитику.</p>
          <Button variant="outline" className="gap-2" onClick={onRetry} aria-label="Повторить загрузку">
            <RefreshCw size={16} />
            Повторить
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (empty) {
    return (
      <Card variant="elevated">
        <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <p className="font-medium text-fg">{emptyTitle}</p>
          <p className="text-sm text-muted">{emptyDescription}</p>
          <Button variant="outline" size="sm" className="mt-2 gap-2" onClick={onRetry} aria-label="Обновить">
            <RefreshCw size={14} />
            Обновить
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
