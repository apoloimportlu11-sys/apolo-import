"use client";

import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/next";
import { readCookieConsent, type CookieConsentState } from "@/lib/cookie-consent";

/** Carga Vercel Analytics solo si el visitante aceptó cookies de medición. */
export default function ConsentAnalytics() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const sync = () => {
      const consent = readCookieConsent();
      setAllowed(Boolean(consent?.analytics));
    };
    sync();
    const onConsent = (event: Event) => {
      const detail = (event as CustomEvent<CookieConsentState>).detail;
      setAllowed(Boolean(detail?.analytics));
    };
    window.addEventListener("apolo:cookie-consent", onConsent);
    return () => window.removeEventListener("apolo:cookie-consent", onConsent);
  }, []);

  if (!allowed) return null;
  return <Analytics />;
}
