import { Suspense } from "react";
import ConsentClient from "./ConsentClient";

export default function ConsentPage() {
  return (
    <Suspense fallback={<ConsentFallback />}>
      <ConsentClient />
    </Suspense>
  );
}

function ConsentFallback() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="h-5 w-40 rounded bg-surface-subtle" />
      <div className="space-y-2">
        <div className="h-8 w-72 rounded bg-surface-subtle" />
        <div className="h-5 w-full rounded bg-surface-subtle" />
      </div>

      <div className="space-y-3 rounded-2xl border border-[color:var(--border)] bg-surface p-6">
        <div className="h-16 rounded-xl bg-surface-subtle" />
        <div className="h-16 rounded-xl bg-surface-subtle" />
        <div className="h-16 rounded-xl bg-surface-subtle" />
        <div className="h-16 rounded-xl bg-surface-subtle" />
      </div>

      <div className="space-y-3 rounded-2xl border border-[color:var(--border)] bg-surface p-6">
        <div className="h-11 rounded-xl bg-surface-subtle" />
        <div className="h-11 rounded-xl bg-surface-subtle" />
        <div className="h-5 w-48 rounded bg-surface-subtle" />
      </div>
    </div>
  );
}