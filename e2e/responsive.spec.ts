import { test, expect } from "@playwright/test";

const viewports = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
];

for (const vp of viewports) {
  test(`responsive — home on ${vp.name} has no horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("/");
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `horizontal overflow at ${vp.name}`).toBeLessThanOrEqual(2);
  });
}
