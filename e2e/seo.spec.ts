import { test, expect } from "./fixtures";

test.describe("SEO & metadata", () => {
  test("home has title and meta description", async ({ page }) => {
    await page.goto("/");
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    expect(title.length).toBeLessThan(70);

    const desc = await page.locator('meta[name="description"]').getAttribute("content");
    if (desc) {
      expect(desc.length).toBeGreaterThan(0);
      expect(desc.length).toBeLessThan(180);
    }
  });

  test("has viewport meta for mobile", async ({ page }) => {
    await page.goto("/");
    const vp = await page.locator('meta[name="viewport"]').getAttribute("content");
    expect(vp).toContain("width=device-width");
  });

  test("html has lang attribute", async ({ page }) => {
    await page.goto("/");
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBeTruthy();
  });
});
