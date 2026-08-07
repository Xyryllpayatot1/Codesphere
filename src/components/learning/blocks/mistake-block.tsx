import { ArrowRight, Check, X } from "lucide-react";
import type { ContentBlock } from "@/lib/content/types";

type Mistake = Extract<ContentBlock, { type: "mistake" }>;

export function MistakeBlock({ block }: { block: Mistake }) {
  return (
    <div className="my-6 rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-destructive">Explain every mistake</p>
      <h3 className="mt-1 text-lg font-semibold">{block.title ?? "Common mistake & the fix"}</h3>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-destructive/40">
          <div className="flex items-center gap-2 border-b border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
            <X className="h-4 w-4" /> The mistake
          </div>
          <pre className="overflow-x-auto bg-background p-3 text-sm leading-relaxed">
            <code className="font-mono">{block.wrong}</code>
          </pre>
          <p className="border-t border-destructive/20 p-3 text-sm leading-relaxed text-foreground/90">{block.wrongWhy}</p>
        </div>

        <div className="overflow-hidden rounded-lg border border-success/40">
          <div className="flex items-center gap-2 border-b border-success/40 bg-success/10 px-3 py-2 text-sm font-semibold text-success">
            <Check className="h-4 w-4" /> The fix
          </div>
          <pre className="overflow-x-auto bg-background p-3 text-sm leading-relaxed">
            <code className="font-mono">{block.right}</code>
          </pre>
          <p className="border-t border-success/20 p-3 text-sm leading-relaxed text-foreground/90">{block.rightWhy}</p>
        </div>
      </div>

      {block.fix && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-primary/10 p-3 text-sm leading-relaxed text-foreground/90">
          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            <span className="font-semibold text-primary">How to spot it next time: </span>
            {block.fix}
          </span>
        </p>
      )}
    </div>
  );
}
