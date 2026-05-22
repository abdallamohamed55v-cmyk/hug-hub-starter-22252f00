import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    css: false,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**", "load-tests/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "src/test/**",
        "src/main.tsx",
        "src/vite-env.d.ts",
        "src/integrations/supabase/types.ts",
        "src/**/*.generated.*",
        "src/components/ui/**",
      ],
      thresholds: {
        // Baseline reflecting current Phase-1 reality.
        // Phase-2 target: lines 50, branches 60, funcs 45.
        lines: 0.5,
        functions: 5,
        branches: 20,
        statements: 0.5,
      },
    },
  },
});
