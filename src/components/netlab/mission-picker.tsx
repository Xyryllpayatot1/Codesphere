"use client";

import { Target, Award, Coins, Sparkles, Rocket, Plus, Lock } from "lucide-react";
import { useNetlab } from "./netlab-store";
import { NET_MISSIONS } from "@/lib/net/missions";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { missionOfferedAt, type LabLevel } from "./lab-levels";

const DIFF_COLOR: Record<string, string> = {
  beginner: "bg-emerald-500/15 text-emerald-400",
  intermediate: "bg-amber-500/15 text-amber-400",
  advanced: "bg-rose-500/15 text-rose-400",
};

export function MissionPicker({ level }: { level: LabLevel }) {
  const { missionPickerOpen, setMissionPickerOpen, missionSlug, startMission, loadTemplate, newCanvas, setMode } = useNetlab();
  if (!missionPickerOpen) return null;

  const offered = NET_MISSIONS.filter((m) => missionOfferedAt(level, m.difficulty as "beginner" | "intermediate" | "advanced"));
  const hiddenCount = NET_MISSIONS.length - offered.length;

  return (
    <Dialog open={missionPickerOpen} onOpenChange={setMissionPickerOpen} title="Networking Lab" description="Pick a guided mission, load a classic setup, or start a blank canvas.">
      {offered.length > 0 && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {offered.map((m) => (
            <button
              key={m.slug}
              onClick={() => startMission(m.slug)}
              className={cn(
                "group flex flex-col gap-1.5 rounded-xl border border-border bg-background/60 p-3.5 text-left transition hover:border-primary/40 hover:bg-secondary",
                missionSlug === m.slug && "border-primary/60 bg-primary/10"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <Target className="h-4 w-4 text-primary" />
                  {m.title}
                </span>
                <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold uppercase", DIFF_COLOR[m.difficulty])}>{m.difficulty}</span>
              </div>
              <p className="text-xs leading-snug text-muted-foreground">{m.short}</p>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Award className="h-3.5 w-3.5 text-primary" /> {m.xp} XP
                </span>
                <span className="flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5 text-amber-500" /> {m.coins}
                </span>
                {missionSlug === m.slug && <span className="ml-auto text-[10px] font-semibold text-primary">Active</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {offered.length === 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-background/40 p-4 text-sm text-muted-foreground">
          <Lock className="h-4 w-4 shrink-0 text-muted-foreground/60" />
          Missions are hidden in Sandbox. Switch to Beginner, Intermediate or Advanced to pick a guided mission.
        </div>
      )}

      {hiddenCount > 0 && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          <Lock className="mr-1 inline h-3 w-3" />
          {hiddenCount} harder mission{hiddenCount === 1 ? "" : "s"} unlock at a higher level.
        </p>
      )}

      <div className={cn("mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background/40 p-3", level === "sandbox" && "mt-3")}>
        <button
          onClick={() => {
            setMode("sandbox");
            newCanvas();
          }}
          className="flex items-center gap-1.5 rounded-md bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-cyan-950 transition hover:bg-cyan-400"
        >
          <Rocket className="h-3.5 w-3.5" /> Blank sandbox
        </button>
        <button
          onClick={newCanvas}
          className="flex items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-xs font-medium transition hover:bg-secondary/70"
        >
          <Plus className="h-3.5 w-3.5" /> Blank mission canvas
        </button>
        <span className="text-[11px] text-muted-foreground">or start from a classic setup:</span>
        {(["small-lan", "two-router", "wifi", "internet"] as const).map((t) => (
          <button
            key={t}
            onClick={() => loadTemplate(t)}
            className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            {t.replace("-", " ")}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
          <Sparkles className="h-3 w-3" /> Sandbox mode earns no XP
        </span>
      </div>
    </Dialog>
  );
}
