"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVisualViewportHeight } from "@/lib/mobile";

type BottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** Full-screen sheet (used for configuration flows / terminals). */
  fullScreen?: boolean;
  /** Hide the drag handle + title row. */
  bare?: boolean;
};

/**
 * Mobile bottom sheet. Slides up from the bottom with a drag handle, respects
 * safe-area insets and the on-screen keyboard, and clamps to the visible
 * viewport height. On larger screens it renders as a centered dialog so the
 * desktop experience stays unchanged.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  fullScreen,
  bare,
}: BottomSheetProps) {
  const vvHeight = useVisualViewportHeight();

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overscrollBehaviorY = "none";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overscrollBehaviorY = "";
    };
  }, [open, onOpenChange]);

  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 800;
  const sheetMaxHeight = fullScreen ? (vvHeight ?? viewportHeight) : (vvHeight ?? viewportHeight) * 0.92;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className={cn(
              "absolute inset-x-0 bottom-0 z-10 mx-auto flex flex-col rounded-t-2xl border border-b-0 border-border bg-card text-card-foreground shadow-2xl",
              fullScreen ? "h-full w-full rounded-none border-0" : "max-h-[92dvh] w-full lg:max-w-lg",
              className
            )}
            style={{ maxHeight: fullScreen ? undefined : sheetMaxHeight }}
          >
            {!bare && (
              <div className="relative flex shrink-0 flex-col px-4 pt-3 pb-2">
                <span className="mx-auto h-1 w-10 rounded-full bg-muted-foreground/30" aria-hidden />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    {title && <h2 className="truncate text-base font-semibold">{title}</h2>}
                    {description && <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>}
                  </div>
                  <button
                    onClick={() => onOpenChange(false)}
                    className="rounded-full p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
            <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-safe", bare ? "pt-3" : "pb-4")}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
