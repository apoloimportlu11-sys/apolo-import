import { test, expect } from "@playwright/test";
import { dismissCookiesIfPresent, expectCookieBanner } from "./helpers";

test.describe("Storefront smoke", () => {
  test("home carga con marca y navegación principal", async ({ page }) => {
    await page.goto("/");
    await dismissCookiesIfPresent(page);

    await expect(page).toHaveTitle(/Apolo/i);
    await expect(page.getByRole("link", { name: "Inicio" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Productos" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Contacto" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Nosotros" }).first()).toBeVisible();
  });

  test("catálogo /productos responde y muestra buscador", async ({ page }) => {
    await page.goto("/productos");
    await dismissCookiesIfPresent(page);

    await expect(page).toHaveURL(/\/productos/);
    await expect(
      page.getByPlaceholder(/Buscar por marca, nombre, viscosidad o código/i)
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "PRODUCTOS", exact: true })).toBeVisible();
  });

  test("contacto muestra formulario", async ({ page }) => {
    await page.goto("/contacto");
    await dismissCookiesIfPresent(page);

    await expect(page.getByRole("heading", { name: /Contacto/i }).first()).toBeVisible();
    await expect(page.getByPlaceholder("Tu nombre")).toBeVisible();
    await expect(page.getByPlaceholder("tu@email.com")).toBeVisible();
    await expect(page.getByRole("button", { name: /Enviar mensaje/i })).toBeVisible();
  });

  test("nosotros y legales cargan", async ({ page }) => {
    await page.goto("/nosotros");
    await dismissCookiesIfPresent(page);
    await expect(page).toHaveURL(/\/nosotros/);
    await expect(page.locator("main")).toBeVisible();

    await page.goto("/privacidad");
    await expect(page).toHaveURL(/\/privacidad/);
    await expect(page.locator("main")).toBeVisible();

    await page.goto("/cookies");
    await expect(page).toHaveURL(/\/cookies/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("banner de cookies se puede aceptar", async ({ page }) => {
    const dialog = await expectCookieBanner(page);
    await dialog.getByRole("button", { name: "Aceptar todas" }).click();
    await expect(dialog).toBeHidden();

    await page.reload();
    await expect(dialog).toBeHidden({ timeout: 5_000 });
  });
});
