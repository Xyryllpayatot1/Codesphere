"use client";

import { useState } from "react";
import { Target, Award, Coins, CheckCircle2, XCircle, Send, LogOut, Lightbulb, Loader2, Layers, X } from "lucide-react";
import { useNetlab } from "./netlab-store";
import { getMission } from "@/lib/net/missions";
import { cn } from "@/lib/utils";
import { toast } from "@/store/use-toast";

export function MissionPanel() {
  const { missionSlug, missionCheck, checkMission, sim, exitMission, missionPanelOpen, toggleMissionPanel } = useNetlab();
  const [submitting, setSubmitting] = useState(false);

  const mission = missionSlug ? getMission(missionSlug) : null;
  if (!mission || !missionSlug) return null;

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/networking/missions/${missionSlug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot: sim.snapshot }),
      });
      const data = (await res.json()) as {
        passed: boolean;
        message: string;
        hints: string[];
        firstTime: boolean;
        xpAwarded: number;
        coinsAwarded: number;
        levelUp: number | null;
      };
      if (data.passed) {
        toast({
          title: "Mission complete!",
          description:
            data.firstTime && data.xpAwarded > 0
              ? `+${data.xpAwarded} XP, +${data.coinsAwarded} coins${data.levelUp ? ` — reached level ${data.levelUp}!` : ""}`
              : "Already completed — you did it again!",
          variant: "success",
        });
      } else {
        toast({ title: "Not yet", description: data.message, variant: "error" });
        data.hints.slice(0, 2).forEach((h) => toast({ title: "Hint", description: h, variant: "info" }));
      }
    } catch {
      toast({ title: "Submit failed", description: "Could not reach the server.", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {!missionPanelOpen && (
        <button
          onClick={toggleMissionPanel}
          className="absolute right-3 top-14 z-30 flex items-center gap-1.5 rounded-full border border-border bg-card/90 px-3 py-1.5 text-xs font-medium text-primary shadow-lg backdrop-blur transition hover:bg-secondary"
          title="Show mission objectives"
        >
          <Layers className="h-3.5 w-3.5" />
          Objectives
          {missionCheck && !missionCheck.ok && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
          {missionCheck?.ok && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
        </button>
      )}

      <div
        className={cn(
          "absolute right-2 top-12 bottom-2 z-30 flex w-72 max-w-[calc(100%-1rem)] flex-col rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur transition-transform",
          missionPanelOpen ? "translate-x-0" : "pointer-events-none translate-x-[calc(100%+1rem)]"
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">{mission.title}</h3>
          </div>
          <div className="flex items-center gap-0.5">
            <button onClick={exitMission} title="Leave mission" className="rounded p-1 text-muted-foreground hover:bg-secondary">
              <LogOut className="h-4 w-4" />
            </button>
            <button onClick={toggleMissionPanel} title="Collapse" className="rounded p-1 text-muted-foreground hover:bg-secondary">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="rounded bg-secondary px-1.5 py-0.5 capitalize">{mission.difficulty}</span>
            <span className="flex items-center gap-1">
              <Award className="h-3.5 w-3.5 text-primary" /> {mission.xp} XP
            </span>
            <span className="flex items-center gap-1">
              <Coins className="h-3.5 w-3.5 text-amber-500" /> {mission.coins}
            </span>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Objective</p>
            <ul className="space-y-1.5">
              {mission.objectives.map((o, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs leading-snug text-muted-foreground">
                  <span className="mt-0.5 text-primary">•</span>
                  {o}
                </li>
              ))}
            </ul>
          </div>

          {missionCheck && (
            <div
              className={cn(
                "rounded-lg border p-2.5",
                missionCheck.ok ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10"
              )}
            >
              <p className={cn("flex items-center gap-1.5 text-xs font-semibold", missionCheck.ok ? "text-success" : "text-destructive")}>
                {missionCheck.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {missionCheck.ok ? "All objectives met!" : "Not solved yet"}
              </p>
              {!missionCheck.ok && missionCheck.hints.length > 0 && (
                <p className="mt-1 flex items-start gap-1 text-[11px] leading-snug text-muted-foreground">
                  <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  {missionCheck.hints[0]}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-border p-3">
          <button
            onClick={checkMission}
            className="flex flex-1 items-center justify-center gap-1 rounded-md bg-secondary px-3 py-2 text-xs font-medium transition hover:bg-secondary/70"
          >
            <Target className="h-3.5 w-3.5" /> Check
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="flex flex-1 items-center justify-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Submit
          </button>
        </div>
      </div>
    </>
  );
}
