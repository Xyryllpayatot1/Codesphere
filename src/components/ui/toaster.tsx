"use client";

import { CheckCircle2, AlertCircle, Info, TrendingUp, Flame, X } from "lucide-react";
import { useToastStore, type ToastVariant } from "@/store/use-toast";
import { cn } from "@/lib/utils";

const config: Record<ToastVariant, { icon: React.ReactNode; accent: string }> = {
  success: { icon: <CheckCircle2 className="h-5 w-5 text-success" />, accent: "border-l-success" },
  error: { icon: <AlertCircle className="h-5 w-5 text-destructive" />, accent: "border-l-destructive" },
  info: { icon: <Info className="h-5 w-5 text-primary" />, accent: "border-l-primary" },
  level: { icon: <TrendingUp className="h-5 w-5 text-info" />, accent: "border-l-info" },
  streak: { icon: <Flame className="h-5 w-5 text-warning" />, accent: "border-l-warning" },
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "toast-in pointer-events-auto flex items-start gap-3 rounded-xl border border-border border-l-2 bg-card p-3.5 shadow-lg",
            config[t.variant].accent
          )}
          role="status"
        >
          <span className="mt-0.5 shrink-0">{config[t.variant].icon}</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-foreground">{t.title}</p>
            {t.description && <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>}
          </div>
          <button
            onClick={() => dismiss(t.id)}
            className="rounded p-0.5 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
