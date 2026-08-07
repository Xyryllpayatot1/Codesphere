"use client";

// Presentational, controlled interaction areas for each game kind. The parent
// (game-player.tsx) owns the answer state and the submit flow; each component
// here just renders the manipulation UI and reports changes through `onChange`.

import { Check, GripVertical, Info, ShieldAlert } from "lucide-react";
import { Reorder } from "framer-motion";
import { CodeEditor } from "@/components/learning/editor/code-editor";
import { MONACO_LANGUAGE } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type AnswerState = {
  order?: string[];
  selected?: string[];
  code?: string;
  answers?: Record<string, number | boolean>;
};

export type GameInteractionProps = {
  config: Record<string, unknown>;
  value: AnswerState;
  onChange: (value: AnswerState) => void;
};

// A key-based reorderable list (used by HTML Builder and JS Logic Puzzle).
function KeyOrderList({
  keys,
  render,
  onChange,
}: {
  keys: string[];
  render: (key: string, pos: number) => React.ReactNode;
  onChange: (order: string[]) => void;
}) {
  return (
    <Reorder.Group axis="y" values={keys} onReorder={onChange} className="space-y-2">
      {keys.map((key, pos) => (
        <Reorder.Item
          key={key}
          value={key}
          className="flex cursor-grab select-none items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm active:cursor-grabbing"
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-xs">{pos + 1}</span>
          <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50" />
          <span className="min-w-0 flex-1">{render(key, keys.indexOf(key))}</span>
        </Reorder.Item>
      ))}
    </Reorder.Group>
  );
}

// ───────────────────────────── HTML Builder ────────────────────────────────

type HtmlToken = { key: string; label: string; kind: string; indent?: number };

export function HtmlBuilderInteraction({ config, value, onChange }: GameInteractionProps) {
  const tokens = (config.tokens ?? []) as HtmlToken[];
  const order = value.order ?? [];
  const byKey = new Map(tokens.map((t) => [t.key, t]));

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium text-muted-foreground">Drag the blocks into the right order. Order is checked exactly.</p>
      <KeyOrderList
        keys={order}
        onChange={(o) => onChange({ ...value, order: o })}
        render={(key) => <span className="font-mono text-foreground/90">{byKey.get(key)?.label}</span>}
      />
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Live preview</p>
        <pre className="overflow-x-auto font-mono text-sm leading-7 text-foreground/90">
          {order.map((key, i) => {
            const t = byKey.get(key);
            return (
              <div key={i} className="whitespace-pre-wrap" style={{ paddingLeft: `${(t?.indent ?? 0) * 1.25}rem` }}>
                {t?.label}
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}

// ────────────────────────────── CSS Painter ────────────────────────────────

type CssDeclaration = { key: string; label: string; property: string; value: string };

export function CssPainterInteraction({ config, value, onChange }: GameInteractionProps) {
  const target = config.target as { title: string; description: string; element: string; styles: [string, string][] };
  const declarations = (config.declarations ?? []) as CssDeclaration[];
  const selected = new Set(value.selected ?? []);

  function toggle(key: string) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange({ ...value, selected: [...next] });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Target design</p>
        <p className="mt-1 font-semibold">{target.title}</p>
        <p className="text-sm text-muted-foreground">{target.description}</p>
        <div className="mt-3 rounded-md bg-card p-3">
          <p className="font-mono text-xs text-muted-foreground">{target.element} {"{"}</p>
          {target.styles.map(([property, v]) => (
            <p key={property} className="font-mono text-sm text-foreground/90">
              {"  "}{property}: <span className="text-success">{v}</span>;
            </p>
          ))}
          <p className="font-mono text-xs text-muted-foreground">{"}"}</p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Select every declaration that styles the target. Wrong picks cost points.</p>
        <div className="flex flex-wrap gap-2">
          {declarations.map((d) => {
            const on = selected.has(d.key);
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => toggle(d.key)}
                aria-pressed={on}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border px-3 py-2 font-mono text-sm transition",
                  on ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-foreground/80 hover:border-muted-foreground"
                )}
              >
                <span className={cn("flex h-4 w-4 items-center justify-center rounded border", on ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")}>
                  {on && <Check className="h-3 w-3" />}
                </span>
                {d.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────── JS Logic Puzzle ──────────────────────────────

type JsStatement = { key: string; code: string };

export function JsLogicInteraction({ config, value, onChange }: GameInteractionProps) {
  const statements = (config.statements ?? []) as JsStatement[];
  const order = value.order ?? [];
  const byKey = new Map(statements.map((s) => [s.key, s]));

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium text-muted-foreground">Drag the statements into the right order so the program runs and prints the expected output.</p>
      <KeyOrderList
        keys={order}
        onChange={(o) => onChange({ ...value, order: o })}
        render={(key) => <span className="whitespace-pre-wrap font-mono text-foreground/90">{byKey.get(key)?.code}</span>}
      />
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assembled program</p>
        <pre className="overflow-x-auto font-mono text-sm leading-6 text-foreground/90">{order.map((k) => byKey.get(k)?.code).join("\n")}</pre>
      </div>
    </div>
  );
}

// ────────────────────────────── Bug Hunter ─────────────────────────────────

export function BugHunterInteraction({ config, value, onChange }: GameInteractionProps) {
  const code = value.code ?? (config.starterCode as string) ?? "";
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">Find the bug, fix the code, and make the hidden checks pass.</p>
      <CodeEditor
        language={config.language === "html" ? MONACO_LANGUAGE.html : config.language === "css" ? MONACO_LANGUAGE.css : MONACO_LANGUAGE.javascript}
        value={code}
        onChange={(v) => onChange({ ...value, code: v ?? "" })}
        height={Math.max(220, code.split("\n").length * 22)}
        options={{ fontSize: 13, scrollBeyondLastLine: false, minimap: { enabled: false } }}
      />
    </div>
  );
}

// ───────────────────────────── Cyber Escape ────────────────────────────────

type CyberQuestion = {
  id: string;
  type: string;
  prompt: string;
  scenario?: string;
  url?: string;
  options?: string[];
  points: number;
};

export function CyberEscapeInteraction({ config, value, onChange }: GameInteractionProps) {
  const questions = (config.questions ?? []) as CyberQuestion[];
  const answers = value.answers ?? {};
  const scenario = (config.scenario as string) ?? "";

  function setAnswer(id: string, answer: number | boolean) {
    onChange({ ...value, answers: { ...answers, [id]: answer } });
  }

  return (
    <div className="space-y-4">
      {scenario && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/5 p-3 text-sm text-foreground/85">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p>{scenario}</p>
        </div>
      )}

      {questions.map((q, i) => {
        const answered = answers[q.id] !== undefined;
        return (
          <div key={q.id} className="rounded-lg border border-border bg-card p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="text-sm font-semibold">
                <span className="mr-1.5 text-muted-foreground">{i + 1}.</span>
                {q.prompt}
              </p>
              <span className="shrink-0 text-xs text-muted-foreground">{q.points} pts</span>
            </div>

            {q.url && (
              <div className="mb-3 flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 font-mono text-xs text-foreground/80">
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                {q.url}
              </div>
            )}
            {q.scenario && <p className="mb-3 text-sm text-muted-foreground">{q.scenario}</p>}

            {q.type === "true_false" ? (
              <div className="flex gap-2">
                {[true, false].map((tf) => (
                  <button
                    key={String(tf)}
                    type="button"
                    onClick={() => setAnswer(q.id, tf)}
                    aria-pressed={answers[q.id] === tf}
                    className={cn(
                      "rounded-lg border px-4 py-2 text-sm font-medium transition",
                      answers[q.id] === tf ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-muted-foreground hover:border-muted-foreground"
                    )}
                  >
                    {tf ? "True" : "False"}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {(q.options ?? []).map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAnswer(q.id, idx)}
                    aria-pressed={answers[q.id] === idx}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition",
                      answers[q.id] === idx ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-foreground/85 hover:border-muted-foreground"
                    )}
                  >
                    <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border", answers[q.id] === idx ? "border-primary" : "border-muted-foreground/40")}>
                      {answers[q.id] === idx && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {!answered && <p className="mt-2 text-xs text-muted-foreground">Not answered yet</p>}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────── Website Builder ───────────────────────────────

export function WebsiteBuilderInteraction({ config, value, onChange }: GameInteractionProps) {
  const code = value.code ?? (config.starterCode as string) ?? "";
  const isCss = (config.checkKind as string) === "css_check";
  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">
        {isCss ? "Write the CSS the brief asks for. Structure and style are checked automatically." : "Build the page in HTML. Structure, content and styling are checked automatically."}
      </p>
      <CodeEditor
        language={isCss ? MONACO_LANGUAGE.css : MONACO_LANGUAGE.html}
        value={code}
        onChange={(v) => onChange({ ...value, code: v ?? "" })}
        height={Math.max(260, code.split("\n").length * 22)}
        options={{ fontSize: 13, scrollBeyondLastLine: false, minimap: { enabled: false } }}
      />
    </div>
  );
}
