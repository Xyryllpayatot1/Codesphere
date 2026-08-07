"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  Ban,
  ClipboardList,
  Copy,
  FolderOpen,
  GripVertical,
  LayoutList,
  ListChecks,
  Plus,
  Sparkles,
  Target,
  Trash2,
  User,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type PromptComponentKey =
  | "role"
  | "task"
  | "context"
  | "requirements"
  | "constraints"
  | "examples"
  | "outputFormat"
  | "successCriteria";

type ComponentDef = {
  key: PromptComponentKey;
  label: string;
  icon: typeof User;
  hint: string;
  placeholder: string;
};

const COMPONENTS: ComponentDef[] = [
  { key: "role", label: "Role", icon: User, hint: "Who the assistant should be", placeholder: "You are a patient tutor for beginners who explains things simply." },
  { key: "task", label: "Task", icon: Target, hint: "What you want done", placeholder: "Write a JavaScript function that capitalizes the first letter of each word." },
  { key: "context", label: "Context", icon: FolderOpen, hint: "Background, your situation, skill level", placeholder: "I'm a beginner. This is for a school project and I'm using vanilla JavaScript." },
  { key: "requirements", label: "Requirements", icon: ListChecks, hint: "Features the answer must include", placeholder: "It must handle empty strings and work for any sentence." },
  { key: "constraints", label: "Constraints", icon: Ban, hint: "What to avoid or limit", placeholder: "No frameworks, ES6 only, under 40 lines." },
  { key: "examples", label: "Examples", icon: ClipboardList, hint: "Sample input to output", placeholder: "Example: 'hello world' → 'Hello World'." },
  { key: "outputFormat", label: "Output format", icon: LayoutList, hint: "How the answer should be shaped", placeholder: "Show the code first, then a one-line explanation of how it works." },
  { key: "successCriteria", label: "Success criteria", icon: BadgeCheck, hint: "How you'll know it worked", placeholder: "It should pass the three example cases above." },
];

const TEMPLATES: { name: string; blocks: Partial<Record<PromptComponentKey, string>> }[] = [
  {
    name: "Explain something",
    blocks: {
      role: "You are a patient tutor for beginners.",
      task: "Explain how closures work in JavaScript.",
      context: "I'm a new programmer and this is my first time seeing this concept.",
      outputFormat: "Use a real-life analogy, then show one small code example.",
      successCriteria: "I should be able to explain it back in my own words afterwards.",
    },
  },
  {
    name: "Build a feature",
    blocks: {
      role: "You are a senior full-stack developer who writes clean code.",
      task: "Build a click counter that saves its value between page reloads.",
      context: "The page is a single HTML file using vanilla JavaScript.",
      constraints: "No frameworks and no external libraries.",
      outputFormat: "Show the full code, then list the key lines with one-line comments.",
      successCriteria: "The counter should survive a refresh and never go below zero.",
    },
  },
  {
    name: "Fix a bug",
    blocks: {
      role: "You are a debugging expert.",
      task: "Find and fix the bug in my code.",
      context: "I clicked a button and the counter went straight to 1 instead of adding 1 each time.",
      constraints: "Explain the cause before showing the fix.",
      outputFormat: "First the cause, then the fixed code.",
    },
  },
];

type Entry = { id: string; key: PromptComponentKey; text: string };

export function PromptBuilder({
  embed,
  title,
  onCompose,
}: {
  embed?: boolean;
  title?: string;
  onCompose?: (text: string) => void;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);

  function add(key: PromptComponentKey) {
    setEntries((prev) => [...prev, { id: crypto.randomUUID(), key, text: "" }]);
  }

  function update(id: string, text: string) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, text } : e)));
  }

  function remove(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function move(id: string, dir: -1 | 1) {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === id);
      const target = idx + dir;
      if (idx === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function applyTemplate(t: (typeof TEMPLATES)[number]) {
    setEntries(
      Object.entries(t.blocks)
        .filter(([, text]) => text && text.trim().length > 0)
        .map(([key, text]) => ({ id: crypto.randomUUID(), key: key as PromptComponentKey, text: text ?? "" })),
    );
  }

  const composed = entries
    .filter((e) => e.text.trim().length > 0)
    .map((e) => {
      const def = COMPONENTS.find((c) => c.key === e.key)!;
      return `${def.label.toUpperCase()}: ${e.text.trim()}`;
    })
    .join("\n\n");

  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(composed);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  }

  function compose() {
    onCompose?.(composed);
  }

  return (
    <div className="my-6 rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          {title ?? "Prompt Builder"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Build a prompt out of components — {embed ? "each block adds one ingredient of a great prompt." : "add blocks, type, reorder, then copy."}
        </p>
      </div>

      <div className="grid gap-0 lg:grid-cols-2">
        <div className="space-y-3 border-b border-border p-4 lg:border-b-0 lg:border-r">
          <div className="flex flex-wrap items-center gap-1.5">
            {COMPONENTS.map((c) => (
              <Button key={c.key} type="button" variant="outline" size="sm" onClick={() => add(c.key)}>
                <Plus className="h-3.5 w-3.5" /> <c.icon className="h-3.5 w-3.5" />
                {c.label}
              </Button>
            ))}
          </div>

          {entries.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Add blocks on the left to start composing your prompt.
            </div>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry, i) => {
                const def = COMPONENTS.find((c) => c.key === entry.key)!;
                return (
                  <li key={entry.id} className="rounded-lg border border-border bg-background/60 p-3">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                      <def.icon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold">{def.label}</span>
                      <span className="hidden text-xs text-muted-foreground sm:inline">{def.hint}</span>
                      <span className="ml-auto flex items-center gap-0.5">
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(entry.id, -1)} disabled={i === 0} aria-label="Move up">
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(entry.id, 1)} disabled={i === entries.length - 1} aria-label="Move down">
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove(entry.id)} aria-label="Remove">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      value={entry.text}
                      onChange={(e) => update(entry.id, e.target.value)}
                      placeholder={def.placeholder}
                      className="mt-2 w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </li>
                );
              })}
            </ul>
          )}

          <details className="rounded-lg border border-border bg-background/40 p-3">
            <summary className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground">
              Or start from a template
            </summary>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {TEMPLATES.map((t) => (
                <Button key={t.name} type="button" variant="secondary" size="sm" onClick={() => applyTemplate(t)}>
                  {t.name}
                </Button>
              ))}
            </div>
          </details>
        </div>

        <div className="flex flex-col p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Composed prompt</span>
            <Button type="button" variant="outline" size="sm" onClick={copy} disabled={composed.length === 0}>
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <pre
            className={cn(
              "flex-1 whitespace-pre-wrap rounded-lg border border-border bg-background p-4 font-mono text-xs leading-relaxed text-foreground/90",
              composed.length === 0 && "border-dashed text-muted-foreground",
            )}
          >
            {composed.length > 0 ? composed : "Your prompt will appear here as you add blocks."}
          </pre>
          {onCompose && (
            <Button type="button" className="mt-3" disabled={composed.length === 0} onClick={compose}>
              <Sparkles className="h-4 w-4" /> Send to analyzer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
