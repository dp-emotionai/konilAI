"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageTitle from "@/components/common/PageTitle";
import {Card} from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useUI } from "@/components/layout/Providers";
import { ROLE_HOME } from "@/lib/routes";

export default function ConsentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");
  const { state, setConsent } = useUI();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Breadcrumbs
        items={[
          ...(state.role ? [{ label: state.role === "student" ? "Студент" : state.role === "teacher" ? "Преподаватель" : "Админ", href: ROLE_HOME[state.role] }] : []),
          { label: "Согласие на анализ" },
        ]}
      />
      <PageTitle
        overline="Согласие"
        title="Согласие на анализ эмоций"
        subtitle="Мы обрабатываем 1–2 кадра в секунду (без записи видео). Сохраняются только метаданные."
      />

      <Card className="p-6 space-y-3">
        <Item t="Мы обрабатываем" d="Изображения с веб-камеры (без записи видео)" />
        <Item t="Мы сохраняем" d="Только метаданные эмоций (без исходного видео)" />
        <Item t="Используется для" d="Анализ вовлечённости и стресса для улучшения преподавания" />
        <Item t="Не используется для" d="Оценок, санкций или дисциплинарных решений" />
      </Card>

      <Card className="p-6 flex flex-col gap-3">
        <Button
          onClick={() => {
            setConsent(true);
            try {
              localStorage.setItem("consent", "true");
            } catch {
              // ignore storage errors
            }
            const target = returnUrl && returnUrl.startsWith("/") ? returnUrl : (ROLE_HOME[state.role] || "/");
            router.push(target);
          }}
        >
          Принимаю и продолжаю
        </Button>
        <Link href="/privacy">
          <Button variant="outline" className="w-full">Полный текст о конфиденциальности</Button>
        </Link>
        <Link href="/ethics" className="text-sm text-zinc-400 hover:text-zinc-200">
          Принципы этики использования
        </Link>
      </Card>
    </div>
  );
}

function Item({ t, d }: { t: string; d: string }) {
  return (
    <div className="rounded-2xl bg-black/30 border border-white/10 p-4">
      <div className="text-sm text-white/60">{t}</div>
      <div className="mt-1 text-zinc-200">{d}</div>
    </div>
  );
}
