import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Maximize2, Download, Loader2, FileCode2, FileType2 } from "lucide-react";
import { toast } from "sonner";
import { exportDeckHtml, exportDeckPptx } from "@/lib/slidesExport";
import { findSlidesTemplate } from "@/lib/slidesTemplates";

export interface SlideData {
  type?: string;
  layout?: string;
  variant?: string;
  accent?: string;
  title?: string;
  subtitle?: string;
  body?: string;
  bullets?: string[];
  quote?: string;
  attribution?: string;
  stats?: { label: string; value: string }[];
  image?: string;
  images?: string[];
  kicker?: string;
  cta?: string;
  steps?: { title: string; desc?: string }[];
  events?: { date: string; title: string; desc?: string }[];
  left_title?: string;
  right_title?: string;
  left_bullets?: string[];
  right_bullets?: string[];
  big_value?: string;
  big_label?: string;
  /** Optional chart data — renderer draws inline SVG bars or line. */
  chart?: {
    kind?: "bar" | "line" | "donut";
    data?: { label: string; value: number }[];
    yLabel?: string;
  };
}

export interface SlideBrandKit {
  logoUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
}

export interface SlideDeck {
  title: string;
  subtitle?: string;
  language?: string;
  templateId: string;
  palette: { primary: string; accent: string; bg: string; fg: string };
  slides: SlideData[];
  /** Optional theme id from src/lib/slides/themes.ts */
  theme?: string;
  brandKit?: SlideBrandKit;
  densityHint?: "low" | "medium" | "high";
  audience?: string;
  durationMin?: number;
}

interface Props {
  deck: SlideDeck;
}

/* Render a single slide using the deck palette — readable, brand-light. */
function SlideRender({ slide, palette, dir }: { slide: SlideData; palette: SlideDeck["palette"]; dir: "ltr" | "rtl" }) {
  const isQuote = slide.type === "quote";
  const isStats = slide.type === "stats";
  const isCover = slide.type === "cover";
  const isClosing = slide.type === "closing";

  return (
    <div
      className="relative w-full h-full overflow-hidden flex"
      style={{ background: palette.bg, color: palette.fg, direction: dir }}
    >
      {/* Image background for cover */}
      {isCover && slide.image && (
        <>
          <img src={slide.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${palette.bg}ee, ${palette.bg}aa 60%, transparent)` }} />
        </>
      )}

      {/* Side image for content */}
      {!isCover && !isClosing && !isQuote && !isStats && slide.image && (
        <div className="hidden md:block w-[42%] h-full relative shrink-0 order-2">
          <img src={slide.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(${dir === "rtl" ? "270deg" : "90deg"}, ${palette.bg}, transparent 60%)` }} />
        </div>
      )}

      <div className="relative z-10 flex-1 p-8 md:p-12 flex flex-col justify-center order-1">
        {slide.kicker && (
          <span className="text-xs font-bold uppercase tracking-[0.3em] mb-3 opacity-70" style={{ color: palette.accent }}>
            {slide.kicker}
          </span>
        )}

        {isQuote ? (
          <>
            <span className="text-6xl font-bold leading-none mb-2" style={{ color: palette.accent }}>"</span>
            <p className="text-2xl md:text-3xl font-semibold leading-snug mb-4">{slide.quote || slide.body}</p>
            {slide.attribution && (
              <p className="text-sm opacity-70">— {slide.attribution}</p>
            )}
          </>
        ) : isStats && slide.stats?.length ? (
          <>
            {slide.title && <h2 className="text-2xl md:text-3xl font-bold mb-6">{slide.title}</h2>}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              {slide.stats.slice(0, 6).map((s, i) => (
                <div key={i} className="rounded-xl p-4" style={{ background: `${palette.fg}0d` }}>
                  <div className="text-2xl md:text-3xl font-extrabold" style={{ color: palette.accent }}>{s.value}</div>
                  <div className="text-xs opacity-80 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {slide.title && (
              <h2 className={`font-extrabold leading-tight mb-3 ${isCover ? "text-4xl md:text-6xl" : "text-2xl md:text-4xl"}`}>
                {slide.title}
              </h2>
            )}
            {slide.subtitle && (
              <p className="text-base md:text-xl opacity-85 mb-4">{slide.subtitle}</p>
            )}
            {slide.body && !isCover && (
              <p className="text-sm md:text-base opacity-90 leading-relaxed mb-3 max-w-2xl">{slide.body}</p>
            )}
            {slide.bullets && slide.bullets.length > 0 && (
              <ul className="space-y-2 max-w-2xl">
                {slide.bullets.map((b, i) => (
                  <li key={i} className="flex gap-3 text-sm md:text-base">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: palette.accent }} />
                    <span className="opacity-95">{b}</span>
                  </li>
                ))}
              </ul>
            )}
            {isClosing && slide.cta && (
              <div className="mt-6 inline-flex px-5 py-2.5 rounded-full text-sm font-semibold" style={{ background: palette.accent, color: palette.bg }}>
                {slide.cta}
              </div>
            )}
          </>
        )}
      </div>

      {/* Page number */}
      <div className="absolute bottom-4 left-4 text-xs font-mono opacity-60">
        {/* index injected by parent */}
      </div>
    </div>
  );
}

const SlidesDeckCard = ({ deck }: Props) => {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const dir: "ltr" | "rtl" = (deck.language?.startsWith("ar")) ? "rtl" : "ltr";
  const total = deck.slides.length;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "ArrowRight") setIdx((i) => Math.min(total - 1, i + 1));
      else if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, total]);

  const [exportingHtml, setExportingHtml] = useState(false);
  const [exportingPptx, setExportingPptx] = useState(false);

  const handleHtml = async () => {
    setExportingHtml(true);
    try { exportDeckHtml(deck); toast.success("HTML downloaded"); }
    catch { toast.error("HTML export failed"); }
    finally { setExportingHtml(false); }
  };

  const handlePptx = async () => {
    setExportingPptx(true);
    try { await exportDeckPptx(deck); toast.success("PPTX downloaded"); }
    catch (e) { console.error(e); toast.error("PPTX export failed"); }
    finally { setExportingPptx(false); }
  };

  // Card preview
  const cover = deck.slides[0];
  return (
    <>
      <div className="mt-3 rounded-2xl overflow-hidden border border-border/40 bg-card max-w-xl">
        <button
          onClick={() => { setIdx(0); setOpen(true); }}
          className="relative block w-full aspect-[16/9] overflow-hidden group"
          style={{ background: deck.palette.bg }}
        >
          {cover?.image && <img src={cover.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />}
          <div className="absolute inset-0 flex flex-col justify-end p-5" style={{ background: `linear-gradient(180deg, transparent, ${deck.palette.bg}ee)` }}>
            <div className="text-xs font-bold uppercase tracking-[0.3em] mb-1.5" style={{ color: deck.palette.accent }}>Presentation · {total} slides</div>
            <h3 className="text-xl md:text-2xl font-extrabold line-clamp-2" style={{ color: deck.palette.fg }}>{deck.title}</h3>
            {deck.subtitle && <p className="text-sm opacity-80 mt-1 line-clamp-1" style={{ color: deck.palette.fg }}>{deck.subtitle}</p>}
          </div>
          <div className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/40 backdrop-blur px-2.5 py-1 text-[11px] font-medium text-white opacity-0 group-hover:opacity-100 transition">
            <Maximize2 className="w-3 h-3" /> Open
          </div>
        </button>
        <div className="flex items-center justify-between px-3 py-2 border-t border-border/40 bg-background/40 gap-2">
          <div className="text-xs text-muted-foreground truncate min-w-0">{findSlidesTemplate(deck.templateId).name}</div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => { setIdx(0); setOpen(true); }} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-foreground text-background hover:opacity-90 transition">
              <Maximize2 className="w-3 h-3" />
              Preview
            </button>
            <button onClick={handlePptx} disabled={exportingPptx} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-accent/60 hover:bg-accent border border-border/40 transition disabled:opacity-50">
              {exportingPptx ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              Download PPTX
            </button>
            <button onClick={handleHtml} disabled={exportingHtml} aria-label="HTML" title="Download HTML" className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-border/60 hover:bg-muted/40 transition disabled:opacity-50">
              {exportingHtml ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileCode2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[80] bg-black/95 backdrop-blur flex flex-col"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <header className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-mono text-white/60">{idx + 1} / {total}</span>
                <span className="text-sm font-semibold text-white truncate">{deck.title}</span>
              </div>
              <button onClick={() => setOpen(false)} className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </header>

            <div className="flex-1 flex items-center justify-center px-3 sm:px-10 pb-4 relative">
              <button
                onClick={() => setIdx((i) => Math.max(0, i - 1))}
                disabled={idx === 0}
                className="absolute left-2 sm:left-4 h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white flex items-center justify-center"
              >
                <ChevronLeft />
              </button>
              <div className="relative w-full max-w-5xl aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.25 }}
                    className="absolute inset-0"
                  >
                    <SlideRender slide={deck.slides[idx]} palette={deck.palette} dir={dir} />
                  </motion.div>
                </AnimatePresence>
              </div>
              <button
                onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
                disabled={idx === total - 1}
                className="absolute right-2 sm:right-4 h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white flex items-center justify-center"
              >
                <ChevronRight />
              </button>
            </div>

            {/* Filmstrip — quick navigation across slides */}
            <div className="shrink-0 border-t border-white/10 bg-black/40 backdrop-blur px-3 py-2.5 overflow-x-auto">
              <div className="flex items-center gap-2 min-w-min mx-auto w-fit">
                {deck.slides.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setIdx(i)}
                    aria-label={`Slide ${i + 1}`}
                    className={`relative shrink-0 w-32 aspect-[16/9] rounded-md overflow-hidden transition ring-2 ${
                      i === idx
                        ? "ring-white shadow-lg"
                        : "ring-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <div className="absolute inset-0 pointer-events-none [&_*]:!text-[6px] [&_h2]:!text-[8px] [&_h3]:!text-[7px]">
                      <SlideRender slide={s} palette={deck.palette} dir={dir} />
                    </div>
                    <span className="absolute bottom-0.5 right-1 text-[9px] font-mono text-white/80 bg-black/40 rounded px-1">
                      {i + 1}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SlidesDeckCard;
