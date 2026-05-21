"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import PageTitle from "@/components/common/PageTitle";
import { Card } from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { api } from "@/lib/api/client";

type ValidateResponse = {
  valid: boolean;
};

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Токен для сброса пароля отсутствует или недействителен.");
      setValidating(false);
      return;
    }

    const validate = async () => {
      try {
        await api.get<ValidateResponse>(
          `auth/reset-password/validate?token=${encodeURIComponent(token)}`
        );
        setIsValidToken(true);
      } catch (err) {
        console.error("RESET TOKEN VALIDATION ERROR:", err);
        setError("Ссылка для сброса пароля недействительна или устарела.");
        setIsValidToken(false);
      } finally {
        setValidating(false);
      }
    };

    void validate();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Токен для сброса пароля недействителен.");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError("Пароль должен содержать не менее 8 символов.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Пароли не совпадают.");
      return;
    }

    setLoading(true);
    try {
      await api.post<unknown>("auth/reset-password", {
        token,
        password: newPassword,
      });
      setSuccess(true);
    } catch (err) {
      console.error("RESET PASSWORD ERROR:", err);
      setError(
        "Не удалось изменить пароль. Ссылка могла устареть. Попробуйте запросить сброс ещё раз."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-8">
      <PageTitle
        overline="Восстановление пароля"
        title="Сброс пароля"
        subtitle="Придумайте новый пароль для своего аккаунта."
      />

      <Card className="p-6 md:p-8 shadow-md bg-surface">
        {validating ? (
          <p className="text-muted">Проверяем ссылку для сброса пароля…</p>
        ) : success ? (
          <div className="space-y-4 text-center">
            <p className="text-fg">Пароль успешно изменён.</p>
            <p className="text-sm text-muted">
              Теперь вы можете войти в систему, используя новый пароль.
            </p>
            <Button className="w-full" onClick={() => router.push("/auth/login")}>
              Перейти ко входу
            </Button>
          </div>
        ) : !isValidToken ? (
          <div className="space-y-4 text-center">
            <p className="text-fg">
              Ссылка для сброса пароля недействительна или устарела.
            </p>
            <p className="text-sm text-muted">
              Запросите восстановление пароля ещё раз.
            </p>
            <Link href="/auth/forgot-password">
              <Button variant="outline" className="w-full bg-surface hover:bg-surface-subtle">
                Запросить новую ссылку
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              type="password"
              placeholder="Новый пароль"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              required
            />
            <Input
              type="password"
              placeholder="Повторите новый пароль"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
            {error && <p className="text-sm text-[rgb(var(--error))]">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Сохраняем…" : "Сохранить новый пароль"}
            </Button>
          </form>
        )}

        <div className="mt-6 pt-4 border-t border-[color:var(--border)] text-center">
          <Link
            href="/auth/login"
            className="text-sm font-semibold text-[rgb(var(--primary))] hover:text-[rgb(var(--primary-hover))] transition hover:underline"
          >
            ← Назад ко входу
          </Link>
        </div>
      </Card>
    </div>
  );
}

