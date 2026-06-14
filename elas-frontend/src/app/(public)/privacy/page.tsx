"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Database,
  Download,
  ShieldCheck,
  UserRoundCheck,
  Users,
  Video,
} from "lucide-react";

import PageTitle from "@/components/common/PageTitle";
import { Card } from "@/components/ui/Card";
import {
  getConsentStatus,
  type ConsentStatus,
} from "@/lib/api/consent";

const SECTIONS = [
  {
    id: "capture",
    icon: Video,
    title: "Что мы обрабатываем",
    body:
        "Мы обрабатываем кадры с вашей веб-камеры с низкой частотой — 1–2 кадра в секунду. Это не непрерывная видеозапись. Кадры используются только для анализа эмоций и вовлечённости в реальном времени. Видеозапись не сохраняется.",
  },
  {
    id: "storage",
    icon: Database,
    title: "Что мы сохраняем",
    body:
        "Мы не сохраняем исходное видео или изображения. Сохраняются только метаданные: агрегированные показатели эмоций, уровень вовлечённости и временные метки для аналитики и отчётов. В групповых отчётах данные обезличиваются.",
  },
  {
    id: "access",
    icon: Users,
    title: "Кто имеет доступ",
    body:
        "Доступ зависит от роли пользователя. Студенты видят только собственную сводку, если они дали согласие. Преподаватели видят агрегированную аналитику по своим группам и сессиям. Администраторы управляют пользователями и настройками системы. Мы не передаём данные третьим лицам для маркетинговых или неучебных целей.",
  },
  {
    id: "retention",
    icon: CalendarDays,
    title: "Срок хранения",
    body:
        "Срок хранения данных может настраиваться вашей организацией. Вы можете запросить удаление своих данных, и мы обработаем такой запрос в соответствии с применимыми правилами и требованиями, например GDPR.",
  },
  {
    id: "consent",
    icon: ShieldCheck,
    title: "Ваше согласие",
    body:
        "Участие в видеоаналитике требует вашего явного согласия. Вы можете дать или отозвать согласие в любой момент в центре согласия. Без согласия кадры не обрабатываются и не анализируются.",
  },
] as const;

export default function Privacy() {
  const [consentStatus, setConsentStatus] =
      useState<ConsentStatus | null>(null);

  const [consentLoading, setConsentLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    async function loadConsentStatus() {
      try {
        const status = await getConsentStatus(controller.signal);

        if (mounted) {
          setConsentStatus(status);
        }
      } catch (error) {
        if (
            error instanceof DOMException &&
            error.name === "AbortError"
        ) {
          return;
        }

        console.error("CONSENT STATUS LOAD FAILED", error);

        if (mounted) {
          setConsentStatus({
            hasConsent: false,
            consentedAt: null,
          });
        }
      } finally {
        if (mounted) {
          setConsentLoading(false);
        }
      }
    }

    void loadConsentStatus();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  return (
      <div className="relative -mx-4 -my-6 min-h-[calc(100vh-80px)] overflow-hidden px-4 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.16),transparent_34%)]" />

        <div className="pointer-events-none absolute bottom-0 left-0 -z-10 h-72 w-72 rounded-full border border-purple-200/60 opacity-40" />

        <div className="pointer-events-none absolute bottom-8 left-8 -z-10 h-56 w-56 rounded-full border border-purple-200/50 opacity-40" />

        <div className="mx-auto max-w-7xl space-y-7">
          <PageTitle
              overline="Публичный документ"
              title="Политика конфиденциальности"
              subtitle="Что мы обрабатываем, что сохраняем и кто имеет доступ к данным."
          />

          <Card className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur md:p-7">
            <div className="space-y-3">
              {SECTIONS.map(({ id, icon: Icon, title, body }) => (
                  <section
                      key={id}
                      id={id}
                      className="scroll-mt-24 rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-purple-100 hover:shadow-md sm:px-6"
                  >
                    <div className="flex items-start gap-5">
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[18px] bg-purple-50 text-[#7448FF]">
                        <Icon size={24} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-bold text-slate-950">
                          {title}
                        </h2>

                        <p className="mt-1 max-w-5xl text-sm leading-relaxed text-slate-600">
                          {body}
                        </p>
                      </div>
                    </div>
                  </section>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-4 rounded-[24px] bg-white pt-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                    href="/consent?returnUrl=/privacy"
                    className="inline-flex items-center justify-center gap-3 rounded-2xl bg-[#7448FF] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(116,72,255,0.28)] transition hover:bg-[#6538f5]"
                >
                  <ShieldCheck size={18} />

                  {consentLoading
                      ? "Проверяем согласие..."
                      : consentStatus?.hasConsent
                          ? "Управление согласием"
                          : "Дать согласие"}
                </Link>

                <a
                    href={`${process.env.NEXT_PUBLIC_API_URL}/legal/privacy-policy/download`}
                    className="inline-flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-purple-200 hover:bg-purple-50 hover:text-[#7448FF]"
                >
                  <Download size={18} />
                  Скачать политику
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <UserRoundCheck
                    size={18}
                    className={
                      consentStatus?.hasConsent
                          ? "text-emerald-600"
                          : "text-slate-400"
                    }
                />

                <span>Статус согласия:</span>

                {consentLoading ? (
                    <span className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-500">
                  Проверяем...
                </span>
                ) : consentStatus?.hasConsent ? (
                    <span className="rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-semibold text-emerald-700">
                  Согласие дано
                </span>
                ) : (
                    <span className="rounded-full bg-amber-100 px-4 py-1.5 text-sm font-semibold text-amber-700">
                  Согласие не дано
                </span>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
  );
}