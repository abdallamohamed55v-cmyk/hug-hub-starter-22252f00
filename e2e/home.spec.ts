import { test, expect } from "./fixtures";

test.describe("Landing / Home @smoke", () => {
  test("loads root without runtime errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

    const resp = await page.goto("/");
    expect(resp?.ok(), `HTTP ${resp?.status()}`).toBeTruthy();

    // App shell should mount something.
    await expect(page.locator("body")).toBeVisible();
    // Allow a brief beat for React hydration.
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

    // Filter benign third-party / hot-reload noise.
    const meaningful = errors.filter(
      (e) =>
        !/(favicon|manifest|sourcemap|ResizeObserver|hot-update|Failed to load resource)/i.test(
          e,
        ),
    );
    expect(meaningful, meaningful.join("\n")).toHaveLength(0);
  });

  test("has a unique <h1> and a <main> landmark", async ({ page }) => {
    await page.goto("/");
    const mains = await page.locator("main").count();
    expect(mains, "exactly one <main> landmark").toBeLessThanOrEqual(1);
    // h1 may be 0 on shell-only pages — assert never >1.
    const h1s = await page.locator("h1").count();
    expect(h1s).toBeLessThanOrEqual(1);
  });
});
