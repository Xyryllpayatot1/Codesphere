"use client";

import { useEffect } from "react";
import { Lightbulb, CheckCircle2, XCircle, Info, X } from "lucide-react";
import { useNetlab } from "./netlab-store";
import { cn } from "@/lib/utils";

export function LearnNote() {
  const { learn, setLearn } = useNetlab();

  useEffect(() => {
    if (!learn) return;
    const t = setTimeout(() => setLearn(null), 9000);
    return () => clearTimeout(t);
  }, [learn, setLearn]);

  if (!learn) return null;

  const Icon = learn.kind === "success" ? CheckCircle2 : learn.kind === "error" ? XCircle : Info;
  const titleColor =
    learn.kind === "success" ? "text-success" : learn.kind === "error" ? "text-destructive" : "text-primary";
  const borderColor =
    learn.kind === "success" ? "border-success/40" : learn.kind === "error" ? "border-destructive/40" : "border-primary/30";

  return (
    <div className="pointer-events-auto absolute left-3 top-28 z-40 w-80 max-w-[calc(100%-6rem)] lg:bottom-3 lg:top-auto">
      <div className={cn("rounded-xl border bg-card/95 p-3 shadow-2xl backdrop-blur", borderColor)}>
        <div className="flex items-start gap-2.5">
          <span className={cn("mt-0.5", titleColor)}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className={cn("text-xs font-semibold leading-tight", titleColor)}>{learn.title}</p>
            <p className="mt-1 text-xs leading-snug text-muted-foreground">{learn.body}</p>
          </div>
          <button onClick={() => setLearn(null)} className="rounded p-0.5 text-muted-foreground hover:bg-secondary" aria-label="Dismiss">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="mt-2 flex items-center gap-1.5 border-t border-border pt-2 text-[10px] text-muted-foreground">
          <Lightbulb className="h-3 w-3 text-amber-500" />
          Learn this — it&apos;s how real networks work.
        </div>
      </div>
    </div>
  );
}
