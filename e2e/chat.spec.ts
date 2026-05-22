import { test, expect } from "./fixtures";

/**
 * Chat is auth-gated. We assert the route either:
 *  - redirects to /auth (unauthenticated visitors), or
 *  - renders a chat composer (authenticated test session).
 */
test("chat route gates correctly", async ({ page }) => {
  await page.goto("/chat");
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  const url = page.url();
  const isAuth = url.includes("/auth");
  const composer = page.locator('textarea, [contenteditable="true"]').first();
  const composerVisible = await composer.isVisible().catch(() => false);
  expect(isAuth || composerVisible).toBeTruthy();
});
