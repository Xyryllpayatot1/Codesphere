"use client";

// Client-side contracts shared by the game hub, detail shell and per-kind
// players. Mirrors the shapes returned by the game APIs and the server pages.

import { useState } from "react";
import { Award, CheckCircle2, Coins, Map, Skull, Sparkles, Trophy, XCircle } from "lucide-react";
import { toast } from "@/store/use-toast";
import { GAME_LEVEL_STATUS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type GameLevelView = {
  key: string;
  title: string;
  description: string | null;
  instructions: string | null;
  objectives: string[];
  hints: string[];
  explanation: string | null;
  xpReward: number;
  status: string;
  bestScore: number;
  attempts: number;
  completedAt: string | null;
  unlocked: boolean;
  unlockReason: string | null;
  config: Record<string, unknown>;
};

export type GameView = {
  id: string;
  key: string;
  slug: string;
  name: string;
  description: string;
  kind: string;
  icon: string;
  color: string;
  difficulty: string;
  estimatedMinutes: number;
  xpReward: number;
  levelRequirement: number;
  learningObjectives: string[];
  hints: string[];
  badges: unknown;
  order: number;
  worldKey: string | null;
  worldSlug: string | null;
  worldName: string | null;
  worldColor: string | null;
  isBoss: boolean;
  rewardCoins: number;
  certificateTitle: string | null;
  bossBonusXp: number;
  bossBonusCoins: number;
};

export type BossOutcomeView = {
  certificate: { code: string; title: string } | null;
  unlockedWorlds: string[];
  mastered: boolean;
  xpAwarded: number;
  coinsAwarded: number;
};

export type GameSubmitResult = {
  passed: boolean;
  score: number;
  maxScore: number;
  ratio: number;
  perfect: boolean;
  feedback: string[];
  output?: string;
  firstBeat: boolean;
  xpAwarded: number;
  coinsAwarded?: number;
  levelUpCoins?: number;
  newTitles?: number;
  levelStatus: string;
  gameCompleted: boolean;
  achievements: { awarded: { key: string; name: string; icon: string }[]; xpAwarded: number };
  explanation: string | null;
  levelUp: number | null;
  boss: BossOutcomeView | null;
};

export function isLevelBeaten(status: string): boolean {
  return status === GAME_LEVEL_STATUS.BEATEN || status === GAME_LEVEL_STATUS.PERFECT;
}

export async function submitLevel(gameSlug: string, levelKey: string, payload: Record<string, unknown>): Promise<GameSubmitResult | null> {
  try {
    const res = await fetch(`/api/games/${gameSlug}/levels/${levelKey}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      toast({ title: "Something went wrong", description: json.error ?? "Please try again", variant: "error" });
      return null;
    }
    return json.data as GameSubmitResult;
  } catch {
    toast({ title: "Network error", description: "Could not reach the server", variant: "error" });
    return null;
  }
}

export function GameResultPanel({ result, levelExplanation }: { result: GameSubmitResult; levelExplanation: string | null }) {
  const failed = !result.passed;
  return (
    <div className={cn("space-y-3 rounded-lg border p-4", failed ? "border-destructive/40 bg-destructive/5" : "border-success/40 bg-success/5")}>
      <div className="flex items-center gap-2">
        {failed ? <XCircle className="h-5 w-5 text-destructive" /> : <CheckCircle2 className="h-5 w-5 text-success" />}
        <p className={cn("text-sm font-semibold", failed ? "text-destructive" : "text-success")}>
          {failed ? `Not quite — ${result.score}/${result.maxScore} points` : result.perfect ? "Perfect level!" : "Level passed!"}
        </p>
      </div>

      <ul className="space-y-1.5">
        {result.feedback.map((f, i) => (
          <li key={i} className="flex gap-2 text-sm text-foreground/85">
            <span className={f.startsWith("✓") ? "text-success" : ""}>{f.startsWith("✓") || f.startsWith("✗") ? "" : "•"}</span>
            <span className="whitespace-pre-wrap">{f}</span>
          </li>
        ))}
      </ul>

      {result.output != null && (
        <pre className="overflow-x-auto rounded-md bg-background p-3 font-mono text-xs">{result.output}</pre>
      )}

      {!failed && result.xpAwarded > 0 && (
        <p className="text-sm font-medium text-success">
          +{result.xpAwarded} XP {result.perfect ? "· perfect bonus included" : ""}
          {result.coinsAwarded ? ` · +${result.coinsAwarded} coins` : ""}
        </p>
      )}

      {!failed && levelExplanation && (
        <div className="rounded-md border border-border bg-card p-3 text-sm text-foreground/85">
          <span className="font-semibold text-foreground">Why it works: </span>
          {levelExplanation}
        </div>
      )}

      {!failed && result.achievements.awarded.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Trophy className="h-4 w-4 text-warning" />
          {result.achievements.awarded.map((a) => (
            <span key={a.key} className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-xs font-medium">
              <span aria-hidden>{a.icon}</span> {a.name}
              <span className="text-success">+{result.achievements.xpAwarded} XP</span>
            </span>
          ))}
        </div>
      )}

      {!failed && result.gameCompleted && (
        <p className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Game complete — you beat every level!
        </p>
      )}

      {!failed && result.boss && (
        <div className="space-y-2 rounded-lg border border-warning/40 bg-warning/10 p-3">
          <p className="inline-flex items-center gap-1.5 text-sm font-bold text-warning">
            <Skull className="h-4 w-4" /> BOSS DEFEATED — {result.boss.mastered ? "World mastered!" : "World conquered!"}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/85">
            <span className="inline-flex items-center gap-1"><Coins className="h-3.5 w-3.5 text-warning" />+{result.boss.xpAwarded} XP</span>
            <span className="inline-flex items-center gap-1"><Coins className="h-3.5 w-3.5 text-warning" />+{result.boss.coinsAwarded} coins</span>
            {result.boss.certificate && (
              <span className="inline-flex items-center gap-1"><Award className="h-3.5 w-3.5 text-primary" />Certificate {result.boss.certificate.code}</span>
            )}
          </div>
          {result.boss.unlockedWorlds.length > 0 && (
            <p className="text-xs font-medium text-success">
              <Map className="mr-1 inline h-3.5 w-3.5" />
              New world{result.boss.unlockedWorlds.length > 1 ? "s" : ""} unlocked: {result.boss.unlockedWorlds.join(", ")}!
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function LevelStatusIcon({ status, className }: { status: string; className?: string }) {
  if (isLevelBeaten(status)) return <CheckCircle2 className={cn("h-4 w-4 text-success", className)} />;
  return <span className={cn("font-mono text-xs font-semibold text-muted-foreground", className)}>•</span>;
}

export function useGameSubmit(gameSlug: string, levelKey: string) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<GameSubmitResult | null>(null);

  async function submit(payload: Record<string, unknown>): Promise<GameSubmitResult | null> {
    setChecking(true);
    setResult(null);
    const data = await submitLevel(gameSlug, levelKey, payload);
    if (data) {
      setResult(data);
      if (data.passed) {
        const coinText = data.coinsAwarded
          ? ` · +${data.coinsAwarded} coins${data.levelUpCoins ? ` (${data.levelUpCoins} level-up)` : ""}`
          : "";
        toast({ title: data.perfect ? "Perfect!" : "Level passed!", description: `+${data.xpAwarded} XP${coinText}`, variant: "success" });
        if (data.levelUp) {
          toast({
            title: `Level up — level ${data.levelUp}!`,
            description: data.newTitles ? `You unlocked ${data.newTitles} new title${data.newTitles === 1 ? "" : "s"}!` : undefined,
            variant: "level",
          });
        }
        if (data.gameCompleted) toast({ title: "Game complete!", description: "You beat every level", variant: "success" });
        window.dispatchEvent(new CustomEvent("creyvaph:progress"));
      }
    }
    setChecking(false);
    return data;
  }

  return { checking, result, submit };
}
