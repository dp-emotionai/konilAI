"use client";

import { useEffect, useRef, useState } from "react";
import {
    Activity,
    CheckCircle2,
    CheckSquare,
    MonitorUp,
    ShieldCheck,
    ShieldX,
    Sparkles,
    X,
} from "lucide-react";

import CameraCheck from "@/components/session/CameraCheck";
import ConsentModal from "@/components/consent/ConsentModal";
import { useUI } from "@/components/layout/Providers";
import Button from "@/components/ui/Button";
import { getConsentStatus, updateConsentStatus } from "@/lib/api/consent";
import { getMlApiBaseUrl } from "@/lib/api/ml";
import { recordSessionConsent } from "@/lib/api/student";
import { cn } from "@/lib/cn";
import { writeConsent } from "@/lib/consent";

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

function PreparationStepper({
                                step,
                                canOpenStep2,
                                onStepChange,
                            }: {
    step: 1 | 2;
    canOpenStep2: boolean;
    onStepChange: (step: 1 | 2) => void;
}) {
    return (
        <div className="mx-auto flex w-full max-w-[190px] items-center">
            <button
                type="button"
                onClick={() => onStepChange(1)}
                aria-label="Открыть шаг 1"
                aria-current={step === 1 ? "step" : undefined}
                className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[11px] font-bold transition-all duration-300",
                    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200",
                    step === 1
                        ? "border-[#7448FF] bg-[#7448FF] text-white shadow-[0_7px_18px_rgba(116,72,255,0.28)]"
                        : "border-[#7448FF] bg-[#7448FF] text-white hover:scale-105"
                )}
            >
                {canOpenStep2 ? <CheckCircle2 size={15} /> : 1}
            </button>

            <div className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-slate-200">
                <div
                    className={cn(
                        "absolute inset-y-0 left-0 rounded-full bg-[#7448FF] transition-all duration-300",
                        canOpenStep2 ? "w-full" : "w-0"
                    )}
                />
            </div>

            <button
                type="button"
                onClick={() => {
                    if (canOpenStep2) onStepChange(2);
                }}
                disabled={!canOpenStep2}
                aria-label="Открыть шаг 2"
                aria-current={step === 2 ? "step" : undefined}
                title={canOpenStep2 ? "Открыть проверку камеры" : "Сначала подтвердите согласие"}
                className={cn(
                    "grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[11px] font-bold transition-all duration-300",
                    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200",
                    step === 2
                        ? "border-[#7448FF] bg-[#7448FF] text-white shadow-[0_7px_18px_rgba(116,72,255,0.28)]"
                        : canOpenStep2
                            ? "cursor-pointer border-violet-200 bg-white text-[#7448FF] hover:scale-105 hover:border-[#7448FF]"
                            : "cursor-not-allowed border-slate-200 bg-white text-slate-400 opacity-70"
                )}
            >
                2
            </button>
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
    const onCloseRef = useRef(onClose);
    const consentUpdatingRef = useRef(false);
    const consentModalOpenRef = useRef(false);

    const [step, setStep] = useState<1 | 2>(1);
    const [consentModalOpen, setConsentModalOpen] = useState(false);
    const [consentUpdating, setConsentUpdating] = useState(false);
    const [consentStatusLoading, setConsentStatusLoading] = useState(false);
    const [consentActionError, setConsentActionError] = useState<string | null>(null);

    const sessionId = session?.id ?? null;
    const canOpenStep2 = state.consent;
    const mlApiAvailable = Boolean(getMlApiBaseUrl());

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        consentUpdatingRef.current = consentUpdating;
    }, [consentUpdating]);

    useEffect(() => {
        consentModalOpenRef.current = consentModalOpen;
    }, [consentModalOpen]);

    useEffect(() => {
        if (!open || !sessionId) return;

        const safeSessionId = sessionId;
        const controller = new AbortController();
        let active = true;

        setConsentModalOpen(false);
        setConsentActionError(null);
        setConsentStatusLoading(true);

        async function loadConsentState() {
            try {
                const consentStatus = await getConsentStatus(controller.signal);
                if (!active) return;

                setConsent(consentStatus.hasConsent);
                writeConsent(consentStatus.hasConsent);

                if (consentStatus.hasConsent) {
                    try {
                        await recordSessionConsent(safeSessionId);
                    } catch (sessionConsentError) {
                        console.warn("TEACHER SESSION CONSENT AUDIT SYNC FAILED", sessionConsentError);
                    }
                }

                if (!active) return;
                setStep(consentStatus.hasConsent ? 2 : 1);
            } catch (error) {
                if (error instanceof DOMException && error.name === "AbortError") return;

                console.error("TEACHER PREPARATION CONSENT LOAD FAILED", error);
                if (!active) return;
                setConsentActionError(
                    error instanceof Error ? error.message : "Не удалось загрузить статус согласия"
                );
                setStep(state.consent ? 2 : 1);
            } finally {
                if (active) setConsentStatusLoading(false);
            }
        }

        void loadConsentState();

        return () => {
            active = false;
            controller.abort();
        };
    }, [open, sessionId, setConsent, state.consent]);

    useEffect(() => {
        if (!open || consentStatusLoading) return;
        if (!canOpenStep2 && step === 2) setStep(1);
    }, [canOpenStep2, consentStatusLoading, open, step]);

    useEffect(() => {
        if (!open) return;

        const previousOverflow = document.body.style.overflow;
        previousBodyOverflowRef.current = previousOverflow;
        document.body.style.overflow = "hidden";

        const handleKeyDown = (event: KeyboardEvent) => {
            if (
                event.key === "Escape" &&
                !consentUpdatingRef.current &&
                !consentModalOpenRef.current
            ) {
                document.body.style.overflow = previousOverflow;
                onCloseRef.current();
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [open]);

    if (!open || !session) return null;

    const restoreBodyScroll = () => {
        document.body.style.overflow = previousBodyOverflowRef.current;
    };

    const close = () => {
        setConsentModalOpen(false);
        restoreBodyScroll();
        onCloseRef.current();
    };

    const handleAcceptConsent = async () => {
        if (consentUpdating) return;

        try {
            setConsentUpdating(true);
            setConsentActionError(null);

            const consentStatus = await updateConsentStatus(true);

            try {
                await recordSessionConsent(session.id);
            } catch (sessionConsentError) {
                console.warn("TEACHER SESSION CONSENT AUDIT SAVE FAILED", sessionConsentError);
            }

            setConsent(consentStatus.hasConsent);
            writeConsent(consentStatus.hasConsent);
            setConsentModalOpen(false);

            if (consentStatus.hasConsent) setStep(2);
        } catch (error) {
            console.error("TEACHER SESSION CONSENT SAVE FAILED", error);
            setConsentActionError(
                error instanceof Error ? error.message : "Не удалось сохранить согласие"
            );
        } finally {
            setConsentUpdating(false);
        }
    };

    const handleRevokeConsent = async () => {
        if (consentUpdating) return;

        const confirmed = window.confirm(
            "Вы действительно хотите отозвать согласие на анализ эмоций?"
        );

        if (!confirmed) return;

        try {
            setConsentUpdating(true);
            setConsentActionError(null);

            const status = await updateConsentStatus(false);
            setConsent(status.hasConsent);
            writeConsent(status.hasConsent);
            setConsentModalOpen(false);
            setStep(1);
        } catch (error) {
            console.error("TEACHER SESSION CONSENT REVOKE FAILED", error);
            setConsentActionError(
                error instanceof Error ? error.message : "Не удалось отозвать согласие"
            );
        } finally {
            setConsentUpdating(false);
        }
    };

    return (
        <>
            <div
                className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/55 px-3 py-4 backdrop-blur-[3px] sm:px-5 sm:py-7"
                role="presentation"
                onMouseDown={(event) => {
                    if (
                        event.currentTarget === event.target &&
                        !consentUpdating &&
                        !consentModalOpen
                    ) {
                        close();
                    }
                }}
            >
                <div className="flex min-h-full items-center justify-center">
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="teacher-session-preparation-title"
                        className={cn(
                            "relative w-full overflow-hidden border border-white/70 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.30)]",
                            step === 1 ? "max-w-[720px] rounded-[28px]" : "max-w-[980px] rounded-[30px]"
                        )}
                    >
                        <div className="pointer-events-none absolute -left-24 -top-28 h-64 w-64 rounded-full bg-purple-100/70 blur-3xl" />
                        <div className="pointer-events-none absolute -right-24 top-1/3 h-64 w-64 rounded-full bg-indigo-100/60 blur-3xl" />

                        <div className="relative border-b border-slate-100 px-5 pb-5 pt-5 sm:px-7 sm:pb-6 sm:pt-6">
                            <div className="flex items-center justify-between gap-4">
                                <div
                                    id="teacher-session-preparation-title"
                                    className="text-[16px] font-extrabold tracking-[-0.01em] text-slate-900"
                                >
                                    Подготовка (согласие и камера)
                                </div>
                                <button
                                    type="button"
                                    onClick={close}
                                    aria-label="Закрыть"
                                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                                    disabled={consentUpdating || consentModalOpen}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[110px_minmax(0,1fr)_110px]">
                                <div className="text-xs font-semibold text-slate-500">Шаг {step}</div>
                                <PreparationStepper
                                    step={step}
                                    canOpenStep2={canOpenStep2}
                                    onStepChange={setStep}
                                />
                                <div className="hidden sm:block" />
                            </div>
                        </div>

                        <div className="relative px-5 py-6 sm:px-7 sm:py-7">
                            {consentStatusLoading ? (
                                <div className="flex min-h-[280px] items-center justify-center text-sm font-semibold text-slate-500">
                                    Проверяем сохранённое согласие...
                                </div>
                            ) : step === 1 ? (
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

                                        {consentActionError && (
                                            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                                {consentActionError}
                                            </div>
                                        )}

                                        <Button
                                            type="button"
                                            onClick={() => {
                                                setConsentActionError(null);

                                                if (state.consent) {
                                                    void handleRevokeConsent();
                                                    return;
                                                }

                                                setConsentModalOpen(true);
                                            }}
                                            disabled={consentUpdating || consentStatusLoading}
                                            className={cn(
                                                "mt-5 h-11 w-full gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
                                                state.consent
                                                    ? "border border-red-200 bg-red-50 text-red-600 shadow-none hover:bg-red-100"
                                                    : "border-none bg-[#7448FF] text-white shadow-[0_12px_28px_rgba(116,72,255,0.28)] hover:bg-[#6538f5]"
                                            )}
                                        >
                                            {state.consent ? <ShieldX size={18} /> : <ShieldCheck size={18} />}
                                            {consentStatusLoading
                                                ? "Проверяем согласие..."
                                                : consentUpdating
                                                    ? "Обновляем согласие..."
                                                    : state.consent
                                                        ? "Отозвать согласие"
                                                        : "Подтвердить согласие"}
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
                                                Настройте свет и положение лица, затем нажмите «Начать». Чтобы изменить согласие, нажмите на Шаг 1 сверху.
                                            </div>
                                        </div>
                                    </div>

                                    <CameraCheck
                                        variant="modal"
                                        onStart={() => {
                                            setConsentModalOpen(false);
                                            restoreBodyScroll();
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

            <ConsentModal
                open={consentModalOpen}
                saving={consentUpdating}
                hasConsent={state.consent}
                error={consentActionError}
                onClose={() => setConsentModalOpen(false)}
                onContinueWithoutAnalysis={() => setConsentModalOpen(false)}
                onAccept={() => void handleAcceptConsent()}
                onRevoke={() => void handleRevokeConsent()}
            />
        </>
    );
}
