import { test, expect } from "@playwright/test";
import { dismissCookiesIfPresent } from "./helpers";

test.describe("Cotización", () => {
  test("drawer de cotización abre vacío desde el header", async ({ page }) => {
    await page.goto("/");
    await dismissCookiesIfPresent(page);

    const quoteBtn = page.locator("header").getByRole("button", { name: "Cotización", exact: true });
    await expect(quoteBtn).toBeVisible();
    await quoteBtn.click();

    await expect(page.getByRole("heading", { name: "Lista de Cotización" })).toBeVisible();
    await expect(page.getByText("Tu lista está vacía")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Explorar Catálogo de Productos" })
    ).toBeVisible();
  });

  test("seguimiento por código inexistente no rompe la app", async ({ page }) => {
    await page.goto("/cotizacion/NOEXISTE999");
    await dismissCookiesIfPresent(page);

    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("body")).not.toBeEmpty();
  });
});
