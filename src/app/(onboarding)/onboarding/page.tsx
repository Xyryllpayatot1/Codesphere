"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DAILY_GOALS, DEFAULT_DAILY_GOAL_MINUTES, EXPERIENCE_LEVELS, LEARNING_PATHS } from "@/lib/onboarding";
import { FeatureIcon } from "@/components/shared/feature-icon";

const STEP_TITLES = ["What do you want to do?", "Have you coded before?", "How much time do you have?"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [path, setPath] = useState<string | null>(null);
  const [experience, setExperience] = useState<string | null>(null);
  const [goal, setGoal] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = step === 0 ? path !== null : step === 1 ? experience !== null : goal !== null;

  const submit = async (defaults?: { learningPath?: string; experience?: string; dailyGoalMinutes?: number }) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          learningPath: defaults?.learningPath ?? path ?? "FUNDAMENTALS",
          experience: defaults?.experience ?? experience ?? "NONE",
          dailyGoalMinutes: defaults?.dailyGoalMinutes ?? goal ?? DEFAULT_DAILY_GOAL_MINUTES,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong. Please try again.");
        setSaving(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {STEP_TITLES.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 w-8 rounded-full transition-colors",
                i <= step ? "bg-primary" : "bg-secondary"
              )}
            />
          ))}
        </div>
        <button
          onClick={() => submit()}
          disabled={saving}
          className="text-xs font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-50"
        >
          {saving ? "Saving…" : "Skip for now"}
        </button>
      </div>

      <h1 className="text-2xl font-bold tracking-tight">{STEP_TITLES[step]}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {step === 0 && "Pick the goal that sounds most like you — you can change it anytime."}
        {step === 1 && "Your answer just helps us pick the right starting point. No judgement."}
        {step === 2 && "A small daily goal you can actually hit. You can change it later."}
      </p>

      <div className="mt-6">
        {step === 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {LEARNING_PATHS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPath(p.id)}
                className={cn(
                  "group flex flex-col gap-2 rounded-2xl border p-4 text-left transition",
                  path === p.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40 hover:bg-secondary"
                )}
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${p.color}1a`, color: p.color }}
                >
                  <FeatureIcon name={p.icon} className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold leading-snug">{p.headline}</span>
                <span className="text-xs leading-snug text-muted-foreground">{p.description}</span>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            {EXPERIENCE_LEVELS.map((e) => (
              <button
                key={e.id}
                onClick={() => setExperience(e.id)}
                className={cn(
                  "flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition",
                  experience === e.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40 hover:bg-secondary"
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                  <FeatureIcon name={e.icon} className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{e.label}</p>
                  <p className="text-xs text-muted-foreground">{e.description}</p>
                </div>
                {experience === e.id && <Check className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-3 sm:grid-cols-4">
            {DAILY_GOALS.map((g) => (
              <button
                key={g.minutes}
                onClick={() => setGoal(g.minutes)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-2xl border p-4 text-center transition",
                  goal === g.minutes
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40 hover:bg-secondary"
                )}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary">
                  <FeatureIcon name={g.icon} className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold">{g.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || saving}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {step < 2 ? (
          <Button onClick={() => canContinue && setStep((s) => s + 1)} disabled={!canContinue || saving}>
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={() => submit()} disabled={!canContinue || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {saving ? "Setting up…" : "Start my journey"}
          </Button>
        )}
      </div>
    </div>
  );
}
