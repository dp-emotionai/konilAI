"use client";

import { useEffect, useRef, useState } from "react";
import {
    Activity,
    CheckCircle2,
    CheckSquare,
    MonitorUp,
    ShieldCheck,
    Sparkles,
    X,
} from "lucide-react";

import CameraCheck from "@/components/session/CameraCheck";
import { useUI } from "@/components/layout/Providers";
import Button from "@/components/ui/Button";
import { getMlApiBaseUrl } from "@/lib/api/ml";
import { cn } from "@/lib/cn";

type TeacherSessionPreview = {
    id: string;
    title: string;
    status: "upcoming" | "live" | "ended";
};

type TeacherSessionPreparationModalProps = {
    open: boolean;
    session: TeacherSessionPreview | null;
    onClose: () => void;
    onStart: (sessionId: string) => void;
};

function StatusPill({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-[18px] border border-slate-100 bg-white px-4 py-3.5 shadow-[0_8px_28px_rgba(15,23,42,0.05)]">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                {label}
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-slate-900">
                <span className="h-2 w-2 rounded-full bg-[#7448FF] shadow-[0_0_0_4px_rgba(116,72,255,0.10)]" />
                {value}
            </div>
        </div>
    );
}

function PreparationStepper({ step }: { step: 1 | 2 }) {
    return (
        <div className="mx-auto flex w-full max-w-[190px] items-center">
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#7448FF] bg-[#7448FF] text-[11px] font-bold text-white shadow-[0_7px_18px_rgba(116,72,255,0.28)]">
                {step === 2 ? <CheckCircle2 size={15} /> : 1}
            </div>
            <div className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-slate-200">
                <div
                    className={cn(
                        "absolute inset-y-0 left-0 rounded-full bg-[#7448FF] transition-all duration-300",
                        step === 2 ? "w-full" : "w-0"
                    )}
                />
            </div>
            <div
                className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[11px] font-bold transition-all duration-300",
                    step === 2
                        ? "border-[#7448FF] bg-[#7448FF] text-white shadow-[0_7px_18px_rgba(116,72,255,0.28)]"
                        : "border-violet-200 bg-white text-[#7448FF]"
                )}
            >
                2
            </div>
        </div>
    );
}

export default function TeacherSessionPreparationModal({
                                                           open,
                                                           session,
                                                           onClose,
                                                           onStart,
                                                       }: TeacherSessionPreparationModalProps) {
    const { state, setConsent } = useUI();
    const previousBodyOverflowRef = useRef("");
    const [stepOverride, setStepOverride] = useState<1 | 2 | null>(null);
    const [consentCheckedOverride, setConsentCheckedOverride] = useState<boolean | null>(null);
    const step = stepOverride ?? (state.consent ? 2 : 1);
    const consentChecked = consentCheckedOverride ?? state.consent;
    const mlApiAvailable = Boolean(getMlApiBaseUrl());

    useEffect(() => {
        if (!open) return;

        previousBodyOverflowRef.current = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousBodyOverflowRef.current;
        };
    }, [open]);


    if (!open || !session) return null;

    const close = () => {
        document.body.style.overflow = previousBodyOverflowRef.current;
        setStepOverride(null);
        setConsentCheckedOverride(null);
        onClose();
    };

    const confirmConsent = () => {
        if (!consentChecked) return;
        setConsent(true);

        try {
            localStorage.setItem("consent", "true");
        } catch {
            // localStorage may be unavailable.
        }

        setStepOverride(2);
    };

    return (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/55 px-3 py-4 backdrop-blur-[3px] sm:px-5 sm:py-7">
            <div className="flex min-h-full items-center justify-center">
                <section
                    role="dialog"
                    aria-modal="true"
                    className={cn(
                        "relative w-full overflow-hidden border border-white/70 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.30)]",
                        step === 1 ? "max-w-[720px] rounded-[28px]" : "max-w-[980px] rounded-[30px]"
                    )}
                >
                    <div className="pointer-events-none absolute -left-24 -top-28 h-64 w-64 rounded-full bg-purple-100/70 blur-3xl" />
                    <div className="pointer-events-none absolute -right-24 top-1/3 h-64 w-64 rounded-full bg-indigo-100/60 blur-3xl" />

                    <div className="relative border-b border-slate-100 px-5 pb-5 pt-5 sm:px-7 sm:pb-6 sm:pt-6">
                        <div className="flex items-center justify-between gap-4">
                            <div className="text-[16px] font-extrabold tracking-[-0.01em] text-slate-900">
                                Подготовка (согласие и камера)
                            </div>
                            <button
                                type="button"
                                onClick={close}
                                aria-label="Закрыть"
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[110px_minmax(0,1fr)_110px]">
                            <div className="text-xs font-semibold text-slate-500">Шаг {step}</div>
                            <PreparationStepper step={step} />
                            <div className="hidden sm:block" />
                        </div>
                    </div>

                    <div className="relative px-5 py-6 sm:px-7 sm:py-7">
                        {step === 1 ? (
                            <div className="grid items-center gap-7 md:grid-cols-[0.82fr_1.18fr] md:gap-10">
                                <div className="relative mx-auto grid min-h-[250px] w-full max-w-[280px] place-items-center overflow-hidden rounded-[30px] bg-[radial-gradient(circle_at_50%_40%,rgba(237,233,254,0.95),rgba(248,250,252,0.75)_58%,rgba(255,255,255,0)_72%)]">
                                    <div className="absolute left-5 top-12 h-3 w-3 rounded-full bg-[#7448FF]/20" />
                                    <div className="absolute right-8 top-8 h-2.5 w-2.5 rounded-full bg-sky-400/25" />
                                    <div className="absolute bottom-12 right-5 h-4 w-4 rounded-full bg-violet-300/25" />

                                    <div className="relative">
                                        <div className="absolute -left-16 bottom-1 grid h-24 w-20 -rotate-6 place-items-center rounded-[22px] border border-white bg-white/90 text-[#7448FF] shadow-[0_18px_45px_rgba(116,72,255,0.12)]">
                                            <CheckSquare size={38} strokeWidth={1.7} />
                                        </div>
                                        <div className="grid h-36 w-32 place-items-center rounded-[34px] border border-purple-100 bg-gradient-to-b from-[#8B6BFF] to-[#7448FF] text-white shadow-[0_24px_55px_rgba(116,72,255,0.30)]">
                                            <ShieldCheck size={58} strokeWidth={1.7} />
                                        </div>
                                        <div className="absolute -right-12 bottom-3 grid h-16 w-14 rotate-6 place-items-center rounded-[18px] border border-white bg-white/90 text-violet-500 shadow-[0_16px_38px_rgba(116,72,255,0.12)]">
                                            <Sparkles size={25} />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[12px] font-bold uppercase tracking-[0.15em] text-[#7448FF]">
                                        Шаг 1
                                    </div>
                                    <div className="mt-2 text-xl font-extrabold tracking-[-0.02em] text-slate-900 sm:text-2xl">
                                        Consent и правила приватности
                                    </div>
                                    <div className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
                                        Видео не сохраняется. Анализ идёт 1–2 кадра в секунду, в систему попадают только агрегированные метрики.
                                    </div>

                                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                        <StatusPill label="Согласие пользователя" value={state.consent ? "Принято ✅" : "Ожидает"} />
                                        <StatusPill label="ML сервис (нейросеть)" value={mlApiAvailable ? "Подключен и Готов ✅" : "Временно недоступен"} />
                                    </div>

                                    <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-[18px] border border-slate-200 bg-slate-50/70 px-4 py-3.5 text-sm font-semibold text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={consentChecked}
                                            onChange={(event) => setConsentCheckedOverride(event.target.checked)}
                                            className="mt-1 h-4 w-4 accent-[#7448FF]"
                                        />
                                        <span>Я согласен на анализ обезличенных показателей.</span>
                                    </label>

                                    <Button
                                        type="button"
                                        onClick={confirmConsent}
                                        disabled={!consentChecked}
                                        className="mt-5 h-11 w-full gap-2 rounded-xl border-none bg-[#7448FF] font-semibold text-white shadow-[0_12px_28px_rgba(116,72,255,0.28)] hover:bg-[#6538f5] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <ShieldCheck size={18} />
                                        Подтвердить согласие
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="mb-5 flex items-start gap-3">
                                    <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-500 shadow-sm">
                                        <MonitorUp size={18} />
                                    </div>
                                    <div>
                                        <div className="text-[12px] font-bold uppercase tracking-[0.15em] text-[#7448FF]">
                                            Шаг 2
                                        </div>
                                        <div className="mt-1 text-xl font-extrabold tracking-[-0.02em] text-slate-900">
                                            Проверка камеры
                                        </div>
                                        <div className="mt-1.5 text-sm font-medium text-slate-500">
                                            Настройте свет и положение лица, затем нажмите «Начать».
                                        </div>
                                    </div>
                                </div>

                                <CameraCheck
                                    variant="modal"
                                    onStart={() => {
                                        document.body.style.overflow = previousBodyOverflowRef.current;
                                        setStepOverride(null);
                                        setConsentCheckedOverride(null);
                                        onStart(session.id);
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    <div className="relative flex items-start justify-center gap-2.5 border-t border-slate-100 bg-slate-50/70 px-5 py-4 text-center sm:px-7">
                        <Activity className="mt-0.5 shrink-0 text-slate-400" size={15} />
                        <div className="max-w-3xl text-[11px] font-medium leading-relaxed text-slate-500">
                            Соединение защищено по стандарту WebRTC P2P. Видео-поток не записывается. Бэкенд получает только обезличенные числовые метрики эмоций.
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
