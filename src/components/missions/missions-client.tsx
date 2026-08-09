"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Coins, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type MissionView = {
  key: string;
  title: string;
  description: string;
  type: string;
  target: number;
  progress: number;
  rewardCoins: number;
  rewardXp: number;
  claimed: boolean;
};

export function MissionsClient({
  missions,
  unlocked,
  coins,
  level,
}: {
  missions: MissionView[];
  unlocked: boolean;
  coins: number;
  level: number;
}) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coinBalance, setCoinBalance] = useState(coins);

  async function claim(m: MissionView) {
    setBusyKey(m.key);
    setError(null);
    try {
      const res = await fetch("/api/progression/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionKey: m.key }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to claim");
      setCoinBalance(data.coins);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to claim");
    } finally {
      setBusyKey(null);
    }
  }

  const earned = missions.filter((m) => m.claimed).length;

  if (!unlocked) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 pt-10 text-center">
          <Target className="h-10 w-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Daily Missions unlock at level 2</h2>
          <p className="text-sm text-muted-foreground">
            Complete lessons, pass quizzes, and earn XP to reach level {2}. You are currently level {level}.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {earned} of {missions.length} claimed today
        </p>
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <Coins className="h-4 w-4 text-amber-500" /> {coinBalance} coins
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {missions.map((m) => {
          const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
          const done = m.progress >= m.target;
          const busy = busyKey === m.key;
          return (
            <Card key={m.key}>
              <CardContent className="flex flex-col items-start gap-3 pt-5">
                <div className="flex w-full items-start justify-between">
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      done ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {m.claimed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                  </span>
                  <div className="flex gap-2 text-xs">
                    <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-medium text-amber-600">
                      +{m.rewardCoins} coins
                    </span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                      +{m.rewardXp} XP
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold">{m.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
                </div>
                <div className="w-full space-y-2">
                  <Progress value={pct} />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {Math.min(m.progress, m.target)} / {m.target}
                    </p>
                    {m.claimed ? (
                      <span className="text-xs font-medium text-success">Claimed</span>
                    ) : (
                      <Button size="sm" variant={done ? "success" : "outline"} disabled={!done || busy} onClick={() => claim(m)}>
                        {busy ? "Claiming…" : "Claim"}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {missions.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 pt-8 text-center">
            <Target className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No missions available right now. Check back tomorrow!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
