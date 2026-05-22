# Performance Budget — Core Web Vitals

| Metric | Budget | Source of truth |
|---|---|---|
| LCP (Largest Contentful Paint) | < 2.5s | Lighthouse CI |
| CLS (Cumulative Layout Shift) | < 0.1 | Lighthouse CI |
| INP (Interaction to Next Paint) | < 200ms | Real-user monitoring |
| TBT (Total Blocking Time) | < 300ms | Lighthouse CI |
| TTI | < 4s | Lighthouse CI |
| Lighthouse Performance score | ≥ 0.8 | CI gate |

التطبيق عبر `lighthouserc.cjs` — يفشل البناء عند تجاوز الميزانية.

## نصائح
- صور: `vite-imagetools` للتحويل إلى AVIF/WebP وقت البناء.
- preload لصورة LCP.
- code-splitting افتراضي عبر React.lazy للمسارات الثقيلة.
