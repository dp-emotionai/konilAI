"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import ConsentModal from "@/components/consent/ConsentModal";
import { useUI } from "@/components/layout/Providers";

import {
    getConsentStatus,
    updateConsentStatus,
} from "@/lib/api/consent";

import { recordSessionConsent } from "@/lib/api/student";
import { writeConsent } from "@/lib/consent";
import { ROLE_HOME } from "@/lib/routes";

function getSessionId(returnUrl: string | null): string | null {
    if (!returnUrl) return null;

    const match = returnUrl.match(
        /^\/student\/session\/([^/?#]+)/
    );

    return match?.[1] ?? null;
}

export default function ConsentClient() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const { state, setConsent } = useUI();

    const [hasConsent, setHasConsent] = useState<boolean | null>(null);
    const [statusLoading, setStatusLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const returnUrl =
        searchParams.get("next") ??
        searchParams.get("returnUrl") ??
        null;

    const target =
        returnUrl && returnUrl.startsWith("/")
            ? returnUrl
            : state.role
                ? ROLE_HOME[state.role]
                : "/";

    useEffect(() => {
        const controller = new AbortController();

        async function loadStatus() {
            try {
                setStatusLoading(true);

                const status = await getConsentStatus(
                    controller.signal
                );

                setHasConsent(status.hasConsent);
                setConsent(status.hasConsent);
                writeConsent(status.hasConsent);
            } catch (error) {
                if (
                    error instanceof DOMException &&
                    error.name === "AbortError"
                ) {
                    return;
                }

                console.error(
                    "CONSENT STATUS LOAD FAILED",
                    error
                );

                setHasConsent(false);
            } finally {
                if (!controller.signal.aborted) {
                    setStatusLoading(false);
                }
            }
        }

        void loadStatus();

        return () => {
            controller.abort();
        };
    }, [setConsent]);

    const handleAccept = async () => {
        if (saving || statusLoading) return;

        try {
            setSaving(true);
            setError(null);

            const sessionId = getSessionId(returnUrl);

            let consentValue: boolean;

            if (sessionId) {
                await recordSessionConsent(sessionId);

                const status = await getConsentStatus();
                consentValue = status.hasConsent;
            } else {
                const status = await updateConsentStatus(true);
                consentValue = status.hasConsent;
            }

            setHasConsent(consentValue);
            setConsent(consentValue);
            writeConsent(consentValue);

            router.replace(target);
        } catch (error) {
            console.error("CONSENT SAVE FAILED", error);

            setError(
                error instanceof Error
                    ? error.message
                    : "Не удалось сохранить согласие"
            );
        } finally {
            setSaving(false);
        }
    };

    const handleRevoke = async () => {
        if (saving || statusLoading) return;

        const confirmed = window.confirm(
            "Вы действительно хотите отозвать согласие на анализ эмоций?"
        );

        if (!confirmed) return;

        try {
            setSaving(true);
            setError(null);

            const status = await updateConsentStatus(false);

            setHasConsent(status.hasConsent);
            setConsent(status.hasConsent);
            writeConsent(status.hasConsent);

            router.replace(target);
        } catch (error) {
            console.error("CONSENT REVOKE FAILED", error);

            setError(
                error instanceof Error
                    ? error.message
                    : "Не удалось отозвать согласие"
            );
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        if (saving) return;

        router.replace(target);
    };

    return (
        <ConsentModal
            open
            saving={saving}
            statusLoading={statusLoading}
            hasConsent={hasConsent === true}
            error={error}
            onClose={handleClose}
            onAccept={() => {
                void handleAccept();
            }}
            onRevoke={() => {
                void handleRevoke();
            }}
            onContinueWithoutAnalysis={
                hasConsent ? undefined : handleClose
            }
        />
    );
}