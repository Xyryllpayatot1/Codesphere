"use client";

import { useState } from "react";
import { NotebookPen } from "lucide-react";
import type { ContentBlock } from "@/lib/content/types";

type Reflection = Extract<ContentBlock, { type: "reflection" }>;

export function ReflectionBlock({ block }: { block: Reflection }) {
  const storageKey = `reflection:${block.title ?? "notes"}`;
  const [notes, setNotes] = useState<string[]>(() => {
    if (typeof window === "undefined") return block.questions.map(() => "");
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as string[]) : block.questions.map(() => "");
    } catch {
      // ignore corrupt storage
      return block.questions.map(() => "");
    }
  });

  function update(i: number, value: string) {
    const next = notes.map((n, j) => (j === i ? value : n));
    setNotes(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // storage full/unavailable — ignore
    }
  }

  return (
    <div className="my-6 rounded-xl border border-border bg-card p-5">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
        <NotebookPen className="h-3.5 w-3.5" /> Reflection journal
      </p>
      <h3 className="mt-1 text-lg font-semibold">{block.title ?? "Think it through"}</h3>
      <div className="mt-3 space-y-3">
        {block.questions.map((q, i) => (
          <div key={i} className="space-y-1.5">
            <p className="text-sm font-medium leading-relaxed text-foreground/90">{q}</p>
            <textarea
              rows={2}
              value={notes[i]}
              onChange={(e) => update(i, e.target.value)}
              placeholder="Write a sentence or two — your answer stays on this device."
              className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
