import { ArrowRight } from "lucide-react";
import type { ContentBlock } from "@/lib/content/types";

type Analogy = Extract<ContentBlock, { type: "analogy" }>;

export function AnalogyBlock({ block }: { block: Analogy }) {
  return (
    <div className="my-6 rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">Real-life analogy</p>
      <h3 className="mt-1 text-lg font-semibold">{block.topic}</h3>
      <p className="mt-2 leading-relaxed text-foreground/90">{block.real}</p>

      <div className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border">
        {block.mapping.map((row, i) => (
          <div key={i} className="grid gap-2 bg-background/60 p-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <div className="text-sm text-foreground/80">
              <span className="mr-1.5 text-muted-foreground">🏠</span>
              {row.real}
            </div>
            <ArrowRight className="hidden h-4 w-4 text-primary sm:block" />
            <div className="text-sm font-medium text-foreground">
              <span className="mr-1.5 text-primary">💻</span>
              {row.concept}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
