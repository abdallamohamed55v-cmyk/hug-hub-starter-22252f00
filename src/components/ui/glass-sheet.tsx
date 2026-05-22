import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface GlassSheetContextValue {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}

const GlassSheetContext = React.createContext<GlassSheetContextValue | null>(null);

interface GlassSheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function GlassSheet({ open = false, onOpenChange, children }: GlassSheetProps) {
  return (
    <GlassSheetContext.Provider value={{ open, onOpenChange }}>
      {children}
    </GlassSheetContext.Provider>
  );
}

export const GlassSheetTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ onClick, ...props }, ref) => {
  const sheet = React.useContext(GlassSheetContext);
  return (
    <button
      ref={ref}
      type="button"
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) sheet?.onOpenChange?.(true);
      }}
      {...props}
    />
  );
});
GlassSheetTrigger.displayName = "GlassSheetTrigger";

export const GlassSheetClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ onClick, ...props }, ref) => {
  const sheet = React.useContext(GlassSheetContext);
  return (
    <button
      ref={ref}
      type="button"
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) sheet?.onOpenChange?.(false);
      }}
      {...props}
    />
  );
});
GlassSheetClose.displayName = "GlassSheetClose";

export const GlassSheetPortal = ({ children }: { children: React.ReactNode }) => {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
};

export const GlassSheetOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, onClick, ...props }, ref) => {
  const sheet = React.useContext(GlassSheetContext);
  return (
    <div
      ref={ref}
      className={cn("fixed inset-0 z-[9998] bg-black/55 backdrop-blur-sm", className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) sheet?.onOpenChange?.(false);
      }}
      {...props}
    />
  );
});
GlassSheetOverlay.displayName = "GlassSheetOverlay";

interface GlassSheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  showHandle?: boolean;
  contentClassName?: string;
}

export const GlassSheetContent = React.forwardRef<HTMLDivElement, GlassSheetContentProps>(
  ({ className, contentClassName, children, showHandle = true, ...props }, ref) => {
    const sheet = React.useContext(GlassSheetContext);

    // Lock document scroll while open. Some ancestor (likely a CSS
    // `backdrop-filter`/`transform` inside the chat layout) breaks
    // `position: fixed`, anchoring the sheet to the document instead of the
    // viewport. Locking scroll keeps the document and the viewport aligned so
    // the sheet always lands at the visible bottom.
    React.useEffect(() => {
      if (!sheet?.open || typeof document === "undefined") return;
      const html = document.documentElement;
      const scrollY = window.scrollY;
      const prevHtmlOverflow = html.style.overflow;
      const prevHtmlScrollBehavior = html.style.scrollBehavior;
      html.style.scrollBehavior = "auto";
      window.scrollTo(0, 0);
      html.style.overflow = "hidden";
      return () => {
        html.style.overflow = prevHtmlOverflow;
        window.scrollTo(0, scrollY);
        html.style.scrollBehavior = prevHtmlScrollBehavior;
      };
    }, [sheet?.open]);

    if (!sheet?.open || typeof document === "undefined") return null;

    return createPortal(
      <>
        <GlassSheetOverlay />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 9999 }}
          className={cn(
            "mt-24 flex h-auto max-h-[88dvh] flex-col overflow-y-auto rounded-t-[28px] outline-none",
            "border-t border-white/15 dark:border-white/10 bg-background",
            "shadow-[0_-24px_60px_-12px_rgba(0,0,0,0.45)]",
            "animate-in slide-in-from-bottom-6 fade-in duration-200",
            className,
          )}
          onClick={(event) => event.stopPropagation()}
          {...props}
        >
          {showHandle && (
            <div className="mx-auto mt-2 mb-1 h-1.5 w-10 shrink-0 rounded-full bg-foreground/20" />
          )}
          <div
            className={cn(
              "px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+1rem)] text-foreground",
              contentClassName,
            )}
          >
            {children}
          </div>
        </div>
      </>,
      document.body,
    );
  },
);
GlassSheetContent.displayName = "GlassSheetContent";

export const GlassSheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("px-1 pt-1 pb-3 text-start", className)} {...props} />
);

export const GlassSheetTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-base font-semibold text-foreground tracking-tight", className)}
    {...props}
  />
));
GlassSheetTitle.displayName = "GlassSheetTitle";

export const GlassSheetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs text-muted-foreground mt-0.5", className)}
    {...props}
  />
));
GlassSheetDescription.displayName = "GlassSheetDescription";
