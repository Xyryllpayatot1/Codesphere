"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Medal, Trophy, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Entry = {
  rank: number;
  userId: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  xp: number;
  level: number;
};

const PERIODS = [
  { key: "daily", label: "Today" },
  { key: "weekly", label: "This Week" },
  { key: "monthly", label: "This Month" },
  { key: "all", label: "All Time" },
] as const;

export function LeaderboardClient({
  userId,
  unlocked,
  level,
}: {
  userId: string;
  unlocked: boolean;
  level: number;
}) {
  const router = useRouter();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["key"]>("daily");
  const [loadedPeriod, setLoadedPeriod] = useState<(typeof PERIODS)[number]["key"] | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [me, setMe] = useState<(Entry & { rank: number }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loading = loadedPeriod !== period;

  useEffect(() => {
    if (!unlocked) {
      return;
    }
    let cancelled = false;
    fetch(`/api/progression/leaderboard?period=${period}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        setError(null);
        setEntries(data.entries ?? []);
        setMe(data.me ?? null);
        setLoadedPeriod(period);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load leaderboard");
          setLoadedPeriod(period);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [period, unlocked]);

  if (!unlocked) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 pt-10 text-center">
          <Trophy className="h-10 w-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Leaderboards unlock at level 3</h2>
          <p className="text-sm text-muted-foreground">
            Earn XP to climb the ranks. You are currently level {level}.
          </p>
        </CardContent>
      </Card>
    );
  }

  const medalFor = (rank: number) => {
    if (rank === 1) return <Trophy className="h-4 w-4 text-amber-500" />;
    if (rank === 2) return <Medal className="h-4 w-4 text-slate-400" />;
    if (rank === 3) return <Medal className="h-4 w-4 text-amber-700" />;
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              period === p.key
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-secondary"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Card>
        <CardContent className="divide-y divide-border">
          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No XP earned this period yet — go learn something!
            </p>
          ) : (
            entries.map((e) => {
              const isMe = e.userId === userId;
              return (
                <div
                  key={e.userId}
                  className={cn(
                    "flex items-center gap-3 px-2 py-3",
                    isMe && "rounded-md bg-primary/10"
                  )}
                >
                  <span className="flex w-8 items-center justify-center text-sm font-semibold text-muted-foreground">
                    {medalFor(e.rank) ?? `#${e.rank}`}
                  </span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold">
                    {e.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {e.name} {isMe && <span className="text-xs text-primary">(you)</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{e.username} · Level {e.level}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">{e.xp.toLocaleString()} XP</span>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {me && (
        <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
          <User className="h-4 w-4 text-muted-foreground" />
          <p className="flex-1 text-sm">
            Your rank: <span className="font-semibold">#{me.rank}</span>{" "}
            <span className="text-muted-foreground">
              · {me.xp.toLocaleString()} XP this {period === "all" ? "all-time" : period}
            </span>
          </p>
          <button
            onClick={() => router.push("/profile")}
            className="text-sm font-medium text-primary hover:underline"
          >
            View profile
          </button>
        </div>
      )}
    </div>
  );
}
