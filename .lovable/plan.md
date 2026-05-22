
# تحسينات Deep Research

5 تحسينات تتقسم لـ **3 طبقات**: قاعدة بيانات + Edge Function + واجهة.

---

## 1. Research Plan قبل التنفيذ (Plan Gate)

**الفكرة**: بدل ما الـ pipeline تجري كاملة من أول الرسالة، يعمل planning بس ويوقف يستنى موافقة المستخدم على الخطة والأسئلة الفرعية.

**التغييرات**:
- DB: إضافة status جديد `awaiting_approval` لـ `research_jobs`، وعمود `approved_at` (timestamptz).
- Edge function: action جديد `approve` ياخد `jobId` و(اختيارياً) `plan` معدّلة، ويستأنف الـ pipeline.
- بعد `planQueries()`، الـ pipeline تكتب الخطة وتقف عند `awaiting_approval` بدل ما تكمل searching مباشرة.
- UI: كارت جديد `ResearchPlanCard` يظهر داخل المحادثة لما `status === "awaiting_approval"`:
  - قائمة الأسئلة الفرعية قابلة للتعديل (add / edit / delete / reorder).
  - زرار **Approve & Run** + **Cancel**.

---

## 2. Live Activity Stream

**الفكرة**: بدل spinner، تيار خطوات حية بتظهر بالترتيب مع تأثير entrance.

**التغييرات**:
- الـ edge function بالفعل بتعمل `appendStep` — نحتاج بس نعرضها.
- مكوّن جديد `ResearchActivityStream` (يستهلك `job.steps` من realtime):
  - كل step بـ icon (plan / search / extract / synthesize / done) + نص + timestamp.
  - الخطوة الحالية بـ pulse animation، اللي خلصت بـ ✓ خضراء.
  - auto-scroll لآخر خطوة.
- نضيف tracking أدق في الـ edge function: لما يبدأ extract لـ URL معيّن نعمل `appendStep({type:"reading", url, host})` قبل و`{type:"read", url, ms}` بعد.

---

## 3. Progress Skeleton منظّم

**الفكرة**: بدل progress bar مفرد، عرض خطوات الـ plan كـ checklist رأسية.

**التغييرات**:
- مكوّن `ResearchProgressChecklist`:
  - مراحل ثابتة: `Planning → Searching → Reading sources → Synthesizing → Done`.
  - كل مرحلة بـ status (pending / active / complete).
  - تحت "Searching" يتفرّع لكل query من `job.plan` مع عداد نتايج.
  - تحت "Reading sources" يعرض المواقع اللي اتقرت بـ favicon.
- يحلّ محل الـ spinner الحالي في `ChatMessage` لما الـ job شغّال.

---

## 4. Export & Share (PDF / Markdown / Notion)

**الفكرة**: قائمة export منسدلة من `DeepResearchCard` وصفحة preview.

**التغييرات**:
- **Markdown**: تنزيل مباشر من المتصفح (`Blob` + `download`). لا backend.
- **PDF**: بالفعل موجود عبر `/research/preview` (html2canvas) — نوصّله لزرار جديد داخل dropdown.
- **Notion**: نسخ نسخة Notion-friendly Markdown للـ clipboard مع تعليمات + زرار "Open Notion" يفتح `https://notion.new`. (Notion API الرسمي يحتاج OAuth — نأجّله ونوفّر "Copy for Notion" دلوقتي.)
- **Public share link**: بالفعل شغّال (`share_token` في `research_reports`). نضيف زرار "Copy share link" منفصل عن زرار Share الـ native، ونضمن إن صفحة `/research/share/:token` تعرض الـ report للزوّار من غير auth.
- مكوّن جديد `ExportMenu` (popover بسيط) يتربط في الكارت وصفحة الـ preview.

---

## 5. Collapsible Sections

**الفكرة**: في صفحة preview التقرير، كل H2 يبقى accordion. أول section ("Executive Summary" أو ما يعادله) يكون مفتوح افتراضياً.

**التغييرات**:
- داخل `ResearchArticleTemplate`، نستخدم `splitIntoSections` الموجود ونلفّ كل section في `<details>` مخصّص (أو `<button>` + `motion.div` لـ animation سلس).
- أول section و"Sources" يفضلوا مفتوحين افتراضياً.
- chevron يدوّر، expand-all / collapse-all في الـ header.

---

## ترتيب التنفيذ

1. **Migration** — إضافة `awaiting_approval` status + `approved_at` لـ `research_jobs`.
2. **Edge function** — plan gate + steps أدق لـ Activity Stream.
3. **Frontend job client** — حدث `runResearchJob` يدعم `onPlanReady` callback ويستأنف بعد approve.
4. **مكوّنات جديدة** بالتوازي: `ResearchPlanCard`, `ResearchActivityStream`, `ResearchProgressChecklist`, `ExportMenu`.
5. **تعديل** `ChatMessage` لعرض الـ plan card / activity / progress حسب `job.status`.
6. **تعديل** `ResearchArticleTemplate` للأقسام القابلة للطيّ.
7. **تعديل** `DeepResearchCard` + صفحة preview لربط `ExportMenu`.

---

## تفاصيل تقنية

| البند | الملف/الكيان |
|---|---|
| Status enum جديد | `research_jobs.status` (string field — لا يحتاج enum تعديل) |
| Plan approval | `supabase/functions/deep-research-job/index.ts` |
| Realtime sub | `src/lib/deepResearchJob.ts` (موجود) |
| Plan UI | `src/components/research/ResearchPlanCard.tsx` (جديد) |
| Activity | `src/components/research/ResearchActivityStream.tsx` (جديد) |
| Progress | `src/components/research/ResearchProgressChecklist.tsx` (جديد) |
| Export menu | `src/components/research/ExportMenu.tsx` (جديد) |
| Collapsible | `src/components/research/ResearchArticleTemplate.tsx` (تعديل) |
| Integration | `src/components/chat/ChatMessage.tsx`, `src/components/chat/DeepResearchCard.tsx`, `src/pages/chat/ChatPage.tsx` |

ملاحظات:
- صفحة `/research/share/:token` لازم تكون publicly readable — يتحقق إن `research_reports` فيها RLS policy `SELECT USING (share_token IS NOT NULL)` (لو مش موجودة هنضيفها في الـ migration).
- مفيش تغيير على الـ AI provider أو الـ search provider.
- مفيش OAuth جديد للـ Notion في الـ MVP.
