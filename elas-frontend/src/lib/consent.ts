const STORAGE_KEY = "elas_consent_given";

export function readConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "1";
  } catch {
    return false;
  }
}

export function writeConsent(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (value) {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: value ? "1" : null }));
  } catch {
    // ignore quota / access errors
  }
}

