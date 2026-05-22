// Templates available in chat-mode slide generation.
// Each template ships with a hand-crafted cover image that represents its
// visual identity, plus a variant that drives the layout/typography rhythm
// in the deck renderer.

import iosCover from "@/assets/slide-templates/ios.svg";
import sketchCover from "@/assets/slide-templates/sketch.svg";
import threeDCover from "@/assets/slide-templates/3d.svg";
import megsyCover from "@/assets/slide-templates/megsy.svg";
import atelierCover from "@/assets/slide-templates/atelier.svg";
import swissCover from "@/assets/slide-templates/swiss.svg";
import neonCover from "@/assets/slide-templates/neon.svg";
import brutalistCover from "@/assets/slide-templates/brutalist.svg";
import cinematicCover from "@/assets/slide-templates/cinematic.svg";

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
  /** Imported cover image shown in the template picker. */
  cover: string;
}

export const PREMIUM_HTML_TEMPLATES: SlidesTemplate[] = [
  // ─── Named by the user ──────────────────────────────────────────────
  {
    id: "premium-ios",
    name: "iOS",
    description: "Frosted glass, SF-Pro feel, Apple keynote polish",
    colors: ["#000000", "#7C9AFF"],
    category: "premium",
    htmlSlug: "remix-next-generation-iphone",
    variant: "glass-frost",
    cover: iosCover,
  },
  {
    id: "premium-sketch",
    name: "Sketch",
    description: "Hand-drawn ink on paper, doodles and arrows",
    colors: ["#f8f5ee", "#1a1714"],
    category: "premium",
    htmlSlug: "remix-animated-graphic-designer",
    variant: "paper-collage",
    cover: sketchCover,
  },
  {
    id: "premium-3d",
    name: "3D",
    description: "Chrome shapes, iridescent gradient, studio render",
    colors: ["#0a0a14", "#a78bfa"],
    category: "premium",
    htmlSlug: "remix-3d-website-the-digital-o",
    variant: "bold-display",
    cover: threeDCover,
  },
  {
    id: "premium-megsy",
    name: "Megsy",
    description: "Megsy AI brand — aurora glow, neural particles",
    colors: ["#06070d", "#10b981"],
    category: "premium",
    htmlSlug: "remix-aiventraq-ai-automation",
    variant: "aurora-glow",
    cover: megsyCover,
  },

  // ─── Kept from previous set ─────────────────────────────────────────
  {
    id: "premium-vanta-atelier",
    name: "Obsidian Atelier",
    description: "Editorial dark luxury, gold serif",
    colors: ["#0a0a0a", "#c9a84c"],
    category: "premium",
    htmlSlug: "remix-vanta-digital-atelier",
    variant: "luxury-gold",
    cover: atelierCover,
  },
  {
    id: "premium-seasonal-flow",
    name: "Quiet Seasons",
    description: "Swiss modernist, minimal grid",
    colors: ["#fafafa", "#1a1a1a"],
    category: "premium",
    htmlSlug: "remix-seasonal-scroll-experien",
    variant: "swiss-modernist",
    cover: swissCover,
  },

  // ─── Additional flavours ────────────────────────────────────────────
  {
    id: "premium-neon",
    name: "Neon Grid",
    description: "Cyberpunk HUD, neon glow on grid floor",
    colors: ["#06070d", "#22d3ee"],
    category: "premium",
    htmlSlug: "remix-splash-page-genesis",
    variant: "neon-tech",
    cover: neonCover,
  },
  {
    id: "premium-brutalist",
    name: "Brutalist Press",
    description: "Anti-design, massive type, yellow accent",
    colors: ["#f5f3ee", "#0d0d0d"],
    category: "premium",
    htmlSlug: "remix-yash-verma-interactive-g",
    variant: "brutalist",
    cover: brutalistCover,
  },
  {
    id: "premium-cinematic",
    name: "Cinematic",
    description: "Letterbox film card, deep ocean blues",
    colors: ["#001f3f", "#5cbdb9"],
    category: "premium",
    htmlSlug: "remix-ocean-flow-fish",
    variant: "cinematic-letterbox",
    cover: cinematicCover,
  },
];

export const SLIDES_TEMPLATES: SlidesTemplate[] = [...PREMIUM_HTML_TEMPLATES];

export const DEFAULT_SLIDES_TEMPLATE = "premium-megsy";

export function findSlidesTemplate(id?: string | null): SlidesTemplate {
  return SLIDES_TEMPLATES.find((t) => t.id === id) || PREMIUM_HTML_TEMPLATES[0];
}

export function isPremiumHtml(id?: string | null): boolean {
  const t = SLIDES_TEMPLATES.find((x) => x.id === id);
  return !!(t && t.htmlSlug);
}
