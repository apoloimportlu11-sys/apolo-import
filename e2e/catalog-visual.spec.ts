import { test, expect } from "@playwright/test";
import { dismissCookiesIfPresent } from "./helpers";

const viewports = [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
];

for (const viewport of viewports) {
  test(`catálogo ${viewport.width}px sin desborde y con fotos`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/productos");
    await dismissCookiesIfPresent(page);

    await expect(page.getByText(/producto(s)? encontrado(s)?/i)).toBeVisible({
      timeout: 45_000,
    });
    const card = page.locator("[data-catalog-card]").first();
    await expect(card).toBeVisible();
    const photo = card.locator("img").first();
    await expect(photo).toBeVisible();
    await expect
      .poll(async () => photo.evaluate((img: HTMLImageElement) => img.naturalWidth), {
        timeout: 20_000,
      })
      .toBeGreaterThan(20);

    const fits = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth <= doc.clientWidth + 1;
    });
    expect(fits).toBe(true);

    if (viewport.width <= 430) {
      const columns = await page.locator("[data-catalog-grid]").first().evaluate((el) => {
        return getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length;
      });
      expect(columns).toBe(2);
    }

    await page.locator("[data-catalog-grid]").first().evaluate((el) => {
      el.scrollIntoView({ block: "center", inline: "nearest" });
    });
    await page.screenshot({
      path: `e2e/screenshots/catalog-${viewport.width}.png`,
      fullPage: false,
    });
  });
}
