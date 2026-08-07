import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentBlock } from "@/lib/content/types";

type Visual = Extract<ContentBlock, { type: "visual" }>;

const TONE_CLASSES: Record<NonNullable<Visual["nodes"][number]["tone"]>, string> = {
  default: "border-border bg-card text-foreground",
  primary: "border-primary/40 bg-primary/10 text-primary",
  muted: "border-border bg-muted text-muted-foreground",
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-warning/40 bg-warning/10 text-warning",
  danger: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function VisualBlock({ block }: { block: Visual }) {
  const labelFor = (from: string, to: string) => block.edges?.find((e) => e.from === from && e.to === to)?.label;

  return (
    <figure className="my-6 rounded-xl border border-border bg-card p-5">
      {block.title && <figcaption className="mb-4 text-sm font-semibold text-foreground">{block.title}</figcaption>}
      <div className="mx-auto max-w-xl">
        {block.nodes.map((node, i) => {
          const next = block.nodes[i + 1];
          const label = next ? labelFor(node.id, next.id) : undefined;
          return (
            <div key={node.id} className="flex flex-col items-center">
              <div
                className={cn(
                  "w-full rounded-lg border px-4 py-3 text-center",
                  TONE_CLASSES[node.tone ?? "default"],
                )}
              >
                <p className="font-semibold">{node.label}</p>
                {node.detail && <p className="mt-0.5 text-xs opacity-80">{node.detail}</p>}
              </div>
              {next && (
                <div className="flex flex-col items-center py-1.5">
                  {label && <span className="mb-0.5 text-[11px] font-medium text-muted-foreground">{label}</span>}
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {block.caption && <p className="mt-4 text-center text-xs text-muted-foreground">{block.caption}</p>}
    </figure>
  );
}
