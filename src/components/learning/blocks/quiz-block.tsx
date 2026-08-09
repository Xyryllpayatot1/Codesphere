"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ClipboardCheck, Loader2, Send, Timer, XCircle } from "lucide-react";
import { toast } from "@/store/use-toast";
import { CodeEditor } from "@/components/learning/editor/code-editor";
import { Button } from "@/components/ui/button";
import { InlineHtml } from "./inline-html";
import { OrderableList } from "./orderable-list";
import { QUIZ_QUESTION_TYPES, MONACO_LANGUAGE } from "@/lib/constants";
import { cn } from "@/lib/utils";

type RenderQuestion = {
  id: string;
  type: string;
  prompt: string;
  code?: string | null;
  points: number;
  render: Record<string, unknown>;
};

type QuizPayload = {
  id: string;
  key: string;
  title: string;
  description?: string | null;
  passScore: number;
  points: number;
  timeLimit?: number | null;
  questions: RenderQuestion[];
  previousPassed: boolean;
};

type GradedQuestion = { questionId: string; correct: boolean; explanation: string | null };

type SubmitResult = {
  percentage: number;
  passed: boolean;
  score: number;
  maxScore: number;
  xpEarned: number;
  levelUp?: number | null;
  streak?: number | null;
  questions: GradedQuestion[];
};

function initialAnswers(questions: RenderQuestion[]): Record<string, unknown> {
  const acc: Record<string, unknown> = {};
  for (const q of questions) {
    if (q.type === QUIZ_QUESTION_TYPES.FILL_BLANK) acc[q.id] = Array((q.render.count as number) ?? 1).fill("");
    if (q.type === QUIZ_QUESTION_TYPES.MULTIPLE_CHOICE) acc[q.id] = (q.render.multi as boolean) ? [] : null;
    if (q.type === QUIZ_QUESTION_TYPES.TRUE_FALSE) acc[q.id] = null;
    if (q.type === QUIZ_QUESTION_TYPES.CODE_COMPLETION) acc[q.id] = "";
    if (q.type === QUIZ_QUESTION_TYPES.ORDERING) {
      const n = (q.render.items as string[]) ?? [];
      acc[q.id] = shuffle([...n.keys()]);
    }
    if (q.type === QUIZ_QUESTION_TYPES.MATCHING) {
      const left = (q.render.left as string[]) ?? [];
      acc[q.id] = left.map((_, i) => i); // left[i] -> right[i] initially
    }
  }
  return acc;
}

export function QuizBlock({ quizKey, title }: { quizKey: string; title?: string }) {
  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [notFound, setNotFound] = useState(false);
  const loadedKey = useRef<string | null>(null);

  useEffect(() => {
    const alive = true;
    async function load() {
      try {
        const res = await fetch(`/api/learn/quizzes/${quizKey}`);
        const json = await res.json();
        if (!alive) return;
        if (!res.ok || !json.data) {
          setNotFound(true);
          return;
        }
        const q: QuizPayload = json.data;
        setQuiz(q);
        setAnswers(initialAnswers(q.questions));
        if (q.timeLimit) setTimeLeft(q.timeLimit * 60);
      } catch {
        if (alive) setNotFound(true);
      } finally {
        if (alive) setLoading(false);
      }
    }
    if (loadedKey.current !== quizKey) {
      loadedKey.current = quizKey;
      setResult(null);
      setNotFound(false);
      setLoading(true);
      void load();
    }
  }, [quizKey]);

  // Countdown when a time limit is set.
  useEffect(() => {
    if (timeLeft == null) return;
    const t = window.setInterval(() => {
      setTimeLeft((s) => {
        if (s == null || s <= 1) {
          window.clearInterval(t);
          if (s === 1) void submit();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft != null]);

  const answeredCount = useMemo(() => {
    if (!quiz) return 0;
    return quiz.questions.filter((q) => {
      const a = answers[q.id];
      if (Array.isArray(a)) return (a as unknown[]).length > 0 && (a as unknown[]).every((v) => v !== "" && v != null);
      return a != null && a !== "";
    }).length;
  }, [quiz, answers]);

  const allAnswered = quiz != null && answeredCount === quiz.questions.length;

  function updateAnswer(id: string, value: unknown) {
    setAnswers((a) => ({ ...a, [id]: value }));
  }

  async function submit() {
    if (!quiz || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/learn/quizzes/${quiz.key}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Something went wrong", description: json.error ?? "Please try again", variant: "error" });
        return;
      }
      const data: SubmitResult = json.data;
      setResult(data);
      if (data.passed) {
        toast({ title: "Quiz passed!", description: `Score ${data.percentage}% · +${data.xpEarned} XP`, variant: "success" });
        if (data.levelUp) toast({ title: `Level up — level ${data.levelUp}!`, variant: "level" });
        window.dispatchEvent(new CustomEvent("creyvaph:progress"));
      } else {
        toast({ title: `Score ${data.percentage}%`, description: `Pass mark is ${quiz.passScore}%. Keep going!`, variant: "info" });
      }
    } catch {
      toast({ title: "Network error", description: "Could not reach the server", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="my-6 flex h-40 items-center justify-center rounded-xl border border-border">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !quiz) {
    return (
      <div className="my-6 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
        Quiz “{quizKey}” not found.
      </div>
    );
  }

  const locked = result != null;

  return (
    <div className="my-6 overflow-hidden rounded-xl border border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          <h4 className="font-semibold">{title ?? quiz.title}</h4>
          <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-semibold text-accent-foreground">Quiz</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{quiz.questions.length} questions</span>
          <span>Pass {quiz.passScore}%</span>
          {timeLeft != null && (
            <span className={cn("inline-flex items-center gap-1 font-semibold", timeLeft < 60 ? "text-destructive" : "")}>
              <Timer className="h-3.5 w-3.5" />
              {formatTime(timeLeft)}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-4 p-4">
        {quiz.description && (
          <p className="text-sm text-muted-foreground">
            <InlineHtml text={quiz.description} />
          </p>
        )}

        {quiz.questions.map((q, qi) => (
          <QuizQuestion key={q.id} q={q} index={qi} answers={answers} update={updateAnswer} locked={locked} grade={result?.questions.find((g) => g.questionId === q.id)} />
        ))}

        <div className="flex flex-col items-center gap-2 border-t border-border pt-4 sm:flex-row sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Answered {answeredCount} of {quiz.questions.length}
          </p>
          {locked ? (
            <div className={cn("flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold", result!.passed ? "border-success/40 bg-success/5 text-success" : "border-destructive/40 bg-destructive/5 text-destructive")}>
              {result!.passed ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {result!.passed ? `Passed · ${result!.percentage}%` : `${result!.percentage}% — need ${quiz.passScore}% to pass`}
              <span className="font-normal">· +{result!.xpEarned} XP</span>
            </div>
          ) : (
            <Button onClick={submit} disabled={submitting || !allAnswered}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {submitting ? "Grading…" : allAnswered ? "Submit answers" : `Answer all questions (${answeredCount}/${quiz.questions.length})`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function QuizQuestion({
  q,
  index,
  answers,
  update,
  locked,
  grade,
}: {
  q: RenderQuestion;
  index: number;
  answers: Record<string, unknown>;
  update: (id: string, value: unknown) => void;
  locked: boolean;
  grade?: GradedQuestion;
}) {
  const value = answers[q.id];
  const label = `Q${index + 1}`;

  function renderBody() {
    switch (q.type) {
      case QUIZ_QUESTION_TYPES.MULTIPLE_CHOICE: {
        const options = (q.render.options as string[]) ?? [];
        const multi = (q.render.multi as boolean) ?? false;
        return (
          <div className="space-y-2">
            {options.map((opt, oi) => {
              const selected = multi ? Array.isArray(value) && (value as number[]).includes(oi) : value === oi;
              return (
                <button
                  key={oi}
                  type="button"
                  disabled={locked}
                  onClick={() =>
                    update(
                      q.id,
                      multi
                        ? Array.isArray(value)
                          ? (value as number[]).includes(oi)
                            ? (value as number[]).filter((x) => x !== oi)
                            : [...(value as number[]), oi]
                          : [oi]
                        : oi,
                    )
                  }
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition disabled:opacity-70",
                    selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
                  )}
                >
                  <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border", selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40")}>
                    {selected && <CheckCircle2 className="h-3 w-3" />}
                  </span>
                  <span className="text-foreground/90">
                    <InlineHtml text={opt} />
                  </span>
                </button>
              );
            })}
          </div>
        );
      }
      case QUIZ_QUESTION_TYPES.TRUE_FALSE: {
        return (
          <div className="flex gap-2">
            {[true, false].map((b) => (
              <button
                key={String(b)}
                type="button"
                disabled={locked}
                onClick={() => update(q.id, b)}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition",
                  value === b ? "border-primary bg-primary/10 text-foreground" : "border-border hover:border-primary/50",
                )}
              >
                {b ? "True" : "False"}
              </button>
            ))}
          </div>
        );
      }
      case QUIZ_QUESTION_TYPES.FILL_BLANK: {
        const count = (q.render.count as number) ?? 1;
        const arr = Array.isArray(value) ? (value as string[]) : Array(count).fill("");
        return (
          <div className="flex flex-wrap items-center gap-2">
            {Array.from({ length: count }, (_, i) => (
              <input
                key={i}
                value={arr[i] ?? ""}
                disabled={locked}
                onChange={(e) => update(q.id, arr.map((v, j) => (j === i ? e.target.value : v)))}
                className="w-40 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
                aria-label={`Blank ${i + 1}`}
              />
            ))}
          </div>
        );
      }
      case QUIZ_QUESTION_TYPES.CODE_COMPLETION: {
        return (
          <CodeEditor
            language={MONACO_LANGUAGE.javascript}
            value={(value as string) ?? ""}
            onChange={(v) => update(q.id, v ?? "")}
            readOnly={locked}
            height={180}
            options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false }}
          />
        );
      }
      case QUIZ_QUESTION_TYPES.ORDERING: {
        const items = (q.render.items as string[]) ?? [];
        const order = Array.isArray(value) ? (value as number[]) : items.map((_, i) => i);
        return (
          <OrderableList items={order} labels={items} onChange={(o) => update(q.id, o)} className={locked ? "pointer-events-none opacity-70" : ""} />
        );
      }
      case QUIZ_QUESTION_TYPES.MATCHING: {
        const left = (q.render.left as string[]) ?? [];
        const right = (q.render.right as string[]) ?? [];
        const mapping = Array.isArray(value) ? (value as number[]) : left.map((_, i) => i);
        return (
          <div className="grid gap-2 sm:grid-cols-2">
            {left.map((item, li) => (
              <div key={li} className="flex items-center gap-2">
                <span className="flex-1 rounded-lg border border-border bg-card px-3 py-2 font-mono text-sm">{item}</span>
                <select
                  disabled={locked}
                  value={mapping[li]}
                  onChange={(e) => update(q.id, mapping.map((v, j) => (j === li ? Number(e.target.value) : v)))}
                  className="rounded-md border border-border bg-background px-2 py-2 text-sm outline-none focus:border-primary"
                  aria-label={`Match for ${item}`}
                >
                  {right.map((r, ri) => (
                    <option key={ri} value={ri}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        );
      }
      default:
        return <p className="text-sm text-muted-foreground">Unsupported question type.</p>;
    }
  }

  return (
    <div className={cn("rounded-xl border p-4", grade && (grade.correct ? "border-success/40 bg-success/[0.03]" : "border-destructive/40 bg-destructive/[0.03]"))}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">{label}</span>
          <p className="text-sm font-medium leading-relaxed">
            <InlineHtml text={q.prompt} />
          </p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{q.points} pts</span>
      </div>
      {q.code && (
        <pre className="mb-3 overflow-x-auto rounded-lg bg-muted/60 p-3 font-mono text-sm text-foreground/90">{q.code}</pre>
      )}
      {renderBody()}
      {grade && (
        <div className="mt-3 flex items-start gap-2 text-sm">
          {grade.correct ? (
            <span className="inline-flex items-center gap-1 font-medium text-success">
              <CheckCircle2 className="h-4 w-4" /> Correct
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-medium text-destructive">
              <XCircle className="h-4 w-4" /> Incorrect
            </span>
          )}
          {grade.explanation && <span className="text-muted-foreground">— {grade.explanation}</span>}
        </div>
      )}
    </div>
  );
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
