import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { detectResearchReportDirection, normalizeResearchReport } from "@/lib/normalizeResearchReport";
import ExportMenu from "@/components/research/ExportMenu";

interface DeepResearchCardProps {
  query: string;
  report: string;
  images?: string[];
  sessionKey?: string;
}

const DeepResearchCard = ({ query, report, images = [], sessionKey }: DeepResearchCardProps) => {
  const navigate = useNavigate();

  const cleanReport = normalizeResearchReport(report);
  const isRtl = detectResearchReportDirection(cleanReport) === "rtl";
  const cover = images[0];
  const previewLine =
    cleanReport
      .replace(/^#+\s*/gm, "")
      .replace(/[*_`#>~-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 140) + (cleanReport.length > 140 ? "…" : "");

  const reportData = { query, report: cleanReport, images };

  const openPreview = () => {
    if (sessionKey) {
      navigate(`/research/preview/${sessionKey}`, { state: { reportData } });
    } else {
      navigate("/research/preview/new", { state: { reportData } });
    }
  };

  const handleExportPdf = () => {
    const target = sessionKey
      ? `/research/preview/${sessionKey}`
      : "/research/preview/new";
    navigate(target, { state: { reportData, autoDownload: true } });
  };

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={openPreview}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPreview(); } }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 400, damping: 26 }}
      dir="ltr"
      className="group relative w-full text-left rounded-3xl liquid-glass border border-border/40 overflow-hidden hover:border-border/70 transition-colors cursor-pointer"
    >
      {/* Cover */}
      <div className="relative h-32 sm:h-40 w-full overflow-hidden">
        {cover ? (
          <img src={cover} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-violet-500/30 via-blue-500/25 to-emerald-500/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/30 to-transparent" />
      </div>

      {/* Body */}
      <div className="px-4 pt-3 pb-4">
        <div className="min-w-0" dir={isRtl ? "rtl" : "ltr"}>
          <h4 className="text-[15px] font-semibold text-foreground line-clamp-2 leading-snug">{query}</h4>
          {previewLine && (
            <p className="mt-1 text-[12.5px] text-muted-foreground line-clamp-2 leading-relaxed">
              {previewLine}
            </p>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); openPreview(); }}
            className="flex-1 inline-flex items-center justify-center h-10 rounded-2xl bg-foreground text-background text-[13px] font-medium hover:bg-foreground/90 transition-colors"
          >
            <span>{"Open Preview"}</span>
          </button>
          <ExportMenu
            query={query}
            report={cleanReport}
            images={images}
            sessionKey={sessionKey}
            onExportPdf={handleExportPdf}
          />
        </div>
      </div>
    </motion.div>
  );
};

export default DeepResearchCard;
