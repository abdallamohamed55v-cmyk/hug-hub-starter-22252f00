# OWASP Top 10 — Mapping

| Risk | Control في المشروع |
|---|---|
| A01 Broken Access Control | RLS على كل جدول Supabase + جدول `user_roles` مع `has_role()` security-definer function |
| A02 Cryptographic Failures | TLS عبر Lovable/Supabase، secrets في Supabase Vault (لا تُلتزم في git) |
| A03 Injection | استعلامات parameterized عبر `@supabase/supabase-js`، لا concatenation |
| A04 Insecure Design | code review + threat modeling في ملفات `docs/testing/` |
| A05 Security Misconfiguration | Semgrep + `bun audit` + ZAP baseline في CI |
| A06 Vulnerable Components | `bun audit` على كل PR، Dependabot موصى به |
| A07 Identification & Auth Failures | Supabase Auth + email verification + (اختياري) MFA |
| A08 Software & Data Integrity | lockfile مُلتزم، CI builds reproducible |
| A09 Logging & Monitoring Failures | Supabase logs + edge function logs + analytics |
| A10 SSRF | تجنّب fetch لـ URLs مُدخلة من المستخدم بدون allow-list |

## CI Enforcement
- Semgrep policy: `p/owasp-top-ten p/typescript p/react p/secrets`
- ZAP baseline على `main` ضد PREVIEW_URL
- gitleaks لمنع تسريب secrets
