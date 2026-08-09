"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Award, CheckCircle2, Loader2, PartyPopper } from "lucide-react";
import { toast } from "@/store/use-toast";
import { Button } from "@/components/ui/button";

type CompleteResult = {
  completed: boolean;
  reason: string;
  xpAwarded?: number;
  streak?: { streak: number; longestStreak: number } | null;
  newAchievements?: string[];
  course?: {
    completed: boolean;
    already?: boolean;
    certificate?: { code: string };
    progress?: { completed: number; total: number };
  } | null;
};

export function CompleteLessonButton({
  lessonId,
  initiallyCompleted,
  disabled,
  onCompleted,
}: {
  lessonId: string;
  initiallyCompleted: boolean;
  disabled: boolean;
  onCompleted?: () => void;
}) {
  const [completed, setCompleted] = useState(initiallyCompleted);
  const [busy, setBusy] = useState(false);
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    function onProgress() {
      if (!fired.current) {
        fired.current = true;
        setBlockedReason(null);
      }
    }
    window.addEventListener("creyvaph:progress", onProgress);
    return () => window.removeEventListener("creyvaph:progress", onProgress);
  }, []);

  const complete = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/learn/lessons/${lessonId}/complete`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Could not complete lesson", description: json.error ?? "Try again", variant: "error" });
        return;
      }
      const result: CompleteResult = json.data;
      if (result.completed) {
        setCompleted(true);
        toast({
          title: "Lesson completed!",
          description: `+${result.xpAwarded ?? 0} XP${result.course?.certificate ? ` · Certificate ${result.course.certificate.code}` : ""}`,
          variant: "success",
        });
        if (result.streak) toast({ title: `${result.streak.streak}-day streak`, variant: "streak" });
        for (const name of result.newAchievements ?? []) {
          toast({ title: `Achievement unlocked: ${name}`, variant: "success" });
        }
        if (result.course?.certificate) {
          toast({ title: "Course completed!", description: "A certificate has been issued to you.", variant: "success" });
        }
        onCompleted?.();
      } else {
        setBlockedReason(result.reason);
      }
    } catch {
      toast({ title: "Network error", description: "Could not reach the server", variant: "error" });
    } finally {
      setBusy(false);
    }
  }, [busy, lessonId, onCompleted]);

  if (completed) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/5 px-4 py-2.5 text-sm font-medium text-success">
        <PartyPopper className="h-4 w-4" /> Lesson completed
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button size="lg" onClick={complete} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
        {busy ? "Completing…" : "Complete lesson"}
      </Button>
      {blockedReason && (
        <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {blockedReason}
        </p>
      )}
      {disabled && !blockedReason && (
        <p className="text-sm text-muted-foreground">Finish the exercises and quizzes above to unlock completion.</p>
      )}
    </div>
  );
}
