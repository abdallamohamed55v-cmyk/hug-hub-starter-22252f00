import { test, expect } from "./fixtures";

// Public marketing & legal routes — must render without auth and without errors.
const publicRoutes = [
  "/",
  "/pricing",
  "/contact",
  "/terms",
  "/privacy",
  "/refund",
  "/cookies",
  "/policies/content",
  "/trust",
  "/support",
  "/security",
  "/enterprise",
  "/legal/dmca",
  "/legal/ai-disclaimer",
  "/legal/dpa",
];

for (const route of publicRoutes) {
  test(`public route renders: ${route} @smoke`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    const resp = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(resp?.status(), `HTTP for ${route}`).toBeLessThan(500);
    await expect(page.locator("body")).toBeVisible();

    const meaningful = errors.filter(
      (e) => !/(ResizeObserver|hot-update|favicon)/i.test(e),
    );
    expect(meaningful, meaningful.join("\n")).toHaveLength(0);
  });
}

test("protected routes redirect to /auth when logged out", async ({ page }) => {
  await page.goto("/chat");
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1000);
  expect(page.url()).toMatch(/\/(auth|login|sign)/);
});
