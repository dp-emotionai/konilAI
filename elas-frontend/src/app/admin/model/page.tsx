"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  Clock3,
  Cpu,
  Database,
  Gauge,
  Loader2,
  RefreshCw,
  Save,
  Server,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  ToggleLeft,
} from "lucide-react";

import {
  getMlApiBaseUrl,
  isMlApiConfigured,
} from "@/lib/api/ml";
import { cn } from "@/lib/cn";

type ModelHealth = {
  status?: string;
  model_loaded?: boolean;
  model_path?: string;
  min_frame_interval?: number;
};

type ModelRoot = {
  service?: string;
  status?: string;
  version?: string;
};

type LocalModelSettings = {
  temperature: number;
  maxLength: number;
  confidenceThreshold: number;
  autoAnalysis: boolean;
  saveLogs: boolean;
  responseLanguage: "ru" | "kk" | "en";
  mode: "balanced" | "strict" | "sensitive";
};

const STORAGE_KEY = "konilai_admin_model_ui_settings_v1";

const DEFAULT_SETTINGS: LocalModelSettings = {
  temperature: 0.7,
  maxLength: 2048,
  confidenceThreshold: 85,
  autoAnalysis: true,
  saveLogs: false,
  responseLanguage: "ru",
  mode: "balanced",
};

const CARD =
  "rounded-[22px] border border-slate-200/80 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.045)]";

function formatDateTime(value: Date | null) {
  if (!value) return "Ещё не проверялось";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function StatusPill({
  ok,
  successLabel,
  failureLabel,
}: {
  ok: boolean;
  successLabel: string;
  failureLabel: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ring-1 ring-inset",
        ok
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-rose-50 text-rose-700 ring-rose-200"
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {ok ? successLabel : failureLabel}
    </span>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-slate-100 py-4 first:border-t-0">
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-900">{label}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors",
          checked ? "bg-violet-600" : "bg-slate-200"
        )}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

function RangeField({
  label,
  description,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="border-t border-slate-100 py-5 first:border-t-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-900">{label}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>

        <span className="text-sm font-extrabold text-violet-600">
          {value}
          {suffix}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-violet-600"
        style={{
          background: `linear-gradient(to right, #6d4aff 0%, #6d4aff ${percentage}%, #e2e8f0 ${percentage}%, #e2e8f0 100%)`,
        }}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  helper,
  icon,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  tone: "violet" | "emerald" | "blue" | "amber";
}) {
  const toneClass = {
    violet: "bg-violet-100 text-violet-600",
    emerald: "bg-emerald-100 text-emerald-600",
    blue: "bg-blue-100 text-blue-600",
    amber: "bg-amber-100 text-amber-600",
  }[tone];

  return (
    <article className={cn(CARD, "p-5")}>
      <div className="flex items-start justify-between gap-4">
        <span
          className={cn(
            "grid h-10 w-10 place-items-center rounded-xl",
            toneClass
          )}
        >
          {icon}
        </span>
      </div>

      <p className="mt-5 text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-[-0.03em] text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-400">{helper}</p>
    </article>
  );
}

export default function AdminModelPage() {
  const [settings, setSettings] =
    useState<LocalModelSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] =
    useState<LocalModelSettings>(DEFAULT_SETTINGS);

  const [health, setHealth] = useState<ModelHealth | null>(null);
  const [rootInfo, setRootInfo] = useState<ModelRoot | null>(null);
  const [checking, setChecking] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const mlBaseUrl = getMlApiBaseUrl();
  const mlConfigured = isMlApiConfigured();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<LocalModelSettings>;

      const restored: LocalModelSettings = {
        ...DEFAULT_SETTINGS,
        ...parsed,
      };

      setSettings(restored);
      setSavedSettings(restored);
    } catch {
      // Повреждённые локальные настройки безопасно игнорируются.
    }
  }, []);

  const checkHealth = useCallback(async () => {
    setChecking(true);
    setHealthError(null);

    if (!mlConfigured || !mlBaseUrl) {
      setHealth(null);
      setRootInfo(null);
      setHealthError(
        "NEXT_PUBLIC_ML_API_URL не настроен. Проверка ML-сервиса недоступна."
      );
      setLastCheckedAt(new Date());
      setChecking(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);

    try {
      const [healthResponse, rootResponse] = await Promise.all([
        fetch(`${mlBaseUrl}/health`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        }),
        fetch(`${mlBaseUrl}/`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        }),
      ]);

      if (!healthResponse.ok) {
        throw new Error(`ML health вернул HTTP ${healthResponse.status}`);
      }

      const healthData = (await healthResponse.json()) as ModelHealth;
      const rootData = rootResponse.ok
        ? ((await rootResponse.json()) as ModelRoot)
        : null;

      setHealth(healthData);
      setRootInfo(rootData);
    } catch (error) {
      setHealth(null);
      setRootInfo(null);

      if (error instanceof DOMException && error.name === "AbortError") {
        setHealthError("ML-сервис не ответил за 12 секунд.");
      } else {
        setHealthError(
          error instanceof Error
            ? error.message
            : "Не удалось проверить состояние ML-сервиса."
        );
      }
    } finally {
      window.clearTimeout(timeout);
      setLastCheckedAt(new Date());
      setChecking(false);
    }
  }, [mlBaseUrl, mlConfigured]);

  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [savedSettings, settings]
  );

  const serviceOnline =
    Boolean(health) &&
    String(health?.status ?? "").toLowerCase() === "ok";

  const modelLoaded = Boolean(health?.model_loaded);

  function saveLocalSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSavedSettings(settings);
    setSavedAt(new Date());
  }

  function resetSettings() {
    setSettings(DEFAULT_SETTINGS);
  }

  return (
    <div className="space-y-5 pb-14">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">
            Администрирование
          </p>

          <h1 className="mt-3 text-[30px] font-extrabold tracking-[-0.035em] text-slate-950 md:text-[34px]">
            Настройки модели
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Мониторинг ML-сервиса и локальная подготовка параметров интерфейса.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void checkHealth()}
          disabled={checking}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          {checking ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          Проверить сервис
        </button>
      </header>

      <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
        <p>
          Параметры на этой странице сохраняются только в текущем браузере и
          пока не изменяют ML-сервис. Серверного endpoint для конфигурации модели
          в проекте ещё нет.
        </p>
      </div>

      {healthError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {healthError}
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="ML-сервис"
          value={checking ? "Проверка…" : serviceOnline ? "Доступен" : "Недоступен"}
          helper={formatDateTime(lastCheckedAt)}
          icon={<Server size={19} />}
          tone={serviceOnline ? "emerald" : "amber"}
        />

        <StatCard
          label="Состояние модели"
          value={checking ? "Проверка…" : modelLoaded ? "Загружена" : "Нет данных"}
          helper={health?.model_path ?? "Файл модели не получен"}
          icon={<BrainCircuit size={19} />}
          tone={modelLoaded ? "violet" : "amber"}
        />

        <StatCard
          label="Версия API"
          value={rootInfo?.version ?? "—"}
          helper={rootInfo?.service ?? "emotion-risk-api"}
          icon={<Cpu size={19} />}
          tone="blue"
        />

        <StatCard
          label="Минимальный интервал"
          value={
            typeof health?.min_frame_interval === "number"
              ? `${health.min_frame_interval} с`
              : "—"
          }
          helper="Ограничение между кадрами"
          icon={<Clock3 size={19} />}
          tone="amber"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1.05fr]">
        <div className={cn(CARD, "overflow-hidden")}>
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-5">
            <div>
              <p className="text-xs font-medium text-slate-500">Параметры</p>
              <h2 className="mt-1 text-base font-extrabold text-slate-950">
                Поведение анализа
              </h2>
            </div>

            <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
              Local config
            </span>
          </div>

          <div className="px-5">
            <RangeField
              label="Температура"
              description="Экспериментальный уровень вариативности интерфейсных рекомендаций."
              value={settings.temperature}
              min={0}
              max={1}
              step={0.1}
              onChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  temperature: value,
                }))
              }
            />

            <RangeField
              label="Максимальная длина"
              description="Локальный лимит текста для будущих объяснений и отчётов."
              value={settings.maxLength}
              min={256}
              max={4096}
              step={256}
              onChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  maxLength: value,
                }))
              }
            />

            <RangeField
              label="Порог уверенности"
              description="Ниже порога результат должен считаться недостаточно уверенным."
              value={settings.confidenceThreshold}
              min={50}
              max={99}
              step={1}
              suffix="%"
              onChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  confidenceThreshold: value,
                }))
              }
            />

            <Toggle
              label="Автоматический анализ"
              description="Подготавливать интерфейс к запуску анализа после завершения сессии."
              checked={settings.autoAnalysis}
              onChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  autoAnalysis: value,
                }))
              }
            />

            <Toggle
              label="Сохранение логов"
              description="Локальный переключатель. Реальное серверное логирование пока не подключено."
              checked={settings.saveLogs}
              onChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  saveLogs: value,
                }))
              }
            />
          </div>
        </div>

        <div className={cn(CARD, "overflow-hidden")}>
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-5">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Текущая модель
              </p>
              <h2 className="mt-1 text-base font-extrabold text-slate-950">
                Конфигурация интерфейса
              </h2>
            </div>

            <StatusPill
              ok={serviceOnline && modelLoaded}
              successLabel="Активна"
              failureLabel="Не проверена"
            />
          </div>

          <div className="space-y-5 p-5">
            <div className="flex items-center gap-4 rounded-2xl bg-violet-50 p-4">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-violet-600 text-white">
                <Sparkles size={21} />
              </span>

              <div className="min-w-0">
                <p className="truncate text-lg font-extrabold text-slate-950">
                  {health?.model_path ?? "Emotion model"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {rootInfo?.service ?? "ML-сервис распознавания эмоций"}
                </p>
              </div>
            </div>

            <label className="block space-y-2">
              <span className="text-xs font-bold text-slate-600">
                Режим работы
              </span>
              <select
                value={settings.mode}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    mode: event.target.value as LocalModelSettings["mode"],
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              >
                <option value="balanced">Сбалансированный</option>
                <option value="strict">Строгий</option>
                <option value="sensitive">Чувствительный</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-bold text-slate-600">
                Язык ответа
              </span>
              <select
                value={settings.responseLanguage}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    responseLanguage:
                      event.target.value as LocalModelSettings["responseLanguage"],
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
              >
                <option value="ru">Русский</option>
                <option value="kk">Қазақша</option>
                <option value="en">English</option>
              </select>
            </label>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck size={18} className="text-emerald-600" />
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Безопасное сохранение
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Секреты, ключи и серверные параметры не записываются в
                    браузер.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={resetSettings}
                className="h-11 flex-1 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Сбросить
              </button>

              <button
                type="button"
                onClick={saveLocalSettings}
                disabled={!hasUnsavedChanges}
                className="inline-flex h-11 flex-[1.5] items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={16} />
                Сохранить локально
              </button>
            </div>

            <p className="text-center text-[11px] text-slate-400">
              {savedAt
                ? `Последнее локальное сохранение: ${formatDateTime(savedAt)}`
                : hasUnsavedChanges
                ? "Есть несохранённые локальные изменения"
                : "Локальные настройки не изменены"}
            </p>
          </div>
        </div>
      </section>

      <section className={cn(CARD, "overflow-hidden")}>
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-5">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Диагностика подключения
            </p>
            <h2 className="mt-1 text-base font-extrabold text-slate-950">
              Состояние ML-инфраструктуры
            </h2>
          </div>

          <Settings2 size={19} className="text-slate-400" />
        </div>

        <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "URL сервиса",
              value: mlBaseUrl || "Не настроен",
              icon: <Server size={17} />,
              ok: Boolean(mlBaseUrl),
            },
            {
              label: "Health endpoint",
              value: serviceOnline ? "Ответ получен" : "Нет ответа",
              icon: <Activity size={17} />,
              ok: serviceOnline,
            },
            {
              label: "Файл модели",
              value: health?.model_path ?? "Нет данных",
              icon: <Database size={17} />,
              ok: modelLoaded,
            },
            {
              label: "Rate limit",
              value:
                typeof health?.min_frame_interval === "number"
                  ? `${health.min_frame_interval} с`
                  : "Нет данных",
              icon: <Gauge size={17} />,
              ok: typeof health?.min_frame_interval === "number",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 p-4"
            >
              <div className="flex items-center gap-2 text-slate-500">
                {item.icon}
                <p className="text-xs font-bold">{item.label}</p>
              </div>

              <p className="mt-3 break-all text-sm font-extrabold text-slate-900">
                {item.value}
              </p>

              <div className="mt-3">
                <StatusPill
                  ok={item.ok}
                  successLabel="Готово"
                  failureLabel="Ожидание"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        className={cn(
          CARD,
          "flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
        )}
      >
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-600">
            <SlidersHorizontal size={18} />
          </span>

          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              Серверное управление ещё не подключено
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Для реального изменения модели потребуется отдельный защищённый
              admin endpoint и журнал аудита изменений.
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
          <ToggleLeft size={16} />
          UI-only режим
        </div>
      </section>
    </div>
  );
}
