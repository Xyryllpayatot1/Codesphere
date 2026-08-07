"use client";

import { useState } from "react";
import { CheckCircle2, Send, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CodeEditor } from "@/components/learning/editor/code-editor";
import { cn } from "@/lib/utils";

type Result = {
  status: string;
  passed: boolean;
  feedback: string[];
  xpAwarded: number;
};

export function ProjectSubmitter({
  slug,
  starterCode,
  previousCode,
}: {
  slug: string;
  starterCode: string | null;
  previousCode: string | null;
}) {
  const [code, setCode] = useState(previousCode ?? starterCode ?? "");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function submit() {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/projects/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, description }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({ status: "error", passed: false, feedback: [json.error ?? "Submission failed"], xpAwarded: 0 });
      } else {
        setResult(json.data ?? json);
      }
    } catch {
      setResult({ status: "error", passed: false, feedback: ["Network error while submitting"], xpAwarded: 0 });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="project-description">What did you build? (optional)</Label>
        <Textarea
          id="project-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A short note for reviewers."
          rows={2}
        />
      </div>

      <CodeEditor language="javascript" value={code} onChange={setCode} height={360} />

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Deterministic checks run on submit. Passing auto-approves your project.</p>
        <Button onClick={submit} disabled={busy || code.trim().length === 0}>
          <Send className="h-3.5 w-3.5" /> {busy ? "Submitting…" : "Submit project"}
        </Button>
      </div>

      {result && (
        <div
          className={cn(
            "rounded-xl border p-4",
            result.passed
              ? "border-success/40 bg-success/10"
              : result.status === "error"
                ? "border-destructive/40 bg-destructive/10"
                : "border-amber-500/40 bg-amber-500/10"
          )}
        >
          <div className="flex items-center gap-2">
            {result.passed ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : result.status === "error" ? (
              <XCircle className="h-4 w-4 text-destructive" />
            ) : (
              <Send className="h-4 w-4 text-amber-600" />
            )}
            <p className="text-sm font-semibold">
              {result.passed
                ? result.xpAwarded > 0
                  ? `Approved — ${result.xpAwarded} XP earned!`
                  : "Approved — nice work!"
                : result.status === "error"
                  ? "Something went wrong"
                  : "Submitted for review"}
            </p>
          </div>
          {result.feedback.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {result.feedback.map((f, i) => (
                <li key={i} className="whitespace-pre-wrap font-mono text-xs">
                  {f}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
