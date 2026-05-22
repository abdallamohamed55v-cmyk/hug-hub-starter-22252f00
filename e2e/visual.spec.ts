import { test, expect } from "@playwright/test";

const pages = ["/", "/auth"];

test.describe("Visual regression", () => {
  for (const path of pages) {
    test(`snapshot ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
      // Mask volatile regions (timestamps, animated bg).
      await expect(page).toHaveScreenshot(`${path.replace(/\//g, "_") || "root"}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.02,
        animations: "disabled",
      });
    });
  }
});
