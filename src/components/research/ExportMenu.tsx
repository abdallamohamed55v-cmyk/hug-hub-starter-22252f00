import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Download, FileText, FileType2, Link2, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ExportMenuProps {
  query: string;
  report: string;
  images?: string[];
  sessionKey?: string;
  /** Triggers the html2canvas-based PDF flow in the preview page. */
  onExportPdf?: () => void;
  /** Visual style — default matches DeepResearchCard outline button. */
  variant?: "outline" | "ghost";
}

const slugify = (s: string) =>
  (s || "research")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "research";

const downloadBlob = (data: string, filename: string, mime: string) => {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const ExportMenu = ({ query, report, sessionKey, onExportPdf, variant = "outline" }: ExportMenuProps) => {
  const [open, setOpen] = useState(false);
  const [sharing, setSharing] = useState(false);

  const handleMarkdown = () => {
    const front = `# ${query}\n\n`;
    downloadBlob(front + report.trimStart(), `${slugify(query)}.md`, "text/markdown;charset=utf-8");
    setOpen(false);
    toast.success("Markdown downloaded");
  };

  const handleNotion = async () => {
    // Notion's public web app accepts pasted Markdown and converts it to
    // blocks automatically. We copy a Notion-friendly version (front-matter +
    // body) and open notion.new in a new tab.
    const md = `# ${query}\n\n${report.trim()}`;
    try {
      await navigator.clipboard.writeText(md);
      toast.success("Copied for Notion · opening notion.new", {
        description: "Paste (Ctrl/⌘+V) into a new Notion page.",
      });
      window.open("https://notion.new", "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
    setOpen(false);
  };

  const handlePdf = () => {
    setOpen(false);
    onExportPdf?.();
  };

  const handleShareLink = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      let url = `${window.location.origin}${sessionKey ? `/research/preview/${sessionKey}` : "/research/preview/new"}`;
      if (uid) {
        const token =
          (typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2)) + Date.now().toString(36);
        const key = sessionKey || `r_${Date.now().toString(36)}`;
        const { error } = await supabase.from("research_reports").upsert(
          {
            user_id: uid,
            session_key: key,
            query,
            report,
            images: [] as any,
            steps: [] as any,
            share_token: token,
          },
          { onConflict: "user_id,session_key" }
        );
        if (!error) {
          url = `${window.location.origin}/research/share/${token}`;
        }
      }
      await navigator.clipboard.writeText(url);
      toast.success("Public share link copied");
    } catch {
      toast.error("Couldn't generate share link");
    } finally {
      setSharing(false);
      setOpen(false);
    }
  };

  const triggerCls =
    variant === "ghost"
      ? "inline-flex items-center justify-center h-10 px-4 rounded-2xl text-foreground/85 text-[13px] font-medium hover:bg-foreground/10 transition-colors"
      : "inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-2xl bg-accent/40 text-foreground text-[13px] font-medium hover:bg-accent/60 transition-colors border border-border/40";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button onClick={(e) => e.stopPropagation()} className={triggerCls}>
          <Download className="w-3.5 h-3.5 me-1" />
          Export
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        onClick={(e) => e.stopPropagation()}
        className="w-60 p-1.5"
      >
        <button
          onClick={handlePdf}
          disabled={!onExportPdf}
          className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-muted text-start text-[13px] disabled:opacity-50"
        >
          <FileText className="w-4 h-4 text-red-500" />
          <div className="flex-1">
            <div className="font-medium text-foreground/90">PDF</div>
            <div className="text-[11px] text-muted-foreground">Print-ready report</div>
          </div>
        </button>
        <button
          onClick={handleMarkdown}
          className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-muted text-start text-[13px]"
        >
          <FileType2 className="w-4 h-4 text-blue-500" />
          <div className="flex-1">
            <div className="font-medium text-foreground/90">Markdown</div>
            <div className="text-[11px] text-muted-foreground">.md file with citations</div>
          </div>
        </button>
        <button
          onClick={handleNotion}
          className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-muted text-start text-[13px]"
        >
          <FileText className="w-4 h-4 text-foreground/80" />
          <div className="flex-1">
            <div className="font-medium text-foreground/90">Copy for Notion</div>
            <div className="text-[11px] text-muted-foreground">Opens notion.new</div>
          </div>
        </button>
        <div className="h-px bg-border/60 my-1" />
        <button
          onClick={handleShareLink}
          disabled={sharing}
          className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-muted text-start text-[13px] disabled:opacity-60"
        >
          {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4 text-emerald-500" />}
          <div className="flex-1">
            <div className="font-medium text-foreground/90">Copy share link</div>
            <div className="text-[11px] text-muted-foreground">Public read-only</div>
          </div>
        </button>
      </PopoverContent>
    </Popover>
  );
};

export default ExportMenu;
