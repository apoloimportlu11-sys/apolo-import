import { expect, type Page } from "@playwright/test";

const COOKIE_CONSENT_KEY = "apolo_cookie_consent_v1";

export async function dismissCookiesIfPresent(page: Page) {
  const dialog = page.getByRole("dialog", { name: "Preferencias de cookies" });
  await dialog.waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
  if (await dialog.isVisible().catch(() => false)) {
    await dialog.getByRole("button", { name: "Solo necesarias" }).click();
    await expect(dialog).toBeHidden();
  }
}

export async function expectCookieBanner(page: Page) {
  await page.goto("/");
  await page.evaluate((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }, COOKIE_CONSENT_KEY);
  await page.reload();
  const dialog = page.getByRole("dialog", { name: "Preferencias de cookies" });
  await expect(dialog).toBeVisible();
  return dialog;
}
