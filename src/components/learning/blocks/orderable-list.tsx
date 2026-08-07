"use client";

import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

// Click-to-reorder list used by ordering/code_completion exercises and quizzes.
// Items are given already shuffled; the user reorders them by moving rows up/down.

export function OrderableList({
  items,
  labels,
  onChange,
  className,
}: {
  items: number[]; // current order: array of item indexes
  labels: string[]; // labels[i] is the text of item i
  onChange: (order: number[]) => void;
  className?: string;
}) {
  function move(idx: number, delta: number) {
    const next = [...items];
    const target = idx + delta;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  return (
    <ol className={cn("space-y-2", className)}>
      {items.map((itemIdx, pos) => (
        <li
          key={itemIdx}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-xs">
            {pos + 1}
          </span>
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />
          <span className="flex-1 font-mono text-foreground/90">{labels[itemIdx]}</span>
          <div className="flex shrink-0 gap-0.5">
            <button
              type="button"
              onClick={() => move(pos, -1)}
              disabled={pos === 0}
              className="rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30"
              aria-label="Move up"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => move(pos, 1)}
              disabled={pos === items.length - 1}
              className="rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30"
              aria-label="Move down"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          </div>
        </li>
      ))}
    </ol>
  );
}
