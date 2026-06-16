"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  BarChart3,
  ChevronDown,
  MessageSquareText,
  Search,
  ShieldCheck,
} from "lucide-react";

import { cn } from "@/lib/cn";

type Category = "all" | "privacy" | "consent" | "platform";

type FaqItem = {
  id: string;
  category: Exclude<Category, "all">;
  question: string;
  answer: string;
  icon: ReactNode;
};

const FAQ_ITEMS: FaqItem[] = [
  {
    id: "camera-storage",
    category: "privacy",
    question: "Сохраняется ли видео с камеры?",
    answer:
      "Нет. Система работает с кадрами для анализа и хранит только агрегированные метрики и события.",
    icon: <MessageSquareText size={25} />,
  },
  {
    id: "analytics-opt-out",
    category: "consent",
    question: "Можно ли отказаться от аналитики?",
    answer:
      "Да. Аналитика включается только после согласия и может быть отозвана.",
    icon: <ShieldCheck size={25} />,
  },
  {
    id: "engagement-purpose",
    category: "platform",
    question: "Для чего нужна аналитика вовлечённости?",
    answer:
      "Чтобы поддержать преподавателя: увидеть динамику группы и вовремя заметить падение внимания.",
    icon: <BarChart3 size={25} />,
  },
];

const CATEGORY_LABELS: { id: Category; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "privacy", label: "Приватность" },
  { id: "consent", label: "Согласие" },
  { id: "platform", label: "Платформа" },
];

export default function FaqPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [openId, setOpenId] = useState<string>(FAQ_ITEMS[0].id);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return FAQ_ITEMS.filter((item) => {
      const matchesCategory =
        category === "all" || item.category === category;

      const matchesQuery =
        !normalizedQuery ||
        item.question.toLowerCase().includes(normalizedQuery) ||
        item.answer.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  return (
    <main className="relative min-h-[calc(100vh-72px)] overflow-hidden bg-gradient-to-br from-white via-[#FBFAFF] to-[#F3EEFF]">
      <div className="pointer-events-none absolute -right-24 top-0 h-[380px] w-[380px] rounded-full border border-purple-200/70" />
      <div className="pointer-events-none absolute right-0 top-0 h-[420px] w-[420px] bg-[radial-gradient(circle,rgba(116,72,255,0.10),transparent_68%)]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-[260px] w-[260px] bg-[radial-gradient(circle,rgba(116,72,255,0.06),transparent_70%)]" />

      <div className="relative mx-auto w-full max-w-[1500px] px-5 py-12 md:px-8 lg:px-12 lg:py-16">
        <section className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div>
            <div className="inline-flex items-center rounded-full bg-purple-100/80 px-4 py-2 text-sm font-medium text-[#6841E8]">
              Публичный раздел
            </div>

            <h1 className="mt-5 text-6xl font-medium tracking-[-0.05em] text-slate-950 md:text-7xl">
              FAQ
            </h1>

            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Ответы на частые вопросы о приватности, согласии и работе платформы.
            </p>
          </div>

          <div className="space-y-5">
            <div className="relative">
              <Search
                size={22}
                className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Поиск по вопросам"
                className="h-16 w-full rounded-2xl border border-slate-200 bg-white/90 pl-14 pr-5 text-base text-slate-900 shadow-[0_14px_45px_rgba(15,23,42,0.05)] outline-none transition placeholder:text-slate-400 focus:border-[#7448FF] focus:ring-4 focus:ring-purple-100"
              />
            </div>

            <div className="flex flex-wrap gap-4">
              {CATEGORY_LABELS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCategory(item.id)}
                  className={cn(
                    "rounded-xl border px-5 py-3 text-sm font-medium transition",
                    category === item.id
                      ? "border-purple-300 bg-white text-[#6841E8] shadow-[0_10px_30px_rgba(116,72,255,0.10)]"
                      : "border-slate-200 bg-white/75 text-slate-600 hover:border-purple-200 hover:text-slate-900"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-12 space-y-4">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => {
              const isOpen = openId === item.id;

              return (
                <article
                  key={item.id}
                  className={cn(
                    "overflow-hidden rounded-[24px] border bg-white/95 transition-all duration-300",
                    isOpen
                      ? "border-purple-300 shadow-[0_18px_50px_rgba(116,72,255,0.12)]"
                      : "border-slate-200 shadow-[0_12px_36px_rgba(15,23,42,0.05)]"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? "" : item.id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-5 px-6 py-7 text-left md:px-8"
                  >
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-purple-100/80 text-[#7448FF]">
                      {item.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl font-semibold tracking-[-0.02em] text-slate-950 md:text-2xl">
                        {item.question}
                      </h2>

                      <div
                        className={cn(
                          "grid transition-all duration-300",
                          isOpen
                            ? "mt-3 grid-rows-[1fr] opacity-100"
                            : "grid-rows-[0fr] opacity-0"
                        )}
                      >
                        <div className="overflow-hidden">
                          <p className="text-base leading-7 text-slate-600">
                            {item.answer}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-sm">
                      <ChevronDown
                        size={21}
                        className={cn(
                          "transition-transform duration-300",
                          isOpen && "rotate-180 text-[#7448FF]"
                        )}
                      />
                    </div>
                  </button>
                </article>
              );
            })
          ) : (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/80 px-6 py-14 text-center shadow-sm">
              <div className="text-lg font-medium text-slate-900">
                Ничего не найдено
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Попробуйте изменить запрос или выбрать другую категорию.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
