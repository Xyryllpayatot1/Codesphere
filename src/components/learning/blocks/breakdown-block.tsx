import { CircleHelp, Lightbulb, TriangleAlert } from "lucide-react";
import type { ContentBlock } from "@/lib/content/types";

type Breakdown = Extract<ContentBlock, { type: "breakdown" }>;

export function BreakdownBlock({ block }: { block: Breakdown }) {
  return (
    <div className="my-6 space-y-4">
      {block.title && <p className="text-sm font-semibold text-foreground">{block.title}</p>}
      {block.steps.map((step, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              {i + 1}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Step {i + 1}</span>
          </div>
          <pre className="overflow-x-auto border-b border-border bg-background p-4 text-sm leading-relaxed">
            <code className="font-mono">{step.code}</code>
          </pre>
          <div className="space-y-2 p-4 text-sm leading-relaxed text-foreground/90">
            <p>{step.explain}</p>
            {step.why && (
              <p className="flex gap-2 text-foreground/85">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <span className="font-semibold">Why: </span>
                  {step.why}
                </span>
              </p>
            )}
            {step.mistake && (
              <p className="flex gap-2 rounded-md bg-destructive/10 p-2.5 text-foreground/90">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <span>
                  <span className="font-semibold text-destructive">Common trap: </span>
                  {step.mistake}
                </span>
              </p>
            )}
          </div>
        </div>
      ))}
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <CircleHelp className="h-3.5 w-3.5" /> Read each step from top to bottom before moving on.
      </p>
    </div>
  );
}
