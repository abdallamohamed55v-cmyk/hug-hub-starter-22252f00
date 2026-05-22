// 40-layout registry. Each layout declares its content fit + density profile so
// the LayoutPlanner can match content to layout deterministically and the
// renderer can enforce per-layout constraints.

export type LayoutId =
  // text+image
  | "split-right" | "split-left" | "image-full" | "image-top" | "image-bottom"
  | "image-side-card" | "focus-image" | "magazine-cover" | "diagonal-split" | "polaroid"
  // text-only
  | "centered" | "centered-narrow" | "left-aligned-hero" | "right-aligned-hero"
  | "definition" | "manifesto" | "poster-typo" | "pull-quote" | "callout"
  // grid/columns
  | "two-col" | "three-col" | "four-col" | "bento" | "masonry-cards"
  | "pillars" | "icon-grid" | "ribbon-cards"
  // compare
  | "comparison" | "before-after" | "vs-split" | "table-compare"
  // data
  | "big-number" | "stat-cluster" | "stat-circles" | "kpi-strip"
  // narrative
  | "process" | "timeline" | "timeline-horizontal" | "numbered-list"
  | "step-vertical" | "story-rows"
  // media
  | "gallery" | "image-grid-2" | "image-grid-4" | "carousel-strip";

export type ContentFit =
  | "title" | "section" | "text" | "text+image" | "bullets" | "stats"
  | "comparison" | "timeline" | "process" | "quote" | "gallery" | "definition";

export interface LayoutMeta {
  id: LayoutId;
  fits: ContentFit[];
  hasImage: boolean;
  hasMultiImage: boolean;
  textDensity: "low" | "medium" | "high";
  /** Max bullets that fit cleanly. */
  maxBullets: number;
  /** Max paragraph words that fit cleanly. */
  maxBodyWords: number;
}

export const LAYOUTS: LayoutMeta[] = [
  // text+image
  { id: "split-right",      fits: ["text+image", "bullets", "text"], hasImage: true,  hasMultiImage: false, textDensity: "medium", maxBullets: 5, maxBodyWords: 100 },
  { id: "split-left",       fits: ["text+image", "bullets", "text"], hasImage: true,  hasMultiImage: false, textDensity: "medium", maxBullets: 5, maxBodyWords: 100 },
  { id: "image-full",       fits: ["text+image", "title"],           hasImage: true,  hasMultiImage: false, textDensity: "low",    maxBullets: 0, maxBodyWords: 30  },
  { id: "image-top",        fits: ["text+image", "bullets"],         hasImage: true,  hasMultiImage: false, textDensity: "medium", maxBullets: 4, maxBodyWords: 80  },
  { id: "image-bottom",     fits: ["text+image", "bullets"],         hasImage: true,  hasMultiImage: false, textDensity: "medium", maxBullets: 4, maxBodyWords: 80  },
  { id: "image-side-card",  fits: ["text+image"],                    hasImage: true,  hasMultiImage: false, textDensity: "medium", maxBullets: 4, maxBodyWords: 80  },
  { id: "focus-image",      fits: ["text+image", "title"],           hasImage: true,  hasMultiImage: false, textDensity: "low",    maxBullets: 0, maxBodyWords: 40  },
  { id: "magazine-cover",   fits: ["title", "section"],              hasImage: true,  hasMultiImage: false, textDensity: "low",    maxBullets: 0, maxBodyWords: 25  },
  { id: "diagonal-split",   fits: ["text+image"],                    hasImage: true,  hasMultiImage: false, textDensity: "medium", maxBullets: 4, maxBodyWords: 70  },
  { id: "polaroid",         fits: ["text+image"],                    hasImage: true,  hasMultiImage: false, textDensity: "low",    maxBullets: 0, maxBodyWords: 50  },
  // text-only
  { id: "centered",          fits: ["text", "title"],                hasImage: false, hasMultiImage: false, textDensity: "low",    maxBullets: 4, maxBodyWords: 60  },
  { id: "centered-narrow",   fits: ["text", "definition"],           hasImage: false, hasMultiImage: false, textDensity: "low",    maxBullets: 0, maxBodyWords: 60  },
  { id: "left-aligned-hero", fits: ["title", "text"],                hasImage: false, hasMultiImage: false, textDensity: "low",    maxBullets: 3, maxBodyWords: 50  },
  { id: "right-aligned-hero",fits: ["title", "text"],                hasImage: false, hasMultiImage: false, textDensity: "low",    maxBullets: 3, maxBodyWords: 50  },
  { id: "definition",        fits: ["definition"],                   hasImage: false, hasMultiImage: false, textDensity: "low",    maxBullets: 0, maxBodyWords: 60  },
  { id: "manifesto",         fits: ["title", "quote"],               hasImage: false, hasMultiImage: false, textDensity: "low",    maxBullets: 0, maxBodyWords: 25  },
  { id: "poster-typo",       fits: ["title", "section"],             hasImage: false, hasMultiImage: false, textDensity: "low",    maxBullets: 0, maxBodyWords: 12  },
  { id: "pull-quote",        fits: ["quote"],                        hasImage: false, hasMultiImage: false, textDensity: "low",    maxBullets: 0, maxBodyWords: 40  },
  { id: "callout",           fits: ["title", "definition"],          hasImage: false, hasMultiImage: false, textDensity: "low",    maxBullets: 0, maxBodyWords: 25  },
  // grid
  { id: "two-col",      fits: ["bullets", "comparison"],   hasImage: false, hasMultiImage: false, textDensity: "high",   maxBullets: 8, maxBodyWords: 0   },
  { id: "three-col",    fits: ["bullets"],                 hasImage: false, hasMultiImage: false, textDensity: "high",   maxBullets: 9, maxBodyWords: 0   },
  { id: "four-col",     fits: ["bullets"],                 hasImage: false, hasMultiImage: false, textDensity: "high",   maxBullets: 8, maxBodyWords: 0   },
  { id: "bento",        fits: ["bullets", "text+image"],   hasImage: false, hasMultiImage: false, textDensity: "high",   maxBullets: 6, maxBodyWords: 0   },
  { id: "masonry-cards",fits: ["bullets", "gallery"],      hasImage: false, hasMultiImage: true,  textDensity: "medium", maxBullets: 6, maxBodyWords: 0   },
  { id: "pillars",      fits: ["bullets"],                 hasImage: false, hasMultiImage: false, textDensity: "medium", maxBullets: 4, maxBodyWords: 0   },
  { id: "icon-grid",    fits: ["bullets"],                 hasImage: false, hasMultiImage: false, textDensity: "medium", maxBullets: 6, maxBodyWords: 0   },
  { id: "ribbon-cards", fits: ["bullets"],                 hasImage: false, hasMultiImage: false, textDensity: "medium", maxBullets: 4, maxBodyWords: 0   },
  // compare
  { id: "comparison",   fits: ["comparison"], hasImage: false, hasMultiImage: false, textDensity: "high",   maxBullets: 5, maxBodyWords: 0 },
  { id: "before-after", fits: ["comparison"], hasImage: false, hasMultiImage: false, textDensity: "medium", maxBullets: 4, maxBodyWords: 0 },
  { id: "vs-split",     fits: ["comparison"], hasImage: false, hasMultiImage: false, textDensity: "medium", maxBullets: 5, maxBodyWords: 0 },
  { id: "table-compare",fits: ["comparison"], hasImage: false, hasMultiImage: false, textDensity: "high",   maxBullets: 6, maxBodyWords: 0 },
  // data
  { id: "big-number",   fits: ["stats"], hasImage: false, hasMultiImage: false, textDensity: "low",    maxBullets: 0, maxBodyWords: 60 },
  { id: "stat-cluster", fits: ["stats"], hasImage: false, hasMultiImage: false, textDensity: "medium", maxBullets: 0, maxBodyWords: 30 },
  { id: "stat-circles", fits: ["stats"], hasImage: false, hasMultiImage: false, textDensity: "low",    maxBullets: 0, maxBodyWords: 0  },
  { id: "kpi-strip",    fits: ["stats"], hasImage: false, hasMultiImage: false, textDensity: "low",    maxBullets: 0, maxBodyWords: 0  },
  // narrative
  { id: "process",            fits: ["process"],  hasImage: false, hasMultiImage: false, textDensity: "medium", maxBullets: 0, maxBodyWords: 0 },
  { id: "timeline",           fits: ["timeline"], hasImage: false, hasMultiImage: false, textDensity: "medium", maxBullets: 0, maxBodyWords: 0 },
  { id: "timeline-horizontal",fits: ["timeline"], hasImage: false, hasMultiImage: false, textDensity: "low",    maxBullets: 0, maxBodyWords: 0 },
  { id: "numbered-list",      fits: ["bullets", "process"], hasImage: false, hasMultiImage: false, textDensity: "medium", maxBullets: 6, maxBodyWords: 0 },
  { id: "step-vertical",      fits: ["process"],  hasImage: false, hasMultiImage: false, textDensity: "medium", maxBullets: 0, maxBodyWords: 0 },
  { id: "story-rows",         fits: ["timeline", "bullets"], hasImage: false, hasMultiImage: false, textDensity: "high", maxBullets: 0, maxBodyWords: 0 },
  // media
  { id: "gallery",        fits: ["gallery"], hasImage: false, hasMultiImage: true, textDensity: "low", maxBullets: 0, maxBodyWords: 30 },
  { id: "image-grid-2",   fits: ["gallery"], hasImage: false, hasMultiImage: true, textDensity: "low", maxBullets: 0, maxBodyWords: 30 },
  { id: "image-grid-4",   fits: ["gallery"], hasImage: false, hasMultiImage: true, textDensity: "low", maxBullets: 0, maxBodyWords: 20 },
  { id: "carousel-strip", fits: ["gallery"], hasImage: false, hasMultiImage: true, textDensity: "low", maxBullets: 0, maxBodyWords: 20 },
];

export const LAYOUT_IDS = LAYOUTS.map((l) => l.id);

export function getLayoutMeta(id: string | undefined | null): LayoutMeta | undefined {
  if (!id) return undefined;
  return LAYOUTS.find((l) => l.id === id);
}

/** Pick a layout for a given content shape (rule-based, no LLM). */
export function suggestLayout(
  shape: {
    contentType: ContentFit;
    bulletsCount?: number;
    bodyWords?: number;
    hasImage?: boolean;
    statsCount?: number;
  },
  forbid: Set<LayoutId> = new Set(),
): LayoutId {
  const candidates = LAYOUTS.filter((l) => l.fits.includes(shape.contentType) && !forbid.has(l.id));
  if (candidates.length === 0) return "centered";

  // Score: prefer layouts that match image presence + can hold the content density.
  const scored = candidates.map((l) => {
    let score = 100;
    if (shape.hasImage && !l.hasImage && !l.hasMultiImage) score -= 30;
    if (!shape.hasImage && l.hasImage) score -= 15;
    if (shape.bulletsCount && shape.bulletsCount > l.maxBullets && l.maxBullets > 0) score -= 40;
    if (shape.bodyWords && l.maxBodyWords > 0 && shape.bodyWords > l.maxBodyWords) score -= 35;
    return { id: l.id, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].id;
}
