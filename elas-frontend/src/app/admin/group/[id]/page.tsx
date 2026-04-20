"use client";

import Link from "next/link";
import PageHero from "@/components/common/PageHero";
import Section from "@/components/common/Section";
import Reveal from "@/components/common/Reveal";
import GlassCard from "@/components/ui/GlassCard";
import Glow from "@/components/common/Glow";

export default function AdminGroupDetailPage() {
  return (
    <div className="relative space-y-14 pb-20">
      <Glow />
      <PageHero
        title="Группа (админ)"
        subtitle="Админ-раздел для групп будет подключён к backend позже. Сейчас страница носит справочный характер."
      />

      <Section>
        <Reveal>
          <GlassCard className="p-7 space-y-4">
            <p className="text-sm text-zinc-300">
              Управление группами (структура, привязка преподавателей и студентов, аудит изменений) будет
              реализовано в отдельном административном модуле.
            </p>
            <p className="text-sm text-zinc-400">
              Пока вы можете работать с группами через интерфейс преподавателя: создание групп, приглашения и
              управление участниками доступны в разделе «Преподаватель → Группы».
            </p>
            <Link
              href="/teacher/groups"
              className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm ring-1 ring-white/10 bg-surface-subtle hover:bg-white/15 text-zinc-100 transition"
            >
              Перейти к группам преподавателя
            </Link>
          </GlassCard>
        </Reveal>
      </Section>
    </div>
  );
}