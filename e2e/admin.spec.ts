import { test, expect } from "@playwright/test";

test.describe("Admin auth gate", () => {
  test("login admin muestra formulario de acceso", async ({ page }) => {
    await page.goto("/admin-login");

    await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
    await expect(page.getByPlaceholder("tu@email.com")).toBeVisible();
    await expect(page.getByPlaceholder("Tu contraseña")).toBeVisible();
    await expect(page.getByRole("button", { name: "Ingresar", exact: true })).toBeVisible();
  });

  test("ruta /admin sin sesión redirige o pide login", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("domcontentloaded");

    const url = page.url();
    const onLogin = /admin-login/i.test(url);
    const hasLoginForm = await page.getByPlaceholder("tu@email.com").isVisible().catch(() => false);
    const blockedCopy = await page
      .getByText(/iniciar sesi[oó]n|acceso|no autorizado/i)
      .first()
      .isVisible()
      .catch(() => false);

    expect(onLogin || hasLoginForm || blockedCopy).toBeTruthy();
  });
});
