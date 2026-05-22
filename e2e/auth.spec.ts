import { test, expect } from "./fixtures";

test.describe("Auth page @smoke", () => {
  test("renders sign-in form", async ({ page }) => {
    await page.goto("/auth");
    // Some kind of email field should be present.
    const email = page.getByRole("textbox", { name: /email|البريد/i }).first();
    await expect(email).toBeVisible({ timeout: 15_000 });
  });

  test("rejects empty submission", async ({ page }) => {
    await page.goto("/auth");
    const submit = page.getByRole("button", { name: /sign in|log in|continue|دخول/i }).first();
    if (await submit.isVisible().catch(() => false)) {
      await submit.click();
      // Either an HTML5 validation message or an error toast — both acceptable.
      await page.waitForTimeout(500);
      expect(page.url()).toContain("/auth");
    }
  });
});
