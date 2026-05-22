# Load Testing (k6)

سكربتات [k6](https://k6.io) لاختبار جاهزية المنصة لـ **1M+ مستخدم**.

## التشغيل المحلي

```bash
# تثبيت
brew install k6   # macOS
# أو: docker run --rm -i grafana/k6 run - <load-tests/smoke.js

# تشغيل
k6 run -e BASE_URL=https://your-app.lovable.app load-tests/smoke.js
k6 run -e BASE_URL=https://your-app.lovable.app load-tests/load.js
k6 run -e BASE_URL=https://your-app.lovable.app load-tests/stress.js
k6 run -e BASE_URL=https://your-app.lovable.app load-tests/spike.js
k6 run -e BASE_URL=https://your-app.lovable.app load-tests/soak.js
```

## السكربتات

| السكربت | الغرض | الحمل |
|---|---|---|
| `smoke.js` | sanity check بعد deploy | 1 VU × 1m |
| `load.js` | الحمل العادي المتوقع | 500 VUs × 10m |
| `stress.js` | إيجاد نقطة الانكسار | up to 5000 VUs |
| `spike.js` | قفزة مفاجئة (viral) | spike to 10000 VUs |
| `soak.js` | تسرّب ذاكرة / استنزاف موارد | 1000 VUs × 1h |

## معايير النجاح (Thresholds)

- `http_req_failed` < 1% في الحمل العادي
- `http_req_duration p(95)` < 500ms في الحمل العادي
- `http_req_duration p(99)` < 1.5s

## للوصول إلى 1M مستخدم متزامن

k6 المحلي لا يكفي. الخيارات:

1. **k6 Cloud** — `k6 cloud load-tests/load.js` (يدعم 100k+ VUs)
2. **k6 Distributed** على Kubernetes (operator رسمي)
3. **Grafana Cloud k6** مع توزيع جغرافي

## قائمة Scaling قبل اختبار حقيقي

- [ ] رفع Supabase instance size (Cloud → Advanced settings)
- [ ] فحص indexes على الجداول الساخنة (`workspaces`, `messages`, `jobs`)
- [ ] مراجعة RLS policies (تجنّب الـ joins داخل `using`)
- [ ] تفعيل connection pooler (Supavisor)
- [ ] CDN caching للأصول الثابتة
- [ ] rate limiting على edge functions
