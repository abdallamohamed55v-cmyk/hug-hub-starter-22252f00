import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, FileText, Globe, Search, Sparkles, Loader2 } from "lucide-react";

export interface ResearchStep {
  at?: string;
  type?: string;
  query?: string;
  url?: string;
  host?: string;
  title?: string;
  results?: number;
  pages?: number;
  withContent?: number;
  index?: number;
  total?: number;
  chars?: number;
  ms?: number;
  length?: number;
  // allow extra keys
  [k: string]: unknown;
}

interface ResearchActivityStreamProps {
  steps: ResearchStep[];
  /** True while the job is still running — the latest step shows a pulse. */
  active?: boolean;
}

const iconFor = (type?: string) => {
  switch (type) {
    case "plan":
    case "approved":
      return Sparkles;
    case "search":
    case "searching":
      return Search;
    case "reading":
      return Loader2;
    case "read":
      return Globe;
    case "extract":
      return Globe;
    case "synthesizing":
      return FileText;
    case "done":
      return Check;
    default:
      return Sparkles;
  }
};

const labelFor = (s: ResearchStep): string => {
  switch (s.type) {
    case "plan":
      return `Planned ${Array.isArray((s as any).queries) ? (s as any).queries.length : ""} sub-questions`.trim();
    case "approved":
      return "Plan approved — starting search";
    case "searching":
      return `Searching ${s.index ?? "?"}/${s.total ?? "?"}: ${s.query ?? ""}`.trim();
    case "search":
      return `Found ${s.results ?? 0} results · ${s.query ?? ""}`;
    case "reading":
      return `Reading ${s.host ?? s.url ?? ""}${s.title ? ` — ${s.title}` : ""}`;
    case "read":
      return `Read ${s.host ?? s.url ?? ""} (${s.chars ?? 0} chars)`;
    case "extract":
      return `Extracted ${s.withContent ?? 0}/${s.pages ?? 0} pages`;
    case "synthesizing":
      return "Synthesizing report…";
    case "done":
      return `Report ready (${s.length ?? 0} chars)`;
    default:
      return s.type || "step";
  }
};

const time = (iso?: string) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch { return ""; }
};

const ResearchActivityStream = ({ steps, active }: ResearchActivityStreamProps) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [steps.length]);

  if (!steps.length) return null;

  return (
    <div
      ref={scrollRef}
      className="max-h-[280px] overflow-y-auto pe-1 ps-1 py-1 flex flex-col gap-1.5"
    >
      <AnimatePresence initial={false}>
        {steps.map((s, i) => {
          const Icon = iconFor(s.type);
          const isLast = i === steps.length - 1;
          const isReading = s.type === "reading" && active && isLast;
          const done = s.type === "read" || s.type === "search" || s.type === "extract" || s.type === "done" || s.type === "approved" || s.type === "plan";
          return (
            <motion.div
              key={`${s.at ?? i}-${i}`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-foreground/[0.03]"
            >
              <span
                className={`mt-0.5 w-5 h-5 rounded-full inline-flex items-center justify-center shrink-0 ${
                  isReading
                    ? "bg-primary/15 text-primary"
                    : done
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className={`w-3 h-3 ${isReading ? "animate-spin" : ""}`} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] leading-snug text-foreground/90 break-words">{labelFor(s)}</div>
                {s.at && (
                  <div className="text-[10.5px] text-muted-foreground/70 mt-0.5 font-mono">{time(s.at)}</div>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default ResearchActivityStream;
