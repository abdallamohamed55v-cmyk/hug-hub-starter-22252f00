// Templates available in chat-mode slide generation.
// All templates are now "premium" — internal HTML landing-page templates shipped
// from /public/templates/{slug}/index.html. The renderer fetches the template HTML,
// strips nav/header/footer/CTAs, enlarges typography, and injects AI-generated content.

export type SlidesCategory = "premium";

/** Distinct visual identity applied on top of the template's animated bg + fonts. */
export type SlidesVariant =
  | "editorial-serif"
  | "bold-display"
  | "minimal-mono"
  | "glass-frost"
  | "neon-tech"
  | "soft-pastel"
  | "luxury-gold"
  | "brutalist"
  | "aurora-glow"
  | "magazine-grid"
  | "swiss-modernist"
  | "retro-vhs"
  | "terminal-green"
  | "kinetic-poster"
  | "ornate-baroque"
  | "blueprint-tech"
  | "paper-collage"
  | "vapor-y2k"
  | "organic-clay"
  | "cinematic-letterbox";

export interface SlidesTemplate {
  id: string;
  name: string;
  description: string;
  /** Two-color hint used for the fallback gradient preview & exported deck palette. */
  colors: [string, string];
  category: SlidesCategory;
  /** Directory under /public/templates/ that contains index.html (+ optional scene.js). */
  htmlSlug: string;
  /** Visual variant (drives layout/typography/spacing rhythm in the renderer). */
  variant: SlidesVariant;
}

/** ─── 20 internal HTML templates — each with its own unique visual variant ─────── */
export const PREMIUM_HTML_TEMPLATES: SlidesTemplate[] = [
  { id: "premium-vanta-atelier",   name: "Obsidian Atelier",   description: "Editorial dark luxury, gold serif",   colors: ["#0a0a0a", "#c9a84c"], category: "premium", htmlSlug: "remix-vanta-digital-atelier",      variant: "luxury-gold" },
  { id: "premium-verdana-3d",      name: "Verdant Bloom",      description: "Botanical, organic clay",             colors: ["#0a0e08", "#a8d63b"], category: "premium", htmlSlug: "remix-3d-website-the-digital-o",   variant: "organic-clay" },
  { id: "premium-iphone-aura",     name: "Halo Glass",          description: "Frosted glass editorial",             colors: ["#000000", "#7C9AFF"], category: "premium", htmlSlug: "remix-next-generation-iphone",     variant: "glass-frost" },
  { id: "premium-landscape-napa",  name: "Paper & Ink",         description: "Serif print luxury",                  colors: ["#F5F0E8", "#1a1714"], category: "premium", htmlSlug: "remix-landscape-design",           variant: "editorial-serif" },
  { id: "premium-yash-graphic",    name: "Neon Rose",           description: "Kinetic poster, bold display",        colors: ["#0e0e10", "#d94f7a"], category: "premium", htmlSlug: "remix-yash-verma-interactive-g",   variant: "kinetic-poster" },
  { id: "premium-doc-scriptforge", name: "Field Notes",         description: "Mono editorial documentary",          colors: ["#000000", "#ffffff"], category: "premium", htmlSlug: "remix-documentary-research-and",   variant: "minimal-mono" },
  { id: "premium-ocean-flow",      name: "Deep Current",        description: "Cinematic deep blue letterbox",       colors: ["#001f3f", "#5cbdb9"], category: "premium", htmlSlug: "remix-ocean-flow-fish",            variant: "cinematic-letterbox" },
  { id: "premium-splash-genesis",  name: "Emerald Pulse",       description: "Neon tech with emerald glow",         colors: ["#06070d", "#10b981"], category: "premium", htmlSlug: "remix-splash-page-genesis",        variant: "neon-tech" },
  { id: "premium-ice-fashion",     name: "Crystal Couture",     description: "Magazine grid, fashion editorial",    colors: ["#000000", "#e0e7ff"], category: "premium", htmlSlug: "remix-fashion-ice-cubes",          variant: "magazine-grid" },
  { id: "premium-seasonal-flow",   name: "Quiet Seasons",       description: "Swiss modernist, minimal",            colors: ["#fafafa", "#1a1a1a"], category: "premium", htmlSlug: "remix-seasonal-scroll-experien",   variant: "swiss-modernist" },
  { id: "premium-bold-3d-typo",    name: "Monolith Type",       description: "Massive sculptural display",          colors: ["#0a0a0a", "#f5f5f5"], category: "premium", htmlSlug: "remix-bold-3d-typography-portf",   variant: "bold-display" },
  { id: "premium-blobs-landing",   name: "Lavender Drift",      description: "Soft pastel, dreamy",                 colors: ["#0e0b1f", "#a78bfa"], category: "premium", htmlSlug: "remix-landing-page-blobs",         variant: "soft-pastel" },
  { id: "premium-tech-consulting", name: "Navy Compass",        description: "Blueprint engineering",               colors: ["#0f1b3d", "#e8edf3"], category: "premium", htmlSlug: "remix-premium-tech-consulting",    variant: "blueprint-tech" },
  { id: "premium-cosmetic-laundry",name: "Petal Soft",          description: "Paper collage, handcrafted",          colors: ["#f8e8ee", "#c45c7c"], category: "premium", htmlSlug: "remix-cosmetic-inspired-laundr",   variant: "paper-collage" },
  { id: "premium-forma-sofa",      name: "Warm Linen",          description: "Magazine grid, warm neutrals",        colors: ["#f0ebe3", "#8b7355"], category: "premium", htmlSlug: "remix-forma-ergonomic-sofa",       variant: "magazine-grid" },
  { id: "premium-baresol",         name: "Sage Garden",         description: "Organic clay, wellness",              colors: ["#f5f0e8", "#7d9b76"], category: "premium", htmlSlug: "remix-baresol-skincare",           variant: "organic-clay" },
  { id: "premium-robotic-tech",    name: "Cyan Circuit",        description: "Terminal green, futurist",            colors: ["#06070d", "#22d3ee"], category: "premium", htmlSlug: "remix-robotic-technologies-202",   variant: "terminal-green" },
  { id: "premium-ai-video-gen",    name: "Neon Tide",           description: "Vapor Y2K, vibrant gradient",         colors: ["#0a0a1a", "#ec4899"], category: "premium", htmlSlug: "remix-ai-video-generator-websi",   variant: "vapor-y2k" },
  { id: "premium-silent-wealth",   name: "Quiet Luxury",        description: "Ornate baroque, restrained serif",    colors: ["#f5f3ee", "#0d0d0d"], category: "premium", htmlSlug: "remix-silent-wealth",              variant: "ornate-baroque" },
  { id: "premium-aiventraq",       name: "Aurora Dark",         description: "Aurora glow, emerald gradient",       colors: ["#06070d", "#10b981"], category: "premium", htmlSlug: "remix-aiventraq-ai-automation",    variant: "aurora-glow" },
];

export const SLIDES_TEMPLATES: SlidesTemplate[] = [...PREMIUM_HTML_TEMPLATES];

export const DEFAULT_SLIDES_TEMPLATE = "premium-vanta-atelier";

export function findSlidesTemplate(id?: string | null): SlidesTemplate {
  return SLIDES_TEMPLATES.find((t) => t.id === id) || PREMIUM_HTML_TEMPLATES[0];
}

export function isPremiumHtml(id?: string | null): boolean {
  const t = SLIDES_TEMPLATES.find((x) => x.id === id);
  return !!(t && t.htmlSlug);
}
