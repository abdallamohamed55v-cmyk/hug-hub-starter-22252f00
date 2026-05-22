// Premium HTML template renderer with FULL CREATIVE FREEDOM.
//
// Strategy:
//   - Inherit the template's <head> (fonts, base CSS, three.js scripts, canvas setup).
//   - Preserve any background <canvas> element (so 3D / fluid backgrounds keep working).
//   - REPLACE the <body> content entirely with sections we compose from deck.slides.
//     This means the AI is not constrained by the original template's section count
//     or text shape — it can generate any number of slides with any content, and
//     we render them in the template's visual style (fonts, colors, background).
//   - Inject giant slide-grade typography + scrub any leftover nav/buttons/forms.
//
// The result reads like a presentation, not a marketing landing page.

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, X, Download, FileCode2, ExternalLink, ArrowLeft, Share2, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import type { SlideDeck, SlideData } from "./SlidesDeckCard";
import { getTheme, THEMES, type ThemeId } from "@/lib/slides/themes";

interface Props {
  deck: SlideDeck & { htmlSlug: string; variant?: string };
}

/** Known visual variants. Keep in sync with src/lib/slidesTemplates.ts. */
type SlidesVariant =
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

const KNOWN_VARIANTS: SlidesVariant[] = [
  "editorial-serif","bold-display","minimal-mono","glass-frost",
  "neon-tech","soft-pastel","luxury-gold","brutalist","aurora-glow",
  "magazine-grid","swiss-modernist","retro-vhs","terminal-green",
  "kinetic-poster","ornate-baroque","blueprint-tech","paper-collage",
  "vapor-y2k","organic-clay","cinematic-letterbox",
];

function normalizeVariant(v?: string): SlidesVariant {
  return (KNOWN_VARIANTS.includes(v as SlidesVariant) ? v : "editorial-serif") as SlidesVariant;
}

/** Per-variant CSS layered on top of SLIDE_BASE_CSS. Each gives the deck a distinct identity. */
const VARIANT_STYLES: Record<SlidesVariant, string> = {
  "editorial-serif": `
    .lov-deck { font-family: 'Cormorant Garamond','Playfair Display',Georgia,serif; }
    .lov-deck .lov-h1, .lov-deck .lov-h2 { font-family: inherit; font-weight: 600 !important; letter-spacing: -0.025em !important; }
    .lov-deck .lov-h1 { font-style: italic; }
    .lov-deck .lov-kicker { font-family: 'Inter',sans-serif; font-weight: 500 !important; letter-spacing: 0.42em !important; opacity: 0.6; }
    .lov-deck .lov-subtitle, .lov-deck .lov-body, .lov-deck .lov-bullets li { font-family: 'Inter',sans-serif; font-weight: 400 !important; }
    .lov-deck .lov-section { border-bottom: none !important; padding: 14vh 8vw !important; }
    .lov-deck .lov-content { max-width: 1280px !important; }
    .lov-deck .lov-content::before { content:""; display:block; width:64px; height:1px; background: var(--lov-fg); opacity: 0.5; margin-bottom: 2.5rem; }
    .lov-deck .lov-bullets li::before { background: transparent !important; width: 18px !important; height: 1px !important; top: 0.82em !important; }
    .lov-deck .lov-bullets li { padding-inline-start: 2.4rem !important; }
    .lov-deck .lov-stat-value { font-family: inherit; font-style: italic; font-weight: 500 !important; }
  `,
  "bold-display": `
    .lov-deck { font-family: 'Archivo Black','Bebas Neue',sans-serif; }
    .lov-deck .lov-h1 { font-size: clamp(80px,13vw,240px) !important; line-height: 0.85 !important; letter-spacing: -0.05em !important; font-weight: 900 !important; text-transform: uppercase; }
    .lov-deck .lov-h2 { font-size: clamp(60px,9vw,160px) !important; line-height: 0.9 !important; letter-spacing: -0.04em !important; font-weight: 900 !important; text-transform: uppercase; }
    .lov-deck .lov-kicker { font-size: clamp(14px,1.1vw,20px) !important; opacity: 1; color: var(--lov-fg) !important; background: var(--lov-accent); display: inline-block; padding: 0.4rem 1rem; }
    .lov-deck .lov-subtitle, .lov-deck .lov-body, .lov-deck .lov-bullets li { font-family: 'Inter',sans-serif; font-weight: 500 !important; }
    .lov-deck .lov-bullets { counter-reset: lovBullet; }
    .lov-deck .lov-bullets li { padding-inline-start: 4.5rem !important; counter-increment: lovBullet; font-size: clamp(22px,1.9vw,34px) !important; }
    .lov-deck .lov-bullets li::before { content: counter(lovBullet, decimal-leading-zero) !important; background: transparent !important; color: var(--lov-accent) !important; font-family: inherit !important; font-weight: 900 !important; font-size: 1.3em !important; width: auto !important; height: auto !important; border-radius: 0 !important; top: 0 !important; }
  `,
  "minimal-mono": `
    .lov-deck { font-family: 'JetBrains Mono','IBM Plex Mono',ui-monospace,monospace; }
    .lov-deck .lov-h1, .lov-deck .lov-h2 { font-family: inherit; font-weight: 500 !important; letter-spacing: -0.03em !important; }
    .lov-deck .lov-kicker { font-family: inherit; opacity: 0.55; letter-spacing: 0.18em !important; }
    .lov-deck .lov-kicker::before { content:"// "; }
    .lov-deck .lov-subtitle, .lov-deck .lov-body, .lov-deck .lov-bullets li { font-family: inherit; font-weight: 400 !important; opacity: 0.85; }
    .lov-deck .lov-section { padding: 9vh 5vw !important; border-bottom: 1px dashed color-mix(in oklab, var(--lov-fg) 22%, transparent) !important; }
    .lov-deck .lov-bullets li::before { content:"›" !important; background: transparent !important; color: var(--lov-accent) !important; width: auto !important; height: auto !important; border-radius: 0 !important; top: 0 !important; font-weight: 700 !important; }
    .lov-deck .lov-bullets li { padding-inline-start: 1.6rem !important; }
    .lov-deck .lov-stat-value { font-family: inherit; font-weight: 600 !important; }
  `,
  "glass-frost": `
    .lov-deck { font-family: 'Inter','SF Pro Display',sans-serif; }
    .lov-deck .lov-h1, .lov-deck .lov-h2 { font-weight: 700 !important; letter-spacing: -0.04em !important; }
    .lov-deck .lov-content {
      background: color-mix(in oklab, var(--lov-fg) 6%, transparent);
      backdrop-filter: blur(28px) saturate(140%); -webkit-backdrop-filter: blur(28px) saturate(140%);
      border: 1px solid color-mix(in oklab, var(--lov-fg) 14%, transparent);
      border-radius: 32px; padding: 5vh 5vw !important;
      box-shadow: 0 30px 100px -30px rgba(0,0,0,0.5);
    }
    .lov-deck .lov-section { padding: 8vh 5vw !important; border-bottom: none !important; }
    .lov-deck .lov-stat {
      background: color-mix(in oklab, var(--lov-fg) 8%, transparent);
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border: 1px solid color-mix(in oklab, var(--lov-fg) 14%, transparent);
      border-radius: 24px; padding: 1.6rem 1.4rem; text-align: center;
    }
  `,
  "neon-tech": `
    .lov-deck { font-family: 'Space Grotesk','Inter',sans-serif; }
    .lov-deck .lov-h1, .lov-deck .lov-h2 { font-weight: 700 !important; letter-spacing: -0.035em !important;
      text-shadow: 0 0 40px color-mix(in oklab, var(--lov-accent) 55%, transparent), 0 0 8px color-mix(in oklab, var(--lov-accent) 35%, transparent); }
    .lov-deck .lov-kicker { color: var(--lov-accent) !important; text-shadow: 0 0 20px color-mix(in oklab, var(--lov-accent) 60%, transparent); }
    .lov-deck .lov-section { padding: 11vh 6vw !important; border-bottom: 1px solid color-mix(in oklab, var(--lov-accent) 18%, transparent) !important; }
    .lov-deck .lov-section::before {
      content:""; position:absolute; inset-inline-start:0; top:50%; width:4px; height:60%; transform:translateY(-50%);
      background: linear-gradient(180deg, transparent, var(--lov-accent), transparent);
      box-shadow: 0 0 24px var(--lov-accent);
    }
    .lov-deck .lov-bullets li::before { background: var(--lov-accent) !important;
      box-shadow: 0 0 14px var(--lov-accent), 0 0 28px color-mix(in oklab, var(--lov-accent) 50%, transparent); }
    .lov-deck .lov-stat-value { text-shadow: 0 0 30px color-mix(in oklab, var(--lov-accent) 50%, transparent); }
  `,
  "soft-pastel": `
    .lov-deck { font-family: 'Plus Jakarta Sans','Nunito Sans',sans-serif; }
    .lov-deck .lov-h1, .lov-deck .lov-h2 { font-weight: 700 !important; letter-spacing: -0.025em !important; }
    .lov-deck .lov-kicker { display: inline-block; padding: 0.45rem 1.1rem;
      background: color-mix(in oklab, var(--lov-accent) 22%, transparent); color: var(--lov-accent) !important; border-radius: 999px; }
    .lov-deck .lov-section { padding: 10vh 6vw !important; border-bottom: none !important; }
    .lov-deck .lov-bullets li::before { width: 0.55rem !important; height: 0.55rem !important; background: var(--lov-accent) !important; }
    .lov-deck .lov-stat, .lov-deck .lov-media, .lov-deck .lov-content { border-radius: 28px; }
    .lov-deck .lov-stat { background: color-mix(in oklab, var(--lov-accent) 8%, var(--lov-bg)); padding: 1.8rem 1.6rem; text-align: center;
      box-shadow: 0 12px 40px -12px color-mix(in oklab, var(--lov-accent) 30%, transparent); }
  `,
  "luxury-gold": `
    .lov-deck { font-family: 'Cormorant Garamond',Georgia,serif; }
    .lov-deck .lov-h1, .lov-deck .lov-h2 { font-family: inherit; font-weight: 500 !important; letter-spacing: -0.015em !important; }
    .lov-deck .lov-kicker { font-family: 'Inter',sans-serif; font-size: clamp(11px,0.8vw,15px) !important; letter-spacing: 0.55em !important; font-weight: 600 !important; color: var(--lov-accent) !important; }
    .lov-deck .lov-subtitle, .lov-deck .lov-body, .lov-deck .lov-bullets li { font-family: 'Inter',sans-serif; font-weight: 400 !important; opacity: 0.88; }
    .lov-deck .lov-section { padding: 13vh 7vw !important; border-bottom: none !important; }
    .lov-deck .lov-section::after { content:""; position:absolute; left:50%; bottom:5vh; transform:translateX(-50%); width: 48px; height: 1px; background: var(--lov-accent); opacity: 0.7; }
    .lov-deck .lov-bullets li::before { background: var(--lov-accent) !important; width: 6px !important; height: 6px !important; transform: rotate(45deg); border-radius: 0 !important; top: 0.85em !important; }
    .lov-deck .lov-stat-value { font-family: inherit; font-weight: 400 !important; color: var(--lov-accent) !important; }
    .lov-deck .lov-content::before { content:""; display:block; width: 80px; height: 1px; background: var(--lov-accent); margin-bottom: 2rem; }
  `,
  "brutalist": `
    .lov-deck { font-family: 'Space Mono',ui-monospace,monospace; }
    .lov-deck .lov-h1, .lov-deck .lov-h2 { font-family: 'Archivo Black',sans-serif; font-weight: 900 !important; letter-spacing: -0.04em !important; text-transform: uppercase; }
    .lov-deck .lov-kicker { background: var(--lov-fg); color: var(--lov-bg) !important; display: inline-block; padding: 0.3rem 0.8rem; letter-spacing: 0.2em !important; border-radius: 0 !important; }
    .lov-deck .lov-section { padding: 9vh 5vw !important; border-bottom: 4px solid var(--lov-fg) !important; }
    .lov-deck .lov-content, .lov-deck .lov-media, .lov-deck .lov-stat { border-radius: 0 !important; }
    .lov-deck .lov-stat { border: 3px solid var(--lov-fg); padding: 1.4rem; background: transparent; }
    .lov-deck .lov-bullets li::before { background: var(--lov-fg) !important; border-radius: 0 !important; width: 1rem !important; height: 0.35rem !important; top: 0.95em !important; }
  `,
  "aurora-glow": `
    .lov-deck { font-family: 'Sora','Inter',sans-serif; }
    .lov-deck .lov-h1, .lov-deck .lov-h2 {
      font-weight: 800 !important; letter-spacing: -0.04em !important;
      background: linear-gradient(120deg, var(--lov-fg) 0%, var(--lov-accent) 55%, var(--lov-primary) 100%);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent !important;
    }
    .lov-deck .lov-kicker { color: var(--lov-accent) !important; }
    .lov-deck .lov-section { padding: 11vh 6vw !important; border-bottom: none !important; }
    .lov-deck .lov-section::before { content:""; position:absolute; inset:0; pointer-events:none;
      background: radial-gradient(ellipse 60% 40% at 20% 30%, color-mix(in oklab, var(--lov-accent) 18%, transparent), transparent 60%),
                  radial-gradient(ellipse 50% 40% at 80% 70%, color-mix(in oklab, var(--lov-primary) 16%, transparent), transparent 60%);
      z-index: 0; }
    .lov-deck .lov-bullets li::before { background: linear-gradient(135deg, var(--lov-accent), var(--lov-primary)) !important;
      box-shadow: 0 0 18px color-mix(in oklab, var(--lov-accent) 60%, transparent); }
    .lov-deck .lov-stat-value { background: linear-gradient(135deg, var(--lov-accent), var(--lov-primary));
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent !important; }
  `,
  "magazine-grid": `
    .lov-deck { font-family: 'DM Serif Display','Playfair Display',serif; }
    .lov-deck .lov-h1, .lov-deck .lov-h2 { font-family: inherit; font-weight: 400 !important; letter-spacing: -0.03em !important; line-height: 0.95 !important; }
    .lov-deck .lov-kicker { font-family: 'Work Sans',sans-serif; letter-spacing: 0.32em !important; font-weight: 700 !important; padding-bottom: 0.6rem; border-bottom: 2px solid var(--lov-fg); display: inline-block; }
    .lov-deck .lov-subtitle, .lov-deck .lov-body, .lov-deck .lov-bullets li { font-family: 'Work Sans','Inter',sans-serif; font-weight: 400 !important; column-fill: balance; }
    .lov-deck .lov-section { padding: 10vh 7vw !important; border-bottom: none !important; }
    .lov-deck .lov-section .lov-body { columns: 2; column-gap: 3rem; max-width: 1200px; }
    @media (max-width: 900px) { .lov-deck .lov-section .lov-body { columns: 1; } }
    .lov-deck .lov-bullets li::before { background: var(--lov-fg) !important; width: 0.5rem !important; height: 0.5rem !important; border-radius: 0 !important; }
  `,
  "swiss-modernist": `
    .lov-deck { font-family: 'Helvetica Neue','Inter','Neue Haas Grotesk',sans-serif; }
    .lov-deck .lov-h1, .lov-deck .lov-h2 { font-weight: 700 !important; letter-spacing: -0.04em !important; line-height: 0.95 !important; }
    .lov-deck .lov-kicker { font-weight: 700 !important; letter-spacing: 0.04em !important; text-transform: none; opacity: 1; color: var(--lov-accent) !important; }
    .lov-deck .lov-section { padding: 8vh 6vw !important; border-bottom: 1px solid var(--lov-fg) !important; }
    .lov-deck .lov-content { display: grid; grid-template-columns: 1fr 4fr; gap: 3rem; align-items: start; max-width: 1500px !important; }
    .lov-deck .lov-content .lov-kicker { grid-column: 1; align-self: start; padding-top: 0.4rem; }
    .lov-deck .lov-content > :not(.lov-kicker) { grid-column: 2; }
    @media (max-width: 900px) { .lov-deck .lov-content { grid-template-columns: 1fr; } .lov-deck .lov-content > :not(.lov-kicker) { grid-column: 1; } }
    .lov-deck .lov-bullets li::before { background: var(--lov-fg) !important; width: 0.5rem !important; height: 0.5rem !important; border-radius: 0 !important; }
  `,
  "retro-vhs": `
    .lov-deck { font-family: 'VT323','Press Start 2P','Courier New',monospace; }
    .lov-deck .lov-h1, .lov-deck .lov-h2 { font-family: inherit; font-weight: 400 !important; letter-spacing: 0.02em !important; text-transform: uppercase;
      text-shadow: 3px 0 0 #ff00aa, -3px 0 0 #00ffe5, 0 0 18px color-mix(in oklab, var(--lov-accent) 40%, transparent); }
    .lov-deck .lov-kicker { font-family: inherit; letter-spacing: 0.2em !important; color: #ff00aa !important; }
    .lov-deck .lov-subtitle, .lov-deck .lov-body, .lov-deck .lov-bullets li { font-family: inherit; font-weight: 400 !important; }
    .lov-deck .lov-section { padding: 10vh 6vw !important; border-bottom: 2px dashed color-mix(in oklab, var(--lov-accent) 40%, transparent) !important; position: relative; }
    .lov-deck .lov-section::after { content:""; position:absolute; inset:0; pointer-events:none;
      background: repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 2px, transparent 2px 4px); z-index: 0; }
    .lov-deck .lov-bullets li::before { content:"▸" !important; background: transparent !important; color: var(--lov-accent) !important; width: auto !important; height: auto !important; border-radius: 0 !important; top: 0 !important; }
  `,
  "terminal-green": `
    .lov-deck { font-family: 'JetBrains Mono','Fira Code',monospace; background: #050a05 !important; color: #4ade80 !important; }
    .lov-deck .lov-h1, .lov-deck .lov-h2 { font-family: inherit; font-weight: 500 !important; color: #4ade80 !important; letter-spacing: -0.02em !important; }
    .lov-deck .lov-h1::before, .lov-deck .lov-h2::before { content:"$ "; opacity: 0.6; }
    .lov-deck .lov-kicker { font-family: inherit; color: #facc15 !important; }
    .lov-deck .lov-kicker::before { content:"> "; }
    .lov-deck .lov-subtitle, .lov-deck .lov-body, .lov-deck .lov-bullets li { font-family: inherit; color: #86efac !important; }
    .lov-deck .lov-section { padding: 8vh 5vw !important; border-bottom: 1px solid rgba(74,222,128,0.18) !important; }
    .lov-deck .lov-bullets li::before { content:"#" !important; background: transparent !important; color: #facc15 !important; width:auto !important; height:auto !important; border-radius: 0 !important; top: 0 !important; }
    .lov-deck .lov-stat-value { color: #facc15 !important; }
  `,
  "kinetic-poster": `
    .lov-deck { font-family: 'Anton','Oswald','Archivo Black',sans-serif; }
    .lov-deck .lov-h1 { font-size: clamp(90px,16vw,300px) !important; line-height: 0.82 !important; letter-spacing: -0.04em !important; font-weight: 900 !important; text-transform: uppercase; transform: skewX(-6deg); transform-origin: left; }
    .lov-deck .lov-h2 { font-size: clamp(64px,11vw,180px) !important; line-height: 0.88 !important; font-weight: 900 !important; text-transform: uppercase; }
    .lov-deck .lov-h1:hover { transform: skewX(0); transition: transform .8s ease; }
    .lov-deck .lov-kicker { background: var(--lov-accent); color: var(--lov-bg) !important; padding: 0.35rem 1rem; transform: rotate(-3deg); display: inline-block; }
    .lov-deck .lov-section { padding: 10vh 5vw !important; border-bottom: 8px solid var(--lov-accent) !important; }
    .lov-deck .lov-bullets li { font-weight: 700 !important; text-transform: uppercase; letter-spacing: -0.01em; }
    .lov-deck .lov-bullets li::before { background: var(--lov-accent) !important; width: 1.4rem !important; height: 1.4rem !important; border-radius: 0 !important; transform: rotate(45deg); top: 0.55em !important; }
  `,
  "ornate-baroque": `
    .lov-deck { font-family: 'Cormorant Garamond','EB Garamond','Playfair Display',serif; }
    .lov-deck .lov-h1, .lov-deck .lov-h2 { font-family: inherit; font-weight: 500 !important; font-style: italic; letter-spacing: -0.01em !important; }
    .lov-deck .lov-kicker { font-family: inherit; font-style: italic; font-weight: 500 !important; letter-spacing: 0.18em !important; text-transform: none; color: var(--lov-accent) !important; }
    .lov-deck .lov-kicker::before { content:"❦ "; }
    .lov-deck .lov-kicker::after { content:" ❦"; }
    .lov-deck .lov-section { padding: 14vh 8vw !important; border-bottom: none !important; }
    .lov-deck .lov-content { text-align: center; max-width: 1100px !important; margin: 0 auto; }
    .lov-deck .lov-content::before { content:"✣"; display:block; font-size: 2rem; color: var(--lov-accent); margin-bottom: 1.5rem; }
    .lov-deck .lov-content::after { content:"✣"; display:block; font-size: 2rem; color: var(--lov-accent); margin-top: 2.5rem; opacity: 0.6; }
    .lov-deck .lov-bullets { text-align: start; }
    .lov-deck .lov-bullets li::before { content:"✦" !important; background: transparent !important; color: var(--lov-accent) !important; width:auto !important; height:auto !important; border-radius:0 !important; top:0 !important; }
  `,
  "blueprint-tech": `
    .lov-deck { font-family: 'IBM Plex Mono','JetBrains Mono',monospace; background: #0c1a2e !important; color: #b4d4ff !important; }
    .lov-deck .lov-h1, .lov-deck .lov-h2 { font-family: 'IBM Plex Sans','Inter',sans-serif; font-weight: 600 !important; color: #ffffff !important; letter-spacing: -0.02em !important; }
    .lov-deck .lov-kicker { font-family: inherit; color: #7ab8ff !important; letter-spacing: 0.16em !important; }
    .lov-deck .lov-kicker::before { content:"[ "; }
    .lov-deck .lov-kicker::after { content:" ]"; }
    .lov-deck .lov-section { padding: 9vh 6vw !important; border-bottom: 1px dashed rgba(180,212,255,0.25) !important;
      background-image: linear-gradient(rgba(180,212,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(180,212,255,0.05) 1px, transparent 1px);
      background-size: 40px 40px; }
    .lov-deck .lov-bullets li::before { content:"+" !important; background: transparent !important; color: #7ab8ff !important; width:auto !important; height:auto !important; border-radius:0 !important; top:0 !important; font-weight: 700 !important; }
    .lov-deck .lov-stat-value { color: #ffffff !important; }
  `,
  "paper-collage": `
    .lov-deck { font-family: 'Caveat','Patrick Hand','Kalam',cursive; background: #f5efe3 !important; color: #1a1410 !important; }
    .lov-deck .lov-h1, .lov-deck .lov-h2 { font-family: inherit; font-weight: 700 !important; letter-spacing: -0.01em !important; color: #1a1410 !important; transform: rotate(-1.5deg); display: inline-block; }
    .lov-deck .lov-kicker { font-family: 'Kalam',cursive; background: #ffd166; color: #1a1410 !important; padding: 0.3rem 0.9rem; transform: rotate(2deg); display: inline-block; border-radius: 4px; }
    .lov-deck .lov-subtitle, .lov-deck .lov-body, .lov-deck .lov-bullets li { font-family: 'Patrick Hand','Kalam',cursive; color: #2a2018 !important; }
    .lov-deck .lov-section { padding: 10vh 6vw !important; border-bottom: none !important; }
    .lov-deck .lov-content { padding: 3rem; background: #fffdf6; box-shadow: 0 12px 30px -12px rgba(0,0,0,0.3); transform: rotate(-0.6deg); border-radius: 6px; }
    .lov-deck .lov-bullets li::before { content:"✓" !important; background: transparent !important; color: #d94f4f !important; width:auto !important; height:auto !important; border-radius:0 !important; top:-0.1em !important; font-weight: 700 !important; }
  `,
  "vapor-y2k": `
    .lov-deck { font-family: 'Sora','Outfit','Inter',sans-serif;
      background: linear-gradient(135deg, #1a0033, #4a0080, #0080ff) !important; color: #ffffff !important; }
    .lov-deck .lov-h1, .lov-deck .lov-h2 {
      font-weight: 900 !important; letter-spacing: -0.03em !important;
      background: linear-gradient(180deg, #ffffff 0%, #c4b5fd 40%, #ff6ad5 75%, #ffd166 100%);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent !important;
      text-shadow: 0 0 60px rgba(255,106,213,0.4);
    }
    .lov-deck .lov-kicker { color: #ff6ad5 !important; text-shadow: 0 0 12px #ff6ad5; }
    .lov-deck .lov-section { padding: 11vh 6vw !important; border-bottom: 1px solid rgba(255,106,213,0.3) !important; }
    .lov-deck .lov-bullets li::before { background: linear-gradient(135deg, #ff6ad5, #67e8f9) !important; box-shadow: 0 0 16px #ff6ad5; }
    .lov-deck .lov-stat-value { background: linear-gradient(135deg, #67e8f9, #ff6ad5);
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; color: transparent !important; }
  `,
  "organic-clay": `
    .lov-deck { font-family: 'Fraunces','Lora','Source Serif Pro',serif; }
    .lov-deck .lov-h1, .lov-deck .lov-h2 { font-family: inherit; font-weight: 500 !important; letter-spacing: -0.025em !important; }
    .lov-deck .lov-kicker { font-family: 'Inter',sans-serif; background: color-mix(in oklab, var(--lov-accent) 18%, transparent); color: var(--lov-accent) !important; padding: 0.5rem 1.2rem; border-radius: 999px; font-weight: 500 !important; letter-spacing: 0.2em !important; }
    .lov-deck .lov-subtitle, .lov-deck .lov-body, .lov-deck .lov-bullets li { font-family: 'Inter','Plus Jakarta Sans',sans-serif; font-weight: 400 !important; }
    .lov-deck .lov-section { padding: 12vh 7vw !important; border-bottom: none !important; }
    .lov-deck .lov-content { max-width: 1280px !important; }
    .lov-deck .lov-stat, .lov-deck .lov-media { border-radius: 36px; }
    .lov-deck .lov-stat { background: color-mix(in oklab, var(--lov-accent) 12%, var(--lov-bg)); padding: 2rem 1.6rem; text-align: center; }
    .lov-deck .lov-bullets li::before { background: var(--lov-accent) !important; width: 0.6rem !important; height: 0.6rem !important; }
  `,
  "cinematic-letterbox": `
    .lov-deck { font-family: 'Inter','Helvetica Neue',sans-serif; }
    .lov-deck .lov-section { padding: 0 !important; min-height: 100vh; border-bottom: none !important; position: relative; }
    .lov-deck .lov-section::before, .lov-deck .lov-section::after {
      content:""; position: absolute; left:0; right:0; height: 80px; background: #000; z-index: 5; pointer-events: none;
    }
    .lov-deck .lov-section::before { top: 0; }
    .lov-deck .lov-section::after { bottom: 0; }
    .lov-deck .lov-content { padding: 12vh 7vw; z-index: 2; }
    .lov-deck .lov-h1, .lov-deck .lov-h2 { font-weight: 800 !important; letter-spacing: -0.04em !important; text-transform: uppercase; }
    .lov-deck .lov-kicker { color: var(--lov-accent) !important; letter-spacing: 0.4em !important; font-size: clamp(11px,0.9vw,16px) !important; }
    .lov-deck .lov-subtitle, .lov-deck .lov-body { font-weight: 300 !important; opacity: 0.88; max-width: 900px; }
    .lov-deck .lov-bullets li::before { background: var(--lov-accent) !important; width: 0.4rem !important; height: 0.4rem !important; }
  `,
};

/** 8-point Pegtop star (our brand) — small spinner used in inline buttons. */
const SpinningStar = ({ size = 14 }: { size?: number }) => (
  <motion.svg
    width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"
    className="text-fuchsia-500 shrink-0"
    animate={{ rotate: [0, 180, 360], scale: [1, 1.12, 1] }}
    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
  >
    <path d="M50 5 L60 40 L95 50 L60 60 L50 95 L40 60 L5 50 L40 40 Z" fill="currentColor" />
  </motion.svg>
);

/* ------------------------------------------------------------------ */
/* Slide → HTML                                                        */
/* ------------------------------------------------------------------ */

const esc = (s: string | undefined) =>
  (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// 8-point Pegtop star (our brand) — used as image fallback while loading or on error.
const STAR_SVG = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="lov-star-svg" aria-hidden="true"><path d="M50 5 L60 40 L95 50 L60 60 L50 95 L40 60 L5 50 L40 40 Z" fill="currentColor"/></svg>`;

function imgWithFallback(url: string | undefined, cls = "lov-media"): string {
  if (!url) return `<div class="${cls} lov-media-empty"><span class="lov-star">${STAR_SVG}</span></div>`;
  // onerror: replace the parent's content with star fallback so we never show a broken image icon.
  const onerr = "this.parentElement.innerHTML='<span class=\\'lov-star\\'>" + STAR_SVG.replace(/'/g, "\\'") + "</span>';this.parentElement.classList.add('lov-media-empty');";
  return `<div class="${cls}"><img src="${esc(url)}" alt="" loading="lazy" decoding="async" onerror="${onerr}" /></div>`;
}

// Map the AI's 40-layout vocabulary onto our internal renderer types.
// Each alias resolves to an existing handler — many AI layouts share a base renderer
// but get unique visuals via `variant` (8 surface styles) + `accent` (6 decorations).
// Effective combinations: ~40 layouts × 8 variants × 6 accents ≈ 1900 distinct designs.
const LAYOUT_ALIASES: Record<string, string> = {
  // text+image
  "image-bottom": "image-top", "image-side-card": "split-right",
  "focus-image": "centered", "magazine-cover": "image-full",
  "diagonal-split": "image-full", "polaroid": "image-top",
  // text-only
  "centered-narrow": "centered", "left-aligned-hero": "centered",
  "right-aligned-hero": "centered", "definition": "callout",
  "manifesto": "callout", "poster-typo": "callout", "pull-quote": "callout",
  // grid/columns
  "four-col": "three-col", "bento": "three-col", "masonry-cards": "gallery",
  "pillars": "three-col", "icon-grid": "three-col", "ribbon-cards": "three-col",
  // compare
  "before-after": "comparison", "vs-split": "comparison", "table-compare": "comparison",
  // data
  "stat-cluster": "big-number", "stat-circles": "stats", "kpi-strip": "stats",
  // narrative
  "numbered-list": "process", "step-vertical": "process",
  "timeline-horizontal": "timeline", "story-rows": "timeline",
  // media
  "image-grid-2": "gallery", "image-grid-4": "gallery", "carousel-strip": "gallery",
};

function normalizeLayout(l?: string): string {
  if (!l) return "";
  const k = l.toLowerCase().trim();
  return LAYOUT_ALIASES[k] || k;
}

const VARIANTS = new Set(["glass","outline","filled","gradient","neon","paper","mono"]);
const ACCENTS = new Set(["top","left","corner","underline","side-bar"]);

function injectClasses(html: string, slide: SlideData): string {
  const v = (slide.variant || "").toLowerCase();
  const a = (slide.accent || "").toLowerCase();
  const vCls = VARIANTS.has(v) ? ` lov-v-${v}` : "";
  const aCls = ACCENTS.has(a) ? ` lov-a-${a}` : "";
  // Carry the original layout name onto the section as a data attribute so CSS
  // can target specific micro-variations (e.g. magazine-cover vs image-full).
  const orig = (slide.layout || "").toLowerCase().trim();
  const dataLayout = orig ? ` data-layout="${orig}"` : "";
  if (!vCls && !aCls && !dataLayout) return html;
  return html.replace(/class="lov-section([^"]*)"/, (m, rest) => `class="lov-section${rest}${vCls}${aCls}"${dataLayout}`);
}

function slideHtml(slide: SlideData, idx: number, palette: SlideDeck["palette"], total: number): string {
  // Alias normalization — let the AI pick any of 40 layout names; we map to base renderers.
  if (slide.layout) slide = { ...slide, layout: normalizeLayout(slide.layout) };
  return injectClasses(_slideHtmlBase(slide, idx, palette, total), slide);
}

/** Inline-SVG chart renderer — bar / line / donut. No JS runtime needed. */
function chartSlideHtml(
  slide: SlideData,
  idx: number,
  palette: SlideDeck["palette"],
  total: number,
  kicker: string,
  idxLabel: string,
): string {
  const kind = slide.chart?.kind || "bar";
  const data = (slide.chart?.data || []).slice(0, 10);
  const W = 1200, H = 520, PAD = 80;
  const max = Math.max(1, ...data.map(d => Number(d.value) || 0));
  let svgInner = "";

  if (kind === "donut") {
    const cx = W / 2, cy = H / 2, R = 180, r = 110;
    const totalVal = data.reduce((s, d) => s + (Number(d.value) || 0), 0) || 1;
    let acc = 0;
    const arcs = data.map((d, i) => {
      const v = Number(d.value) || 0;
      const a0 = (acc / totalVal) * Math.PI * 2 - Math.PI / 2;
      acc += v;
      const a1 = (acc / totalVal) * Math.PI * 2 - Math.PI / 2;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const x0 = cx + R * Math.cos(a0), y0 = cy + R * Math.sin(a0);
      const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
      const ix0 = cx + r * Math.cos(a1), iy0 = cy + r * Math.sin(a1);
      const ix1 = cx + r * Math.cos(a0), iy1 = cy + r * Math.sin(a0);
      const op = 0.55 + (0.45 * (i % 3) / 2);
      return `<path d="M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${ix0} ${iy0} A ${r} ${r} 0 ${large} 0 ${ix1} ${iy1} Z" fill="var(--lov-accent)" fill-opacity="${op}" />`;
    }).join("");
    const legend = data.map((d, i) => `<div style="display:flex;align-items:center;gap:.6rem;margin:.35rem 0;"><span style="width:14px;height:14px;border-radius:3px;background:var(--lov-accent);opacity:${0.55 + (0.45 * (i % 3) / 2)}"></span><span class="lov-body" style="font-size:1.05rem;">${esc(d.label)} — <strong>${esc(String(d.value))}</strong></span></div>`).join("");
    svgInner = `<g>${arcs}</g>`;
    return `
<section class="lov-section lov-chart-section" data-slide="${idx}">
  <div class="lov-content">
    ${kicker}
    ${slide.title ? `<h2 class="lov-h2">${esc(slide.title)}</h2>` : ""}
    <div style="display:grid;grid-template-columns: 1.2fr .8fr;gap:3rem;align-items:center;margin-top:2rem;">
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;max-height:520px;">${svgInner}</svg>
      <div>${legend}</div>
    </div>
    ${slide.body ? `<p class="lov-body" style="margin-top:1.5rem;opacity:.85">${esc(slide.body)}</p>` : ""}
  </div>
  ${idxLabel}
</section>`;
  }

  if (kind === "line") {
    const step = (W - PAD * 2) / Math.max(1, data.length - 1);
    const pts = data.map((d, i) => {
      const x = PAD + step * i;
      const y = H - PAD - ((Number(d.value) || 0) / max) * (H - PAD * 2);
      return `${x},${y}`;
    }).join(" ");
    const dots = data.map((d, i) => {
      const x = PAD + step * i;
      const y = H - PAD - ((Number(d.value) || 0) / max) * (H - PAD * 2);
      return `<circle cx="${x}" cy="${y}" r="6" fill="var(--lov-accent)" /><text x="${x}" y="${H - PAD + 28}" text-anchor="middle" font-size="18" fill="var(--lov-fg)" opacity=".7">${esc(d.label)}</text>`;
    }).join("");
    svgInner = `
      <line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" stroke="var(--lov-fg)" stroke-opacity=".25" />
      <polyline points="${pts}" fill="none" stroke="var(--lov-accent)" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" />
      ${dots}`;
  } else {
    // bar
    const bw = (W - PAD * 2) / Math.max(1, data.length) * 0.7;
    const gap = (W - PAD * 2) / Math.max(1, data.length) * 0.3;
    const bars = data.map((d, i) => {
      const x = PAD + i * (bw + gap) + gap / 2;
      const h = ((Number(d.value) || 0) / max) * (H - PAD * 2);
      const y = H - PAD - h;
      return `
        <rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="6" fill="var(--lov-accent)" />
        <text x="${x + bw / 2}" y="${y - 12}" text-anchor="middle" font-size="20" font-weight="700" fill="var(--lov-fg)">${esc(String(d.value))}</text>
        <text x="${x + bw / 2}" y="${H - PAD + 28}" text-anchor="middle" font-size="18" fill="var(--lov-fg)" opacity=".7">${esc(d.label)}</text>`;
    }).join("");
    svgInner = `<line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" stroke="var(--lov-fg)" stroke-opacity=".25" />${bars}`;
  }

  return `
<section class="lov-section lov-chart-section" data-slide="${idx}">
  <div class="lov-content">
    ${kicker}
    ${slide.title ? `<h2 class="lov-h2">${esc(slide.title)}</h2>` : ""}
    ${slide.subtitle ? `<p class="lov-subtitle">${esc(slide.subtitle)}</p>` : ""}
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;max-height:560px;margin-top:1.6rem;">${svgInner}</svg>
    ${slide.body ? `<p class="lov-body" style="margin-top:1.5rem;opacity:.85">${esc(slide.body)}</p>` : ""}
  </div>
  ${idxLabel}
</section>`;
}

function _slideHtmlBase(slide: SlideData, idx: number, palette: SlideDeck["palette"], total: number): string {
  const kicker = slide.kicker ? `<div class="lov-kicker">${esc(slide.kicker)}</div>` : "";
  const idxLabel = `<div class="lov-index">${String(idx + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}</div>`;
  const img = slide.image ? imgWithFallback(slide.image) : "";

  if (slide.type === "cover") {
    return `
<section class="lov-section lov-cover" data-slide="${idx}">
  ${slide.image ? `<img class="lov-cover-bg" src="${esc(slide.image)}" alt="" onerror="this.style.display='none'" />` : ""}
  <div class="lov-cover-veil"></div>
  <div class="lov-content lov-content-center">
    ${kicker}
    <h1 class="lov-h1">${esc(slide.title)}</h1>
    ${slide.subtitle ? `<p class="lov-subtitle">${esc(slide.subtitle)}</p>` : ""}
  </div>
  ${idxLabel}
</section>`;
  }

  if (slide.type === "quote") {
    return `
<section class="lov-section lov-quote-section" data-slide="${idx}">
  <div class="lov-content lov-content-center">
    <div class="lov-quote-mark">"</div>
    <blockquote class="lov-quote">${esc(slide.quote)}</blockquote>
    ${slide.attribution ? `<cite class="lov-cite">— ${esc(slide.attribution)}</cite>` : ""}
  </div>
  ${idxLabel}
</section>`;
  }

  if (slide.type === "stats" && slide.stats?.length) {
    const items = slide.stats.map((s) => `
      <div class="lov-stat">
        <div class="lov-stat-value">${esc(s.value)}</div>
        <div class="lov-stat-label">${esc(s.label)}</div>
      </div>`).join("");
    return `
<section class="lov-section lov-stats-section" data-slide="${idx}">
  <div class="lov-content">
    ${kicker}
    ${slide.title ? `<h2 class="lov-h2">${esc(slide.title)}</h2>` : ""}
    <div class="lov-stats-grid">${items}</div>
  </div>
  ${idxLabel}
</section>`;
  }

  if ((slide.type === "chart" || (slide.layout || "").startsWith("chart")) && slide.chart?.data?.length) {
    return chartSlideHtml(slide, idx, palette, total, kicker, idxLabel);
  }

  if (slide.type === "closing") {
    return `
<section class="lov-section lov-closing" data-slide="${idx}">
  <div class="lov-content lov-content-center">
    ${kicker}
    <h1 class="lov-h1">${esc(slide.title)}</h1>
    ${slide.subtitle ? `<p class="lov-subtitle">${esc(slide.subtitle)}</p>` : ""}
    ${slide.body ? `<p class="lov-body">${esc(slide.body)}</p>` : ""}
  </div>
  ${idxLabel}
</section>`;
  }

  // ── Custom layouts for content slides ─────────────────────────────
  const layout = (slide.layout || "").toLowerCase();
  const bulletsList = (arr?: string[]) =>
    arr?.length ? `<ul class="lov-bullets">${arr.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : "";
  const bullets = bulletsList(slide.bullets);

  if (layout === "big-number") {
    return `
<section class="lov-section lov-bignum" data-slide="${idx}">
  <div class="lov-content lov-content-center">
    ${kicker}
    <div class="lov-bignum-value">${esc(slide.big_value || slide.title || "")}</div>
    ${slide.big_label ? `<div class="lov-bignum-label">${esc(slide.big_label)}</div>` : ""}
    ${slide.body ? `<p class="lov-body" style="max-width:900px;text-align:center;margin:2rem auto 0">${esc(slide.body)}</p>` : ""}
  </div>
  ${idxLabel}
</section>`;
  }

  if (layout === "callout") {
    return `
<section class="lov-section lov-callout" data-slide="${idx}">
  <div class="lov-content lov-content-center">
    ${kicker}
    <h2 class="lov-callout-text">${esc(slide.title || "")}</h2>
    ${slide.subtitle ? `<p class="lov-subtitle" style="text-align:center">${esc(slide.subtitle)}</p>` : ""}
  </div>
  ${idxLabel}
</section>`;
  }

  if (layout === "comparison") {
    const lb = bulletsList(slide.left_bullets);
    const rb = bulletsList(slide.right_bullets);
    return `
<section class="lov-section lov-compare" data-slide="${idx}">
  <div class="lov-content">
    ${kicker}
    ${slide.title ? `<h2 class="lov-h2">${esc(slide.title)}</h2>` : ""}
    <div class="lov-compare-grid">
      <div class="lov-compare-col">
        ${slide.left_title ? `<h3 class="lov-compare-title">${esc(slide.left_title)}</h3>` : ""}
        ${lb}
      </div>
      <div class="lov-compare-divider"></div>
      <div class="lov-compare-col">
        ${slide.right_title ? `<h3 class="lov-compare-title" style="color:var(--lov-accent)">${esc(slide.right_title)}</h3>` : ""}
        ${rb}
      </div>
    </div>
  </div>
  ${idxLabel}
</section>`;
  }

  if (layout === "process" && slide.steps?.length) {
    const steps = slide.steps.map((st, i) => `
      <div class="lov-step">
        <div class="lov-step-num">${String(i + 1).padStart(2, "0")}</div>
        <div class="lov-step-body">
          <h4 class="lov-step-title">${esc(st.title)}</h4>
          ${st.desc ? `<p class="lov-step-desc">${esc(st.desc)}</p>` : ""}
        </div>
      </div>`).join("");
    return `
<section class="lov-section lov-process" data-slide="${idx}">
  <div class="lov-content">
    ${kicker}
    ${slide.title ? `<h2 class="lov-h2">${esc(slide.title)}</h2>` : ""}
    <div class="lov-steps">${steps}</div>
  </div>
  ${idxLabel}
</section>`;
  }

  if (layout === "timeline" && slide.events?.length) {
    const events = slide.events.map((ev) => `
      <div class="lov-event">
        <div class="lov-event-date">${esc(ev.date)}</div>
        <div class="lov-event-body">
          <h4 class="lov-event-title">${esc(ev.title)}</h4>
          ${ev.desc ? `<p class="lov-event-desc">${esc(ev.desc)}</p>` : ""}
        </div>
      </div>`).join("");
    return `
<section class="lov-section lov-timeline" data-slide="${idx}">
  <div class="lov-content">
    ${kicker}
    ${slide.title ? `<h2 class="lov-h2">${esc(slide.title)}</h2>` : ""}
    <div class="lov-events">${events}</div>
  </div>
  ${idxLabel}
</section>`;
  }

  if (layout === "gallery" && slide.images?.length) {
    const imgs = slide.images.slice(0, 4).map((u) => `<div class="lov-gal-item">${imgWithFallback(u, "lov-media")}</div>`).join("");
    return `
<section class="lov-section lov-gallery" data-slide="${idx}">
  <div class="lov-content">
    ${kicker}
    ${slide.title ? `<h2 class="lov-h2">${esc(slide.title)}</h2>` : ""}
    ${slide.subtitle ? `<p class="lov-subtitle">${esc(slide.subtitle)}</p>` : ""}
    <div class="lov-gallery-grid lov-gal-${Math.min(slide.images.length, 4)}">${imgs}</div>
  </div>
  ${idxLabel}
</section>`;
  }

  if (layout === "two-col") {
    const lb = bulletsList(slide.left_bullets) || `<p class="lov-body">${esc(slide.body || "")}</p>`;
    const rb = bulletsList(slide.right_bullets) || bullets;
    return `
<section class="lov-section lov-twocol" data-slide="${idx}">
  <div class="lov-content">
    ${kicker}
    ${slide.title ? `<h2 class="lov-h2">${esc(slide.title)}</h2>` : ""}
    ${slide.subtitle ? `<p class="lov-subtitle">${esc(slide.subtitle)}</p>` : ""}
    <div class="lov-twocol-grid">
      <div>${lb}</div>
      <div>${rb}</div>
    </div>
  </div>
  ${idxLabel}
</section>`;
  }

  if (layout === "three-col" && slide.bullets?.length) {
    const cards = slide.bullets.slice(0, 3).map((b, i) => `
      <div class="lov-tri-card">
        <div class="lov-tri-num">${String(i + 1).padStart(2, "0")}</div>
        <p class="lov-tri-text">${esc(b)}</p>
      </div>`).join("");
    return `
<section class="lov-section lov-three" data-slide="${idx}">
  <div class="lov-content">
    ${kicker}
    ${slide.title ? `<h2 class="lov-h2">${esc(slide.title)}</h2>` : ""}
    ${slide.subtitle ? `<p class="lov-subtitle">${esc(slide.subtitle)}</p>` : ""}
    <div class="lov-three-grid">${cards}</div>
  </div>
  ${idxLabel}
</section>`;
  }

  if (layout === "image-full" && slide.image) {
    return `
<section class="lov-section lov-imgfull" data-slide="${idx}">
  <img class="lov-imgfull-bg" src="${esc(slide.image)}" alt="" onerror="this.style.display='none'" />
  <div class="lov-imgfull-veil"></div>
  <div class="lov-content">
    ${kicker}
    ${slide.title ? `<h2 class="lov-h1" style="font-size:clamp(48px,7vw,128px)">${esc(slide.title)}</h2>` : ""}
    ${slide.subtitle ? `<p class="lov-subtitle">${esc(slide.subtitle)}</p>` : ""}
    ${slide.body ? `<p class="lov-body">${esc(slide.body)}</p>` : ""}
  </div>
  ${idxLabel}
</section>`;
  }

  if (layout === "image-top" && slide.image) {
    return `
<section class="lov-section lov-imgtop" data-slide="${idx}">
  <div class="lov-content">
    ${kicker}
    <div class="lov-media lov-imgtop-media">${imgWithFallback(slide.image, "lov-media")}</div>
    ${slide.title ? `<h2 class="lov-h2" style="margin-top:2rem">${esc(slide.title)}</h2>` : ""}
    ${slide.subtitle ? `<p class="lov-subtitle">${esc(slide.subtitle)}</p>` : ""}
    ${slide.body ? `<p class="lov-body">${esc(slide.body)}</p>` : ""}
    ${bullets}
  </div>
  ${idxLabel}
</section>`;
  }

  if (layout === "centered") {
    return `
<section class="lov-section lov-centered" data-slide="${idx}">
  <div class="lov-content lov-content-center">
    ${kicker}
    ${slide.title ? `<h2 class="lov-h2" style="text-align:center">${esc(slide.title)}</h2>` : ""}
    ${slide.subtitle ? `<p class="lov-subtitle" style="text-align:center">${esc(slide.subtitle)}</p>` : ""}
    ${slide.body ? `<p class="lov-body" style="text-align:center;margin-left:auto;margin-right:auto">${esc(slide.body)}</p>` : ""}
  </div>
  ${idxLabel}
</section>`;
  }

  // split-left / split-right (and default)
  const flipImage = layout === "split-left";
  const gridStyle = flipImage ? "grid-template-columns: 1fr 1.2fr;" : "";
  const textOrder = flipImage ? "order:2;" : "";
  const imgOrder = flipImage ? "order:1;" : "";
  return `
<section class="lov-section lov-content-slide" data-slide="${idx}">
  <div class="lov-grid" style="${gridStyle}">
    <div class="lov-text" style="${textOrder}">
      ${kicker}
      ${slide.title ? `<h2 class="lov-h2">${esc(slide.title)}</h2>` : ""}
      ${slide.subtitle ? `<p class="lov-subtitle">${esc(slide.subtitle)}</p>` : ""}
      ${slide.body ? `<p class="lov-body">${esc(slide.body)}</p>` : ""}
      ${bullets}
    </div>
    ${img ? `<div style="${imgOrder}">${img}</div>` : ""}
  </div>
  ${idxLabel}
</section>`;
}

/* ------------------------------------------------------------------ */
/* Build full document                                                 */
/* ------------------------------------------------------------------ */

const SLIDE_BASE_CSS = (p: SlideDeck["palette"]) => `
  :root {
    --lov-bg: ${p.bg};
    --lov-fg: ${p.fg};
    --lov-primary: ${p.primary};
    --lov-accent: ${p.accent};
  }
  /* Reset chrome */
  nav, header, footer, [role="navigation"], [role="banner"], [role="contentinfo"],
  .nav, .navbar, .header, .footer, .menu, .topbar, .navigation,
  [class*="navigation"], [class*="navbar"], [class*="topbar"],
  [id*="nav-"], [id*="header-"], [id*="footer-"] { display: none !important; }
  button, [role="button"], .btn, .button, .cta, [class*="cta-"], [class*="-cta"],
  a[href^="#contact"], a[href^="mailto:"], form, .social, [class*="social-"] { display: none !important; }
  *[style*="position: fixed"][style*="top: 0"],
  *[style*="position:fixed"][style*="top:0"] { display: none !important; }

  html, body {
    background: var(--lov-bg) !important; color: var(--lov-fg) !important;
    margin: 0 !important; padding: 0 !important;
    width: 100% !important; min-height: 100% !important; height: auto !important;
    overflow-x: hidden !important; overflow-y: auto !important;
    -webkit-overflow-scrolling: touch; touch-action: pan-y;
  }
  body { font-size: 18px; position: static !important; }

  /* Background canvas — let the template's three.js / animated bg keep running */
  body > canvas, body > #bg, body > .bg, body > .background, body > [class*="canvas"] {
    position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important;
    z-index: 0 !important; pointer-events: none !important;
  }

  /* ── Lov slide content ─────────────────────────────────────────── */
  .lov-deck { position: relative; z-index: 1; min-height: 100vh; height: auto !important; overflow: visible !important; }
  .lov-section {
    position: relative; min-height: 100vh; padding: 9vh 6vw;
    display: flex; align-items: center; justify-content: center;
    border-bottom: 1px solid color-mix(in oklab, var(--lov-fg) 8%, transparent);
  }
  .lov-content { width: 100%; max-width: 1680px; position: relative; z-index: 2; }
  .lov-content-center { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1.2rem; }
  .lov-kicker {
    font-size: clamp(13px, 1vw, 18px); letter-spacing: 0.32em; text-transform: uppercase;
    color: var(--lov-accent); font-weight: 700; margin-bottom: 1.2rem;
  }
  .lov-h1 {
    font-size: clamp(64px, 9vw, 168px); line-height: 0.95; letter-spacing: -0.02em;
    font-weight: 800; margin: 0; color: var(--lov-fg);
  }
  .lov-h2 {
    font-size: clamp(44px, 6.2vw, 112px); line-height: 1.0; letter-spacing: -0.01em;
    font-weight: 800; margin: 0 0 1.5rem; color: var(--lov-fg);
  }
  .lov-subtitle {
    font-size: clamp(22px, 2.2vw, 36px); line-height: 1.4; opacity: 0.85; margin: 0.5rem 0 0; max-width: 1100px;
  }
  .lov-body {
    font-size: clamp(20px, 1.6vw, 28px); line-height: 1.55; margin: 1.5rem 0; max-width: 980px; opacity: 0.92;
  }
  .lov-bullets {
    list-style: none; padding: 0; margin: 1.5rem 0; display: grid; gap: 1rem;
  }
  .lov-bullets li {
    font-size: clamp(20px, 1.6vw, 28px); line-height: 1.5; padding-inline-start: 1.6rem; position: relative;
  }
  .lov-bullets li::before {
    content: ""; position: absolute; inset-inline-start: 0; top: 0.7em; width: 0.7rem; height: 0.7rem;
    background: var(--lov-accent); border-radius: 999px;
  }
  .lov-grid {
    display: grid; grid-template-columns: 1.2fr 1fr; gap: 4vw; align-items: center; width: 100%; max-width: 1680px;
  }
  @media (max-width: 900px) { .lov-grid { grid-template-columns: 1fr; } }
  .lov-text { min-width: 0; }
  .lov-media { position: relative; aspect-ratio: 4/3; border-radius: 24px; overflow: hidden;
    box-shadow: 0 30px 80px -20px rgba(0,0,0,0.55);
  }
  .lov-media img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }

  /* Cover */
  .lov-cover { min-height: 100vh; }
  .lov-cover-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.42; z-index: 0; }
  .lov-cover-veil {
    position: absolute; inset: 0; z-index: 1;
    background: linear-gradient(180deg, transparent, color-mix(in oklab, var(--lov-bg) 75%, transparent));
  }

  /* Quote */
  .lov-quote-mark {
    font-family: Georgia, "Times New Roman", serif;
    font-size: clamp(120px, 16vw, 280px); line-height: 0.6; color: var(--lov-accent);
    margin-bottom: -1rem;
  }
  .lov-quote {
    font-family: Georgia, "Times New Roman", serif;
    font-size: clamp(36px, 4.2vw, 84px); line-height: 1.18; font-weight: 500; max-width: 1400px; margin: 0;
  }
  .lov-cite {
    margin-top: 1.6rem; font-size: clamp(18px, 1.4vw, 26px); letter-spacing: 0.18em;
    text-transform: uppercase; opacity: 0.7; font-style: normal;
  }

  /* Stats */
  .lov-stats-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 2.4rem; margin-top: 2.5rem;
  }
  .lov-stat { text-align: start; }
  .lov-stat-value {
    font-size: clamp(56px, 8vw, 144px); line-height: 0.95; font-weight: 800;
    color: var(--lov-accent); letter-spacing: -0.02em;
  }
  .lov-stat-label {
    margin-top: 0.6rem; font-size: clamp(15px, 1.1vw, 20px); letter-spacing: 0.18em;
    text-transform: uppercase; opacity: 0.75;
  }

  /* Index */
  .lov-index {
    position: absolute; bottom: 4vh; inset-inline-end: 4vw;
    font-size: clamp(13px, 0.9vw, 16px); letter-spacing: 0.32em; opacity: 0.55; z-index: 3;
  }

  /* ── Star fallback for missing/broken images ──────────────────── */
  .lov-media-empty {
    background: linear-gradient(135deg, color-mix(in oklab, var(--lov-primary) 18%, var(--lov-bg)),
      color-mix(in oklab, var(--lov-accent) 12%, var(--lov-bg)));
    display: flex; align-items: center; justify-content: center;
  }
  .lov-star {
    color: var(--lov-accent); width: 22%; aspect-ratio: 1; display: block;
    filter: drop-shadow(0 8px 24px color-mix(in oklab, var(--lov-accent) 35%, transparent));
    animation: lovSpin 14s linear infinite;
  }
  .lov-star-svg { width: 100%; height: 100%; }
  @keyframes lovSpin { to { transform: rotate(360deg); } }

  /* ── Scroll-in animations on every section ───────────────────── */
  .lov-deck .lov-section > * { will-change: transform, opacity; }
  .lov-section .lov-content,
  .lov-section .lov-grid,
  .lov-section .lov-stats-grid,
  .lov-section .lov-quote,
  .lov-section .lov-cite,
  .lov-section .lov-quote-mark,
  .lov-section .lov-media {
    opacity: 0; transform: translateY(48px);
    transition: opacity 0.9s cubic-bezier(0.22,1,0.36,1), transform 0.9s cubic-bezier(0.22,1,0.36,1);
  }
  .lov-section.lov-in .lov-content,
  .lov-section.lov-in .lov-grid,
  .lov-section.lov-in .lov-stats-grid,
  .lov-section.lov-in .lov-quote,
  .lov-section.lov-in .lov-cite,
  .lov-section.lov-in .lov-quote-mark,
  .lov-section.lov-in .lov-media { opacity: 1; transform: none; }
  /* Stagger headline → body → list/bullets */
  .lov-section.lov-in .lov-kicker { animation: lovUp 0.7s 0.05s cubic-bezier(0.22,1,0.36,1) backwards; }
  .lov-section.lov-in .lov-h1,
  .lov-section.lov-in .lov-h2 { animation: lovUp 0.9s 0.15s cubic-bezier(0.22,1,0.36,1) backwards; }
  .lov-section.lov-in .lov-subtitle { animation: lovUp 0.9s 0.28s cubic-bezier(0.22,1,0.36,1) backwards; }
  .lov-section.lov-in .lov-body { animation: lovUp 0.9s 0.4s cubic-bezier(0.22,1,0.36,1) backwards; }
  .lov-section.lov-in .lov-bullets li {
    animation: lovUp 0.7s cubic-bezier(0.22,1,0.36,1) backwards;
  }
  .lov-section.lov-in .lov-bullets li:nth-child(1) { animation-delay: 0.45s; }
  .lov-section.lov-in .lov-bullets li:nth-child(2) { animation-delay: 0.55s; }
  .lov-section.lov-in .lov-bullets li:nth-child(3) { animation-delay: 0.65s; }
  .lov-section.lov-in .lov-bullets li:nth-child(4) { animation-delay: 0.75s; }
  .lov-section.lov-in .lov-bullets li:nth-child(5) { animation-delay: 0.85s; }
  .lov-section.lov-in .lov-bullets li:nth-child(n+6) { animation-delay: 0.95s; }
  .lov-section.lov-in .lov-stat { animation: lovUp 0.7s cubic-bezier(0.22,1,0.36,1) backwards; }
  .lov-section.lov-in .lov-stat:nth-child(1) { animation-delay: 0.25s; }
  .lov-section.lov-in .lov-stat:nth-child(2) { animation-delay: 0.4s; }
  .lov-section.lov-in .lov-stat:nth-child(3) { animation-delay: 0.55s; }
  .lov-section.lov-in .lov-stat:nth-child(4) { animation-delay: 0.7s; }
  @keyframes lovUp {
    from { opacity: 0; transform: translateY(40px); }
    to   { opacity: 1; transform: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .lov-section .lov-content, .lov-section .lov-grid, .lov-section .lov-stats-grid,
    .lov-section .lov-media, .lov-section .lov-quote, .lov-section .lov-cite,
    .lov-section .lov-quote-mark { opacity: 1 !important; transform: none !important; transition: none !important; }
    .lov-section.lov-in * { animation: none !important; }
  }

  /* RTL */
  [dir="rtl"] .lov-grid { grid-template-columns: 1fr 1.2fr; }
  [dir="rtl"] .lov-bullets li { padding-inline-start: 1.6rem; }

  /* ── Mobile design (custom) ───────────────────────────────────── */
  @media (max-width: 768px) {
    body { font-size: 16px; }
    .lov-section { min-height: auto; padding: 64px 22px; }
    .lov-content { gap: 0.8rem; }
    .lov-h1 { font-size: clamp(40px, 11vw, 64px) !important; line-height: 1.0; }
    .lov-h2 { font-size: clamp(32px, 8.5vw, 52px) !important; line-height: 1.05; margin-bottom: 1rem; }
    .lov-subtitle { font-size: clamp(17px, 4.5vw, 22px) !important; }
    .lov-body { font-size: clamp(15px, 4vw, 18px) !important; line-height: 1.6; margin: 1rem 0; }
    .lov-bullets { gap: 0.6rem; margin: 1rem 0; }
    .lov-bullets li { font-size: clamp(15px, 4vw, 18px) !important; padding-inline-start: 1.2rem; }
    .lov-bullets li::before { width: 0.5rem; height: 0.5rem; top: 0.55em; }
    .lov-grid { grid-template-columns: 1fr !important; gap: 1.5rem; }
    .lov-media { aspect-ratio: 16/10; border-radius: 16px; }
    .lov-quote { font-size: clamp(24px, 6.5vw, 34px) !important; line-height: 1.25; }
    .lov-quote-mark { font-size: clamp(80px, 22vw, 120px) !important; }
    .lov-cite { font-size: 13px !important; }
    .lov-stats-grid { grid-template-columns: repeat(2, 1fr); gap: 1.4rem; margin-top: 1.5rem; }
    .lov-stat-value { font-size: clamp(36px, 12vw, 56px) !important; }
    .lov-stat-label { font-size: 11px !important; letter-spacing: 0.14em; }
    .lov-kicker { font-size: 11px !important; letter-spacing: 0.22em; margin-bottom: 0.6rem; }
    .lov-index { bottom: 16px; inset-inline-end: 18px; font-size: 11px !important; letter-spacing: 0.22em; }
    .lov-cover-bg { opacity: 0.32; }
  }
  @media (max-width: 480px) {
    .lov-section { padding: 56px 18px; }
    .lov-stats-grid { grid-template-columns: 1fr; }
  }

  /* ── New custom layouts ───────────────────────────────────────── */
  .lov-bignum-value {
    font-size: clamp(120px, 22vw, 360px); line-height: 0.85; font-weight: 900;
    color: var(--lov-accent); letter-spacing: -0.04em; margin: 0;
    background: linear-gradient(135deg, var(--lov-accent), color-mix(in oklab, var(--lov-primary) 70%, var(--lov-accent)));
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  }
  .lov-bignum-label {
    margin-top: 1rem; font-size: clamp(20px, 2vw, 32px); letter-spacing: 0.16em;
    text-transform: uppercase; opacity: 0.78; font-weight: 600;
  }
  @media (max-width: 768px) {
    .lov-bignum-value { font-size: clamp(80px, 32vw, 160px) !important; }
    .lov-bignum-label { font-size: 14px !important; letter-spacing: 0.12em; }
  }

  .lov-callout { background: linear-gradient(135deg, color-mix(in oklab, var(--lov-primary) 14%, var(--lov-bg)), var(--lov-bg)); }
  .lov-callout-text {
    font-size: clamp(40px, 6vw, 96px); line-height: 1.1; font-weight: 800;
    max-width: 1400px; margin: 0 auto; text-align: center;
    background: linear-gradient(135deg, var(--lov-fg), var(--lov-accent));
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  }
  @media (max-width: 768px) { .lov-callout-text { font-size: clamp(28px, 7.5vw, 44px) !important; } }

  .lov-compare-grid { display: grid; grid-template-columns: 1fr 1px 1fr; gap: 3vw; margin-top: 2rem; align-items: start; }
  .lov-compare-divider { background: linear-gradient(180deg, transparent, var(--lov-accent), transparent); width: 1px; min-height: 60vh; }
  .lov-compare-title { font-size: clamp(22px, 2.4vw, 36px); font-weight: 700; margin: 0 0 1.5rem; letter-spacing: -0.01em; }
  @media (max-width: 768px) {
    .lov-compare-grid { grid-template-columns: 1fr; gap: 1.5rem; }
    .lov-compare-divider { width: 100%; min-height: 1px; height: 1px; background: linear-gradient(90deg, transparent, var(--lov-accent), transparent); }
  }

  .lov-steps { display: grid; gap: 1.4rem; margin-top: 2.2rem; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
  .lov-step {
    background: color-mix(in oklab, var(--lov-fg) 5%, transparent);
    border: 1px solid color-mix(in oklab, var(--lov-fg) 10%, transparent);
    border-radius: 20px; padding: 1.8rem 1.6rem;
  }
  .lov-step-num { font-size: clamp(40px, 4vw, 64px); font-weight: 900; line-height: 1; color: var(--lov-accent); opacity: 0.85; margin-bottom: 0.8rem; }
  .lov-step-title { font-size: clamp(18px, 1.6vw, 24px); font-weight: 700; margin: 0 0 0.5rem; }
  .lov-step-desc { font-size: clamp(14px, 1.1vw, 17px); opacity: 0.82; margin: 0; line-height: 1.55; }

  .lov-events { margin-top: 2rem; display: grid; gap: 1.4rem; position: relative; }
  .lov-events::before { content: ""; position: absolute; inset-inline-start: 110px; top: 0.4rem; bottom: 0.4rem; width: 2px; background: color-mix(in oklab, var(--lov-accent) 40%, transparent); }
  .lov-event { display: grid; grid-template-columns: 110px 1fr; gap: 1.5rem; align-items: start; position: relative; }
  .lov-event::before { content: ""; position: absolute; inset-inline-start: 104px; top: 0.55rem; width: 14px; height: 14px; border-radius: 999px; background: var(--lov-accent); box-shadow: 0 0 0 4px color-mix(in oklab, var(--lov-accent) 25%, transparent); }
  .lov-event-date { font-size: clamp(14px, 1.1vw, 18px); font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--lov-accent); padding-top: 0.2rem; }
  .lov-event-title { font-size: clamp(18px, 1.7vw, 26px); font-weight: 700; margin: 0 0 0.4rem; }
  .lov-event-desc { font-size: clamp(14px, 1.1vw, 17px); opacity: 0.85; margin: 0; line-height: 1.55; }
  @media (max-width: 640px) {
    .lov-events::before { inset-inline-start: 8px; }
    .lov-event { grid-template-columns: 1fr; gap: 0.4rem; padding-inline-start: 28px; }
    .lov-event::before { inset-inline-start: 2px; top: 0.3rem; }
  }

  .lov-gallery-grid { margin-top: 2rem; display: grid; gap: 1.2rem; }
  .lov-gal-2 { grid-template-columns: 1fr 1fr; }
  .lov-gal-3 { grid-template-columns: 2fr 1fr 1fr; grid-auto-rows: minmax(220px, 1fr); }
  .lov-gal-3 .lov-gal-item:first-child { grid-row: span 2; }
  .lov-gal-4 { grid-template-columns: repeat(2, 1fr); }
  .lov-gal-item .lov-media { aspect-ratio: auto; height: 100%; min-height: 220px; }
  @media (max-width: 768px) {
    .lov-gallery-grid { grid-template-columns: 1fr 1fr !important; gap: 0.6rem; }
    .lov-gal-3 .lov-gal-item:first-child { grid-row: auto; }
    .lov-gal-item .lov-media { min-height: 140px; aspect-ratio: 1; }
  }

  .lov-twocol-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3vw; margin-top: 2rem; }
  @media (max-width: 768px) { .lov-twocol-grid { grid-template-columns: 1fr; gap: 1rem; } }

  .lov-three-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.6rem; margin-top: 2rem; }
  .lov-tri-card {
    background: color-mix(in oklab, var(--lov-fg) 5%, transparent);
    border: 1px solid color-mix(in oklab, var(--lov-fg) 10%, transparent);
    border-radius: 24px; padding: 2.2rem 1.8rem;
  }
  .lov-tri-num { font-size: clamp(36px, 3.4vw, 56px); font-weight: 900; line-height: 1; color: var(--lov-accent); margin-bottom: 1rem; }
  .lov-tri-text { font-size: clamp(16px, 1.3vw, 22px); line-height: 1.5; margin: 0; opacity: 0.92; }
  @media (max-width: 900px) { .lov-three-grid { grid-template-columns: 1fr; } }

  .lov-imgfull { padding: 0; min-height: 100vh; }
  .lov-imgfull-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }
  .lov-imgfull-veil { position: absolute; inset: 0; z-index: 1; background: linear-gradient(135deg, color-mix(in oklab, var(--lov-bg) 88%, transparent), color-mix(in oklab, var(--lov-bg) 40%, transparent)); }
  .lov-imgfull .lov-content { padding: 9vh 6vw; max-width: 1200px; }

  .lov-imgtop .lov-imgtop-media { aspect-ratio: 21/9; width: 100%; max-height: 60vh; }

  /* ── Surface variants — applied to all card-like children ─────── */
  .lov-v-glass .lov-step, .lov-v-glass .lov-tri-card {
    background: color-mix(in oklab, var(--lov-fg) 6%, transparent);
    backdrop-filter: blur(20px) saturate(140%); -webkit-backdrop-filter: blur(20px) saturate(140%);
    border: 1px solid color-mix(in oklab, var(--lov-fg) 14%, transparent);
    box-shadow: inset 0 1px 0 color-mix(in oklab, var(--lov-fg) 12%, transparent);
  }
  .lov-v-outline .lov-step, .lov-v-outline .lov-tri-card {
    background: transparent; box-shadow: none;
    border: 1.5px solid color-mix(in oklab, var(--lov-accent) 45%, transparent);
  }
  .lov-v-filled .lov-step, .lov-v-filled .lov-tri-card {
    background: color-mix(in oklab, var(--lov-accent) 14%, var(--lov-bg));
    border: 1px solid color-mix(in oklab, var(--lov-accent) 22%, transparent);
  }
  .lov-v-gradient .lov-step, .lov-v-gradient .lov-tri-card {
    background: linear-gradient(135deg, color-mix(in oklab, var(--lov-accent) 18%, var(--lov-bg)), color-mix(in oklab, var(--lov-primary) 10%, var(--lov-bg)));
    border: 1px solid color-mix(in oklab, var(--lov-accent) 25%, transparent);
  }
  .lov-v-neon .lov-step, .lov-v-neon .lov-tri-card {
    background: color-mix(in oklab, var(--lov-bg) 92%, transparent);
    border: 1.5px solid var(--lov-accent);
    box-shadow: 0 0 24px -4px color-mix(in oklab, var(--lov-accent) 55%, transparent), inset 0 0 14px -6px color-mix(in oklab, var(--lov-accent) 35%, transparent);
  }
  .lov-v-paper .lov-step, .lov-v-paper .lov-tri-card {
    background: color-mix(in oklab, #f5f0e6 88%, var(--lov-bg) 12%);
    color: #1a1714;
    border: 1px solid color-mix(in oklab, #c9a84c 30%, transparent);
    box-shadow: 0 14px 40px -16px rgba(0,0,0,0.35), 0 2px 6px -2px rgba(0,0,0,0.18);
  }
  .lov-v-mono .lov-step, .lov-v-mono .lov-tri-card {
    background: var(--lov-fg); color: var(--lov-bg); border: none;
  }
  .lov-v-mono .lov-step .lov-step-num,
  .lov-v-mono .lov-tri-card .lov-tri-num { color: var(--lov-bg); opacity: 0.7; }

  /* ── Accent decorations — applied at section level ────────────── */
  .lov-a-top .lov-content::before {
    content: ""; display: block; width: 80px; height: 4px; border-radius: 4px;
    background: var(--lov-accent); margin-bottom: 1.6rem;
  }
  .lov-a-underline .lov-content > .lov-h2,
  .lov-a-underline .lov-content > .lov-h1 {
    display: inline-block; padding-bottom: 0.5rem; border-bottom: 4px solid var(--lov-accent);
  }
  .lov-a-left .lov-content { padding-inline-start: 2.4rem; position: relative; }
  .lov-a-left .lov-content::before {
    content: ""; position: absolute; inset-inline-start: 0; top: 0.4rem; bottom: 0.4rem;
    width: 5px; border-radius: 4px; background: var(--lov-accent);
  }
  .lov-a-corner::before {
    content: ""; position: absolute; top: 0; inset-inline-end: 0; pointer-events: none; z-index: 1;
    width: 180px; height: 180px;
    background: radial-gradient(circle at top right, color-mix(in oklab, var(--lov-accent) 55%, transparent), transparent 65%);
  }
  .lov-a-side-bar::after {
    content: ""; position: absolute; inset-inline-start: 0; top: 8%; bottom: 8%;
    width: 6px; border-radius: 4px; z-index: 1;
    background: linear-gradient(180deg, transparent, var(--lov-accent), transparent);
  }
  @media (max-width: 768px) {
    .lov-a-corner::before { width: 120px; height: 120px; }
    .lov-a-left .lov-content { padding-inline-start: 1.4rem; }
  }

  /* ── Layout micro-variations via data-layout ──────────────────── */
  [data-layout="magazine-cover"] .lov-imgfull-veil {
    background: linear-gradient(0deg, color-mix(in oklab, var(--lov-bg) 95%, transparent) 0%, transparent 60%);
  }
  [data-layout="diagonal-split"] .lov-imgfull-veil {
    background: linear-gradient(115deg, color-mix(in oklab, var(--lov-bg) 95%, transparent) 45%, transparent 55%);
  }
  [data-layout="polaroid"] .lov-imgtop-media {
    transform: rotate(-2deg); border: 14px solid #fafaf7;
    box-shadow: 0 30px 60px -20px rgba(0,0,0,0.5); max-width: 70%; margin: 0 auto;
  }
  [data-layout="image-bottom"] .lov-content { display: flex; flex-direction: column-reverse; }
  [data-layout="centered-narrow"] .lov-content { max-width: 780px; }
  [data-layout="left-aligned-hero"] .lov-content { text-align: start !important; align-items: flex-start; }
  [data-layout="left-aligned-hero"] .lov-content > * { text-align: start !important; margin-left: 0; margin-right: 0; }
  [data-layout="right-aligned-hero"] .lov-content { text-align: end !important; align-items: flex-end; }
  [data-layout="right-aligned-hero"] .lov-content > * { text-align: end !important; }
  [data-layout="definition"] .lov-callout-text { font-family: Georgia, "Times New Roman", serif; font-style: italic; }
  [data-layout="poster-typo"] .lov-callout-text {
    font-size: clamp(56px, 9vw, 180px); line-height: 0.95; font-weight: 900;
  }
  [data-layout="manifesto"] .lov-callout-text {
    text-transform: uppercase; letter-spacing: -0.02em; font-weight: 900;
  }
  [data-layout="four-col"] .lov-three-grid { grid-template-columns: repeat(4, 1fr); }
  @media (max-width: 1100px) { [data-layout="four-col"] .lov-three-grid { grid-template-columns: repeat(2, 1fr); } }
  [data-layout="bento"] .lov-three-grid {
    grid-template-columns: 2fr 1fr 1fr; grid-auto-rows: minmax(180px, 1fr);
  }
  [data-layout="bento"] .lov-three-grid > :first-child { grid-row: span 2; }
  @media (max-width: 900px) {
    [data-layout="bento"] .lov-three-grid { grid-template-columns: 1fr; }
    [data-layout="bento"] .lov-three-grid > :first-child { grid-row: auto; }
  }
  [data-layout="pillars"] .lov-tri-card {
    border-top: 4px solid var(--lov-accent); border-radius: 0; padding-top: 1.6rem;
  }
  [data-layout="icon-grid"] .lov-tri-num {
    width: 64px; height: 64px; border-radius: 999px; font-size: 26px;
    background: color-mix(in oklab, var(--lov-accent) 22%, transparent);
    display: inline-flex; align-items: center; justify-content: center;
  }
  [data-layout="ribbon-cards"] .lov-tri-card { border-radius: 999px 24px 24px 24px; }
  [data-layout="before-after"] .lov-compare-title::before { content: "BEFORE — "; opacity: 0.5; font-weight: 400; }
  [data-layout="before-after"] .lov-compare-col:last-child .lov-compare-title::before {
    content: "AFTER — "; color: var(--lov-accent); opacity: 1; font-weight: 700;
  }
  [data-layout="vs-split"] .lov-compare-divider { position: relative; }
  [data-layout="vs-split"] .lov-compare-divider::after {
    content: "VS"; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
    background: var(--lov-bg); color: var(--lov-accent); padding: 0.5rem 0.8rem;
    border: 2px solid var(--lov-accent); border-radius: 999px;
    font-weight: 900; font-size: 14px; letter-spacing: 0.1em;
  }
  [data-layout="table-compare"] .lov-compare-col {
    background: color-mix(in oklab, var(--lov-fg) 5%, transparent);
    padding: 1.4rem; border-radius: 18px;
    border: 1px solid color-mix(in oklab, var(--lov-fg) 10%, transparent);
  }
  [data-layout="stat-circles"] .lov-stat {
    width: clamp(140px, 16vw, 220px); aspect-ratio: 1; border-radius: 999px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    border: 2px solid var(--lov-accent); text-align: center;
  }
  [data-layout="stat-circles"] .lov-stats-grid { justify-items: center; }
  [data-layout="kpi-strip"] .lov-stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); padding: 1.8rem 2rem;
    background: linear-gradient(90deg, color-mix(in oklab, var(--lov-accent) 14%, transparent), transparent);
    border-radius: 24px; border: 1px solid color-mix(in oklab, var(--lov-accent) 22%, transparent);
  }
  [data-layout="numbered-list"] .lov-steps { grid-template-columns: 1fr; gap: 0; }
  [data-layout="numbered-list"] .lov-step {
    border-radius: 0; border-left: none; border-right: none; border-top: none;
    background: transparent; padding: 1.4rem 0;
    display: grid; grid-template-columns: 80px 1fr; align-items: baseline;
  }
  [data-layout="numbered-list"] .lov-step-num { margin: 0; font-size: clamp(28px, 2.6vw, 44px); }
  [data-layout="step-vertical"] .lov-steps { grid-template-columns: 1fr; }
  [data-layout="step-vertical"] .lov-step {
    display: grid; grid-template-columns: 80px 1fr; gap: 1.4rem; align-items: start;
  }
  [data-layout="step-vertical"] .lov-step-num { margin: 0; }
  [data-layout="timeline-horizontal"] .lov-events {
    grid-auto-flow: column; grid-auto-columns: minmax(220px, 1fr); overflow-x: auto; padding-bottom: 1rem;
  }
  [data-layout="timeline-horizontal"] .lov-events::before {
    inset-inline-start: 0; inset-inline-end: 0; top: 24px; bottom: auto;
    height: 2px; width: auto; background: color-mix(in oklab, var(--lov-accent) 40%, transparent);
  }
  [data-layout="timeline-horizontal"] .lov-event { grid-template-columns: 1fr; padding-top: 48px; position: relative; }
  [data-layout="timeline-horizontal"] .lov-event::before { top: 17px; inset-inline-start: 50%; transform: translateX(-50%); }
  [data-layout="story-rows"] .lov-event {
    grid-template-columns: 1fr; padding: 1.6rem 0;
    border-bottom: 1px solid color-mix(in oklab, var(--lov-fg) 10%, transparent);
  }
  [data-layout="story-rows"] .lov-events::before,
  [data-layout="story-rows"] .lov-event::before { display: none; }
  [data-layout="image-grid-2"] .lov-gallery-grid { grid-template-columns: 1fr 1fr; }
  [data-layout="image-grid-2"] .lov-gallery-grid > :nth-child(n+3) { display: none; }
  [data-layout="image-grid-4"] .lov-gallery-grid { grid-template-columns: repeat(2, 1fr); }
  [data-layout="carousel-strip"] .lov-gallery-grid {
    grid-auto-flow: column; grid-auto-columns: 60%; overflow-x: auto; gap: 1rem;
  }
  [data-layout="masonry-cards"] .lov-gallery-grid {
    grid-template-columns: repeat(3, 1fr); grid-auto-rows: 180px;
  }
  [data-layout="masonry-cards"] .lov-gal-item:nth-child(2n) { grid-row: span 2; }
  [data-layout="focus-image"] .lov-content { display: grid; gap: 1.5rem; justify-items: center; }
`;

const SCROLL_OBSERVER_SCRIPT = `
(function () {
  function arm() {
    var sections = document.querySelectorAll('.lov-section');
    if (!sections.length) return;
    function unlockScroll() {
      document.documentElement.style.setProperty('overflow-y', 'auto', 'important');
      document.documentElement.style.setProperty('height', 'auto', 'important');
      document.body.style.setProperty('overflow-y', 'auto', 'important');
      document.body.style.setProperty('height', 'auto', 'important');
      document.body.style.setProperty('position', 'static', 'important');
    }
    unlockScroll();
    window.addEventListener('load', unlockScroll);
    setTimeout(unlockScroll, 250);
    setTimeout(unlockScroll, 1000);
    if (!('IntersectionObserver' in window)) {
      sections.forEach(function (s) { s.classList.add('lov-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('lov-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
    sections.forEach(function (s) { io.observe(s); });
    // First section: trigger immediately so cover never waits.
    if (sections[0]) sections[0].classList.add('lov-in');
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', arm);
  } else { arm(); }
})();
`;

/** Parse the template HTML and return only its <head> innerHTML and any <canvas>/<script> tags from the body. */
function extractTemplateScaffold(rawHtml: string): { headInner: string; bodyAttr: string; bgMarkup: string; bgScripts: string } {
  // <head>...</head>
  const headMatch = rawHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const headInner = headMatch ? headMatch[1] : "";

  // <body ...>
  const bodyOpen = rawHtml.match(/<body([^>]*)>/i);
  const bodyAttr = bodyOpen ? bodyOpen[1] : "";

  // body inner
  const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyInner = bodyMatch ? bodyMatch[1] : "";

  // Pull only background-flavored canvases + scripts, drop everything else.
  const bgCanvases = (bodyInner.match(/<canvas\b[^>]*><\/canvas>/gi) || []).join("\n");
  const bgScripts = (bodyInner.match(/<script\b[\s\S]*?<\/script>/gi) || []).join("\n");

  return { headInner, bodyAttr, bgMarkup: bgCanvases, bgScripts };
}

/** Build CSS overrides from optional theme + brandKit. Layered AFTER variant styles. */
function themeAndBrandCss(deck: SlideDeck & { variant?: string }): string {
  const themeId = deck.theme && (deck.theme in THEMES) ? (deck.theme as ThemeId) : null;
  const theme = themeId ? getTheme(themeId) : null;
  const bk = deck.brandKit || {};

  const rules: string[] = [];
  const rootVars: string[] = [];

  if (theme) {
    rootVars.push(`--lov-bg: hsl(${theme.palette.bg})`);
    rootVars.push(`--lov-fg: hsl(${theme.palette.fg})`);
    rootVars.push(`--lov-primary: hsl(${theme.palette.primary})`);
    rootVars.push(`--lov-accent: hsl(${theme.palette.accent})`);
    rules.push(`.lov-deck, .lov-deck * { font-family: ${theme.typography.bodyFamily}; }`);
    rules.push(`.lov-deck .lov-h1, .lov-deck .lov-h2 { font-family: ${theme.typography.headingFamily}; letter-spacing: ${theme.typography.headingTracking} !important; }`);
  }
  // Brand kit takes precedence over theme defaults
  if (bk.primaryColor) rootVars.push(`--lov-primary: ${bk.primaryColor}`);
  if (bk.accentColor) rootVars.push(`--lov-accent: ${bk.accentColor}`);
  if (bk.fontFamily) {
    rules.push(`.lov-deck, .lov-deck * { font-family: ${bk.fontFamily}, system-ui, sans-serif; }`);
    rules.push(`.lov-deck .lov-h1, .lov-deck .lov-h2 { font-family: ${bk.fontFamily}, system-ui, sans-serif; }`);
  }
  if (rootVars.length) rules.unshift(`:root { ${rootVars.join("; ")}; }`);

  // Brand logo badge (fixed top-end corner of each slide)
  if (bk.logoUrl) {
    rules.push(`
      .lov-brand-logo {
        position: fixed; top: 24px; inset-inline-end: 24px; z-index: 50;
        height: 40px; width: auto; opacity: 0.9; pointer-events: none;
        filter: drop-shadow(0 4px 12px rgba(0,0,0,0.15));
      }
    `);
  }
  return rules.join("\n");
}

function buildDocument(rawTemplateHtml: string, deck: SlideDeck & { htmlSlug: string; variant?: string }): string {
  const { headInner, bodyAttr, bgMarkup, bgScripts } = extractTemplateScaffold(rawTemplateHtml);
  const lang = (deck.language || "en").toLowerCase();
  const isRtl = lang.startsWith("ar") || lang.startsWith("he") || lang.startsWith("fa") || lang.startsWith("ur");
  const dir = isRtl ? "rtl" : "ltr";

  // Re-base relative asset URLs (fonts, images, scripts) to /templates/{slug}/
  const base = `/templates/${deck.htmlSlug}/`;

  const slidesMarkup = deck.slides.map((s, i) => slideHtml(s, i, deck.palette, deck.slides.length)).join("\n");

  // For Arabic / RTL languages, the template's chosen Latin display font almost
  // never has Arabic shaping — letters render disconnected. Inject Cairo +
  // Noto Naskh Arabic and force them everywhere inside .lov-deck so the deck
  // is always readable, regardless of which template was picked.
  const arabicFontLink = isRtl
    ? `<link rel="preconnect" href="https://fonts.googleapis.com" />
       <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
       <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Noto+Naskh+Arabic:wght@400;500;700&display=swap" rel="stylesheet" />`
    : "";
  const arabicFontCss = isRtl
    ? `<style id="lov-arabic-fonts">
      .lov-deck, .lov-deck *,
      .lov-h1, .lov-h2, .lov-subtitle, .lov-body, .lov-bullets li,
      .lov-kicker, .lov-index, .lov-quote, .lov-stats, .lov-cta {
        font-family: "Cairo", "Noto Naskh Arabic", "Tajawal", system-ui, -apple-system, "Segoe UI", sans-serif !important;
        font-feature-settings: "kern", "liga", "calt";
      }
      .lov-deck { direction: rtl; text-align: right; }
      .lov-bullets li { padding-inline-start: 0; padding-inline-end: 1.6rem; }
      .lov-bullets li::before { inset-inline-start: auto; inset-inline-end: 0; }
    </style>`
    : "";

  return `<!doctype html>
<html lang="${esc(lang)}" dir="${dir}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <base href="${base}" />
    <title>${esc(deck.title)}</title>
    ${headInner}
    ${arabicFontLink}
    <style id="lov-overrides">${SLIDE_BASE_CSS(deck.palette)}</style>
    <style id="lov-variant">${VARIANT_STYLES[normalizeVariant(deck.variant)]}</style>
    <style id="lov-theme">${themeAndBrandCss(deck)}</style>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=Bebas+Neue&family=Caveat:wght@400;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=DM+Serif+Display&family=EB+Garamond:ital,wght@0,400;0,500;1,400;1,500&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=IBM+Plex+Mono:wght@300;400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@300;400;500;600&family=Kalam:wght@400;700&family=Lora:wght@400;500;600&family=Outfit:wght@400;600;800;900&family=Oswald:wght@500;700&family=Patrick+Hand&family=Playfair+Display:ital,wght@0,500;0,700;1,500&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Sora:wght@300;400;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&family=VT323&family=Work+Sans:wght@400;500;700&display=swap" rel="stylesheet" />
    ${arabicFontCss}
  </head>
  <body${bodyAttr} data-lov-variant="${esc(normalizeVariant(deck.variant))}">
    <!-- Preserved animated background (canvas + scripts) from the template -->
    ${bgMarkup}
    ${deck.brandKit?.logoUrl ? `<img class="lov-brand-logo" src="${esc(deck.brandKit.logoUrl)}" alt="brand logo" />` : ""}
    <main class="lov-deck">
      ${slidesMarkup}
    </main>
    ${bgScripts}
    <script>${SCROLL_OBSERVER_SCRIPT}</script>
  </body>
</html>`;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

const SlidesHtmlDeckCard = ({ deck }: Props) => {
  const [open, setOpen] = useState(false);
  const [rawHtml, setRawHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [downloadMenu, setDownloadMenu] = useState(false);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/templates/${deck.htmlSlug}/index.html`);
        if (!r.ok) throw new Error(`status ${r.status}`);
        const t = await r.text();
        if (!cancelled) setRawHtml(t);
      } catch (e) {
        console.error("Template fetch failed", e);
        if (!cancelled) setRawHtml(""); // fall back to bare doc
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [deck.htmlSlug]);

  const finalHtml = useMemo(() => {
    if (rawHtml === null) return "";
    return buildDocument(rawHtml, deck);
  }, [rawHtml, deck]);

  const portableHtml = useMemo(() => {
    if (!finalHtml) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return finalHtml.replace(`<base href="/templates/`, `<base href="${origin}/templates/`);
  }, [finalHtml]);

  const handleDownloadHtml = async () => {
    if (!portableHtml) return;
    setDownloading(true);
    try {
      const blob = new Blob([portableHtml], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${deck.title.replace(/[^\p{Letter}\p{Number}\-_ ]+/gu, "").slice(0, 60) || "presentation"}.html`;
      document.body.appendChild(a); a.click();
      a.remove(); URL.revokeObjectURL(url);
      toast.success("HTML downloaded");
    } catch (e) {
      console.error(e); toast.error("Download failed");
    } finally { setDownloading(false); }
  };

  const handleOpenTab = () => {
    if (!portableHtml) return;
    const blob = new Blob([portableHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const safeFileName = (ext: string) =>
    `${(deck.title || "presentation").replace(/[^\p{Letter}\p{Number}\-_ ]+/gu, "").slice(0, 60) || "presentation"}.${ext}`;

  const handleDownloadPptx = async () => {
    setExporting(true);
    setDownloadMenu(false);
    try {
      const PptxGenJS = (await import("pptxgenjs")).default;
      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_WIDE";
      const bg = deck.palette?.bg || "0a0a0a";
      const fg = deck.palette?.fg || "f5f5f5";
      const accent = deck.palette?.accent || "c9a84c";
      const hex = (c: string) => (c || "").replace("#", "").slice(0, 6) || "000000";
      const isRtl = /[\u0600-\u06FF]/.test(deck.title || "") || deck.language === "ar";

      deck.slides.forEach((s, i) => {
        const slide = pptx.addSlide();
        slide.background = { color: hex(bg) };
        if (s.kicker) {
          slide.addText(s.kicker, { x: 0.5, y: 0.4, w: 12, h: 0.4, fontSize: 12, bold: true, color: hex(accent), fontFace: "Calibri", rtlMode: isRtl, align: isRtl ? "right" : "left" });
        }
        if (s.type === "cover" || s.type === "closing") {
          slide.addText(s.title || "", { x: 0.5, y: 2.5, w: 12, h: 2.5, fontSize: 60, bold: true, color: hex(fg), fontFace: "Calibri", rtlMode: isRtl, align: isRtl ? "right" : "left" });
          if (s.subtitle) slide.addText(s.subtitle, { x: 0.5, y: 5.2, w: 12, h: 1, fontSize: 22, color: hex(fg), fontFace: "Calibri", rtlMode: isRtl, align: isRtl ? "right" : "left" });
        } else if (s.type === "quote") {
          slide.addText(`"${s.quote || ""}"`, { x: 1, y: 2, w: 11, h: 3.5, fontSize: 36, italic: true, color: hex(fg), fontFace: "Calibri", rtlMode: isRtl, align: "center" });
          if (s.attribution) slide.addText(`— ${s.attribution}`, { x: 1, y: 5.8, w: 11, h: 0.6, fontSize: 18, color: hex(accent), fontFace: "Calibri", align: "center" });
        } else if (s.type === "stats" && s.stats?.length) {
          slide.addText(s.title || "", { x: 0.5, y: 0.9, w: 12, h: 1, fontSize: 36, bold: true, color: hex(fg), fontFace: "Calibri", rtlMode: isRtl, align: isRtl ? "right" : "left" });
          const cols = Math.min(s.stats.length, 4);
          const w = 12 / cols;
          s.stats.slice(0, 8).forEach((st, k) => {
            const col = k % cols; const row = Math.floor(k / cols);
            slide.addText(st.value, { x: 0.5 + col * w, y: 2.4 + row * 2.2, w, h: 1.2, fontSize: 54, bold: true, color: hex(accent), fontFace: "Calibri", align: "center" });
            slide.addText(st.label, { x: 0.5 + col * w, y: 3.6 + row * 2.2, w, h: 0.6, fontSize: 14, color: hex(fg), fontFace: "Calibri", align: "center" });
          });
        } else {
          slide.addText(s.title || "", { x: 0.5, y: 0.9, w: 12, h: 1, fontSize: 36, bold: true, color: hex(fg), fontFace: "Calibri", rtlMode: isRtl, align: isRtl ? "right" : "left" });
          let y = 2.2;
          if (s.subtitle) { slide.addText(s.subtitle, { x: 0.5, y, w: 12, h: 0.6, fontSize: 18, color: hex(accent), fontFace: "Calibri", rtlMode: isRtl, align: isRtl ? "right" : "left" }); y += 0.7; }
          if (s.body) { slide.addText(s.body, { x: 0.5, y, w: s.image ? 7.5 : 12, h: 4, fontSize: 14, color: hex(fg), fontFace: "Calibri", rtlMode: isRtl, align: isRtl ? "right" : "left", valign: "top" }); y += 4.1; }
          if (s.bullets?.length) {
            slide.addText(s.bullets.map((b) => ({ text: b, options: { bullet: true } })), { x: 0.5, y: s.body ? 6 : y, w: s.image ? 7.5 : 12, h: 1.5, fontSize: 14, color: hex(fg), fontFace: "Calibri", rtlMode: isRtl, align: isRtl ? "right" : "left" });
          }
        }
        slide.addText(`${String(i + 1).padStart(2, "0")} / ${String(deck.slides.length).padStart(2, "0")}`, { x: 11, y: 7, w: 2, h: 0.3, fontSize: 10, color: hex(accent), fontFace: "Calibri", align: "right" });
      });

      await pptx.writeFile({ fileName: safeFileName("pptx") });
      toast.success("PPTX downloaded");
    } catch (e) {
      console.error(e); toast.error("PPTX export failed");
    } finally { setExporting(false); }
  };

  const handleShare = async () => {
    if (!portableHtml) return;
    try {
      const blob = new Blob([portableHtml], { type: "text/html;charset=utf-8" });
      const file = new File([blob], safeFileName("html"), { type: "text/html" });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: deck.title, text: deck.subtitle || deck.title });
        return;
      }
      // Fallback: share link / copy
      const url = URL.createObjectURL(blob);
      if (navigator.share) {
        await navigator.share({ title: deck.title, text: deck.subtitle || deck.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        console.error(e); toast.error("Share failed");
      }
    }
  };

  const cover = deck.slides[0];

  return (
    <>
      <div className="mt-3 rounded-2xl overflow-hidden border border-border/40 bg-card max-w-xl">
        <button
          onClick={() => setOpen(true)}
          className="relative block w-full aspect-[16/9] overflow-hidden group"
          style={{ background: deck.palette.bg }}
        >
          {cover?.image && <img src={cover.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />}
          <div
            className="absolute inset-0 flex flex-col justify-end p-5"
            style={{ background: `linear-gradient(180deg, transparent, ${deck.palette.bg}ee)` }}
          >
            <div className="text-xs font-bold uppercase tracking-[0.3em] mb-1.5" style={{ color: deck.palette.accent }}>
              Premium · {deck.slides.length} slides
            </div>
            <h3 className="text-xl md:text-2xl font-extrabold line-clamp-2" style={{ color: deck.palette.fg }}>{deck.title}</h3>
            {deck.subtitle && <p className="text-sm opacity-80 mt-1 line-clamp-1" style={{ color: deck.palette.fg }}>{deck.subtitle}</p>}
          </div>
          <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/40 backdrop-blur px-2.5 py-1 text-[11px] font-medium text-white opacity-0 group-hover:opacity-100 transition">
            <Maximize2 className="w-3 h-3" /> Open
          </div>
        </button>

        <div className="flex items-center justify-between px-3 py-2 border-t border-border/40 bg-background/40">
          <div />
          <div className="flex items-center gap-1.5">
            <button onClick={() => setOpen(true)} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-foreground text-background hover:opacity-90 transition">Open in preview</button>
            <button onClick={handleOpenTab} disabled={loading} className="text-xs font-medium px-3 py-1.5 rounded-full border border-border/60 hover:bg-muted/40 transition disabled:opacity-50">Open in web</button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[80] bg-black/95 backdrop-blur flex flex-col"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <header className="flex items-center gap-3 px-4 py-3 shrink-0">
              <button
                onClick={() => setOpen(false)}
                className="h-9 w-9 rounded-full text-white/80 hover:text-white flex items-center justify-center shrink-0 transition"
                aria-label="Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-white truncate">
                {(deck.title || "")
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 3)
                  .map((w) => w[0])
                  .join("")
                  .toUpperCase() || "—"}
              </span>
            </header>

            <div className="flex-1 px-3 sm:px-6 min-h-0">
              <div className="w-full h-full rounded-2xl overflow-hidden bg-white shadow-2xl relative overscroll-contain touch-pan-y">
                {loading || !finalHtml ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-background via-background to-muted">
                    <motion.svg
                      width="64" height="64" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"
                      className="text-fuchsia-500 drop-shadow-[0_0_24px_rgba(217,70,239,0.6)]"
                      animate={{ rotate: [0, 180, 360], scale: [1, 1.15, 1] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <path d="M50 5 L60 40 L95 50 L60 60 L50 95 L40 60 L5 50 L40 40 Z" fill="currentColor" />
                    </motion.svg>
                    <span className="text-sm font-semibold text-foreground/80">Preparing your slides…</span>
                  </div>
                ) : (
                  <iframe
                    ref={previewIframeRef}
                    title={deck.title}
                    srcDoc={finalHtml}
                    sandbox="allow-scripts allow-same-origin"
                    scrolling="yes"
                    className="w-full h-full border-0 bg-white touch-pan-y"
                  />
                )}
              </div>
            </div>

            <footer className="shrink-0 px-4 py-4 flex items-center justify-center gap-3" dir="ltr">
              <div className="relative">
                <button
                  onClick={() => setDownloadMenu((v) => !v)}
                  disabled={loading || downloading || exporting}
                  className="inline-flex items-center justify-center h-10 px-6 rounded-full bg-white text-black text-sm font-medium tracking-wide hover:bg-white/90 disabled:opacity-50 transition"
                >
                  {downloading || exporting ? "Preparing…" : "Download"}
                </button>
                <AnimatePresence>
                  {downloadMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                      className="absolute bottom-12 left-1/2 -translate-x-1/2 min-w-[160px] rounded-2xl border border-white/10 bg-zinc-900/95 backdrop-blur shadow-2xl p-1.5 z-10"
                    >
                      <button
                        onClick={() => { setDownloadMenu(false); handleDownloadHtml(); }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-white hover:bg-white/10 transition"
                      >
                        <span>HTML</span>
                        <span className="text-[10px] text-white/40">.html</span>
                      </button>
                      <button
                        onClick={() => { setDownloadMenu(false); handleDownloadPptx(); }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-white hover:bg-white/10 transition"
                      >
                        <span>PowerPoint</span>
                        <span className="text-[10px] text-white/40">.pptx</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={handleShare}
                disabled={loading}
                className="inline-flex items-center justify-center h-10 px-6 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium tracking-wide disabled:opacity-50 transition"
              >
                Share
              </button>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SlidesHtmlDeckCard;
