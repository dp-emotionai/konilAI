"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageTitle from "@/components/common/PageTitle";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useUI } from "@/components/layout/Providers";
import { ROLE_HOME } from "@/lib/routes";

export default function ConsentClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");
  const { state, setConsent } = useUI();

  const roleLabel =
    state.role === "student"
      ? "Студент"
      : state.role === "teacher"
      ? "Преподаватель"
      : state.role === "admin"
      ? "Админ"
      : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Breadcrumbs
        items={[
          ...(state.role && roleLabel
            ? [{ label: roleLabel, href: ROLE_HOME[state.role] }]
            : []),
          { label: "Согласие на анализ" },
        ]}
      />

      <PageTitle
        overline="Согласие"
        title="Согласие на анализ эмоций"
        subtitle="Мы обрабатываем 1–2 кадра в секунду, без записи видео. Сохраняются только метаданные."
      />

      <Card className="space-y-3 p-6">
        <Item t="Мы обрабатываем" d="Изображения с веб-камеры без записи видео" />
        <Item t="Мы сохраняем" d="Только метаданные эмоций, без исходного видео" />
        <Item
          t="Используется для"
          d="Анализа вовлечённости и стресса, чтобы улучшать преподавание"
        />
        <Item
          t="Не используется для"
          d="Оценок, санкций или дисциплинарных решений"
        />
      </Card>

      <Card className="flex flex-col gap-3 p-6">
        <Button
          onClick={() => {
            setConsent(true);

            try {
              localStorage.setItem("consent", "true");
            } catch {}

            const target =
              returnUrl && returnUrl.startsWith("/")
                ? returnUrl
                : state.role
                ? ROLE_HOME[state.role]
                : "/";

            router.push(target);
          }}
        >
          Принимаю и продолжаю
        </Button>

        <Link href="/privacy">
          <Button variant="outline" className="w-full">
            Полный текст о конфиденциальности
          </Button>
        </Link>

        <Link href="/ethics" className="text-sm text-muted hover:text-fg">
          Принципы этики использования
        </Link>
      </Card>
    </div>
  );
}

function Item({ t, d }: { t: string; d: string }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-surface-subtle p-4">
      <div className="text-sm text-muted">{t}</div>
      <div className="mt-1 text-fg">{d}</div>
    </div>
  );
}