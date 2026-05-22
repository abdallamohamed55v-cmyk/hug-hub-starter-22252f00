import { test, expect } from "./fixtures";

const routes = ["/", "/auth"];

for (const route of routes) {
  test(`a11y — ${route} has no serious axe violations`, async ({ page, axe }) => {
    await page.goto(route);
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    const results = await axe(page).analyze();
    const serious = results.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    );
    expect(
      serious,
      serious.map((v) => `${v.id}: ${v.help}`).join("\n"),
    ).toHaveLength(0);
  });
}
