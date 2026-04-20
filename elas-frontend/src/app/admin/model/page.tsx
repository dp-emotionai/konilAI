"use client";

import Breadcrumbs from "@/components/layout/Breadcrumbs";
import PageHero from "@/components/common/PageHero";
import Reveal from "@/components/common/Reveal";
import Section from "@/components/common/Section";
import Card from "@/components/ui/Card";
import Glow from "@/components/common/Glow";
import { ServerOff, Settings } from "lucide-react";

export default function AdminModelPage() {
  return (
    <div className="relative space-y-12 pb-20">
      <Glow />
      <Breadcrumbs items={[{ label: "Админ", href: "/admin/dashboard" }, { label: "Модель" }]} />

      <PageHero
        title="Управление Моделью"
        subtitle="Настройки эмоций, вовлеченности и стресса."
      />

      <Section>
        <Reveal>
          <div className="bg-white border border-slate-100 rounded-[28px] p-12 shadow-[0_4px_24px_rgba(0,0,0,0.02)] flex flex-col items-center justify-center text-center max-w-4xl mx-auto">
            <div className="w-20 h-20 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-6 border border-slate-100">
              <ServerOff size={32} strokeWidth={1.5} />
            </div>
            
            <h2 className="text-xl font-bold text-slate-900 mb-2">Бэкенд не подключен</h2>
            <p className="text-[15px] text-slate-500 max-w-lg mb-8 leading-relaxed">
              API для управления конфигурацией моделей машинного обучения в реальном времени еще не реализовано на стороне сервера. 
              Интерфейс настройки пороговых значений станет доступен после релиза эндпоинтов <code>/api/model/settings</code>.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl text-left">
               <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                 <div className="flex items-center gap-2 text-slate-900 font-medium mb-1">
                   <Settings size={16} className="text-slate-400" /> Accuracy Data
                 </div>
                 <div className="text-xs text-slate-500">Автоматический расчёт отключен до поднятия логгеров.</div>
               </div>
               <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                 <div className="flex items-center gap-2 text-slate-900 font-medium mb-1">
                   <Settings size={16} className="text-slate-400" /> Thresholds
                 </div>
                 <div className="text-xs text-slate-500">Управление strict/balanced режимами пока недоступно.</div>
               </div>
               <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                 <div className="flex items-center gap-2 text-slate-900 font-medium mb-1">
                   <Settings size={16} className="text-slate-400" /> Dry Run
                 </div>
                 <div className="text-xs text-slate-500">Запуск тестовых прогнозов требует активного ML-микросервиса.</div>
               </div>
            </div>
          </div>
        </Reveal>
      </Section>
    </div>
  );
}