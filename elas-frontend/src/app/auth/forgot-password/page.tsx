"use client";

import { useState } from "react";
import Link from "next/link";
import PageTitle from "@/components/common/PageTitle";
import { Card } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { api } from "@/lib/api/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Введите email.");
      return;
    }

    setLoading(true);
    try {
      await api.post<unknown>("auth/forgot-password", { email: trimmed });
      setSent(true);
    } catch (err) {
      // По соображениям безопасности сообщение не раскрывает, существует ли email.
      console.error("FORGOT PASSWORD ERROR:", err);
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-8">
      <PageTitle
        overline="Восстановление пароля"
        title="Забыли пароль?"
        subtitle="Укажите email вашего аккаунта — мы отправим ссылку для сброса пароля."
      />

      <Card className="p-6 md:p-8">
        {sent ? (
          <div className="space-y-4 text-center">
            <p className="text-[var(--text)]">
              Если аккаунт с указанным email существует, на него отправлена инструкция по сбросу пароля.
            </p>
            <p className="text-sm text-[var(--muted)]">
              Не пришло письмо? Проверьте папку «Спам» или обратитесь к администратору вашей организации.
            </p>
            <Link href="/auth/login">
              <Button variant="outline" className="w-full">Вернуться ко входу</Button>
            </Link>
          </div>
        ) : (
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
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Отправка…" : "Отправить ссылку"}
            </Button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-white/10 text-center">
          <Link href="/auth/login" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition">
            ← Назад ко входу
          </Link>
        </div>
      </Card>
    </div>
  );
}
