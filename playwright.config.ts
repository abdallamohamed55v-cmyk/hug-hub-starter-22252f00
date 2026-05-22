import { defineConfig, devices } from "@playwright/test";

/**
 * Production-grade Playwright config.
 * - Runs against `vite preview` locally, against PLAYWRIGHT_BASE_URL in CI.
 * - Multi-browser + mobile coverage.
 * - Traces, video, screenshots on failure for debuggability.
 */
const PORT = Number(process.env.PORT ?? 4173);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["list"],
    ["junit", { outputFile: "playwright-report/results.xml" }],
  ],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 14"] } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "bun run build && bun run preview --port " + PORT,
        url: baseURL,
        timeout: 180_000,
        reuseExistingServer: !process.env.CI,
      },
});
