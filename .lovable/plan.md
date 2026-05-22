# خطة اختبارات شاملة للموقع (Production-ready لـ 1M+ مستخدم)

الهدف: تجهيز المنصة لاختبارات احترافية متعددة الطبقات تُغطّي الجودة، الأداء، الأمان، الوصولية، والتحمل، وتدعم الحصول على شهادات (WCAG, SOC2-readiness, OWASP).

---

## 1. هرم الاختبارات (Testing Pyramid)

```
        /\        E2E + Visual + Smoke (Playwright)
       /  \       Integration (RTL + MSW)
      /----\      Unit (Vitest)
     /------\     Static (TS, ESLint, Type-coverage)
```

| الطبقة | الأداة | النطاق |
|---|---|---|
| Static | TypeScript, ESLint, knip | Dead code, types |
| Unit | Vitest + RTL | Components, hooks, utils |
| Integration | Vitest + MSW | API flows, stores |
| Contract | Deno Test | Edge Functions |
| E2E | Playwright | Critical user journeys |
| Visual | Playwright snapshots | UI regression |
| A11y | axe-core + Pa11y | WCAG 2.1 AA |
| Performance | Lighthouse CI | Core Web Vitals |
| Load | k6 | 1M+ users simulation |
| Security | npm audit + OWASP ZAP baseline + Semgrep | OWASP Top 10 |

---

## 2. ما سيتم إضافته

### A. تطوير Unit/Integration (Vitest)
- إضافة `@testing-library/user-event`, `msw`, `@vitest/coverage-v8`
- اختبارات لـ:
  - `src/hooks/` (الـ hooks المهمة)
  - `src/lib/` (utilities)
  - `src/integrations/supabase/` (mock client)
  - الصفحات الأساسية: auth, chat, workspace
- coverage threshold: 70% lines / 60% branches
- script: `bun test:unit`, `bun test:coverage`

### B. Edge Functions Tests (Deno)
- ملف `index.test.ts` لكل دالة حرجة:
  - `chat`, `chat-slides-stream`, `docs-generate`, `build-agent`, `generate-builder-schema`, `generate-code`
- اختبار: CORS, auth header, rate-limit response, fallback model logic
- script: `bun test:edge` (يستدعي `supabase functions serve` أو يستخدم deno test مباشرة)

### C. E2E (Playwright)
- `playwright.config.ts` (multi-browser: chromium, firefox, webkit + mobile viewports)
- سيناريوهات حرجة في `e2e/`:
  - `auth.spec.ts` — تسجيل/دخول/خروج
  - `chat.spec.ts` — إرسال رسالة واستلام رد
  - `slides.spec.ts` — توليد عرض تقديمي
  - `docs.spec.ts` — توليد مستند
  - `deep-research.spec.ts` — تشغيل بحث
  - `workspace.spec.ts` — تنقل وإنشاء مشروع
  - `billing.spec.ts` — صفحة الباقات
- traces + screenshots on failure

### D. Visual Regression
- Playwright `toHaveScreenshot()` على الصفحات الرئيسية في 3 viewports (mobile/tablet/desktop)

### E. Accessibility (WCAG 2.1 AA)
- `@axe-core/playwright` يفحص كل صفحة في E2E
- `pa11y-ci` كـ standalone scan + تقرير CI
- script: `bun test:a11y`

### F. Performance (Core Web Vitals)
- `lighthouserc.cjs` مع budgets: LCP<2.5s, CLS<0.1, INP<200ms, TBT<300ms
- يفحص: `/`, `/auth`, `/chat`, `/workspace`
- script: `bun test:lighthouse`

### G. Load Testing (1M+ users readiness)
- مجلد `load-tests/` بسكربتات k6:
  - `smoke.js` — 1 VU لدقيقة (sanity)
  - `load.js` — 500 VUs / 10 min (نسخة عادية)
  - `stress.js` — ramp-up حتى 5000 VUs (نقطة الانكسار)
  - `spike.js` — قفزة من 100→10000 VU خلال 30s
  - `soak.js` — 1000 VUs لمدة ساعة (ذاكرة/تسرّب)
- يستهدف edge functions الأساسية + `/` و `/auth`
- Thresholds: p95<500ms, error_rate<1%
- توثيق scaling checklist (Supabase instance size, DB indexes, RLS perf)

### H. Security
- `bun audit` في CI
- `semgrep --config=p/owasp-top-ten` (SAST)
- OWASP ZAP baseline scan ضد preview URL (DAST)
- Trivy لمسح الـ dockerfile/dependencies
- Secret scanning بـ gitleaks
- script: `bun test:security`

### I. Smoke Tests (Production)
- Playwright `@smoke` tagged tests تُشغّل بعد كل deploy على published URL

### J. CI Workflow (GitHub Actions)
- `.github/workflows/test.yml` بـ matrix:
  1. `lint` + `typecheck`
  2. `unit` + coverage upload
  3. `e2e` (sharded)
  4. `a11y`
  5. `lighthouse`
  6. `security` (audit + semgrep + zap baseline)
- `load.yml` (manual dispatch) يشغّل k6 cloud

### K. التقارير والشهادات (Certification Readiness)
- `docs/testing/` يحتوي:
  - `WCAG-compliance.md` — تقرير axe + Pa11y
  - `OWASP-top10.md` — mapping للـ controls
  - `performance-budget.md` — Core Web Vitals
  - `load-test-results.md` — قدرة التحمل
  - `test-strategy.md` — السياسة العامة
- جاهز لتدقيق SOC2 type-I (سياسات + أدلة تشغيل CI).

---

## 3. الأدوات المضافة (open-source بالكامل)

| الأداة | الغرض | الترخيص |
|---|---|---|
| Vitest, RTL, MSW, user-event | Unit/Integration | MIT |
| Playwright | E2E + Visual | Apache 2.0 |
| @axe-core/playwright, pa11y | A11y | MPL/MIT |
| Lighthouse CI | Performance | Apache 2.0 |
| k6 | Load | AGPL |
| Semgrep, gitleaks, Trivy, OWASP ZAP | Security | LGPL/MIT/Apache |
| knip | Dead code | ISC |

---

## 4. التنفيذ على مراحل (3 phases)

**Phase 1 (هذا الـ commit):** البنية الأساسية
- Playwright + 4 E2E سيناريوهات حرجة
- Vitest coverage + MSW + 5 اختبارات لـ hooks/utils
- axe في E2E
- k6 smoke + load scripts
- Lighthouse CI config
- npm audit + semgrep config
- GitHub Actions workflow
- `docs/testing/test-strategy.md`

**Phase 2 (لاحقاً عند الطلب):** توسعة التغطية لكل صفحة، Visual snapshots كاملة، Edge function tests كاملة.

**Phase 3:** تشغيل cloud load test فعلي + ZAP full scan + إعداد تقارير الشهادات.

---

## 5. ملاحظات تقنية

- Playwright سيستخدم `webServer: vite preview --port 4173` محلياً، و `baseURL` عبر env في CI.
- k6 يحتاج المستخدم يشغّله محلياً أو يربط حساب k6 Cloud — السكربتات جاهزة فقط.
- ZAP و Semgrep يعملان كـ GitHub Actions (لا تثبيت محلي مطلوب).
- لن نلمس أي كود تطبيق — كل التعديلات في ملفات اختبار وإعدادات وCI.

هل أبدأ بـ Phase 1؟
