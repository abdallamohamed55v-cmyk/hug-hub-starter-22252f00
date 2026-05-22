import { test as base, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Custom test fixture exposing an axe-core builder for WCAG checks. */
export const test = base.extend<{ axe: (page: Page) => AxeBuilder }>({
  axe: async ({}, use) => {
    await use((page: Page) =>
      new AxeBuilder({ page }).withTags([
        "wcag2a",
        "wcag2aa",
        "wcag21a",
        "wcag21aa",
        "best-practice",
      ]),
    );
  },
});

export { expect };
