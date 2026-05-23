// Parse uploaded files (PDF, DOCX, plain text) into model-readable text.
// Heavy parsers (pdfjs-dist, mammoth) are dynamically imported so they
// don't bloat the initial chat bundle — they only load when a user
// actually uploads a PDF or DOCX.

const MAX_CHARS = 30_000; // safety cap so we don't blow the model context

function clip(text: string): string {
  const cleaned = text.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").trim();
  if (cleaned.length <= MAX_CHARS) return cleaned;
  return cleaned.slice(0, MAX_CHARS) + `\n\n[... تم اقتطاع الملف عند ${MAX_CHARS} حرف ...]`;
}

let pdfjsPromise: Promise<any> | null = null;
async function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs: any = await import("pdfjs-dist");
      // @ts-ignore — Vite-friendly worker URL import
      const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      try { pdfjs.GlobalWorkerOptions.workerSrc = workerUrl; } catch { /* ignore */ }
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

async function parsePdf(file: File): Promise<string> {
  const pdfjs = await loadPdfjs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  const max = Math.min(doc.numPages, 50);
  for (let i = 1; i <= max; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it: any) => it.str).join(" ");
    pages.push(`--- Page ${i} ---\n${text}`);
  }
  return clip(pages.join("\n\n"));
}

async function parseDocx(file: File): Promise<string> {
  const mammoth: any = await import("mammoth");
  const buf = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
  return clip(value || "");
}

async function parsePlainText(file: File): Promise<string> {
  const txt = await file.text();
  return clip(txt);
}

export async function parseUploadedFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  try {
    if (name.endsWith(".pdf") || file.type === "application/pdf") {
      return await parsePdf(file);
    }
    if (
      name.endsWith(".docx") ||
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      return await parseDocx(file);
    }
    if (name.endsWith(".doc")) {
      return `[تعذّر قراءة ملف .doc القديم. الرجاء حفظه كـ .docx أو PDF.]`;
    }
    return await parsePlainText(file);
  } catch (e: any) {
    console.error("[parseUploadedFile] failed:", e);
    return `[تعذّر استخراج محتوى ${file.name}: ${e?.message || "غير معروف"}]`;
  }
}
