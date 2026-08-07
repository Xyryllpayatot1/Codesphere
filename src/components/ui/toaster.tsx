"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, TrendingUp, Flame, X } from "lucide-react";
import { useToastStore, type ToastVariant } from "@/store/use-toast";
import { cn } from "@/lib/utils";

const icons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-success" />,
  error: <AlertCircle className="h-5 w-5 text-destructive" />,
  info: <Info className="h-5 w-5 text-primary" />,
  level: <TrendingUp className="h-5 w-5 text-accent-foreground" />,
  streak: <Flame className="h-5 w-5 text-orange-500" />,
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-xl border bg-card/95 p-3.5 shadow-lg backdrop-blur",
              t.variant === "level" && "border-accent",
              t.variant === "streak" && "border-orange-500/40"
            )}
            role="status"
          >
            <span className="mt-0.5 shrink-0">{icons[t.variant]}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="rounded p-0.5 text-muted-foreground transition hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
