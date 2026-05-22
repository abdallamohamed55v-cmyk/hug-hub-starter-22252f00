import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import { SLIDES_TEMPLATES } from "@/lib/slidesTemplates";

interface Props {
  open: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

const SlidesTemplateSheet = ({ open, selectedId, onSelect, onClose }: Props) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] bg-background/95 backdrop-blur flex flex-col"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <header className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <h2 className="text-base font-bold">Choose a slide template</h2>
            <button onClick={onClose} className="h-9 w-9 rounded-full bg-muted hover:bg-muted/70 flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </header>
          <div className="flex-1 overflow-y-auto px-4 py-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-3xl mx-auto">
              {SLIDES_TEMPLATES.map((t) => {
                const active = selectedId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => { onSelect(t.id); onClose(); }}
                    className={`group relative rounded-2xl overflow-hidden border-2 text-left transition-all ${
                      active ? "border-primary ring-2 ring-primary/30" : "border-border/40 hover:border-foreground/30"
                    }`}
                  >
                    <div
                      className="relative w-full aspect-[16/9] overflow-hidden"
                      style={{ background: `linear-gradient(135deg, ${t.colors[0]} 0%, ${t.colors[1]} 100%)` }}
                    >
                      {t.cover && (
                        <img
                          src={t.cover}
                          alt={`${t.name} template preview`}
                          loading="lazy"
                          width={1280}
                          height={720}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      )}
                      <div className="absolute inset-x-0 bottom-0 p-2.5 text-[10px] font-black uppercase tracking-[0.22em] text-white drop-shadow"
                           style={{ background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.65))" }}>
                        {t.name}
                      </div>
                      {active && (
                        <span className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>
                    <div className="px-3 py-2">
                      <p className="text-xs font-semibold truncate">{t.name}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-1">{t.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SlidesTemplateSheet;
