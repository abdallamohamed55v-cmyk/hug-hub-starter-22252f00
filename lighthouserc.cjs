/** Lighthouse CI — Core Web Vitals budget enforcement. */
module.exports = {
  ci: {
    collect: {
      url: [
        "http://localhost:4173/",
        "http://localhost:4173/auth",
      ],
      startServerCommand: "bun run preview --port 4173",
      startServerReadyPattern: "Local:",
      numberOfRuns: 3,
      settings: { chromeFlags: "--no-sandbox --headless=new" },
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.8 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["warn", { minScore: 0.9 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["warn", { maxNumericValue: 300 }],
        "interactive": ["warn", { maxNumericValue: 4000 }],
      },
    },
    upload: { target: "temporary-public-storage" },
  },
};
