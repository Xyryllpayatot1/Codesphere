"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Award, CheckCircle2, Clock, Flame, Lock, Medal, Skull, Star, Trophy } from "lucide-react";
import { GAME_LEVEL_STATUS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  GameLevelView,
  GameSubmitResult,
  GameView,
  isLevelBeaten,
} from "@/components/games/shared";
import { GamePlayer } from "@/components/games/game-player";

type Badge = { key: string; name: string; description: string; icon: string; requirement: string };

function badgeState(badge: Badge, levels: GameLevelView[]): { earned: boolean; hint: string } {
  const beaten = levels.filter((l) => isLevelBeaten(l.status));
  const perfect = levels.filter((l) => l.status === GAME_LEVEL_STATUS.PERFECT);
  switch (badge.requirement) {
    case "allPerfect":
      return { earned: perfect.length === levels.length && levels.length > 0, hint: "Finish every level perfectly" };
    case "perfect":
      return { earned: perfect.length > 0, hint: "Finish any level with a perfect score" };
    default:
      return { earned: beaten.length === levels.length && levels.length > 0, hint: "Beat every level" };
  }
}

function LevelBadge({ status }: { status: string }) {
  if (status === GAME_LEVEL_STATUS.PERFECT) return <Star className="h-3.5 w-3.5 fill-warning text-warning" />;
  if (isLevelBeaten(status)) return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
  return <Lock className="h-3 w-3 text-muted-foreground/60" />;
}

export function GameDetail({
  game,
  levels,
  unlocked,
  unlockReason,
}: {
  game: GameView;
  levels: GameLevelView[];
  unlocked: boolean;
  unlockReason: string | null;
}) {
  const [liveLevels, setLiveLevels] = useState(levels);
  const firstPlayable = useMemo(
    () => liveLevels.find((l) => l.unlocked) ?? liveLevels[0],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [activeKey, setActiveKey] = useState(firstPlayable?.key ?? "");
  const active = liveLevels.find((l) => l.key === activeKey) ?? firstPlayable;

  const beaten = liveLevels.filter((l) => isLevelBeaten(l.status)).length;
  const perfect = liveLevels.filter((l) => l.status === GAME_LEVEL_STATUS.PERFECT).length;
  const total = liveLevels.length;
  const complete = total > 0 && beaten >= total;

  function handleResult(result: GameSubmitResult) {
    setLiveLevels((prev) => {
      const idx = prev.findIndex((l) => l.key === activeKey);
      if (idx === -1) return prev;
      const next = [...prev];
      const old = next[idx];
      next[idx] = {
        ...old,
        status: result.levelStatus,
        bestScore: Math.max(old.bestScore, result.score),
        attempts: old.attempts + 1,
        completedAt: new Date().toISOString(),
        unlocked: true,
      };
      if (result.passed && next[idx + 1]) {
        next[idx + 1] = { ...next[idx + 1], unlocked: true, unlockReason: null };
      }
      return next;
    });
  }

  const badges = (game.badges ?? []) as Badge[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center">
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-3xl"
          style={{ backgroundColor: `${game.color}1a` }}
          aria-hidden
        >
          {game.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">{game.name}</h1>
            {game.isBoss && (
              <span className="inline-flex items-center gap-1 rounded-md bg-warning/10 px-2 py-0.5 text-xs font-bold text-warning">
                <Skull className="h-3.5 w-3.5" /> World Boss
              </span>
            )}
            {game.worldName && game.worldSlug && (
              <Link
                href={`/worlds/${game.worldSlug}`}
                className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold transition hover:opacity-80"
                style={{ backgroundColor: `${game.worldColor ?? "#6366f1"}1a`, color: game.worldColor ?? "#6366f1" }}
              >
                {game.worldName}
              </Link>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{game.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Flame className="h-3.5 w-3.5" />{game.difficulty.toLowerCase()}</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{game.estimatedMinutes} min</span>
            <span className="inline-flex items-center gap-1"><Award className="h-3.5 w-3.5" />{game.xpReward} XP per level</span>
            <span className="inline-flex items-center gap-1"><Medal className="h-3.5 w-3.5" />{total} levels</span>
            {game.isBoss && (
              <span className="inline-flex items-center gap-1 font-semibold text-warning">
                <Skull className="h-3.5 w-3.5" />+{game.bossBonusXp} XP · 🪙{game.bossBonusCoins} first beat
              </span>
            )}
          </div>
          {game.isBoss && game.certificateTitle && (
            <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              <Award className="h-3.5 w-3.5" /> Earns certificate: {game.certificateTitle}
            </p>
          )}
        </div>
        <div className="text-center sm:text-right">
          <p className="text-2xl font-bold">{beaten}<span className="text-base text-muted-foreground">/{total}</span></p>
          <p className="text-xs text-muted-foreground">levels beaten</p>
        </div>
      </div>

      {!unlocked && (
        <div className="rounded-xl border border-warning/40 bg-warning/5 p-5 text-center">
          <Lock className="mx-auto h-6 w-6 text-warning" />
          <p className="mt-2 font-semibold">This game is locked</p>
          <p className="mt-1 text-sm text-muted-foreground">{unlockReason ?? "Keep learning to unlock it."}</p>
        </div>
      )}

      {complete && (
        <div className="flex items-center gap-2 rounded-xl border border-success/40 bg-success/5 p-4 text-sm font-semibold text-success">
          <Trophy className="h-5 w-5" /> Game complete — you beat every level. Replay any level to chase perfect scores.
        </div>
      )}

      {game.learningObjectives.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">What you will learn</p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {game.learningObjectives.map((o, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground/85"><span className="text-success">•</span>{o}</li>
            ))}
          </ul>
        </div>
      )}

      {badges.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Badges</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {badges.map((b) => {
              const state = badgeState(b, liveLevels);
              return (
                <div key={b.key} className={cn("flex items-center gap-2 rounded-lg border p-2.5", state.earned ? "border-warning/40 bg-warning/5" : "border-border")}>
                  <span className={cn("text-xl", state.earned ? "" : "opacity-40 grayscale")} aria-hidden>{state.earned ? b.icon : <Lock className="h-4 w-4 text-muted-foreground" />}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{b.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{state.earned ? b.description : state.hint}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Levels</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {liveLevels.map((l, i) => (
            <button
              key={l.key}
              type="button"
              disabled={!l.unlocked}
              onClick={() => setActiveKey(l.key)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition",
                l.key === active?.key ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-foreground/80",
                !l.unlocked && "cursor-not-allowed opacity-50"
              )}
              title={l.unlocked ? l.title : (l.unlockReason ?? "Locked")}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded bg-muted font-mono text-[11px]">{i + 1}</span>
              <span className="max-w-[10rem] truncate">{l.title}</span>
              <LevelBadge status={l.status} />
            </button>
          ))}
        </div>
      </div>

      {active && unlocked ? (
        <div className="rounded-xl border border-border bg-card p-5">
          <GamePlayer key={active.key} game={game} level={active} onResult={handleResult} />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">
          {perfect > 0 ? `${perfect} level${perfect === 1 ? "" : "s"} beaten perfectly. ` : ""}Levels unlock one at a time as you beat the one before.
        </div>
      )}
    </div>
  );
}
