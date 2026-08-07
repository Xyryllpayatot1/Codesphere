import type { ContentBlock } from "@/lib/content/types";
import { learningPhase } from "@/lib/content/types";

type Section = Extract<ContentBlock, { type: "section" }>;

export function SectionBlock({ block }: { block: Section }) {
  const phase = learningPhase(block.step);
  return (
    <div className="my-8 flex items-start gap-3 border-l-4 border-primary pl-4">
      <span className="mt-0.5 text-2xl leading-none" aria-hidden>
        {phase?.icon ?? "✦"}
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          {phase ? `Step ${phase.step} · ${phase.title}` : `Step ${block.step}`}
        </p>
        <h3 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{block.title}</h3>
        {block.subtitle && <p className="mt-1 text-muted-foreground">{block.subtitle}</p>}
      </div>
    </div>
  );
}
