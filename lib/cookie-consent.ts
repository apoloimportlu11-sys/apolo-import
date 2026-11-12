export const COOKIE_CONSENT_KEY = "apolo_cookie_consent_v1";

export type CookieConsentState = {
  necessary: true;
  analytics: boolean;
  updatedAt: string;
};

export const DEFAULT_CONSENT: CookieConsentState = {
  necessary: true,
  analytics: false,
  updatedAt: "",
};

export function readCookieConsent(): CookieConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsentState>;
    if (typeof parsed.analytics !== "boolean") return null;
    return {
      necessary: true,
      analytics: parsed.analytics,
      updatedAt: String(parsed.updatedAt || ""),
    };
  } catch {
    return null;
  }
}

export function writeCookieConsent(analytics: boolean): CookieConsentState {
  const next: CookieConsentState = {
    necessary: true,
    analytics,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("apolo:cookie-consent", { detail: next }));
  }
  return next;
}
