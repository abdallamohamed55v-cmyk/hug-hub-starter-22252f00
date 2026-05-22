// Templates available in chat-mode slide generation.
// Each ships a minimal SVG cover + a `variant` that drives layout/typography
// in the renderer (see SlidesHtmlDeckCard VARIANT_STYLES).

import iosCover from "@/assets/slide-templates/ios.svg";
import sketchCover from "@/assets/slide-templates/sketch.svg";
import threeDCover from "@/assets/slide-templates/3d.svg";
import megsyCover from "@/assets/slide-templates/megsy.svg";
import atelierCover from "@/assets/slide-templates/atelier.svg";
import swissCover from "@/assets/slide-templates/swiss.svg";
import neonCover from "@/assets/slide-templates/neon.svg";
import brutalistCover from "@/assets/slide-templates/brutalist.svg";
import cinematicCover from "@/assets/slide-templates/cinematic.svg";
import monoCover from "@/assets/slide-templates/mono.svg";
import pastelCover from "@/assets/slide-templates/pastel.svg";
import editorialCover from "@/assets/slide-templates/editorial.svg";
import terminalCover from "@/assets/slide-templates/terminal.svg";
import vaporCover from "@/assets/slide-templates/vapor.svg";
import blueprintCover from "@/assets/slide-templates/blueprint.svg";
import organicCover from "@/assets/slide-templates/organic.svg";

export type SlidesCategory = "premium";

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
  colors: [string, string];
  category: SlidesCategory;
  htmlSlug: string;
  variant: SlidesVariant;
  cover: string;
}

export const PREMIUM_HTML_TEMPLATES: SlidesTemplate[] = [
  { id: "premium-ios",            name: "iOS",         description: "Frosted glass, Apple keynote polish",
    colors: ["#06080f", "#7C9AFF"], category: "premium",
    htmlSlug: "remix-next-generation-iphone",       variant: "glass-frost",         cover: iosCover },

  { id: "premium-sketch",         name: "Sketch",      description: "Hand-drawn ink on paper",
    colors: ["#f7f1e1", "#1f1b16"], category: "premium",
    htmlSlug: "remix-animated-graphic-designer",    variant: "paper-collage",       cover: sketchCover },

  { id: "premium-3d",             name: "3D",          description: "Chrome, iridescent, studio render",
    colors: ["#0b0b18", "#a78bfa"], category: "premium",
    htmlSlug: "remix-3d-website-the-digital-o",     variant: "bold-display",        cover: threeDCover },

  { id: "premium-megsy",          name: "Megsy",       description: "Aurora glow, neural particles",
    colors: ["#030712", "#10b981"], category: "premium",
    htmlSlug: "remix-aiventraq-ai-automation",      variant: "aurora-glow",         cover: megsyCover },

  { id: "premium-vanta-atelier",  name: "Atelier",     description: "Editorial dark luxury, gold serif",
    colors: ["#0a0a0a", "#c9a84c"], category: "premium",
    htmlSlug: "remix-vanta-digital-atelier",        variant: "luxury-gold",         cover: atelierCover },

  { id: "premium-seasonal-flow",  name: "Swiss",       description: "Swiss modernist, minimal grid",
    colors: ["#f6f6f3", "#0a0a0a"], category: "premium",
    htmlSlug: "remix-seasonal-scroll-experien",     variant: "swiss-modernist",     cover: swissCover },

  { id: "premium-neon",           name: "Neon",        description: "Cyberpunk HUD on grid floor",
    colors: ["#050816", "#22d3ee"], category: "premium",
    htmlSlug: "remix-splash-page-genesis",          variant: "neon-tech",           cover: neonCover },

  { id: "premium-brutalist",      name: "Brutalist",   description: "Massive type, yellow accent",
    colors: ["#f1ebde", "#0a0a0a"], category: "premium",
    htmlSlug: "remix-yash-verma-interactive-g",     variant: "brutalist",           cover: brutalistCover },

  { id: "premium-cinematic",      name: "Cinematic",   description: "Letterbox film card, ocean blues",
    colors: ["#001019", "#5cbdb9"], category: "premium",
    htmlSlug: "remix-ocean-flow-fish",              variant: "cinematic-letterbox", cover: cinematicCover },

  // ── New ────────────────────────────────────────────────────────
  { id: "premium-mono",           name: "Mono",        description: "Monospace, minimal, terminal-quiet",
    colors: ["#0a0a0a", "#e5e5e5"], category: "premium",
    htmlSlug: "remix-doc-scriptforge",              variant: "minimal-mono",        cover: monoCover },

  { id: "premium-pastel",         name: "Pastel",      description: "Soft circles, gentle Jakarta",
    colors: ["#fbf3f0", "#f8c8d8"], category: "premium",
    htmlSlug: "remix-baresol-skincare",             variant: "soft-pastel",         cover: pastelCover },

  { id: "premium-editorial",      name: "Editorial",   description: "Cormorant italic, slow magazine",
    colors: ["#f3eee5", "#1a1714"], category: "premium",
    htmlSlug: "remix-landscape-design",             variant: "editorial-serif",     cover: editorialCover },

  { id: "premium-terminal",       name: "Terminal",    description: "Green-on-black hacker shell",
    colors: ["#020a05", "#22c55e"], category: "premium",
    htmlSlug: "remix-modern-ai-visible-websit",     variant: "terminal-green",      cover: terminalCover },

  { id: "premium-vapor",          name: "Vapor",       description: "Y2K dreamscape, perspective grid",
    colors: ["#1e1b4b", "#ec4899"], category: "premium",
    htmlSlug: "remix-landing-page-blobs",           variant: "vapor-y2k",           cover: vaporCover },

  { id: "premium-blueprint",      name: "Blueprint",   description: "Engineering schematic, cyan grid",
    colors: ["#0b2545", "#bfdbfe"], category: "premium",
    htmlSlug: "remix-premium-tech-consulting",      variant: "blueprint-tech",      cover: blueprintCover },

  { id: "premium-organic",        name: "Organic",     description: "Earthy clay, soft blob shapes",
    colors: ["#efe9dd", "#7d9b76"], category: "premium",
    htmlSlug: "remix-forma-ergonomic-sofa",         variant: "organic-clay",        cover: organicCover },
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
