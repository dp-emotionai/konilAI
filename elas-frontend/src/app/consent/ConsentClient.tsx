"use client";

import { useState } from "react";
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

    const handleAccept = async () => {
        if (saving) return;

        try {
            setSaving(true);
            setError(null);

            const sessionId = getSessionId(returnUrl);

            let hasConsent = false;

            if (sessionId) {
                /*
                 * Бұл endpoint session consent пен global consent-ті
                 * backend-та бір transaction ішінде сақтайды.
                 */
                await recordSessionConsent(sessionId);

                /*
                 * Сақталғаннан кейін backend-тен нақты статусты аламыз.
                 */
                const status = await getConsentStatus();
                hasConsent = status.hasConsent;
            } else {
                /*
                 * /privacy немесе жай /consent арқылы келген кезде
                 * global consent сақталады.
                 */
                const status = await updateConsentStatus(true);
                hasConsent = status.hasConsent;
            }

            setConsent(hasConsent);
            writeConsent(hasConsent);

            router.replace(target);
            router.refresh();
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

    const handleClose = () => {
        router.replace(target);
    };

    return (
        <ConsentModal
            open
            saving={saving}
            error={error}
            onClose={handleClose}
            onContinueWithoutAnalysis={handleClose}
            onAccept={() => {
                void handleAccept();
            }}
        />
    );
}