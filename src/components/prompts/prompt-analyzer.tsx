"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Info, ScanSearch, Sparkles, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { analyzePrompt, type PromptAnalysis } from "@/lib/engine/prompts/analyze";

const GRADE_COLOR: Record<PromptAnalysis["grade"], string> = {
  great: "text-success",
  good: "text-primary",
  "needs-work": "text-warning",
  weak: "text-destructive",
};

const GRADE_BAR: Record<PromptAnalysis["grade"], string> = {
  great: "bg-success",
  good: "bg-primary",
  "needs-work": "bg-warning",
  weak: "bg-destructive",
};

export function PromptAnalyzer({
  embed,
  title,
  initialText,
  prefill,
  prefillKey,
}: {
  embed?: boolean;
  title?: string;
  initialText?: string;
  prefill?: string;
  prefillKey?: number;
}) {
  const [text, setText] = useState(initialText ?? "");
  const [seenKey, setSeenKey] = useState(0);

  if (prefill && prefillKey && prefillKey > 0 && prefillKey !== seenKey) {
    setSeenKey(prefillKey);
    setText(prefill);
  }

  const analysis = useMemo(() => analyzePrompt(text), [text]);
  const hasInput = text.trim().length >= 2;

  return (
    <div className="my-6 rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ScanSearch className="h-4 w-4 text-primary" />
          {title ?? "Prompt Analyzer"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Paste a prompt and get a 0–100 score with honest, rule-based feedback. No AI guesses.
        </p>
      </div>

      <div className="p-4">
        <textarea
          rows={embed ? 4 : 6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Paste your prompt here…\n\nExample: Make a website"} 
          className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />

        {!hasInput ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
            <Info className="h-4 w-4 shrink-0" />
            Type a prompt and the analysis updates automatically.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-4 border-border bg-background">
                <span className={cn("text-2xl font-bold", GRADE_COLOR[analysis.grade])}>{analysis.score}</span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">/ 100</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-all", GRADE_BAR[analysis.grade])}
                    style={{ width: `${analysis.score}%` }}
                  />
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground/90">{analysis.summary}</p>
                <p className="mt-1 text-xs text-muted-foreground">{analysis.wordCount} words</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {analysis.components.map((c) => (
                <div
                  key={c.key}
                  className={cn(
                    "rounded-lg border p-3",
                    c.found ? "border-success/40 bg-success/5" : "border-destructive/30 bg-destructive/5",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{c.label}</span>
                    {c.found ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                    )}
                  </div>
                  {c.found ? (
                    <p className="mt-1 text-xs text-foreground/75">
                      {c.strength >= 0.6 ? "Well covered" : "Mentioned, but could be clearer"}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs leading-relaxed text-foreground/75">{c.tip}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {analysis.strengths.length > 0 && (
                <div className="rounded-lg bg-success/10 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-success">
                    <Sparkles className="h-3.5 w-3.5" /> What works
                  </p>
                  <ul className="space-y-1 text-sm text-foreground/90">
                    {analysis.strengths.map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-success">✓</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.improvements.length > 0 && (
                <div className="rounded-lg bg-warning/10 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-warning">
                    <Info className="h-3.5 w-3.5" /> How to improve
                  </p>
                  <ul className="space-y-1 text-sm text-foreground/90">
                    {analysis.improvements.map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-warning">→</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
