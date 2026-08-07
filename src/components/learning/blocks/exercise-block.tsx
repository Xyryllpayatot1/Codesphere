"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Lightbulb, Loader2, Send, XCircle } from "lucide-react";
import { toast } from "@/store/use-toast";
import { CodeEditor } from "@/components/learning/editor/code-editor";
import { Button } from "@/components/ui/button";
import { InlineHtml } from "./inline-html";
import { OrderableList } from "./orderable-list";
import { EXERCISE_TYPES, MONACO_LANGUAGE } from "@/lib/constants";
import { cn } from "@/lib/utils";

type ExercisePayload = {
  id: string;
  key: string;
  type: string;
  title: string;
  instructions: string;
  starterCode?: string | null;
  points: number;
  template?: string | null;
  lines?: string[];
  steps?: string[];
  hints?: string[];
  submission?: { passed: boolean; score: number; code: string; attempts: number } | null;
};

type SubmitResult = {
  result: { passed: boolean; score: number; maxScore: number; ratio: number; feedback: string[]; output?: string };
  xpEarned: number;
  levelUp?: number | null;
  streak?: number | null;
  submission: { passed: boolean; score: number; code: string; attempts: number };
};

const CODE_TYPES = new Set<string>([
  EXERCISE_TYPES.CODE_OUTPUT,
  EXERCISE_TYPES.JS_FUNCTION,
  EXERCISE_TYPES.JS_ASSERT,
  EXERCISE_TYPES.HTML_STRUCTURE,
  EXERCISE_TYPES.CSS_CHECK,
]);

const LANGUAGE_BY_TYPE: Record<string, string> = {
  [EXERCISE_TYPES.CODE_OUTPUT]: MONACO_LANGUAGE.javascript,
  [EXERCISE_TYPES.JS_FUNCTION]: MONACO_LANGUAGE.javascript,
  [EXERCISE_TYPES.JS_ASSERT]: MONACO_LANGUAGE.javascript,
  [EXERCISE_TYPES.HTML_STRUCTURE]: MONACO_LANGUAGE.html,
  [EXERCISE_TYPES.CSS_CHECK]: MONACO_LANGUAGE.css,
};

const BLANK_MARKER = "____";
const ORDER_DELIMITER = ",";

function splitTemplate(template: string): string[] {
  return template.split(BLANK_MARKER);
}

export function ExerciseBlock({ exerciseKey, title }: { exerciseKey: string; title?: string }) {
  const [exercise, setExercise] = useState<ExercisePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [code, setCode] = useState("");
  const [blanks, setBlanks] = useState<string[]>([]);
  const [order, setOrder] = useState<number[]>([]);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [hintIndex, setHintIndex] = useState(-1);
  const [notFound, setNotFound] = useState(false);
  const loadedKey = useRef<string | null>(null);

  useEffect(() => {
    const alive = true;
    async function load() {
      try {
        const res = await fetch(`/api/learn/exercises/${exerciseKey}`);
        const json = await res.json();
        if (!alive) return;
        if (!res.ok || !json.data) {
          setNotFound(true);
          return;
        }
        const ex: ExercisePayload = json.data;
        setExercise(ex);
        setCode(ex.submission?.code ?? ex.starterCode ?? "");
        if (ex.template != null) {
          const parts = splitTemplate(ex.template);
          setBlanks(Array(parts.length - 1).fill(""));
        }
        if (ex.lines) {
          setOrder(shuffle([...ex.lines.keys()]));
        }
        if (ex.steps) {
          setOrder(shuffle([...ex.steps.keys()]));
        }
      } catch {
        if (alive) setNotFound(true);
      } finally {
        if (alive) setLoading(false);
      }
    }
    if (loadedKey.current !== exerciseKey) {
      loadedKey.current = exerciseKey;
      setResult(null);
      setHintIndex(-1);
      setNotFound(false);
      setLoading(true);
      void load();
    }
  }, [exerciseKey]);

  const type = exercise?.type;

  const orderedLines = useMemo(() => {
    const lines = exercise?.lines;
    return lines ? order.map((i) => lines[i]) : [];
  }, [exercise, order]);
  const orderedSteps = useMemo(() => {
    const steps = exercise?.steps;
    return steps ? order.map((i) => steps[i]) : [];
  }, [exercise, order]);

  function buildPayload(): string {
    switch (type) {
      case EXERCISE_TYPES.FILL_BLANK:
        return blanks.join("|||");
      case EXERCISE_TYPES.CODE_COMPLETION:
        return order.join(ORDER_DELIMITER);
      case EXERCISE_TYPES.ORDERING:
        return order.join(ORDER_DELIMITER);
      default:
        return code;
    }
  }

  const canSubmit = useCallback(() => {
    if (!exercise) return false;
    switch (type) {
      case EXERCISE_TYPES.FILL_BLANK:
        return blanks.every((b) => b.trim().length > 0);
      case EXERCISE_TYPES.CODE_COMPLETION:
      case EXERCISE_TYPES.ORDERING:
        return true;
      default:
        return code.trim().length > 0;
    }
  }, [exercise, type, blanks, code]);

  async function submit() {
    if (!exercise || checking) return;
    setChecking(true);
    setResult(null);
    try {
      const res = await fetch(`/api/learn/exercises/${exercise.key}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: buildPayload() }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Something went wrong", description: json.error ?? "Please try again", variant: "error" });
        return;
      }
      const data: SubmitResult = json.data;
      setResult(data);
      if (data.result.passed) {
        toast({ title: "Exercise passed!", description: `+${data.xpEarned} XP`, variant: "success" });
        if (data.levelUp) toast({ title: `Level up — level ${data.levelUp}!`, variant: "level" });
        window.dispatchEvent(new CustomEvent("codesphere:progress"));
      }
    } catch {
      toast({ title: "Network error", description: "Could not reach the server", variant: "error" });
    } finally {
      setChecking(false);
    }
  }

  function renderHint(): boolean {
    return hintIndex >= 0 && (exercise?.hints?.length ?? 0) > hintIndex;
  }

  if (loading) {
    return (
      <div className="my-6 flex h-40 items-center justify-center rounded-xl border border-border">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !exercise) {
    return (
      <div className="my-6 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        Exercise “{exerciseKey}” not found.
      </div>
    );
  }

  const passed = result?.result.passed ?? exercise.submission?.passed ?? false;

  return (
    <div className={cn("my-6 overflow-hidden rounded-xl border", passed ? "border-success/40" : "border-border")}>
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">
              {passed ? "Completed" : "Exercise"}
            </span>
            <h4 className="font-semibold">{title ?? exercise.title}</h4>
          </div>
          <span className="text-xs text-muted-foreground">{exercise.points} XP</span>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <p className="text-sm leading-relaxed text-foreground/90">
          <InlineHtml text={exercise.instructions} />
        </p>

        {type === EXERCISE_TYPES.FILL_BLANK && exercise.template != null && (
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="mb-3 font-mono text-sm leading-8">
              {splitTemplate(exercise.template).map((part, i) => (
                <span key={i}>
                  {part}
                  {i < blanks.length && (
                    <input
                      value={blanks[i]}
                      onChange={(e) => setBlanks((b) => b.map((v, j) => (j === i ? e.target.value : v)))}
                      className="mx-1 inline-block w-28 rounded border border-border bg-background px-2 py-0.5 text-center font-mono outline-none focus:border-primary"
                      aria-label={`Blank ${i + 1}`}
                    />
                  )}
                </span>
              ))}
            </p>
          </div>
        )}

        {(type === EXERCISE_TYPES.CODE_COMPLETION && exercise.lines) && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Order the lines to build a working program.</p>
            <OrderableList items={order} labels={exercise.lines} onChange={setOrder} />
            <div className="mt-3 rounded-lg border border-border bg-card p-3 font-mono text-sm leading-7">
              {orderedLines.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap text-foreground/90">{line}</div>
              ))}
            </div>
          </div>
        )}

        {(type === EXERCISE_TYPES.ORDERING && exercise.steps) && (
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Put the steps in the correct order.</p>
            <OrderableList items={order} labels={exercise.steps} onChange={setOrder} />
            <div className="mt-3 rounded-lg border border-border bg-card p-3 text-sm leading-7">
              {orderedSteps.map((step, i) => (
                <div key={i} className="text-foreground/90">
                  <span className="mr-2 font-mono text-muted-foreground">{i + 1}.</span>
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {CODE_TYPES.has(type ?? "") && (
          <CodeEditor
            language={LANGUAGE_BY_TYPE[type!]}
            value={code}
            onChange={(v) => setCode(v ?? "")}
            height={Math.max(220, (exercise.starterCode?.split("\n").length ?? 10) * 22)}
            options={{ fontSize: 13, scrollBeyondLastLine: false, minimap: { enabled: false } }}
          />
        )}

        {(exercise.hints?.length ?? 0) > 0 && (
          <div className="space-y-2">
            {renderHint() && (
              <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <p className="text-foreground/90">{exercise.hints![hintIndex]}</p>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setHintIndex((h) => (h + 1) % (exercise.hints?.length ?? 1))}
            >
              <Lightbulb className="h-3.5 w-3.5" /> {renderHint() ? "Next hint" : "Show hint"}
            </Button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={submit} disabled={checking || !canSubmit() || passed}>
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {checking ? "Checking…" : passed ? "Completed" : "Check answer"}
          </Button>
          {!passed && exercise.submission?.code && (
            <Button size="sm" variant="outline" onClick={() => setCode(exercise.submission!.code)}>
              Restore last attempt
            </Button>
          )}
          {passed && exercise && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-success">
              <CheckCircle2 className="h-4 w-4" /> +{result?.xpEarned ?? 0} XP earned
            </span>
          )}
        </div>

        {result && (
          <div className={cn("rounded-lg border p-4", result.result.passed ? "border-success/40 bg-success/5" : "border-destructive/40 bg-destructive/5")}>
            <div className="mb-2 flex items-center gap-2">
              {result.result.passed ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              <p className={cn("text-sm font-semibold", result.result.passed ? "text-success" : "text-destructive")}>
                {result.result.passed ? "Correct!" : `Not quite — ${result.result.score}/${result.result.maxScore} points`}
              </p>
            </div>
            <ul className="space-y-1.5">
              {result.result.feedback.map((f, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground/85">
                  <span className={f.startsWith("✓") ? "text-success" : ""}>{f.startsWith("✓") || f.startsWith("✗") ? "" : "•"}</span>
                  <span className="whitespace-pre-wrap">{f}</span>
                </li>
              ))}
            </ul>
            {result.result.output != null && (
              <pre className="mt-2 overflow-x-auto rounded-md bg-background p-3 font-mono text-xs">{result.result.output}</pre>
            )}
            {result.result.passed && (
              <p className="mt-2 text-sm text-success">+{result.xpEarned} XP · {result.streak ? `🔥 ${result.streak}-day streak` : "Nice work!"}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
