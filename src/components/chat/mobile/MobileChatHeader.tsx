import { useState } from "react";
import { ChevronRight, MoreVertical, Plus, Share2, UserPlus, Pencil, Pin, Trash2 } from "lucide-react";
import { GlassSheet, GlassSheetContent } from "@/components/ui/glass-sheet";

export interface MobileChatHeaderProps {
  title?: string;
  hasConversation: boolean;
  isPinned?: boolean;
  onOpenSidebar: () => void;
  onNewChat: () => void;
  onShare: () => void;
  onInvite: () => void;
  onRename: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
  rightSlot?: React.ReactNode;
}

export default function MobileChatHeader({
  hasConversation,
  isPinned,
  onOpenSidebar,
  onNewChat,
  onShare,
  onInvite,
  onRename,
  onTogglePin,
  onDelete,
  rightSlot,
}: MobileChatHeaderProps) {
  const [open, setOpen] = useState(false);

  const items = [
    { icon: Plus, label: "New chat", onClick: onNewChat },
    { icon: Share2, label: "Share chat", onClick: onShare },
    { icon: UserPlus, label: "Invite people", onClick: onInvite },
    { icon: Pencil, label: "Rename", onClick: onRename },
    { icon: Pin, label: isPinned ? "Unpin chat" : "Pin chat", onClick: onTogglePin },
  ];

  const run = (fn: () => void) => {
    setOpen(false);
    setTimeout(fn, 60);
  };

  return (
    <>
      <div
        data-testid="mobile-chat-header"
        className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center gap-2 px-3 py-1.5 min-h-[44px] pt-[max(env(safe-area-inset-top),0.25rem)] bg-transparent pointer-events-none [&>*]:pointer-events-auto"
      >
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open menu"
          data-testid="mobile-open-sidebar"
          className="ios-fab w-11 h-11 rounded-full flex items-center justify-center text-foreground"
        >
          <ChevronRight className="w-[22px] h-[22px]" strokeWidth={2.25} />
        </button>

        <div className="flex-1 min-w-0 text-center">
          {!hasConversation ? rightSlot ?? null : null}
        </div>

        {hasConversation ? (
          <button
            type="button"
            aria-label="More options"
            data-testid="mobile-more-menu"
            onClick={() => setOpen(true)}
            className="ios-fab w-10 h-10 rounded-full flex items-center justify-center text-foreground"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        ) : (
          <span className="w-10 h-10 opacity-0 pointer-events-none" aria-hidden />
        )}
      </div>

      <GlassSheet open={open} onOpenChange={setOpen}>
        <GlassSheetContent data-testid="mobile-more-menu-content">
          <div className="space-y-2">
            <div className="ios-card overflow-hidden">
              {items.map(({ icon: Icon, label, onClick }, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => run(onClick)}
                  data-testid={`mobile-menu-${label.toLowerCase().replace(/\s+/g, "-")}`}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-left text-[15px] font-medium text-foreground active:bg-foreground/5 transition-colors ${i !== 0 ? "border-t border-foreground/5" : ""}`}
                >
                  <Icon className="w-[18px] h-[18px] text-foreground/60 shrink-0" strokeWidth={1.8} />
                  <span className="flex-1 truncate">{label}</span>
                </button>
              ))}
            </div>
            <div className="ios-card overflow-hidden">
              <button
                type="button"
                onClick={() => run(onDelete)}
                data-testid="mobile-menu-delete"
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left text-[15px] font-medium text-destructive active:bg-destructive/5 transition-colors"
              >
                <Trash2 className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} />
                <span className="flex-1 truncate">Delete chat</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ios-fab w-full mt-1 flex items-center justify-center py-3.5 rounded-2xl text-[15px] font-semibold text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </GlassSheetContent>
      </GlassSheet>
    </>
  );
}
