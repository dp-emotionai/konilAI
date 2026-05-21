import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto text-sm text-[var(--muted)]">Загрузка…</div>}>
      <ResetPasswordClient />
    </Suspense>
  );
}

