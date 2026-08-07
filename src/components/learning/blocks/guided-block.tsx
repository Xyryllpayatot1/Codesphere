"use client";

import { useState } from "react";
import { CheckCircle2, CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentBlock } from "@/lib/content/types";

type Guided = Extract<ContentBlock, { type: "guided" }>;

export function GuidedBlock({ block }: { block: Guided }) {
  const [done, setDone] = useState<boolean[]>(() => block.steps.map(() => false));
  const [open, setOpen] = useState<boolean[]>(() => block.steps.map(() => false));

  return (
    <div className="my-6 space-y-3">
      {block.title && <p className="text-sm font-semibold text-foreground">{block.title}</p>}
      {block.steps.map((step, i) => {
        const completed = done[i];
        return (
          <div key={i} className={cn("rounded-xl border bg-card transition-colors", completed ? "border-success/50" : "border-border")}>
            <button
              type="button"
              onClick={() => setDone((d) => d.map((v, j) => (j === i ? !v : v)))}
              className="flex w-full items-start gap-3 px-4 py-3 text-left"
            >
              <CheckCircle2 className={cn("mt-0.5 h-5 w-5 shrink-0", completed ? "text-success" : "text-muted-foreground/40")} />
              <span className="flex-1 text-sm leading-relaxed">
                <span className="mr-1.5 font-semibold text-primary">{i + 1}.</span>
                {step.instruction}
              </span>
            </button>
            {(step.explain || step.check) && (
              <div className="px-4 pb-3">
                <button
                  type="button"
                  onClick={() => setOpen((o) => o.map((v, j) => (j === i ? !v : v)))}
                  className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <CircleHelp className="h-3.5 w-3.5" />
                  {open[i] ? "Hide guidance" : "Show guidance"}
                </button>
                {open[i] && (
                  <div className="space-y-2 rounded-lg bg-background/60 p-3 text-sm leading-relaxed text-foreground/90">
                    {step.explain && <p>{step.explain}</p>}
                    {step.check && (
                      <p className="flex gap-2 text-foreground/85">
                        <span className="font-semibold text-primary">Check yourself: </span>
                        <span>{step.check}</span>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
