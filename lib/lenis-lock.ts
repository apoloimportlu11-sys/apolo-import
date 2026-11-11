export const LENIS_LOCK_EVENT = "apolo:lenis-lock";

export function setLenisLocked(locked: boolean) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(LENIS_LOCK_EVENT, { detail: { locked } }));
}

export function scrollCatalogIntoView(el: HTMLElement) {
  const root = document.documentElement;
  const header =
    parseFloat(getComputedStyle(root).getPropertyValue("--site-header-height")) || 96;
  const toolbar =
    parseFloat(getComputedStyle(root).getPropertyValue("--catalog-toolbar-height")) || 0;
  const y = el.getBoundingClientRect().top + window.scrollY - header - toolbar - 12;
  const lenis = (window as Window & { __apoloLenis?: { scrollTo: (v: number, opts?: { duration?: number }) => void } }).__apoloLenis;
  if (lenis?.scrollTo) {
    lenis.scrollTo(Math.max(0, y), { duration: 0.55 });
    return;
  }
  window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
}
