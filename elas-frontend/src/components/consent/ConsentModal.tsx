"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  BarChart3,
  Camera,
  Database,
  ShieldCheck,
  ShieldX,
  X,
} from "lucide-react";

import Button from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type ConsentModalProps = {
  open: boolean;
  saving?: boolean;
  statusLoading?: boolean;
  hasConsent?: boolean;
  error?: string | null;
  onAccept: () => void;
  onRevoke?: () => void;
  onClose: () => void;
  onContinueWithoutAnalysis?: () => void;
  className?: string;
};

const consentItems = [
  {
    title: "Мы обрабатываем",
    description: "Изображения с веб-камеры без записи видео",
    icon: Camera,
  },
  {
    title: "Мы сохраняем",
    description: "Только метаданные эмоций, без исходного видео",
    icon: Database,
  },
  {
    title: "Используется для",
    description:
        "Анализа вовлечённости и стресса, чтобы улучшать преподавание",
    icon: BarChart3,
  },
  {
    title: "Не используется для",
    description: "Оценок, санкций или дисциплинарных решений",
    icon: ShieldX,
  },
] as const;

export default function ConsentModal({
                                       open,
                                       saving = false,
                                       statusLoading = false,
                                       hasConsent = false,
                                       error = null,
                                       onAccept,
                                       onRevoke,
                                       onClose,
                                       onContinueWithoutAnalysis,
                                       className,
                                     }: ConsentModalProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open, saving]);

  if (!open) return null;

  return (
      <div
          className="fixed inset-0 z-[110] overflow-y-auto bg-slate-950/55 px-3 py-4 backdrop-blur-[4px] sm:px-5 sm:py-7"
          role="presentation"
          onMouseDown={(event) => {
            if (
                event.currentTarget === event.target &&
                !saving
            ) {
              onClose();
            }
          }}
      >
        <div className="flex min-h-full items-center justify-center">
          <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="consent-modal-title"
              aria-busy={saving}
              className={cn(
                  "relative w-full max-w-[700px] overflow-hidden rounded-[28px] border border-white/75 bg-white shadow-[0_32px_100px_rgba(15,23,42,0.36)]",
                  className
              )}
          >
            <div className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-purple-100/70 blur-3xl" />

            <div className="pointer-events-none absolute -right-24 top-1/3 h-64 w-64 rounded-full bg-indigo-100/55 blur-3xl" />

            <div className="relative max-h-[calc(100vh-32px)] overflow-y-auto px-5 pb-5 pt-5 sm:px-10 sm:pb-7 sm:pt-8">
              <button
                  type="button"
                  aria-label="Закрыть"
                  onClick={onClose}
                  disabled={saving}
                  className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-slate-700 transition hover:bg-violet-100 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50 sm:right-6 sm:top-6"
              >
                <X size={21} />
              </button>

              <div className="pr-12">
                <div className="text-sm font-semibold text-[#7448FF]">
                  Согласие
                </div>

                <h1
                    id="consent-modal-title"
                    className="mt-3 text-[28px] font-extrabold leading-[1.12] tracking-[-0.035em] text-slate-900 sm:text-[34px]"
                >
                  {hasConsent
                      ? "Согласие на анализ эмоций активно"
                      : "Согласие на анализ эмоций"}
                </h1>

                <p className="mt-2 max-w-[590px] text-sm font-medium leading-relaxed text-slate-500 sm:text-[15px]">
                  {hasConsent
                      ? "Вы разрешили обработку кадров для анализа вовлечённости. Исходное видео не сохраняется."
                      : "Мы обрабатываем 1–2 кадра в секунду, без записи видео. Сохраняются только метаданные."}
                </p>
              </div>

              <div className="mt-6 space-y-2.5">
                {consentItems.map(
                    ({ title, description, icon: Icon }) => (
                        <div
                            key={title}
                            className="flex items-center gap-4 rounded-[18px] border border-slate-100 bg-white px-4 py-3.5 shadow-[0_8px_28px_rgba(15,23,42,0.055)] sm:px-5"
                        >
                          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[15px] bg-violet-50 text-[#7448FF]">
                            <Icon size={24} strokeWidth={1.9} />
                          </div>

                          <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900">
                              {title}
                            </div>

                            <div className="mt-0.5 text-sm font-medium leading-relaxed text-slate-600">
                              {description}
                            </div>
                          </div>
                        </div>
                    )
                )}
              </div>

              <div className="mt-3.5 flex gap-3 rounded-[18px] border border-violet-100 bg-violet-50/75 px-4 py-3.5 sm:px-5">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-white text-[#7448FF] shadow-sm">
                  <ShieldCheck size={21} />
                </div>

                <div>
                  <div className="text-sm font-bold text-slate-900">
                    Мы бережно относимся к вашей приватности.
                  </div>

                  <div className="mt-0.5 text-xs font-medium leading-relaxed text-slate-500 sm:text-[13px]">
                    Данные используются только для улучшения образовательного
                    процесса и строго в соответствии с принципами этики и
                    конфиденциальности.
                  </div>
                </div>
              </div>

              {error && (
                  <div
                      role="alert"
                      className="mt-4 rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-relaxed text-red-700"
                  >
                    {error}
                  </div>
              )}

              <div className="mt-6 flex flex-col gap-3">
                {statusLoading ? (
                    <Button
                        disabled
                        className="h-12 w-full rounded-[14px] border-none bg-slate-200 text-base font-semibold text-slate-500"
                    >
                      Проверяем статус...
                    </Button>
                ) : hasConsent && onRevoke ? (
                    <Button
                        onClick={onRevoke}
                        disabled={saving}
                        className="h-12 w-full rounded-[14px] border border-red-200 bg-red-50 text-base font-semibold text-red-600 shadow-none hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving
                          ? "Отзываем согласие..."
                          : "Отозвать согласие"}
                    </Button>
                ) : (
                    <Button
                        onClick={onAccept}
                        disabled={saving}
                        className="h-12 w-full rounded-[14px] border-none bg-[#7448FF] text-base font-semibold text-white shadow-[0_14px_30px_rgba(116,72,255,0.28)] hover:bg-[#6538f5] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving
                          ? "Сохраняем согласие..."
                          : "Принимаю и продолжаю"}
                    </Button>
                )}

                <Link
                    href="/privacy"
                    aria-disabled={saving}
                    tabIndex={saving ? -1 : undefined}
                    className={cn(
                        "inline-flex h-12 w-full items-center justify-center rounded-[14px] border border-[#7448FF] bg-white px-5 text-base font-semibold text-[#7448FF] shadow-sm transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7448FF]/50 focus-visible:ring-offset-2",
                        saving &&
                        "pointer-events-none cursor-not-allowed opacity-50"
                    )}
                >
                  Полный текст о конфиденциальности
                </Link>

                <Link
                    href="/ethics"
                    aria-disabled={saving}
                    tabIndex={saving ? -1 : undefined}
                    className={cn(
                        "inline-flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-violet-200 bg-white px-5 text-base font-semibold text-[#7448FF] shadow-sm transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7448FF]/50 focus-visible:ring-offset-2",
                        saving &&
                        "pointer-events-none cursor-not-allowed opacity-50"
                    )}
                >
                  <ShieldCheck size={18} />
                  Принципы этики использования
                </Link>

                {onContinueWithoutAnalysis && (
                    <button
                        type="button"
                        onClick={onContinueWithoutAnalysis}
                        disabled={saving}
                        className="mx-auto px-4 py-1 text-sm font-semibold text-[#7448FF] transition hover:text-[#5f31e8] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Продолжить без анализа
                    </button>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
  );
}