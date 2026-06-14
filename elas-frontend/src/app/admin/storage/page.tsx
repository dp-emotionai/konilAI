"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Clock3,
  Database,
  Eraser,
  HardDrive,
  Info,
  Loader2,
  RefreshCw,
  Save,
  ServerOff,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/cn";

type StorageSettings = {
  retentionDays: number;
  autoCleanup: boolean;
  archiveColdSessions: boolean;
  redactFaces: boolean;
};

type LocalLogRow = {
  id: string;
  at: string;
  action: string;
  result: string;
  tone: "success" | "info" | "warning";
};

type BrowserStorageEstimate = {
  usage: number | null;
  quota: number | null;
};

const SETTINGS_KEY = "konilai_admin_storage_ui_settings_v1";
const LOG_KEY = "konilai_admin_storage_ui_log_v1";

const DEFAULT_SETTINGS: StorageSettings = {
  retentionDays: 30,
  autoCleanup: true,
  archiveColdSessions: true,
  redactFaces: false,
};

const CARD =
  "rounded-[22px] border border-slate-200/80 bg-white shadow-[0_12px_35px_rgba(15,23,42,0.045)]";

function formatBytes(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value === 0) return "0 Б";

  const units = ["Б", "КБ", "МБ", "ГБ", "ТБ"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1
  );
  const amount = value / 1024 ** index;

  return `${amount.toLocaleString("ru-RU", {
    maximumFractionDigits: amount >= 10 ? 1 : 2,
  })} ${units[index]}`;
}

function formatDateTime(value: Date | null) {
  if (!value) return "Ещё не выполнялось";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

function nowLabel() {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
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

function SummaryCard({
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
  tone: "violet" | "blue" | "emerald" | "amber";
}) {
  const toneClass = {
    violet: "bg-violet-100 text-violet-600",
    blue: "bg-blue-100 text-blue-600",
    emerald: "bg-emerald-100 text-emerald-600",
    amber: "bg-amber-100 text-amber-600",
  }[tone];

  return (
    <article className={cn(CARD, "p-5")}>
      <span
        className={cn(
          "grid h-10 w-10 place-items-center rounded-xl",
          toneClass
        )}
      >
        {icon}
      </span>

      <p className="mt-5 text-xs font-semibold text-slate-500">{label}</p>

      <p className="mt-1 text-2xl font-extrabold tracking-[-0.03em] text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-400">{helper}</p>
    </article>
  );
}

function LogBadge({ tone }: { tone: LocalLogRow["tone"] }) {
  const className = {
    success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    info: "bg-blue-50 text-blue-700 ring-blue-200",
    warning: "bg-amber-50 text-amber-700 ring-amber-200",
  }[tone];

  const label = {
    success: "Готово",
    info: "Инфо",
    warning: "Внимание",
  }[tone];

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset",
        className
      )}
    >
      {label}
    </span>
  );
}

export default function AdminStoragePage() {
  const [settings, setSettings] =
    useState<StorageSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] =
    useState<StorageSettings>(DEFAULT_SETTINGS);
  const [logs, setLogs] = useState<LocalLogRow[]>([]);
  const [estimate, setEstimate] = useState<BrowserStorageEstimate>({
    usage: null,
    quota: null,
  });
  const [checkingEstimate, setCheckingEstimate] = useState(true);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const rawSettings = localStorage.getItem(SETTINGS_KEY);
      if (rawSettings) {
        const parsed = JSON.parse(rawSettings) as Partial<StorageSettings>;
        const restored = {
          ...DEFAULT_SETTINGS,
          ...parsed,
        };

        setSettings(restored);
        setSavedSettings(restored);
      }

      const rawLog = localStorage.getItem(LOG_KEY);
      if (rawLog) {
        const parsedLog = JSON.parse(rawLog) as LocalLogRow[];
        setLogs(Array.isArray(parsedLog) ? parsedLog.slice(0, 8) : []);
      }
    } catch {
      setMessage("Локальные настройки были повреждены и сброшены.");
    }
  }, []);

  const refreshEstimate = useCallback(async () => {
    setCheckingEstimate(true);

    try {
      if (!navigator.storage?.estimate) {
        setEstimate({ usage: null, quota: null });
        setMessage("Браузер не поддерживает Storage Estimate API.");
        return;
      }

      const result = await navigator.storage.estimate();

      setEstimate({
        usage: typeof result.usage === "number" ? result.usage : null,
        quota: typeof result.quota === "number" ? result.quota : null,
      });
      setLastCheckedAt(new Date());
    } catch {
      setEstimate({ usage: null, quota: null });
      setMessage("Не удалось получить оценку браузерного хранилища.");
    } finally {
      setCheckingEstimate(false);
    }
  }, []);

  useEffect(() => {
    void refreshEstimate();
  }, [refreshEstimate]);

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [savedSettings, settings]
  );

  const browserUsagePercent = useMemo(() => {
    if (
      estimate.usage == null ||
      estimate.quota == null ||
      estimate.quota <= 0
    ) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(100, Math.round((estimate.usage / estimate.quota) * 100))
    );
  }, [estimate]);

  const retentionLabel =
    settings.retentionDays <= 14
      ? "Минимальное хранение"
      : settings.retentionDays <= 45
      ? "Сбалансированная политика"
      : "Повышенный объём хранения";

  function persistLogs(nextLogs: LocalLogRow[]) {
    setLogs(nextLogs);
    localStorage.setItem(LOG_KEY, JSON.stringify(nextLogs));
  }

  function addLog(
    action: string,
    result: string,
    tone: LocalLogRow["tone"]
  ) {
    const nextLogs = [
      {
        id: crypto.randomUUID(),
        at: nowLabel(),
        action,
        result,
        tone,
      },
      ...logs,
    ].slice(0, 8);

    persistLogs(nextLogs);
  }

  function saveLocalSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setSavedSettings(settings);
    setSavedAt(new Date());
    addLog(
      "Сохранение политики хранения",
      "Настройки сохранены только в этом браузере",
      "success"
    );
    setMessage("Локальная конфигурация сохранена.");
  }

  function resetDraft() {
    setSettings(savedSettings);
    setMessage("Несохранённые изменения отменены.");
  }

  function clearLocalStorageSettings() {
    localStorage.removeItem(SETTINGS_KEY);
    setSettings(DEFAULT_SETTINGS);
    setSavedSettings(DEFAULT_SETTINGS);
    setSavedAt(null);
    addLog(
      "Сброс локальной конфигурации",
      "Настройки страницы возвращены к значениям по умолчанию",
      "warning"
    );
    setMessage("Локальные настройки страницы очищены.");
  }

  function clearLocalLog() {
    localStorage.removeItem(LOG_KEY);
    setLogs([]);
    setMessage("Локальный журнал страницы очищен.");
  }

  return (
    <div className="space-y-5 pb-14">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-slate-500">
            Администрирование
          </p>

          <h1 className="mt-3 text-[30px] font-extrabold tracking-[-0.035em] text-slate-950 md:text-[34px]">
            Хранилище
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Политика хранения данных, локальная диагностика и подготовка
            параметров очистки.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refreshEstimate()}
          disabled={checkingEstimate}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
        >
          {checkingEstimate ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          Обновить оценку
        </button>
      </header>

      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
        <p>
          Серверная статистика хранилища и реальные операции удаления пока не
          подключены. Показатели ниже относятся только к хранилищу текущего
          браузера, а настройки сохраняются локально.
        </p>
      </div>

      {message ? (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="rounded-lg px-2 py-1 font-bold hover:bg-blue-100"
          >
            Закрыть
          </button>
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Использовано браузером"
          value={checkingEstimate ? "Проверка…" : formatBytes(estimate.usage)}
          helper="Текущий origin сайта"
          icon={<HardDrive size={19} />}
          tone="violet"
        />

        <SummaryCard
          label="Доступная квота браузера"
          value={checkingEstimate ? "Проверка…" : formatBytes(estimate.quota)}
          helper={`${browserUsagePercent}% занято`}
          icon={<Database size={19} />}
          tone="blue"
        />

        <SummaryCard
          label="Срок хранения"
          value={`${settings.retentionDays} дней`}
          helper={retentionLabel}
          icon={<Clock3 size={19} />}
          tone="amber"
        />

        <SummaryCard
          label="Режим очистки"
          value={settings.autoCleanup ? "Авто" : "Вручную"}
          helper="Локальная конфигурация"
          icon={<Eraser size={19} />}
          tone={settings.autoCleanup ? "emerald" : "amber"}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_0.8fr]">
        <div className={cn(CARD, "overflow-hidden")}>
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-5">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Retention policy
              </p>
              <h2 className="mt-1 text-base font-extrabold text-slate-950">
                Политика хранения
              </h2>
            </div>

            <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
              Local config
            </span>
          </div>

          <div className="p-5">
            <div className="border-b border-slate-100 pb-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Срок хранения данных
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    После появления backend endpoint это значение сможет
                    управлять архивированием и очисткой.
                  </p>
                </div>

                <span className="text-sm font-extrabold text-violet-600">
                  {settings.retentionDays} дней
                </span>
              </div>

              <input
                type="range"
                min={7}
                max={90}
                step={1}
                value={settings.retentionDays}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    retentionDays: Number(event.target.value),
                  }))
                }
                className="mt-5 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-violet-600"
                style={{
                  background: `linear-gradient(to right, #6d4aff 0%, #6d4aff ${
                    ((settings.retentionDays - 7) / 83) * 100
                  }%, #e2e8f0 ${
                    ((settings.retentionDays - 7) / 83) * 100
                  }%, #e2e8f0 100%)`,
                }}
              />

              <div className="mt-2 flex justify-between text-[10px] font-semibold text-slate-400">
                <span>7 дней</span>
                <span>30 дней</span>
                <span>90 дней</span>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold text-slate-700">
                  Предварительный результат
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Данные старше {settings.retentionDays} дней будут считаться
                  подходящими для архивирования или удаления после подключения
                  серверной политики.
                </p>
              </div>
            </div>

            <Toggle
              checked={settings.autoCleanup}
              onChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  autoCleanup: value,
                }))
              }
              label="Автоматическая очистка"
              description="Подготовка к запуску регулярной серверной очистки."
            />

            <Toggle
              checked={settings.archiveColdSessions}
              onChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  archiveColdSessions: value,
                }))
              }
              label="Архивировать старые сессии"
              description="Перенос завершённых сессий в холодный уровень хранения."
            />

            <Toggle
              checked={settings.redactFaces}
              onChange={(value) =>
                setSettings((current) => ({
                  ...current,
                  redactFaces: value,
                }))
              }
              label="Редактирование лиц"
              description="UI-параметр для будущего хранения обезличенных кадров."
            />

            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={resetDraft}
                disabled={!hasUnsavedChanges}
                className="h-11 flex-1 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Отменить изменения
              </button>

              <button
                type="button"
                onClick={saveLocalSettings}
                disabled={!hasUnsavedChanges}
                className="inline-flex h-11 flex-[1.35] items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={16} />
                Сохранить локально
              </button>
            </div>

            <p className="mt-3 text-center text-[11px] text-slate-400">
              {savedAt
                ? `Последнее сохранение: ${formatDateTime(savedAt)}`
                : hasUnsavedChanges
                ? "Есть несохранённые локальные изменения"
                : "Локальные настройки не изменены"}
            </p>
          </div>
        </div>

        <aside className={cn(CARD, "self-start overflow-hidden")}>
          <div className="border-b border-slate-100 px-5 py-5">
            <p className="text-xs font-medium text-slate-500">
              Browser storage
            </p>
            <h2 className="mt-1 text-base font-extrabold text-slate-950">
              Локальная диагностика
            </h2>
          </div>

          <div className="space-y-5 p-5">
            <div className="relative mx-auto grid h-40 w-40 place-items-center">
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(#6d4aff ${browserUsagePercent}%, #eef2f7 ${browserUsagePercent}% 100%)`,
                }}
              />
              <div className="absolute inset-[15px] rounded-full bg-white" />
              <div className="relative text-center">
                <p className="text-3xl font-extrabold text-slate-950">
                  {browserUsagePercent}%
                </p>
                <p className="mt-1 text-xs text-slate-500">занято</p>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                  Использование
                </p>
                <p className="mt-2 text-sm font-extrabold text-slate-900">
                  {formatBytes(estimate.usage)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
                  Квота
                </p>
                <p className="mt-2 text-sm font-extrabold text-slate-900">
                  {formatBytes(estimate.quota)}
                </p>
              </div>
            </div>

            <p className="text-center text-[11px] leading-5 text-slate-400">
              Последняя проверка: {formatDateTime(lastCheckedAt)}
            </p>
          </div>
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className={cn(CARD, "overflow-hidden")}>
          <div className="border-b border-slate-100 px-5 py-5">
            <p className="text-xs font-medium text-slate-500">
              Безопасные действия
            </p>
            <h2 className="mt-1 text-base font-extrabold text-slate-950">
              Локальная очистка
            </h2>
          </div>

          <div className="space-y-3 p-5">
            <button
              type="button"
              onClick={clearLocalStorageSettings}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-4 text-left transition hover:bg-slate-50"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-600">
                <SlidersHorizontal size={18} />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Сбросить настройки страницы
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Удаляет только ключ {SETTINGS_KEY}.
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={clearLocalLog}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-4 text-left transition hover:bg-slate-50"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-100 text-rose-600">
                <Trash2 size={18} />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Очистить локальный журнал
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Не затрагивает токен авторизации и данные других разделов.
                </p>
              </div>
            </button>

            <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-800">
              <ShieldCheck size={18} className="mt-0.5 shrink-0" />
              <p className="text-xs leading-5">
                На этой странице нет операции, которая удаляет серверные файлы,
                записи сессий или пользовательские данные.
              </p>
            </div>
          </div>
        </div>

        <div className={cn(CARD, "overflow-hidden")}>
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-5">
            <div>
              <p className="text-xs font-medium text-slate-500">
                Activity log
              </p>
              <h2 className="mt-1 text-base font-extrabold text-slate-950">
                Локальные действия
              </h2>
            </div>

            <Archive size={18} className="text-slate-400" />
          </div>

          <div className="divide-y divide-slate-100 px-5">
            {logs.length ? (
              logs.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">
                      {row.action}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {row.result}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">{row.at}</p>
                  </div>

                  <LogBadge tone={row.tone} />
                </div>
              ))
            ) : (
              <div className="grid min-h-[260px] place-items-center text-center">
                <div>
                  <Info size={34} className="mx-auto text-slate-300" />
                  <p className="mt-4 text-sm font-bold text-slate-700">
                    Локальных действий пока нет
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Сохранение или сброс настроек появятся здесь
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section
        className={cn(
          CARD,
          "flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
        )}
      >
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
            <ServerOff size={18} />
          </span>

          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              Серверная статистика пока недоступна
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Для реального мониторинга нужны защищённые admin endpoints:
              объём хранилища, категории файлов, retention jobs и история
              удаления.
            </p>
          </div>
        </div>

        <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
          <CheckCircle2 size={15} className="text-emerald-500" />
          Безопасный UI-only режим
        </span>
      </section>
    </div>
  );
}
