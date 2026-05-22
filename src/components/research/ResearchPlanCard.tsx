import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, GripVertical, Pencil, Plus, Trash2, X, Loader2, Sparkles } from "lucide-react";

interface ResearchPlanCardProps {
  query: string;
  initialPlan: string[];
  /** Called with the (possibly edited) plan when user clicks Approve. */
  onApprove: (plan: string[]) => void | Promise<void>;
  onCancel?: () => void;
  /** When true, disables actions and shows a loading spinner on Approve. */
  busy?: boolean;
}

/**
 * Editable research-plan gate shown when a deep-research job is paused at
 * `awaiting_approval`. The user can edit / reorder / add / delete sub-queries
 * before approving.
 */
const ResearchPlanCard = ({ query, initialPlan, onApprove, onCancel, busy }: ResearchPlanCardProps) => {
  const [items, setItems] = useState<string[]>(initialPlan.length ? initialPlan : [query]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState("");

  // Keep items in sync if the server replans before approval.
  useEffect(() => {
    if (initialPlan.length && editingIndex === null && !adding) {
      setItems(initialPlan);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPlan.join("\u0000")]);

  const startEdit = (i: number) => {
    setEditingIndex(i);
    setDraft(items[i]);
  };
  const commitEdit = () => {
    if (editingIndex === null) return;
    const next = [...items];
    const v = draft.trim();
    if (v) next[editingIndex] = v;
    setItems(next);
    setEditingIndex(null);
    setDraft("");
  };
  const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  };
  const addItem = () => {
    const v = newItem.trim();
    if (!v) return;
    setItems([...items, v]);
    setNewItem("");
    setAdding(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="w-full rounded-3xl border border-border/50 bg-card/70 backdrop-blur-xl overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
        <span className="w-7 h-7 rounded-full bg-primary/15 text-primary inline-flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-foreground leading-tight">Research plan</div>
          <div className="text-[11.5px] text-muted-foreground truncate">{items.length} sub-questions · review before running</div>
        </div>
      </div>

      <ul className="px-2 py-2 flex flex-col">
        {items.map((q, i) => {
          const isEditing = editingIndex === i;
          return (
            <li
              key={i}
              className="group flex items-start gap-2 px-2 py-2 rounded-xl hover:bg-foreground/[0.03] transition-colors"
            >
              <span className="mt-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-[10.5px] font-semibold text-muted-foreground shrink-0">
                {i + 1}
              </span>
              {isEditing ? (
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
                    if (e.key === "Escape") { setEditingIndex(null); setDraft(""); }
                  }}
                  className="flex-1 bg-transparent border-b border-primary/50 text-[13.5px] text-foreground outline-none py-0.5"
                />
              ) : (
                <button
                  onClick={() => startEdit(i)}
                  className="flex-1 text-start text-[13.5px] leading-snug text-foreground/90 hover:text-foreground"
                >
                  {q}
                </button>
              )}
              {!isEditing && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || busy}
                    aria-label="Move up"
                    className="w-6 h-6 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground disabled:opacity-30"
                  >
                    <GripVertical className="w-3.5 h-3.5 rotate-90" />
                  </button>
                  <button
                    onClick={() => startEdit(i)}
                    disabled={busy}
                    aria-label="Edit"
                    className="w-6 h-6 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => remove(i)}
                    disabled={busy || items.length <= 1}
                    aria-label="Delete"
                    className="w-6 h-6 inline-flex items-center justify-center rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground disabled:opacity-30"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </li>
          );
        })}

        {adding ? (
          <li className="flex items-center gap-2 px-2 py-2">
            <span className="mt-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted text-[10.5px] font-semibold text-muted-foreground shrink-0">
              {items.length + 1}
            </span>
            <input
              autoFocus
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="New sub-question…"
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); addItem(); }
                if (e.key === "Escape") { setAdding(false); setNewItem(""); }
              }}
              className="flex-1 bg-transparent border-b border-primary/50 text-[13.5px] text-foreground placeholder:text-muted-foreground outline-none py-0.5"
            />
            <button onClick={addItem} className="w-6 h-6 inline-flex items-center justify-center rounded-md text-primary hover:bg-primary/10">
              <Check className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setAdding(false); setNewItem(""); }} className="w-6 h-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
              <X className="w-3.5 h-3.5" />
            </button>
          </li>
        ) : (
          <li className="px-2 pt-1">
            <button
              onClick={() => setAdding(true)}
              disabled={busy || items.length >= 12}
              className="inline-flex items-center gap-1.5 px-2 py-1.5 text-[12px] font-medium text-primary hover:bg-primary/10 rounded-lg disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              Add sub-question
            </button>
          </li>
        )}
      </ul>

      <div className="flex items-center gap-2 px-4 py-3 border-t border-border/40 bg-foreground/[0.02]">
        <button
          onClick={onCancel}
          disabled={busy}
          className="px-3 h-9 rounded-xl text-[13px] font-medium text-foreground/80 hover:bg-foreground/10 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={() => onApprove(items.filter((s) => s.trim().length > 0))}
          disabled={busy || items.length === 0}
          className="flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          {busy ? "Starting…" : "Approve & run"}
        </button>
      </div>
    </motion.div>
  );
};

export default ResearchPlanCard;
