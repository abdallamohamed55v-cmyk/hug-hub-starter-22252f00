// Wizard-style clarify card: shows ONE question at a time with progress.
// Supports text, long_text, choice, multi_choice, number, date, email, phone,
// url, and image (uploaded to Supabase Storage). Required questions block
// "Next"; optional ones can be skipped. After all answered → collapses to a
// compact "answered" pill while the AI thinks.
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, ArrowRight, ArrowLeft, Upload, X as XIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DocsClarifyQuestion } from "@/lib/agent/docs/types";

// Auto-detect UI language based on the source language of the clarify content.
// Defaults to English; only switches to Arabic when the text contains Arabic
// script. This way ALL languages get a sensible (English) UI by default and
// Arabic users still see fully-localized labels.
type UiLang = "ar" | "en";
function detectUiLang(...samples: string[]): UiLang {
  const joined = samples.join(" ");
  return /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(joined) ? "ar" : "en";
}
const UI_STRINGS: Record<UiLang, Record<string, string>> = {
  ar: {
    title: "Before I start designing",
    optional: "​",
    back: "Back",
    skip: "Skip",
    next: "Next",
    startDesign: "Start Design",
    answered: "Answered",
    thinking: "Thinking…",
    maxSize: "Max size 5MB",
    uploaded: "Uploaded",
    uploadFailed: "Upload failed",
    finishEarly: "Skip the rest and start designing",
    uploaded2: "Image uploaded",
    clear: "Clear",
    uploading: "Uploading…",
    uploadCta: "Click to upload an image (PNG/JPG/WEBP — up to 5MB)",
    orPasteUrl: "Or paste an image URL",
    optionalHint: "This field is optional — you can skip it",
  },
  en: {
    title: "Before I start designing",
    optional: "​",
    back: "Back",
    skip: "Skip",
    next: "Next",
    startDesign: "Start designing",
    answered: "Answered",
    thinking: "Thinking…",
    maxSize: "Max size is 5MB",
    uploaded: "Uploaded",
    uploadFailed: "Upload failed",
    finishEarly: "Skip the rest and start designing",
    uploaded2: "Image uploaded",
    clear: "Clear",
    uploading: "Uploading…",
    uploadCta: "Click to upload an image (PNG/JPG/WEBP — up to 5MB)",
    orPasteUrl: "Or paste an image URL",
    optionalHint: "This field is optional — you can skip it",
  },
};

interface Props {
  reason: string;
  questions: DocsClarifyQuestion[];
  onSubmit: (answers: Record<string, string>) => void;
  onSkip?: () => void;
  busy?: boolean;
}

export default function DocsClarifyCard({ reason, questions, onSubmit, busy }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [idx, setIdx] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uiLang = useMemo<UiLang>(
    () => detectUiLang(reason, ...questions.map((q) => `${q.label} ${q.help ?? ""} ${q.group ?? ""}`)),
    [reason, questions],
  );
  const t = (k: keyof typeof UI_STRINGS.en) => UI_STRINGS[uiLang][k] ?? UI_STRINGS.en[k];

  // If a new clarify arrives (different questions), reset wizard state so the
  // user sees the new questions instead of the "answered" pill from the prior round.
  const questionsSig = useMemo(
    () => `${questions.length}::${questions.map((q) => q.id).join(",")}::${reason.slice(0, 64)}`,
    [questions, reason],
  );
  useEffect(() => {
    setAnswers({});
    setIdx(0);
    setSubmitted(false);
  }, [questionsSig]);

  const q = questions[idx];
  const total = questions.length;
  const isLast = idx === total - 1;
  const value = answers[q?.id ?? ""] ?? "";
  const isAnswered = value.trim().length > 0;
  // Image questions are ALWAYS optional client-side, even if the model marked
  // them required — users may not have a photo ready and shouldn't be blocked.
  const effectiveRequired = q?.required && q?.type !== "image";
  const canAdvance = effectiveRequired ? isAnswered : true;

  const setAns = (id: string, v: string) => setAnswers((p) => ({ ...p, [id]: v }));

  const handleNext = () => {
    if (!canAdvance) return;
    if (isLast) {
      setSubmitted(true);
      onSubmit(answers);
    } else {
      setIdx((i) => i + 1);
    }
  };
  const handleBack = () => setIdx((i) => Math.max(0, i - 1));
  const handleSkip = () => {
    if (effectiveRequired) return;
    if (isLast) { setSubmitted(true); onSubmit(answers); }
    else setIdx((i) => i + 1);
  };

  const handleFinishEarly = () => {
    setSubmitted(true);
    onSubmit(answers);
  };

  const handleUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error(t("maxSize")); return; }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Login required");
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("docs-uploads").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("docs-uploads").getPublicUrl(path);
      setAns(q.id, pub.publicUrl);
      toast.success(t("uploaded"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("uploadFailed"));
    } finally { setUploading(false); }
  };

  const requiredRemaining = useMemo(
    () => questions.filter((qq) => qq.required && qq.type !== "image" && !(answers[qq.id] ?? "").trim()).length,
    [questions, answers]
  );

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="inline-flex items-center gap-2.5 rounded-full border border-border/60 bg-card/70 backdrop-blur-xl px-3.5 h-9 shadow-sm"
      >
        <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <Check className="w-3 h-3" strokeWidth={3} />
        </span>
        <span className="text-[12.5px] font-medium text-foreground/85">{t("answered")}</span>
        <span className="w-px h-3.5 bg-border/60" />
        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
        <span className="text-[12px] text-muted-foreground">{t("thinking")}</span>
      </motion.div>
    );
  }

  if (!q) return null;

  const progressPct = Math.round(((idx + (isAnswered ? 1 : 0)) / total) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-xl rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl p-4 md:p-5 shadow-sm"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
          <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.1 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-foreground">{t("title")}</div>
          <div className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed truncate">{reason}</div>
        </div>
        <div className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">{idx + 1}/{total}</div>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full bg-muted/40 overflow-hidden mb-4">
        <motion.div
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500"
          initial={false}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {/* Group label */}
      {q.group && (
        <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground/80 font-semibold mb-1.5">{q.group}</div>
      )}

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2 }}
        >
          <label className="block text-[14px] font-semibold text-foreground mb-1 leading-snug">
            {q.label}
            {effectiveRequired ? <span className="text-rose-500 ms-1">*</span> : <span className="text-muted-foreground/70 text-[11px] ms-1.5 font-normal">{t("optional")}</span>}
          </label>
          {q.help && <div className="text-[12px] text-muted-foreground mb-2.5">{q.help}</div>}

          <QuestionInput
            q={q}
            value={value}
            onChange={(v) => setAns(q.id, v)}
            uploading={uploading}
            onUploadClick={() => fileRef.current?.click()}
            onClear={() => setAns(q.id, "")}
            uiLang={uiLang}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Nav */}
      <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-border/40">
        <button
          type="button"
          onClick={handleBack}
          disabled={idx === 0 || busy}
          className="h-8 px-2.5 rounded-full text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 inline-flex items-center gap-1"
        >
          <ArrowRight className="w-3.5 h-3.5 rtl:hidden" />
          <ArrowLeft className="w-3.5 h-3.5 hidden rtl:inline" />
          <span>{t("back")}</span>
        </button>

        <div className="flex items-center gap-2">
          {!effectiveRequired && (
            <button
              type="button"
              onClick={handleSkip}
              disabled={busy}
              className="h-8 px-3 rounded-full text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              {t("skip")}
            </button>
          )}
          {isLast ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canAdvance || busy}
              className="h-9 px-4 rounded-full bg-foreground text-background text-[12.5px] font-semibold hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              <span>{t("startDesign")}</span>
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canAdvance || busy}
              className="h-9 px-4 rounded-full bg-foreground text-background text-[12.5px] font-semibold hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
            >
              <span>{t("next")}</span>
              <ArrowLeft className="w-3.5 h-3.5 rtl:hidden" />
              <ArrowRight className="w-3.5 h-3.5 hidden rtl:inline" />
            </button>
          )}
        </div>
      </div>

      {/* Finish early when all required done */}
      {!isLast && requiredRemaining === 0 && (
        <div className="mt-2 text-end">
          <button
            type="button"
            onClick={handleFinishEarly}
            disabled={busy}
            className="text-[11.5px] text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            {t("finishEarly")}
          </button>
        </div>
      )}
    </motion.div>
  );
}

function QuestionInput({
  q, value, onChange, uploading, onUploadClick, onClear, uiLang,
}: {
  q: DocsClarifyQuestion;
  value: string;
  onChange: (v: string) => void;
  uploading: boolean;
  onUploadClick: () => void;
  onClear: () => void;
  uiLang: UiLang;
}) {
  const tt = (k: keyof typeof UI_STRINGS.en) => UI_STRINGS[uiLang][k] ?? UI_STRINGS.en[k];
  if (q.type === "image") {
    if (value) {
      return (
        <div className="flex items-center gap-3 p-2 rounded-xl border border-border/60 bg-background/60">
          <img src={value} alt="" className="w-14 h-14 rounded-lg object-cover bg-muted" />
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-medium text-foreground truncate">{tt("uploaded2")}</div>
            <div className="text-[11px] text-muted-foreground truncate">{value}</div>
          </div>
          <button type="button" onClick={onClear} className="w-8 h-8 rounded-full hover:bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground" title={tt("clear")}>
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={onUploadClick}
          disabled={uploading}
          className="w-full h-24 rounded-xl border-2 border-dashed border-border/60 hover:border-foreground/40 bg-background/40 flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground transition disabled:opacity-60"
        >
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          <span className="text-[12.5px] font-medium">{uploading ? tt("uploading") : tt("uploadCta")}</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="h-px flex-1 bg-border/60" />
          <span className="text-[10.5px] text-muted-foreground">{tt("orPasteUrl")}</span>
          <span className="h-px flex-1 bg-border/60" />
        </div>
        <input
          type="url"
          inputMode="url"
          placeholder="https://…"
          dir="ltr"
          onChange={(e) => onChange(e.target.value.trim())}
          className="w-full h-9 px-3 rounded-xl bg-background/60 border border-border/60 text-[12.5px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground/40 transition-colors"
        />
        <div className="text-[11px] text-muted-foreground/80 text-center">{tt("optionalHint")}</div>
      </div>
    );
  }

  if (q.type === "long_text") {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={q.placeholder ?? ""}
        maxLength={q.maxLength ?? 1000}
        rows={4}
        className="w-full px-3 py-2.5 rounded-xl bg-background/60 border border-border/60 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground/40 transition-colors resize-y leading-relaxed"
      />
    );
  }

  if (q.type === "choice" && q.options?.length) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {q.options.map((opt) => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`px-3.5 h-9 rounded-full text-[12.5px] font-medium border transition-all ${selected ? "bg-foreground text-background border-foreground" : "bg-background/60 border-border/60 text-foreground/75 hover:text-foreground hover:border-foreground/40"}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  if (q.type === "multi_choice" && q.options?.length) {
    const selected = value ? value.split(",").map((s) => s.trim()).filter(Boolean) : [];
    const toggle = (opt: string) => {
      const next = selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt];
      onChange(next.join(", "));
    };
    return (
      <div className="flex flex-wrap gap-1.5">
        {q.options.map((opt) => {
          const isSel = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`px-3.5 h-9 rounded-full text-[12.5px] font-medium border transition-all ${isSel ? "bg-foreground text-background border-foreground" : "bg-background/60 border-border/60 text-foreground/75 hover:text-foreground hover:border-foreground/40"}`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    );
  }

  const htmlType =
    q.type === "number" ? "number" :
    q.type === "date" ? "date" :
    q.type === "email" ? "email" :
    q.type === "phone" ? "tel" :
    q.type === "url" ? "url" :
    "text";

  return (
    <input
      type={htmlType}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={q.placeholder ?? ""}
      maxLength={q.maxLength ?? 200}
      className="w-full h-10 px-3 rounded-xl bg-background/60 border border-border/60 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-foreground/40 transition-colors"
    />
  );
}
