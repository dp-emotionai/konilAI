import { api, getApiBaseUrl, hasAuth } from "./client";

export type ConsentStatus = {
    hasConsent: boolean;
    consentedAt: string | null;
};

export async function getConsentStatus(
    signal?: AbortSignal
): Promise<ConsentStatus> {
    if (!getApiBaseUrl() || !hasAuth()) {
        return {
            hasConsent: false,
            consentedAt: null,
        };
    }

    return api.get<ConsentStatus>("user/consent", {
        signal,
        cache: "no-store",
    });
}

export async function updateConsentStatus(
    consent: boolean
): Promise<ConsentStatus> {
    return api.patch<ConsentStatus>("user/consent", {
        consent,
    });
}