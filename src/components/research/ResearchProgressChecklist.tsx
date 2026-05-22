import { Check, Loader2, ListChecks, Search, Globe, FileText, Sparkles } from "lucide-react";
import type { ResearchJobStatus } from "@/lib/deepResearchJob";

interface ResearchProgressChecklistProps {
  status: ResearchJobStatus;
  progress: number;
  stage?: string | null;
  plan?: string[];
  sourcesCount?: number;
  readHosts?: string[];
}

type Phase = "planning" | "awaiting" | "searching" | "reading" | "synthesizing" | "done";

const ORDER: Phase[] = ["planning", "awaiting", "searching", "reading", "synthesizing", "done"];

const phaseFor = (status: ResearchJobStatus): Phase => {
  if (status === "queued" || status === "planning") return "planning";
  if (status === "awaiting_approval") return "awaiting";
  if (status === "searching") return "searching";
  // Extraction phase is part of execution — the edge function reports the
  // "Extracted N/M pages" stage while status is still searching/synthesizing.
  if (status === "synthesizing") return "synthesizing";
  if (status === "succeeded") return "done";
  return "planning";
};

const PHASES: { key: Phase; label: string; Icon: typeof Sparkles }[] = [
  { key: "planning", label: "Planning queries", Icon: Sparkles },
  { key: "awaiting", label: "Awaiting approval", Icon: ListChecks },
  { key: "searching", label: "Searching the web", Icon: Search },
  { key: "reading", label: "Reading sources", Icon: Globe },
  { key: "synthesizing", label: "Synthesizing report", Icon: FileText },
  { key: "done", label: "Done", Icon: Check },
];

const ResearchProgressChecklist = ({
  status,
  progress,
  stage,
  plan = [],
  sourcesCount = 0,
  readHosts = [],
}: ResearchProgressChecklistProps) => {
  const current = phaseFor(status);
  const idx = ORDER.indexOf(current);
  const isFailed = status === "failed" || status === "cancelled";

  return (
    <div className="w-full rounded-2xl border border-border/50 bg-card/60 backdrop-blur-xl overflow-hidden">
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <div className="text-[12.5px] font-semibold text-foreground/90">Deep Research progress</div>
        <div className="ms-auto text-[11px] text-muted-foreground font-mono">{progress}%</div>
      </div>
      {/* Progress bar */}
      <div className="mx-4 mb-3 h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${isFailed ? "bg-destructive" : "bg-primary"}`}
          style={{ width: `${Math.max(2, Math.min(100, progress))}%` }}
        />
      </div>

      <ul className="px-2 pb-2 flex flex-col">
        {PHASES.map((p, i) => {
          // Skip the "awaiting approval" row once it's already been approved
          // and pipeline moved past it.
          if (p.key === "awaiting" && idx > 1 && status !== "awaiting_approval") return null;

          const state: "done" | "active" | "pending" =
            i < idx ? "done" : i === idx ? "active" : "pending";
          const Icon = p.Icon;
          return (
            <li key={p.key} className="px-2">
              <div className="flex items-start gap-2 py-1.5">
                <span
                  className={`w-5 h-5 rounded-full inline-flex items-center justify-center shrink-0 mt-0.5 ${
                    state === "done"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : state === "active"
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {state === "active" ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : state === "done" ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Icon className="w-3 h-3" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={`text-[13px] leading-snug ${state === "pending" ? "text-muted-foreground" : "text-foreground/90"}`}>
                    {p.label}
                  </div>
                  {/* Sub-detail */}
                  {p.key === "searching" && state !== "pending" && plan.length > 0 && (
                    <ul className="mt-1 ms-1 ps-2 border-s border-border/40 flex flex-col gap-0.5">
                      {plan.map((q, j) => (
                        <li key={j} className="text-[11.5px] text-muted-foreground leading-snug truncate">
                          <span className="font-mono me-1.5">{String(j + 1).padStart(2, "0")}</span>
                          {q}
                        </li>
                      ))}
                    </ul>
                  )}
                  {p.key === "reading" && state !== "pending" && readHosts.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {readHosts.slice(0, 8).map((h, j) => (
                        <span
                          key={j}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted/60 text-[10.5px] text-muted-foreground font-mono"
                        >
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(h)}&sz=32`}
                            alt=""
                            className="w-3 h-3"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                          />
                          {h}
                        </span>
                      ))}
                    </div>
                  )}
                  {state === "active" && stage && (
                    <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{stage}</div>
                  )}
                  {p.key === "searching" && state === "done" && sourcesCount > 0 && (
                    <div className="text-[11px] text-muted-foreground mt-0.5">{sourcesCount} unique sources</div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ResearchProgressChecklist;
