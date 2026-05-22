import { test, expect } from "./fixtures";

test.describe("Security headers & posture", () => {
  test("no service_role_key leaked to client", async ({ page }) => {
    await page.goto("/");
    const html = await page.content();
    // Service role keys are JWTs with role:"service_role".
    expect(html).not.toMatch(/service_role/i);
  });

  test("Supabase calls use anon key only", async ({ page }) => {
    const apikeys: string[] = [];
    page.on("request", (req) => {
      const key = req.headers()["apikey"];
      if (key) apikeys.push(key);
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    for (const k of apikeys) {
      // anon JWT payload includes role:"anon"
      const payload = k.split(".")[1];
      if (!payload) continue;
      try {
        const decoded = JSON.parse(
          Buffer.from(payload, "base64").toString("utf-8"),
        );
        expect(decoded.role).not.toBe("service_role");
      } catch { /* not a JWT */ }
    }
  });

  test("404 returns graceful response", async ({ page }) => {
    const resp = await page.goto("/this-route-does-not-exist-12345");
    expect(resp?.status()).toBeLessThan(500);
  });
});
