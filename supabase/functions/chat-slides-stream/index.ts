// Streaming slides generation with live narrative.
// Tells the user — in their own language — what it's doing as it does it,
// then streams a final React deck JSON.
//
// SSE events:
//   data: {"type":"narrate","delta":"..."}
//   data: {"type":"phase","name":"search|outline|content|images|finalize"}
//   data: {"type":"deck","deck":{...}}
//   data: {"type":"error","message":"..."}
//   data: [DONE]

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { smartImage, quickImage } from "./imageAgent.ts";
import { postProcessDeck, pickThemeForTopic, planDeckShape } from "./deckPostProcessor.ts";
import { safeParseOutline, safeParseExpand, safeParseBrandKit, deckNeedsCritic, type BrandKit } from "./schemas.ts";
import { createJob, runInBackground, JobWriter } from "../_shared/jobs.ts";
import { getAuthUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Premium HTML templates — frontend renders these via /public/templates/{slug}/index.html.
const REACT_TEMPLATES = new Set([
  "premium-vanta-atelier", "premium-verdana-3d", "premium-iphone-aura",
  "premium-landscape-napa", "premium-yash-graphic", "premium-doc-scriptforge",
  "premium-ocean-flow", "premium-splash-genesis", "premium-ice-fashion",
  "premium-seasonal-flow", "premium-bold-3d-typo", "premium-blobs-landing",
  "premium-tech-consulting", "premium-cosmetic-laundry", "premium-forma-sofa",
  "premium-baresol", "premium-robotic-tech", "premium-ai-video-gen",
  "premium-silent-wealth", "premium-aiventraq",
  "premium-megsy", "premium-glass-pitch", "premium-cinema-3d",
]);

// Standard template IDs → premium HTML shell. Picked by visual affinity so the
// user gets a real generated deck instead of an iframe to an external builder.
const STANDARD_TO_PREMIUM: Record<string, string> = {
  "standard-pitch":     "premium-tech-consulting",
  "standard-corporate": "premium-tech-consulting",
  "standard-education": "premium-doc-scriptforge",
  "standard-creative":  "premium-yash-graphic",
  "standard-minimal":   "premium-doc-scriptforge",
  "standard-megsy":     "premium-ai-video-gen",
  "standard-axiom":     "premium-blobs-landing",
  "standard-aethon":    "premium-landscape-napa",
  "standard-solar":     "premium-robotic-tech",
  "standard-turbo-930": "premium-vanta-atelier",
};

const PALETTES: Record<string, { primary: string; accent: string; bg: string; fg: string }> = {
  "premium-vanta-atelier":   { primary: "#c9a84c", accent: "#f0d78c", bg: "#0a0a0a", fg: "#f5f0e0" },
  "premium-verdana-3d":      { primary: "#a8d63b", accent: "#5a8a5c", bg: "#0a0e08", fg: "#e8ece4" },
  "premium-iphone-aura":     { primary: "#7C9AFF", accent: "#FFB07C", bg: "#000000", fg: "#f5f5f7" },
  "premium-landscape-napa":  { primary: "#1a1714", accent: "#8a7355", bg: "#F5F0E8", fg: "#1a1714" },
  "premium-yash-graphic":    { primary: "#d94f7a", accent: "#8b5cf6", bg: "#0e0e10", fg: "#f0ece6" },
  "premium-doc-scriptforge": { primary: "#ffffff", accent: "#888888", bg: "#000000", fg: "#ffffff" },
  "premium-ocean-flow":      { primary: "#5cbdb9", accent: "#2d8a9e", bg: "#001f3f", fg: "#e8f0f8" },
  "premium-splash-genesis":  { primary: "#10b981", accent: "#73ffb8", bg: "#06070d", fg: "#e8f0e8" },
  "premium-ice-fashion":     { primary: "#e0e7ff", accent: "#a5f3fc", bg: "#000000", fg: "#ffffff" },
  "premium-seasonal-flow":   { primary: "#1a1a1a", accent: "#8a8478", bg: "#fafafa", fg: "#1a1a1a" },
  "premium-bold-3d-typo":    { primary: "#f5f5f5", accent: "#a3a3a3", bg: "#0a0a0a", fg: "#f5f5f5" },
  "premium-blobs-landing":   { primary: "#a78bfa", accent: "#f0abfc", bg: "#0e0b1f", fg: "#f8f7ff" },
  "premium-tech-consulting": { primary: "#e8edf3", accent: "#7aa7d9", bg: "#0f1b3d", fg: "#e8edf3" },
  "premium-cosmetic-laundry":{ primary: "#c45c7c", accent: "#e8a3b8", bg: "#f8e8ee", fg: "#3a1a25" },
  "premium-forma-sofa":      { primary: "#8b7355", accent: "#c9b099", bg: "#f0ebe3", fg: "#2a2018" },
  "premium-baresol":         { primary: "#7d9b76", accent: "#a8c0a0", bg: "#f5f0e8", fg: "#243024" },
  "premium-robotic-tech":    { primary: "#22d3ee", accent: "#67e8f9", bg: "#06070d", fg: "#e8f7fb" },
  "premium-ai-video-gen":    { primary: "#ec4899", accent: "#a78bfa", bg: "#0a0a1a", fg: "#f8f7ff" },
  "premium-silent-wealth":   { primary: "#0d0d0d", accent: "#6b6b6b", bg: "#f5f3ee", fg: "#0d0d0d" },
  "premium-aiventraq":       { primary: "#10b981", accent: "#34d399", bg: "#06070d", fg: "#e8f7ee" },
  "premium-megsy":           { primary: "#3b82f6", accent: "#ec4899", bg: "#08070d", fg: "#f8fafc" },
  "premium-glass-pitch":     { primary: "#3b82f6", accent: "#a855f7", bg: "#070b1f", fg: "#f8fafc" },
  "premium-cinema-3d":       { primary: "#06b6d4", accent: "#f43f5e", bg: "#000814", fg: "#ffffff" },
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY");
const PEXELS_API_KEY = Deno.env.get("PEXELS_API_KEY");
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

console.log("[chat-slides-stream] image keys present:",
  { serper: !!SERPER_API_KEY, firecrawl: !!FIRECRAWL_API_KEY, pexels: !!PEXELS_API_KEY, lovable: !!LOVABLE_API_KEY });

/* ────────────────────────────────────────────────────────── */
/* Slides AI helpers — primary: deepseek/deepseek-v4-flash    */
/* via OpenRouter (key in api_keys). Fallback: Lovable.       */
/* ────────────────────────────────────────────────────────── */

import { getRouter, ROUTER_MODELS, lovableEquivalent } from "../_shared/llm-router.ts";

const LOVABLE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function aiJson<T = unknown>(messages: Array<{ role: string; content: string }>, _model?: string): Promise<T | null> {
  const router = await getRouter();
  const primary = router
    ? { url: router.url, key: router.key, model: ROUTER_MODELS.slides }
    : null;
  const fallback = LOVABLE_API_KEY
    ? { url: LOVABLE_URL, key: LOVABLE_API_KEY, model: lovableEquivalent(ROUTER_MODELS.slides) }
    : null;
  const chain = [primary, fallback].filter(Boolean) as Array<{ url: string; key: string; model: string }>;
  if (!chain.length) throw new Error("No LLM key (router or LOVABLE_API_KEY) configured");

  for (const target of chain) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = await fetch(target.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${target.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: target.model,
          messages: [
            { role: "system", content: "Return raw JSON only. No markdown fences. No prose." },
            ...messages,
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (r.ok) {
        const d = await r.json();
        const text = d?.choices?.[0]?.message?.content as string | undefined;
        if (!text) return null;
        try { return JSON.parse(text) as T; } catch {
          const m = text.match(/\{[\s\S]*\}/);
          if (m) try { return JSON.parse(m[0]) as T; } catch { /* */ }
          return null;
        }
      }
      if (r.status !== 429 && r.status < 500) {
        console.warn("aiJson failed", target.url, r.status, (await r.text().catch(() => "")).slice(0, 200));
        break; // try next target
      }
      const wait = 800 * Math.pow(2, attempt) + Math.random() * 400;
      console.warn(`aiJson ${r.status}, retry in ${Math.round(wait)}ms (attempt ${attempt + 1})`);
      await new Promise((res) => setTimeout(res, wait));
    }
  }
  console.warn("aiJson giving up after all targets");
  return null;
}

async function streamNarrative(
  systemPrompt: string,
  userPrompt: string,
  send: (delta: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const router = await getRouter();
  const target = router
    ? { url: router.url, key: router.key, model: ROUTER_MODELS.slides }
    : LOVABLE_API_KEY
      ? { url: LOVABLE_URL, key: LOVABLE_API_KEY, model: lovableEquivalent(ROUTER_MODELS.slides) }
      : null;
  if (!target) throw new Error("No LLM key configured");
  const r = await fetch(target.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${target.key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: target.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
    }),
    signal,
  });
  if (!r.ok || !r.body) {
    console.warn("streamNarrative failed", r.status);
    return "";
  }
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return full;
      try {
        const parsed = JSON.parse(data);
        const c = parsed?.choices?.[0]?.delta?.content as string | undefined;
        if (c) { full += c; send(c); }
      } catch { /* partial */ }
    }
  }
  return full;
}

/* ────────────────────────────────────────────────────────── */
/* Web search + image search                                  */
/* ────────────────────────────────────────────────────────── */

async function serperSearch(q: string): Promise<Array<{ title: string; snippet: string; link: string }>> {
  if (!SERPER_API_KEY) return [];
  try {
    const r = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ q, num: 8 }),
    });
    if (!r.ok) return [];
    const d = await r.json();
    const list = d?.organic || [];
    return list.slice(0, 6).map((x: { title?: string; snippet?: string; link?: string }) => ({
      title: x.title || "",
      snippet: x.snippet || "",
      link: x.link || "",
    }));
  } catch { return []; }
}

async function serperImage(q: string): Promise<string | null> {
  if (!SERPER_API_KEY) return null;
  try {
    const r = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ q, num: 5, safe: "active" }),
    });
    if (!r.ok) return null;
    const d = await r.json();
    const list = d?.images;
    if (!Array.isArray(list)) return null;
    const ok = list.find((it: { imageUrl?: string; imageWidth?: number }) =>
      it?.imageUrl && it.imageUrl.startsWith("https://") && (it.imageWidth ?? 800) >= 600
    );
    return ok?.imageUrl ?? list[0]?.imageUrl ?? null;
  } catch { return null; }
}

async function pexelsImage(q: string): Promise<string | null> {
  if (!PEXELS_API_KEY) return null;
  try {
    const url = new URL("https://api.pexels.com/v1/search");
    url.searchParams.set("query", q.slice(0, 100));
    url.searchParams.set("per_page", "1");
    url.searchParams.set("orientation", "landscape");
    const r = await fetch(url.toString(), { headers: { Authorization: PEXELS_API_KEY } });
    if (!r.ok) return null;
    const d = await r.json();
    const photo = d?.photos?.[0];
    return photo?.src?.large2x || photo?.src?.large || photo?.src?.original || null;
  } catch { return null; }
}

// ── Keyless fallbacks ──────────────────────────────────────
// Openverse: free, CC-licensed image search. No API key required.
async function openverseImage(q: string): Promise<string | null> {
  try {
    const url = new URL("https://api.openverse.org/v1/images/");
    url.searchParams.set("q", q.slice(0, 100));
    url.searchParams.set("page_size", "5");
    url.searchParams.set("license_type", "all");
    url.searchParams.set("mature", "false");
    const r = await fetch(url.toString(), {
      headers: { "User-Agent": "MegsyAI-Slides/1.0 (https://megsy.ai)" },
    });
    if (!r.ok) return null;
    const d = await r.json();
    const list = d?.results;
    if (!Array.isArray(list)) return null;
    const ok = list.find((it: { url?: string; width?: number }) =>
      it?.url && it.url.startsWith("https://") && (it.width ?? 800) >= 600
    );
    return ok?.url ?? list[0]?.url ?? null;
  } catch { return null; }
}

// Wikipedia: image of the top article matching the query (great for famous topics).
async function wikipediaImage(q: string): Promise<string | null> {
  try {
    const search = new URL("https://en.wikipedia.org/w/api.php");
    search.searchParams.set("action", "query");
    search.searchParams.set("format", "json");
    search.searchParams.set("origin", "*");
    search.searchParams.set("generator", "search");
    search.searchParams.set("gsrsearch", q.slice(0, 100));
    search.searchParams.set("gsrlimit", "1");
    search.searchParams.set("prop", "pageimages");
    search.searchParams.set("piprop", "original");
    search.searchParams.set("pilicense", "any");
    const r = await fetch(search.toString());
    if (!r.ok) return null;
    const d = await r.json();
    const pages = d?.query?.pages;
    if (!pages) return null;
    const first = Object.values(pages)[0] as { original?: { source?: string } } | undefined;
    return first?.original?.source ?? null;
  } catch { return null; }
}

// LoremFlickr: always returns a themed photo from Flickr Creative Commons.
// Use as a guaranteed last resort so the slide is never blank.
function loremFlickrImage(q: string): string {
  const tag = encodeURIComponent(q.slice(0, 60).replace(/\s+/g, ","));
  return `https://loremflickr.com/1600/900/${tag}`;
}

function sanitizeQuery(q: string): string {
  return (q || "")
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, " ")
    .replace(/[\u0600-\u06FF\u0750-\u077F\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/g, " ")
    .replace(/\s+/g, " ").trim();
}

async function findImage(q: string | undefined): Promise<string | null> {
  if (!q) return null;
  const cleaned = sanitizeQuery(q);
  if (!cleaned) return null;
  const tries = [cleaned, cleaned.split(/\s+/).slice(0, 3).join(" ")]
    .filter((x, i, arr) => x && arr.indexOf(x) === i);
  for (const t of tries) {
    // Preferred (when keys available) → keyless fallbacks → last-resort themed image.
    const u =
      (await serperImage(t)) ||
      (await pexelsImage(t)) ||
      (await openverseImage(t)) ||
      (await wikipediaImage(t));
    if (u) return u;
  }
  // Guarantee a relevant-looking image so slides are never blank.
  return loremFlickrImage(cleaned);
}

/* ────────────────────────────────────────────────────────── */
/* Deck pipeline (outline → deep content → images)            */
/* ────────────────────────────────────────────────────────── */

type RawSlide = Record<string, unknown> & { type?: string; title?: string; body?: string; bullets?: string[] };

async function buildOutline(topic: string, content: string, language: string, longInputMode: boolean, requestedCount?: number): Promise<{ title?: string; subtitle?: string; language?: string; slides: RawSlide[] }> {
  const lengthRule = requestedCount && requestedCount > 0
    ? `The user EXPLICITLY requested EXACTLY ${requestedCount} slides. You MUST output exactly ${requestedCount} slides — no more, no less. First MUST be "cover", last MUST be "closing".`
    : longInputMode
      ? "The user provided substantial reference material — produce 18-35 slides that fully cover it, splitting major themes into dedicated sections."
      : "Decide optimal slide count based on topic depth: 8 for simple, 12-18 for standard, 20-30 for deep/complex topics, up to 50 for very rich subjects. Min 8, max 50.";

  const sectionRule = requestedCount && requestedCount >= 20
    ? `- Insert a "section" every 5-7 slides; include multiple "stats" and "quote" slides spread throughout.`
    : `- Insert a "section" every 4-6 slides; include at least one "stats" and one "quote" if length >= 10.`;

  const sys = `You are an AWWWARDS-level presentation designer. Output ONLY a JSON object — no markdown.
You must DESIGN this deck specifically for THIS topic — never reuse the same structure twice. Mix layouts freely, like a real magazine art director would.

Schema:
{
  "title": "deck title (in user language)",
  "subtitle": "short subtitle",
  "language": "ar|en|fr|...",
  "slides": [
    {"type":"cover","title":"...","subtitle":"...","image_query":"3-5 ENGLISH visual keywords"},
    {"type":"section","title":"section name","kicker":"01","image_query":"english keywords"},
    {"type":"content","layout":"<pick one from the 40 layout list>","variant":"<pick one of: default|glass|outline|filled|gradient|neon|paper|mono>","accent":"<pick one of: none|top|left|corner|underline|side-bar>","title":"slide title","image_query":"english keywords","focus":"1 sentence describing what this slide explores in depth"},
    {"type":"quote","focus":"who and on which sub-topic"},
    {"type":"stats","title":"...","focus":"what kind of stats"},
    {"type":"closing","title":"Thank You","subtitle":"...","cta":"..."}
  ]
}

Available layouts (40 — pick the BEST fit per slide, mix freely):
TEXT+IMAGE: "split-right" "split-left" "image-full" "image-top" "image-bottom" "image-side-card" "focus-image" "magazine-cover" "diagonal-split" "polaroid"
TEXT-ONLY: "centered" "centered-narrow" "left-aligned-hero" "right-aligned-hero" "definition" "manifesto" "poster-typo" "pull-quote" "callout"
GRID/COLUMNS: "two-col" "three-col" "four-col" "bento" "masonry-cards" "pillars" "icon-grid" "ribbon-cards"
COMPARE/CONTRAST: "comparison" "before-after" "vs-split" "table-compare"
DATA/IMPACT: "big-number" "stat-cluster" "stat-circles" "kpi-strip"
NARRATIVE: "process" "timeline" "timeline-horizontal" "numbered-list" "step-vertical" "story-rows"
MEDIA: "gallery" "image-grid-2" "image-grid-4" "carousel-strip"

Visual variants (apply via "variant" — changes card surface, borders, shadows):
- "default": clean, no boxes
- "glass": frosted glass cards with blur
- "outline": thin outlined cards, no fill
- "filled": solid muted-color cards
- "gradient": cards with subtle accent gradient
- "neon": glowing accent borders
- "paper": warm paper card with subtle shadow
- "mono": monochrome inverted block

Accent placement (apply via "accent"):
- "none": no decoration
- "top": thin accent bar above title
- "left": vertical accent bar on the left of content
- "corner": accent shape in a corner
- "underline": underline beneath the title
- "side-bar": full-height accent bar on one side of section

Rules:
- ${lengthRule}
- First slide MUST be "cover", last MUST be "closing".
${sectionRule}
- VARY aggressively: NEVER use the same layout twice in a row, NEVER same variant twice in a row. Across the deck, use AT LEAST 10 different layouts and AT LEAST 4 different variants. Make the deck feel hand-crafted.
- For "comparison","before-after","vs-split","table-compare" include "left_title","right_title","left_bullets":[…],"right_bullets":[…].
- For "process","step-vertical","numbered-list" include "steps":[{"title":"…","desc":"…"}] (3-6 items).
- For "timeline","timeline-horizontal","story-rows" include "events":[{"date":"…","title":"…","desc":"…"}] (3-7 items).
- For "gallery","image-grid-2","image-grid-4","carousel-strip","masonry-cards" include "image_queries":["…","…","…"] (2-4 english queries).
- For "big-number","stat-cluster" include "big_value" and "big_label".
- For "stat-circles","kpi-strip" include "stats":[{label,value}] (3-6 items).
- For "callout","manifesto","pull-quote","poster-typo","definition" include only "title" + short "subtitle"; no image needed.
- For "four-col","icon-grid","ribbon-cards","pillars","bento" include "bullets" with 4-6 items used as card text.
- "image_query" MUST be 3-5 visual ENGLISH keywords. NO arabic/other scripts, NO punctuation.
- Detect language from topic and put title/subtitle in THAT language.`;
  const user = `Language hint: ${language}\nTopic: ${topic}\n${content ? `Reference / user-provided material:\n${content.slice(0, 8000)}` : ""}`;
  const raw = await aiJson<unknown>([
    { role: "system", content: sys }, { role: "user", content: user },
  ]);
  const out = safeParseOutline(raw);
  if (!out) {
    console.warn("[outline] schema validation failed", typeof raw === "object" ? Object.keys(raw as object).slice(0, 5) : raw);
    // Skeleton fallback so the user never sees a 2-slide stub when AI fails.
    const target = requestedCount && requestedCount > 0 ? requestedCount : 8;
    const skeleton: RawSlide[] = [{ type: "cover", title: topic, image_query: "abstract" }];
    for (let i = 1; i < target - 1; i++) {
      skeleton.push({ type: "content", title: `${topic} — ${i}`, image_query: "abstract concept" });
    }
    skeleton.push({ type: "closing", title: "Thank You" });
    return { title: topic, language, slides: skeleton };
  }
  // Hard cap at 50 to prevent runaway costs
  const slides = out.slides.slice(0, 50) as RawSlide[];
  return { title: out.title, subtitle: out.subtitle, language: out.language || language, slides };
}

async function expandDeep(outline: { language?: string; slides: RawSlide[] }, topic: string, content: string): Promise<RawSlide[]> {
  const language = outline.language || "auto";
  const sys = `You are a senior research writer expanding a MAGAZINE-GRADE PRESENTATION outline.
Output ONLY a JSON object. Preserve EVERY field from the input outline (especially "type", "layout", "image_query", "steps", "events", "left_bullets", "right_bullets", "image_queries", "big_value", "big_label", "left_title", "right_title"). Expand textual fields with dense, specific content.

Per slide return (in addition to all outline fields, kept intact):
- "title": short, punchy, max 8 words.
- "kicker": 1-3 word UPPERCASE label (e.g. "01 · OVERVIEW").
- "subtitle": one strong sentence (10-20 words).
- "body": for content/section — 130-220 words of rich, specific facts. Cite people, products, places, dates, numbers. SKIP body for layout="big-number","callout","gallery","process","timeline","comparison" (those use their own fields).
- "bullets": for content with layout in [split-right,split-left,image-top,centered,two-col] — 5-7 bullets, each 8-18 words. Skip for other layouts.
- For layout="two-col" also fill "left_bullets" + "right_bullets" (4-6 each) if not already present.
- For layout="comparison" fill "left_title","right_title","left_bullets","right_bullets" (4-6 each).
- For layout="process" fill "steps":[{title,desc}] with 3-6 entries, desc 12-25 words.
- For layout="timeline" fill "events":[{date,title,desc}] with 3-7 entries, desc 12-25 words.
- For layout="big-number" fill "big_value" (short like "87%","$2.4B","12×") and "big_label" (3-8 words), plus "body" 60-100 words.
- For layout="callout" provide ONLY "title" (8-15 words, manifesto-style) + short "subtitle".
- For layout="gallery" fill "image_queries":["…","…","…"] (3-4 english queries) + short "subtitle" caption.
- "stats": for stats slides — 4-6 {label,value} pairs.
- "quote": for quote slides — 18-35 word memorable quote. "attribution": plausible person+role.

Hard rules:
- Output language = ${language}.
- Use the reference material as ground truth; expand with widely-known facts when sparse.
- NEVER produce empty required fields. NEVER write filler. NEVER repeat ideas.
- Bullets and body must NOT duplicate each other.
Return JSON: { "slides": [...] } in SAME ORDER as outline.`;
  const user = `Topic: ${topic}\nOutline:\n${JSON.stringify({ slides: outline.slides }, null, 2)}\n${content ? `Reference material:\n${content.slice(0, 10000)}` : ""}`;
  const raw = await aiJson<unknown>([
    { role: "system", content: sys }, { role: "user", content: user },
  ]);
  const out = safeParseExpand(raw);
  if (out && out.slides.length > 0) {
    return outline.slides.map((o, i) => {
      const deep = (out.slides[i] || {}) as RawSlide;
      return { ...o, ...deep, image_query: (deep.image_query as string) || (o.image_query as string) };
    });
  }
  console.warn("[expand] schema validation failed, keeping outline");
  return outline.slides;
}

/* ────────────────────────────────────────────────────────── */
/* Detect Arabic / language for narrative voice               */
/* ────────────────────────────────────────────────────────── */

function detectLanguage(s: string): "ar" | "en" {
  return /[\u0600-\u06FF]/.test(s || "") ? "ar" : "en";
}

/* Parse explicit slide count requests from the user's prompt.
   Examples (AR): "اعمل 30 شريحة", "٢٥ شريحه", "خليها 40 سلايد"
   Examples (EN): "make 25 slides", "30-slide deck", "I want 20 slides" */
function parseRequestedCount(s: string): number | undefined {
  if (!s) return undefined;
  // Normalize Arabic-Indic digits to ASCII, and strip hamza variants so
  // "شرائح" / "شرايح" / "شريحة" / "شرحة" all match the same pattern.
  const normalized = s
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
    .replace(/[\u0623\u0625\u0622]/g, "\u0627")  // ا variants
    .replace(/[\u0626\u0624]/g, "")               // ئ ؤ → drop
    .replace(/[\u064B-\u0652]/g, "");             // diacritics
  // Matches: 5 slides, 5-slide, 5 شريحة, ٥ شرائح, 25 سلايد, 30 سلايدز
  const re = /(\d{1,3})\s*[-\s]?\s*(slides?|سلايد(?:ز|ات)?|شر[اي]{0,2}ح(?:ة|ه|ات)?)/i;
  const m = normalized.match(re);
  if (!m) return undefined;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 3) return undefined;
  return Math.min(50, Math.max(3, n));
}

/* ────────────────────────────────────────────────────────── */
/* Server                                                     */
/* ────────────────────────────────────────────────────────── */

type SlidesEmit = (event: Record<string, unknown>) => void | Promise<void>;

async function runSlidesPipeline(opts: {
  topic: string;
  tplId: string;
  palette: unknown;
  isLongInput: boolean;
  subject: string;
  referenceMaterial: string;
  lang: "ar" | "en";
  requestedCount?: number;
  audience?: string;
  durationMin?: number;
  brandKit?: BrandKit;
  userId?: string;
  emit: SlidesEmit;
}): Promise<{ deck: Record<string, unknown> }> {
  const { topic, tplId, palette, isLongInput, subject, referenceMaterial, lang, requestedCount, audience, durationMin, brandKit, userId, emit } = opts;
  const send = (event: Record<string, unknown>) => { void emit(event); };
  const sendNarrate = (delta: string) => send({ type: "narrate", delta });

  send({ type: "phase", name: "search" });
  const sysSearch = lang === "ar"
    ? `أنت مساعد ودود يبني عرضًا تقديميًا للمستخدم. اكتب جملة قصيرة جدًا (سطر واحد) بالعربية تخبر المستخدم أنك ستبدأ بالبحث عن الموضوع. كن طبيعيًا وحيويًا. لا تستخدم رموز ماركداون. مثال: "دعني أبحث الآن عن أم كلثوم في المصادر الموثوقة..."`
    : `You're a friendly assistant building a presentation for the user. Write ONE short natural sentence in English saying you'll start researching the topic. Conversational, no markdown. Example: "Let me dig into the latest sources on Umm Kulthum..."`;
  await streamNarrative(sysSearch, `Topic: ${subject}`, sendNarrate);
  sendNarrate("\n\n");

  const searchResults = isLongInput ? [] : await serperSearch(subject);

  send({ type: "phase", name: "findings" });
  const findingsContext = isLongInput
    ? `The user provided their own material (${topic.length} chars). Mention you'll use it as the foundation and analyze it carefully.`
    : searchResults.length
      ? `Search results:\n${searchResults.map((r, i) => `${i + 1}. ${r.title} — ${r.snippet}`).join("\n")}`
      : `No external results — rely on what you already know about "${subject}".`;
  const sysFindings = lang === "ar"
    ? `أنت تخبر المستخدم بحماس عن أهم 3 معلومات اكتشفتها للتو. اكتب فقرة قصيرة (3-5 جمل) بالعربية الفصحى الواضحة. لا ماركداون، لا تعداد نقطي، فقط نص متدفق ودود. ابدأ بكلمة مثل "ممتاز" أو "رائع" أو "وجدت معلومات مذهلة". اذكر تفاصيل حقيقية من المعلومات التالية:`
    : `You just discovered key facts. Write 3-5 flowing sentences in English sharing the most interesting things you found. Friendly, no markdown, no bullets. Start with something like "Excellent — I found some fascinating details." Use these:`;
  await streamNarrative(sysFindings, findingsContext, sendNarrate);
  sendNarrate("\n\n");

  send({ type: "phase", name: "outline" });
  const sysContinue = lang === "ar"
    ? `اكتب جملة قصيرة (سطر واحد) بالعربية تقول أنك ستكمل البحث وتبدأ في تصميم بنية العرض. مثال: "دعني أتعمق أكثر وأبدأ في رسم بنية العرض..."`
    : `Write one short sentence in English saying you'll dig deeper and start structuring the deck. Example: "Let me go deeper and start sketching the structure of the deck..."`;
  await streamNarrative(sysContinue, `Subject: ${subject}`, sendNarrate);
  sendNarrate("\n\n");

  const searchCorpus = searchResults.map(r => `${r.title}\n${r.snippet}`).join("\n\n");
  const corpus = referenceMaterial || searchCorpus;
  const outline = await buildOutline(subject, corpus, lang, isLongInput, requestedCount);

  send({ type: "phase", name: "content" });
  const sysCreating = lang === "ar"
    ? `اكتب جملة واحدة قصيرة بالعربية بحماس إبداعي تقول أنك ستبدأ الآن في كتابة محتوى العرض الكامل. مثال: "رائع! دعني أبدع الآن في كتابة كل شريحة بعمق..."`
    : `Write one short enthusiastic sentence in English saying you'll start writing every slide in depth. Example: "Now let me craft every slide with depth and detail..."`;
  await streamNarrative(sysCreating, `${outline.slides.length} slides about ${subject}`, sendNarrate);
  sendNarrate("\n\n");

  const rawDeep = await expandDeep(outline, subject, corpus);

  // Deterministic post-processor: enforces layout intelligence (anti-repeat,
  // content-to-layout matching), word budgets, density caps, deck balance,
  // and auto-splits overflow risks into Part 1/2. Zero LLM calls — saves credits.
  let deepSlides = postProcessDeck(rawDeep as Record<string, unknown>[]) as typeof rawDeep;

  // Hard-enforce explicit slide count requested by user (post-processor may
  // auto-split overflowing slides which inflates the count beyond what the
  // user asked for). Keep cover first + closing last.
  if (requestedCount && requestedCount >= 3 && deepSlides.length !== requestedCount) {
    const cover = deepSlides.find(s => s.type === "cover") || deepSlides[0];
    const closing = [...deepSlides].reverse().find(s => s.type === "closing") || deepSlides[deepSlides.length - 1];
    const middle = deepSlides.filter(s => s !== cover && s !== closing);
    const needMiddle = requestedCount - 2;
    let nextMiddle: typeof middle;
    if (middle.length >= needMiddle) {
      nextMiddle = middle.slice(0, needMiddle);
    } else {
      nextMiddle = [...middle];
      const fallback = middle[middle.length - 1] || { type: "content", title: subject } as typeof middle[number];
      while (nextMiddle.length < needMiddle) {
        nextMiddle.push({ ...fallback, title: `${(fallback as { title?: string }).title || subject} — ${nextMiddle.length + 1}` } as typeof fallback);
      }
    }
    deepSlides = [cover, ...nextMiddle, closing] as typeof deepSlides;
    console.log(`[slides] enforced exact count=${requestedCount} (was ${rawDeep.length})`);
  }

  send({ type: "phase", name: "images" });
  const sysImages = lang === "ar"
    ? `اكتب جملة قصيرة (سطر واحد) بالعربية تقول أنك تختار الصور المناسبة لكل شريحة الآن.`
    : `Write one short sentence in English saying you're hand-picking visuals for each slide.`;
  await streamNarrative(sysImages, "", sendNarrate);
  sendNarrate("\n\n");

  const slidesNeedingImage = deepSlides.filter(s => {
    const layout = (s.layout as string) || "";
    const textOnly = ["callout","manifesto","pull-quote","poster-typo","definition","quote"].includes(layout) || s.type === "quote";
    return !textOnly;
  });
  const usedUrls = new Set<string>();
  const CONCURRENCY = 2;
  for (let i = 0; i < slidesNeedingImage.length; i += CONCURRENCY) {
    const batch = slidesNeedingImage.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (s) => {
      try {
        if (!s.image) {
          const url = await smartImage(s as Parameters<typeof smartImage>[0], subject, usedUrls);
          if (url) (s as { image?: string }).image = url;
        } else {
          usedUrls.add(s.image as string);
        }
        const queries = (s as { image_queries?: string[] }).image_queries;
        if (Array.isArray(queries) && queries.length) {
          const imgs: string[] = [];
          for (const q of queries.slice(0, 4)) {
            const u = await quickImage(q, usedUrls);
            if (u) imgs.push(u);
          }
          (s as { images?: string[] }).images = imgs;
        }
      } catch (e) { console.warn("[smartImage slide]", e); }
    }));
  }

  // Critic gate — skip the review LLM call entirely when the deck has no
  // detectable issues. Saves credits on most generations.
  const shouldCritique = deckNeedsCritic(deepSlides as Array<{ title?: string; bullets?: string[]; layout?: string }>);
  if (shouldCritique) {
    send({ type: "phase", name: "review" });
    const sysReviewNarrate = lang === "ar"
      ? `اكتب جملة قصيرة بالعربية تقول أنك بتراجع العرض كله للتأكد من جودته وعدم تكرار المحتوى.`
      : `Write one short sentence in English saying you're reviewing the whole deck for quality and avoiding repetition.`;
    await streamNarrative(sysReviewNarrate, "", sendNarrate);
    sendNarrate("\n\n");
  } else {
    console.log("[review] skipped — deck passed structural checks (saves credits)");
  }

  if (shouldCritique) try {
    const reviewInput = deepSlides.map((s, i) => ({
      i,
      type: s.type,
      layout: (s as { layout?: string }).layout,
      title: s.title,
      subtitle: (s as { subtitle?: string }).subtitle,
      bullets: (s as { bullets?: string[] }).bullets?.slice(0, 4),
      has_image: !!(s as { image?: string }).image,
    }));
    const reviewSys = `You are a senior editor reviewing a presentation deck. Find ONLY real problems:
- Two slides with nearly identical titles or repetitive bullet points
- Slides whose title/content is off-topic vs the deck subject
- Bullets that just rephrase the title

Return JSON: { "fixes": [{ "i": <slide index>, "title"?: "improved title", "bullets"?: ["improved bullets"], "subtitle"?: "improved subtitle" }] }
Only include slides that NEED fixing. Empty fixes array is fine. Keep the user's language. Max 8 fixes.`;
    const reviewUser = `Deck subject: ${subject}\nLanguage: ${lang}\nSlides:\n${JSON.stringify(reviewInput, null, 1).slice(0, 12000)}`;
    const review = await aiJson<{ fixes?: Array<{ i?: number; title?: string; bullets?: string[]; subtitle?: string }> }>([
      { role: "system", content: reviewSys }, { role: "user", content: reviewUser },
    ]);
    const fixes = Array.isArray(review?.fixes) ? review!.fixes! : [];
    console.log(`[review] applying ${fixes.length} fixes`);
    for (const f of fixes) {
      const idx = Number(f.i);
      if (!Number.isFinite(idx) || idx < 0 || idx >= deepSlides.length) continue;
      const tgt = deepSlides[idx] as Record<string, unknown>;
      if (typeof f.title === "string" && f.title.trim()) tgt.title = f.title.trim();
      if (typeof f.subtitle === "string" && f.subtitle.trim()) tgt.subtitle = f.subtitle.trim();
      if (Array.isArray(f.bullets) && f.bullets.length) {
        tgt.bullets = f.bullets.filter(b => typeof b === "string" && b.trim()).slice(0, 7);
      }
    }
  } catch (e) { console.warn("[review] failed", e); }

  send({ type: "phase", name: "finalize" });
  const sysDone = lang === "ar"
    ? `اكتب جملة ختامية مبهجة (سطر واحد) بالعربية تخبر المستخدم أن العرض جاهز. اذكر عدد الشرائح ${deepSlides.length}.`
    : `Write one cheerful closing sentence in English telling the user the deck is ready. Mention ${deepSlides.length} slides.`;
  await streamNarrative(sysDone, subject, sendNarrate);

  const themeId = pickThemeForTopic(subject, outline.language || lang);
  // Auto-extract duration/audience from the prompt when caller didn't pass them.
  const autoDuration = (() => {
    if (durationMin) return durationMin;
    const m = topic.match(/(\d{1,3})\s*(?:min|minute|minutes|دقيقة|دقائق|د)/i);
    if (m) { const n = parseInt(m[1], 10); if (n >= 2 && n <= 180) return n; }
    return undefined;
  })();
  const autoAudience = (() => {
    if (audience) return audience;
    const t = topic.toLowerCase();
    if (/investor|vc|pitch|مستثمر/.test(t)) return "investors";
    if (/student|class|lecture|طلاب|طالب|محاضرة|درس/.test(t)) return "students";
    if (/team|standup|internal|فريق|اجتماع/.test(t)) return "team";
    if (/customer|client|sales|عميل|مبيعات/.test(t)) return "customers";
    return undefined;
  })();
  const deckShape = planDeckShape({ requested: requestedCount, durationMin: autoDuration, audience: autoAudience });
  const deck = {
    title: outline.title || subject,
    subtitle: (outline as { subtitle?: string }).subtitle,
    language: outline.language || lang,
    templateId: tplId,
    theme: themeId,
    densityHint: deckShape.density,
    audience: autoAudience || null,
    durationMin: autoDuration || null,
    brandKit: brandKit || null,
    palette,
    slides: deepSlides,
  };
  send({ type: "deck", deck });

  if (userId && SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await sb.rpc("deduct_credits", {
        p_user_id: userId, p_amount: 2,
        p_action_type: "slides_chat", p_description: "Slides via chat",
      });
    } catch (e) { console.warn("credit deduction failed", e); }
  }

  return { deck };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });

  const authUser = await getAuthUser(req);
  if (!authUser) {
    return new Response(JSON.stringify({ error: "auth_required" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const body = await req.json().catch(() => ({}));
  const { topic, templateId, background } = body;
  const userId = authUser.id;
  if (!topic || typeof topic !== "string") {
    return new Response(JSON.stringify({ error: "topic is required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const rawId = typeof templateId === "string" ? templateId : "";
  const mapped = STANDARD_TO_PREMIUM[rawId];
  const tplId = mapped
    ? mapped
    : (REACT_TEMPLATES.has(rawId) ? rawId : "premium-vanta-atelier");
  const palette = PALETTES[tplId];

  const isLongInput = topic.trim().length >= 400;
  const subject = isLongInput
    ? topic.split(/\n|[.!؟?]/)[0].trim().slice(0, 120) || topic.slice(0, 120)
    : topic.trim();
  const referenceMaterial = isLongInput ? topic : "";
  const lang = detectLanguage(topic);
  const requestedCount = parseRequestedCount(topic);
  const audience = typeof body.audience === "string" ? body.audience.slice(0, 60) : undefined;
  const durationMin = Number.isFinite(body.durationMin) ? Number(body.durationMin) : undefined;
  const brandKit = safeParseBrandKit(body.brandKit);

  // ── Background mode: return jobId immediately, run pipeline on server ──
  if (background === true && userId) {
    const jobId = await createJob({
      userId,
      kind: "slides",
      input: { topic, templateId: tplId },
      meta: { templateId: tplId, narrative: "", events: [] },
    });
    runInBackground(jobId, async (writer: JobWriter) => {
      const events: Array<Record<string, unknown>> = [];
      let lastMetaFlush = 0;
      const flushEvents = async (force = false) => {
        const now = Date.now();
        if (force || now - lastMetaFlush >= 700) {
          lastMetaFlush = now;
          await writer.setMeta({ templateId: tplId, events });
        }
      };
      const emit: SlidesEmit = async (event) => {
        if (event.type === "narrate" && typeof event.delta === "string") {
          await writer.appendStream(event.delta);
          return;
        }
        if (event.type === "phase") {
          await writer.setProgress(0, String(event.name ?? ""));
        }
        events.push({ ...event, ts: Date.now() });
        await flushEvents();
      };
      await writer.start({ phase: "search", status_text: "Researching..." });
      const { deck } = await runSlidesPipeline({
        topic, tplId, palette, isLongInput, subject, referenceMaterial, lang, requestedCount, audience, durationMin, brandKit, userId, emit,
      });
      await flushEvents(true);
      await writer.complete({ deck });
    });
    return new Response(JSON.stringify({ jobId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      try {
        const emit: SlidesEmit = (event) => {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(event)}\n\n`));
        };
        await runSlidesPipeline({
          topic, tplId, palette, isLongInput, subject, referenceMaterial, lang, requestedCount, audience, durationMin, brandKit, userId, emit,
        });
        controller.enqueue(enc.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        console.error("chat-slides-stream error", err);
        controller.enqueue(enc.encode(`data: ${JSON.stringify({ type: "error", message: err instanceof Error ? err.message : "Unknown error" })}\n\n`));
        controller.enqueue(enc.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
});
