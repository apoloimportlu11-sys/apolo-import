export const ADMIN_THEME_KEY = "apolo-admin-theme";
export const ADMIN_SIDEBAR_KEY = "apolo-admin-sidebar";
export const ADMIN_THEME_EVENT = "apolo-admin-theme";

export type AdminThemeChoice = "light" | "dark" | "system";
export type AdminResolvedTheme = "light" | "dark";

export function readAdminThemeChoice(): AdminThemeChoice {
  if (typeof window === "undefined") return "light";
  try {
    const stored = localStorage.getItem(ADMIN_THEME_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // el navegador puede bloquear el almacenamiento
  }
  return "light";
}

export function resolveAdminTheme(choice: AdminThemeChoice): AdminResolvedTheme {
  if (choice === "dark") return "dark";
  if (choice === "light") return "light";
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyAdminTheme(choice: AdminThemeChoice) {
  if (typeof document === "undefined") return;
  const resolved = resolveAdminTheme(choice);
  const root = document.documentElement;
  root.classList.remove("admin-tone-light", "admin-tone-dark");
  root.classList.add(resolved === "dark" ? "admin-tone-dark" : "admin-tone-light");
  root.setAttribute("data-admin-theme", choice);
  root.style.colorScheme = resolved;
}

export function writeAdminTheme(choice: AdminThemeChoice) {
  try {
    localStorage.setItem(ADMIN_THEME_KEY, choice);
  } catch {
    // se aplica igual en esta pestaña
  }
  applyAdminTheme(choice);
  window.dispatchEvent(new CustomEvent(ADMIN_THEME_EVENT, { detail: choice }));
}

export function releaseAdminTheme() {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("admin-tone-light", "admin-tone-dark");
  root.removeAttribute("data-admin-theme");
  root.style.colorScheme = root.classList.contains("light") ? "light" : "dark";
}
