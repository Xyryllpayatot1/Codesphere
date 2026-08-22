import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Single-purpose metric display. Every stat must answer "so what?" via the
 * `hint` line (context, target or delta) — bare numbers without context are
 * not displayed anywhere in the product.
 */
export function Stat({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  hint?: React.ReactNode;
  tone?: "default" | "primary" | "success" | "warning";
  className?: string;
}) {
  const iconTone =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "success"
        ? "bg-success/10 text-success"
        : tone === "warning"
          ? "bg-warning/10 text-warning-foreground dark:text-warning"
          : "bg-secondary text-muted-foreground";

  return (
    <div className={cn("flex items-start gap-3.5 rounded-xl border border-border bg-card p-4", className)}>
      {Icon && (
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", iconTone)}>
          <Icon className="h-4 w-4" aria-hidden />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-xl font-semibold tabular-nums leading-tight tracking-tight text-foreground">
          {value}
        </p>
        {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
