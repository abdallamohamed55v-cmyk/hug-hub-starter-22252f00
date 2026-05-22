# WCAG 2.1 AA Compliance

## الأدوات
- `@axe-core/playwright` يفحص داخل سيناريوهات E2E (`e2e/a11y.spec.ts`).
- `pa11y-ci` يفحص الصفحات بعد build (`.pa11yci.json`).

## معايير القبول
- 0 violations بدرجة `serious` أو `critical`.
- منع contrast pitfalls (انظر `<a11y>` guideline في design system).
- جميع الأزرار icon-only لها `aria-label`.
- صفحة واحدة `<main>` لكل route، `<h1>` واحد بحد أقصى.

## كيف تستخرج تقرير للمدقق
1. شغّل CI workflow `Quality Gates`.
2. حمّل artifact `playwright-report-*` — يحتوي على نتائج axe المفصّلة.
3. شغّل محلياً: `bunx pa11y-ci --config .pa11yci.json --reporter json > pa11y-report.json`.
