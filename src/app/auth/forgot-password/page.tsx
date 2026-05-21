"use client";

import { useState } from "react";
import Link from "next/link";
import PageTitle from "@/components/common/PageTitle";
import { Card } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { api, isApiAvailable } from "@/lib/api/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Введите email.");
      return;
    }

    if (!isApiAvailable()) {
      setError("Сервер временно недоступен. Попробуйте позже.");
      return;
    }

    setLoading(true);

    try {
      await api.post<unknown>("auth/forgot-password", { email: trimmed });
      setSent(true);
    } catch (err) {
      // По соображениям безопасности не раскрываем, существует ли email.
      console.error("FORGOT PASSWORD ERROR:", err);
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-8">
      <PageTitle
        overline="Восстановление пароля"
        title="Забыли пароль?"
        subtitle="Укажите email вашего аккаунта — мы отправим инструкцию для сброса пароля."
      />

      <Card className="p-6 md:p-8 shadow-md bg-surface">
        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-fg">
              Если аккаунт с указанным email существует, на него отправлена инструкция по сбросу пароля.
            </p>
            <p className="text-sm text-muted">
              Не пришло письмо? Проверьте папку «Спам» или обратитесь к администратору вашей организации.
            </p>
            <Link href="/auth/login">
              <Button variant="outline" className="w-full mt-4 bg-surface hover:bg-surface-subtle">
                Вернуться ко входу
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                placeholder="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                autoComplete="email"
              />

              {error && <p className="text-sm text-[rgb(var(--error))]">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Отправка…" : "Отправить ссылку"}
              </Button>
            </form>

            <div className="mt-6 border-t border-[color:var(--border)] pt-4 text-center">
              <Link
                href="/auth/login"
                className="text-sm font-semibold text-[rgb(var(--primary))] hover:text-[rgb(var(--primary-hover))] transition-colors hover:underline"
              >
                ← Назад ко входу
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}