import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { detectLang, langDir } from "@/lib/detectLang";

interface Props {
  items: string[];
  active: boolean;
}

/* ────────────────────────────────────────────────────────────────
   Custom hand-crafted SVG icon set — designed specifically for the
   research narration. Each glyph is a single-stroke geometric mark
   built from primitives (no external icon library).
   ──────────────────────────────────────────────────────────────── */
type IconKind =
  | "search" | "orbit" | "think" | "read" | "source"
  | "write"  | "design" | "done"  | "spark" | "loader"
  | "caretDown" | "caretUp";

function CustomIcon({ kind, className = "" }: { kind: IconKind; className?: string }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className,
  };
  switch (kind) {
    case "search": // lens with two ripple arcs (discovery)
      return (
        <svg {...common}>
          <circle cx="10.5" cy="10.5" r="4.2" />
          <path d="M14 14l4 4" />
          <path d="M3.5 10.5a7 7 0 0 1 1.6-4.2" opacity="0.55" />
          <path d="M5.2 14.4a7 7 0 0 1-1.7-3.9" opacity="0.35" />
        </svg>
      );
    case "orbit": // planet with elliptical orbit (web)
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3.4" />
          <ellipse cx="12" cy="12" rx="9" ry="3.4" transform="rotate(-28 12 12)" />
          <circle cx="19.4" cy="8.4" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case "think": // interlocked loops (reasoning)
      return (
        <svg {...common}>
          <path d="M8.5 7.5c-2.5 0-3.8 2-3.8 4 0 2.4 1.6 3.6 3 3.8.4 1.4 1.6 2.4 3.3 2.4 2 0 3.4-1.4 3.4-3.4" />
          <path d="M15.5 16.5c2.5 0 3.8-2 3.8-4 0-2.4-1.6-3.6-3-3.8-.4-1.4-1.6-2.4-3.3-2.4-2 0-3.4 1.4-3.4 3.4" />
        </svg>
      );
    case "read": // 3 stacked lines tapering — content extraction
      return (
        <svg {...common}>
          <path d="M5 7.5h14" />
          <path d="M5 12h11" opacity="0.75" />
          <path d="M5 16.5h7" opacity="0.45" />
        </svg>
      );
    case "source": // diamond with two trailing dots — citation node
      return (
        <svg {...common}>
          <path d="M12 4.5l5 5-5 5-5-5z" />
          <circle cx="17" cy="17" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="20" cy="20" r="0.7" fill="currentColor" stroke="none" opacity="0.6" />
        </svg>
      );
    case "write": // pen nib triangle with ink dot
      return (
        <svg {...common}>
          <path d="M12 4l4.5 11-4.5-2-4.5 2z" />
          <path d="M12 12.5v3.5" />
          <circle cx="12" cy="19" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case "design": // layered cards
      return (
        <svg {...common}>
          <rect x="6" y="6" width="11" height="11" rx="2" opacity="0.45" />
          <rect x="8.5" y="8.5" width="11" height="11" rx="2" />
        </svg>
      );
    case "done": // soft check inside subtle ring
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" opacity="0.4" />
          <path d="M8 12.4l2.8 2.6L16.4 9" />
        </svg>
      );
    case "spark": // 4-point asterisk star (default — generative)
      return (
        <svg {...common}>
          <path d="M12 4v6.5" />
          <path d="M12 13.5V20" />
          <path d="M4 12h6.5" />
          <path d="M13.5 12H20" />
          <path d="M12 12l4-4" opacity="0.45" />
          <path d="M12 12l-4 4" opacity="0.45" />
        </svg>
      );
    case "loader": // 3 dots arc — animated via wrapper
      return (
        <svg {...common} className={`${className} animate-spin`}>
          <circle cx="12" cy="4.5" r="1.1" fill="currentColor" stroke="none" />
          <circle cx="18.5" cy="9.5" r="1.1" fill="currentColor" stroke="none" opacity="0.6" />
          <circle cx="16" cy="17.5" r="1.1" fill="currentColor" stroke="none" opacity="0.3" />
        </svg>
      );
    case "caretDown":
      return (
        <svg {...common}><path d="M6 9.5l6 5 6-5" /></svg>
      );
    case "caretUp":
      return (
        <svg {...common}><path d="M6 14.5l6-5 6 5" /></svg>
      );
  }
}

/** Pick a custom icon kind based on the narration text (AR + EN). */
function pickIconKind(text: string): IconKind {
  const t = (text || "").toLowerCase();
  if (/بحث|ابحث|أبحث|بدور|search|google|googling|looking|query/i.test(t)) return "search";
  if (/فتح|موقع|رابط|صفحة|open|visit|browsing|website|url|page/i.test(t)) return "orbit";
  if (/فكر|أفكر|تحليل|أحلل|think|analy[sz]|reason/i.test(t)) return "think";
  if (/قرأ|أقرأ|اقرأ|محتوى|read|reading|content|extract/i.test(t)) return "read";
  if (/مصدر|مرجع|source|reference|cite|citation/i.test(t)) return "source";
  if (/كتاب|أكتب|اكتب|تقرير|اخراج|إخراج|writ|draft|generat|compos/i.test(t)) return "write";
  if (/ملف|تصميم|صمم|file|design|format|layout|export|render/i.test(t)) return "design";
  if (/خلاص|تم|انته|finished|done|complete|ready/i.test(t)) return "done";
  return "spark";
}

const ResearchNarration = ({ items, active }: Props) => {
  const [expanded, setExpanded] = useState(true);
  const visible = (items || []).filter((t) => (t || "").trim().length > 0 || active);
  if (visible.length === 0 && !active) return null;

  if (visible.length === 0 && active) {
    return (
      <div className="flex items-center gap-2 py-2 text-primary">
        <CustomIcon kind="loader" className="w-3.5 h-3.5" />
        <span className="inline-flex gap-1">
          <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
          <span className="w-1 h-1 rounded-full bg-current animate-pulse [animation-delay:120ms]" />
          <span className="w-1 h-1 rounded-full bg-current animate-pulse [animation-delay:240ms]" />
        </span>
      </div>
    );
  }

  const dir = langDir(detectLang(items.join(" ")));
  const lastIdx = items.length - 1;
  // When collapsed (and we have more than 1 item) show only the last item.
  const showAll = expanded || items.length <= 1;
  const displayedItems = showAll
    ? items.map((text, i) => ({ text, originalIndex: i }))
    : [{ text: items[lastIdx], originalIndex: lastIdx }];
  const hiddenCount = items.length - 1;

  return (
    <div dir={dir} className="mb-3">
      {/* Toggle button when collapsed */}
      {!showAll && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="mb-2 inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors w-7 h-7 justify-center rounded-full bg-secondary/40 border border-border/40"
          aria-label="Expand all steps"
          title={`+${hiddenCount}`}
        >
          <CustomIcon kind="caretDown" className="w-3 h-3" />
        </button>
      )}

      <div className="space-y-2.5">
        <AnimatePresence initial={false}>
          {displayedItems.map(({ text, originalIndex }) => {
            const isLast = originalIndex === lastIdx;
            const isEmpty = !text || text.trim().length === 0;
            const kind = pickIconKind(text);
            const isActiveStep = isLast && active;
            return (
              <motion.div
                key={originalIndex}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="flex items-start gap-2.5"
              >
                <span className="mt-0.5 inline-flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-secondary/50 border border-border/40">
                  {isActiveStep && isEmpty ? (
                    <CustomIcon kind="loader" className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <CustomIcon
                      kind={kind}
                      className={`w-3.5 h-3.5 ${isActiveStep ? "text-primary" : "text-muted-foreground"}`}
                    />
                  )}
                </span>
                <p className="text-[14px] leading-relaxed text-foreground/90 flex-1 break-words pt-0.5">
                  {text}
                  {isActiveStep && !isEmpty && (
                    <span className="inline-block w-[2px] h-[14px] bg-primary/70 align-middle ms-0.5 animate-pulse" />
                  )}
                </p>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Collapse button when expanded */}
      {showAll && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-2 inline-flex items-center justify-center w-7 h-7 text-muted-foreground hover:text-foreground transition-colors rounded-full bg-secondary/40 border border-border/40"
          aria-label="Collapse to last step"
        >
          <CustomIcon kind="caretUp" className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

export default ResearchNarration;
