# Testing Strategy

> الهدف: جودة بدرجة Production تدعم **1M+ مستخدم متزامن**، مع جاهزية لشهادات WCAG 2.1 AA و OWASP ASVS و SOC 2 (type-I controls).

## هرم الاختبارات

```
            Smoke (prod)
         E2E + Visual + A11y
       Integration (Vitest + MSW)
     Unit (Vitest)
   Static (TS + ESLint)
```

## الأنواع المُغطّاة

| النوع | الأداة | متى يُشغّل | المالك |
|---|---|---|---|
| Static analysis | tsc, ESLint | every PR | dev |
| Unit | Vitest + RTL | every PR | dev |
| Integration | Vitest + MSW | every PR | dev |
| E2E | Playwright (chromium/firefox/webkit + mobile) | every PR | QA |
| Visual regression | Playwright snapshots | every PR | QA |
| Accessibility | @axe-core/playwright + pa11y-ci | every PR | a11y lead |
| Performance | Lighthouse CI | every PR | perf lead |
| Edge functions | Deno test | per-function PR | backend |
| Load / stress / spike / soak | k6 | nightly + pre-release | SRE |
| Security SAST | Semgrep (OWASP Top 10) | every PR | security |
| Security secrets | gitleaks | every PR | security |
| Security deps | `bun audit` | every PR | security |
| Security DAST | OWASP ZAP baseline | on `main` | security |
| Smoke (prod) | Playwright `@smoke` | post-deploy | SRE |

## أوامر سريعة

```bash
bun test                 # unit + integration
bun run test:coverage    # + تقرير coverage
bun run test:e2e         # Playwright كل المتصفحات
bun run test:e2e:ui      # Playwright UI mode
bun run test:a11y        # pa11y-ci
bun run test:lighthouse  # Lighthouse CI
bun run test:load        # k6 smoke
bun run test:security    # bun audit
```

## معايير القبول (Quality Gates)

- Lint + Typecheck: must pass
- Unit coverage: ≥ 50% (هدف Phase 2: 70%)
- E2E: 100% pass على chromium
- A11y: 0 violations بدرجة `serious` أو `critical`
- Lighthouse: Performance ≥ 0.8, A11y ≥ 0.9
- Security: 0 high/critical في `bun audit`، 0 secrets في gitleaks

## جاهزية 1M+ مستخدم

راجع [`load-tests/README.md`](../../load-tests/README.md) لقائمة scaling و سكربتات k6.

النقاط الحرجة قبل اختبار حقيقي على 1M:
1. رفع Supabase instance + connection pooler
2. CDN على الأصول الثابتة (Lovable تستخدم بالفعل)
3. rate-limiting على edge functions
4. مراجعة indexes و RLS performance
5. تشغيل soak لمدة ساعة بدون تسرب ذاكرة

## شهادات

- **WCAG 2.1 AA**: تقارير axe + pa11y محفوظة في CI artifacts، يمكن مشاركتها مع مدقق.
- **OWASP Top 10**: Semgrep policy `p/owasp-top-ten` + ZAP baseline.
- **SOC 2 type-I readiness**: ملفات CI تعمل كأدلّة (evidence) للسياسات (change management, security testing, monitoring).
