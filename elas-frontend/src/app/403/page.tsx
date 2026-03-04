import Link from "next/link";
import PageTitle from "@/components/common/PageTitle";
import Button from "@/components/ui/Button";

export default function ForbiddenPage() {
  return (
    <div className="max-w-xl mx-auto space-y-6 text-center">
      <PageTitle
        title="403 — Доступ запрещён"
        subtitle="У вас нет прав для просмотра этой страницы."
      />
      <p className="text-zinc-400">
        Войдите под учётной записью с нужной ролью или вернитесь на главную.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/">
          <Button>На главную</Button>
        </Link>
        <Link href="/auth/login">
          <Button variant="outline">Войти</Button>
        </Link>
      </div>
    </div>
  );
}
