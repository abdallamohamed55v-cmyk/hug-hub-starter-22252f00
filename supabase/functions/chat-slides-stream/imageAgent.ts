// Ultra Image Agent — Serper + Firecrawl + Pexels with Gemini Vision ranking.
//
// Pipeline per slide:
//   1. AI extracts 5 SPECIFIC queries that PRESERVE proper nouns
//      (people/places/brands). Translates Arabic names → English.
//   2. Parallel search across Serper Images, Firecrawl Search (images),
//      and Pexels. Up to 25 candidates.
//   3. Gemini 2.5 Flash Vision compares thumbnails vs slide context and
//      picks the BEST match (rejecting generic stock when a named subject exists).
//   4. Validates winner with a HEAD request before returning.

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY");
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
const PEXELS_API_KEY = Deno.env.get("PEXELS_API_KEY");

type Candidate = {
  url: string;
  source: string;
  title?: string;
  width?: number;
  height?: number;
};

const TIMEOUT_MS = 8000;

async function withTimeout<T>(p: Promise<T>, ms = TIMEOUT_MS): Promise<T | null> {
  return await Promise.race([
    p,
    new Promise<null>(res => setTimeout(() => res(null), ms)),
  ]).catch(() => null);
}

// ─── Sources ────────────────────────────────────────────────
async function searchSerper(q: string): Promise<Candidate[]> {
  if (!SERPER_API_KEY) return [];
  try {
    const r = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ q, num: 10, safe: "active" }),
    });
    if (!r.ok) { console.warn("[serper]", r.status); return []; }
    const d = await r.json();
    const list = (d?.images || []) as Array<{ imageUrl?: string; title?: string; imageWidth?: number; imageHeight?: number }>;
    return list
      .filter(it => it.imageUrl?.startsWith("https://"))
      .map(it => ({ url: it.imageUrl!, source: "serper", title: it.title, width: it.imageWidth, height: it.imageHeight }))
      .filter(c => !(c.width && c.height && (c.width < 500 || c.height < 350)))
      .filter(c => !c.url.endsWith(".svg"));
  } catch (e) { console.warn("[serper] err", e); return []; }
}

async function searchFirecrawl(q: string): Promise<Candidate[]> {
  if (!FIRECRAWL_API_KEY) return [];
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: q, limit: 10, sources: ["images"] }),
    });
    if (!r.ok) { console.warn("[firecrawl]", r.status); return []; }
    const d = await r.json();
    const list = (d?.data?.images || d?.images || []) as Array<{ imageUrl?: string; url?: string; title?: string; imageWidth?: number; imageHeight?: number }>;
    return list
      .map(it => ({
        url: (it.imageUrl || it.url || "") as string,
        source: "firecrawl",
        title: it.title,
        width: it.imageWidth,
        height: it.imageHeight,
      }))
      .filter(c => c.url.startsWith("https://") && !c.url.endsWith(".svg"))
      .filter(c => !(c.width && c.height && (c.width < 500 || c.height < 350)));
  } catch (e) { console.warn("[firecrawl] err", e); return []; }
}

async function searchPexels(q: string, orientation: "landscape" | "portrait" | "square" = "landscape"): Promise<Candidate[]> {
  if (!PEXELS_API_KEY) return [];
  try {
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", q.slice(0, 100));
    url.searchParams.set("per_page", "8");
    url.searchParams.set("orientation", orientation);
    const r = await fetch(url.toString(), { headers: { Authorization: PEXELS_API_KEY } });
    if (!r.ok) return [];
    const d = await r.json();
    const list = (d?.photos || []) as Array<{ src?: { large2x?: string; large?: string; original?: string }; alt?: string; width?: number; height?: number }>;
    return list
      .map(p => ({
        url: (p.src?.large2x || p.src?.large || p.src?.original || "") as string,
        source: "pexels",
        title: p.alt,
        width: p.width,
        height: p.height,
      }))
      .filter(c => c.url.startsWith("https://"));
  } catch { return []; }
}

/** Map a slide layout to ideal photo orientation. */
function orientationForLayout(layout?: string, type?: string): "landscape" | "portrait" | "square" {
  const l = (layout || "").toLowerCase();
  const t = (type || "").toLowerCase();
  if (t === "cover" || l === "image-full" || l === "hero" || l === "cover" || l.includes("full")) return "landscape";
  if (l === "split-left" || l === "split-right" || l === "split" || l.includes("portrait")) return "portrait";
  if (l === "gallery" || l === "grid" || l === "mosaic" || l.includes("card")) return "square";
  return "landscape";
}

// ─── AI helpers ─────────────────────────────────────────────
async function aiJSON<T>(messages: Array<{ role: string; content: unknown }>, model = "google/gemini-2.5-flash"): Promise<T | null> {
  if (!LOVABLE_API_KEY) return null;
  try {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, response_format: { type: "json_object" } }),
    });
    if (!r.ok) { console.warn("[aiJSON]", r.status); return null; }
    const d = await r.json();
    const txt = d?.choices?.[0]?.message?.content as string | undefined;
    if (!txt) return null;
    try { return JSON.parse(txt) as T; } catch {
      const m = txt.match(/\{[\s\S]*\}/);
      return m ? JSON.parse(m[0]) as T : null;
    }
  } catch (e) { console.warn("[aiJSON] err", e); return null; }
}

// ─── Stage 1: query generation ──────────────────────────────
type SlideCtx = { title?: string; subtitle?: string; body?: string; focus?: string; image_query?: string; type?: string; layout?: string };

async function generateQueries(slide: SlideCtx, topic: string): Promise<{ queries: string[]; subject: string }> {
  const ctx = [slide.title, slide.subtitle, slide.focus, slide.body?.slice(0, 500)]
    .filter(Boolean).join(" — ");

  const sys = `You are an image search expert. Given a slide context, produce 5 SPECIFIC English image-search queries.

CRITICAL RULES:
1. PRESERVE proper nouns — names of people, places, brands, products, events, teams.
2. If the deck topic or slide mentions a SPECIFIC PERSON (e.g. "محمد صلاح" → "Mohamed Salah", "ستيف جوبز" → "Steve Jobs"), EVERY query MUST include that person's full English name. NEVER replace a named person with a generic role like "a football player" or "a CEO" — that produces wrong images.
3. Translate Arabic / other-script names to their standard English spelling.
4. Vary the angle but keep the subject anchored:
   - Query 1: subject + main context (e.g. "Mohamed Salah Liverpool celebration")
   - Query 2: subject + specific moment/achievement (e.g. "Mohamed Salah Champions League goal")
   - Query 3: subject + portrait/close-up (e.g. "Mohamed Salah portrait Egypt")
   - Query 4: subject + scene/environment (e.g. "Mohamed Salah Anfield stadium")
   - Query 5: subject + alternate angle (e.g. "Mohamed Salah training")
5. If NO named subject exists, produce concrete visual queries about the slide's actual topic — never generic stock-photo phrases unless that IS the topic.
6. 3-7 words per query. English only. No punctuation, no quotes.

Return JSON: { "subject": "<main named English subject, or empty string>", "queries": ["q1","q2","q3","q4","q5"] }`;

  const user = `Deck topic: ${topic}\nSlide title: ${slide.title || ""}\nSlide focus: ${slide.focus || ""}\nSlide details: ${ctx}\nOriginal query hint: ${slide.image_query || ""}`;

  const out = await aiJSON<{ subject?: string; queries?: string[] }>([
    { role: "system", content: sys }, { role: "user", content: user },
  ]);

  const qs = (out?.queries || [])
    .map(q => (q || "").trim().replace(/["']/g, "").replace(/\s+/g, " "))
    .filter(q => q.length >= 3 && q.length <= 120);

  if (qs.length >= 2) return { queries: qs.slice(0, 5), subject: (out?.subject || "").trim() };

  const base = (slide.image_query || slide.title || topic).trim();
  return { queries: base ? [base] : [], subject: "" };
}

// ─── Stage 2: gather candidates ─────────────────────────────
async function gatherCandidates(queries: string[], orientation: "landscape" | "portrait" | "square" = "landscape"): Promise<Candidate[]> {
  const tasks: Array<Promise<Candidate[] | null>> = [];
  for (const q of queries) {
    tasks.push(withTimeout(searchSerper(q)));
    tasks.push(withTimeout(searchFirecrawl(q)));
    tasks.push(withTimeout(searchPexels(q, orientation)));
  }
  const results = await Promise.all(tasks);
  const all: Candidate[] = [];
  for (const r of results) if (r) all.push(...r);

  const seen = new Set<string>();
  const dedup = all.filter(c => {
    if (seen.has(c.url)) return false;
    seen.add(c.url);
    return true;
  });

  // Interleave by source for diversity
  const bySource: Record<string, Candidate[]> = {};
  for (const c of dedup) (bySource[c.source] ||= []).push(c);
  const order = ["serper", "firecrawl", "pexels"];
  const out: Candidate[] = [];
  let added = true;
  while (added && out.length < 25) {
    added = false;
    for (const s of order) {
      const arr = bySource[s];
      if (arr?.length) {
        out.push(arr.shift()!);
        added = true;
        if (out.length >= 25) break;
      }
    }
  }
  return out;
}

// ─── Stage 3: validate URL reachability ─────────────────────
async function isReachable(url: string): Promise<boolean> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 4000);
    const r = await fetch(url, { method: "HEAD", signal: ctl.signal, redirect: "follow" });
    clearTimeout(t);
    if (!r.ok) return false;
    const ct = r.headers.get("content-type") || "";
    return ct.startsWith("image/");
  } catch {
    return false;
  }
}

// ─── Stage 4: vision-based selection ────────────────────────
async function pickBestWithVision(slide: SlideCtx, topic: string, subject: string, candidates: Candidate[]): Promise<number> {
  if (!LOVABLE_API_KEY || candidates.length === 0) return 0;
  if (candidates.length === 1) return 0;

  const ctx = [slide.title, slide.subtitle, slide.focus, slide.body?.slice(0, 300)]
    .filter(Boolean).join(" — ");

  const subjectRule = subject
    ? `\n\nCRITICAL: This slide is specifically about "${subject}". REJECT any image that does NOT clearly show "${subject}" — generic photos of the same category (e.g. random football players when the subject is Mohamed Salah) are WRONG. Only pick an image where "${subject}" is recognisable.`
    : "";

  const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
    { type: "text", text:
`Deck topic: ${topic}
Slide context: ${ctx}${subjectRule}

Below are ${candidates.length} candidate images (indices 0 to ${candidates.length - 1}).
Pick the SINGLE image that best fits this slide.
Reject: text-heavy infographics, watermarks, logos, low-quality stock, off-topic shots, screenshots of websites${subject ? `, photos that do NOT show ${subject}` : ""}.
Prefer: high-quality real photographs with the correct subject and strong composition.
Return JSON: { "best_index": <number>, "reason": "<10 words max>" }` },
  ];
  for (const c of candidates) content.push({ type: "image_url", image_url: { url: c.url } });

  const out = await aiJSON<{ best_index?: number; reason?: string }>([
    { role: "user", content: content as unknown as string },
  ], "google/gemini-2.5-flash");

  console.log("[vision] picked", out?.best_index, "reason:", out?.reason);
  const idx = Number(out?.best_index ?? 0);
  if (!Number.isFinite(idx) || idx < 0 || idx >= candidates.length) return 0;
  return idx;
}

// ─── Public orchestrator ────────────────────────────────────
export async function smartImage(
  slide: SlideCtx,
  topic: string,
  usedUrls?: Set<string>,
): Promise<string | null> {
  try {
    const { queries, subject } = await generateQueries(slide, topic);
    if (queries.length === 0) return null;
    console.log("[smartImage] subject:", subject, "queries:", queries);

    const orientation = orientationForLayout(slide.layout, slide.type);
    const candidates = await gatherCandidates(queries, orientation);
    console.log(`[smartImage] gathered ${candidates.length} candidates`);
    if (candidates.length === 0) return null;

    // Drop already-used URLs (dedup across the whole deck) before validation.
    const fresh = usedUrls && usedUrls.size > 0
      ? candidates.filter(c => !usedUrls.has(c.url))
      : candidates;
    const workingSet = fresh.length >= 3 ? fresh : candidates;

    // Validate top 15 in parallel; drop unreachable.
    const top = workingSet.slice(0, 15);
    const reach = await Promise.all(top.map(c => withTimeout(isReachable(c.url), 4500)));
    const valid = top.filter((_, i) => reach[i] === true);
    const pool = valid.length >= 3 ? valid : top;

    const best = await pickBestWithVision(slide, topic, subject, pool);
    const picked = pool[best]?.url || pool[0].url;
    if (picked && usedUrls) usedUrls.add(picked);
    return picked;
  } catch (e) {
    console.warn("[smartImage] failed", e);
    return null;
  }
}

// Lightweight variant for gallery sub-images
export async function quickImage(query: string, usedUrls?: Set<string>): Promise<string | null> {
  const q = (query || "").trim();
  if (!q) return null;
  const [serp, fire, pex] = await Promise.all([
    withTimeout(searchSerper(q)),
    withTimeout(searchFirecrawl(q)),
    withTimeout(searchPexels(q)),
  ]);
  const all = [...(serp || []), ...(fire || []), ...(pex || [])];
  const pick = all.find(c => !usedUrls || !usedUrls.has(c.url))?.url || all[0]?.url || null;
  if (pick && usedUrls) usedUrls.add(pick);
  return pick;
}
