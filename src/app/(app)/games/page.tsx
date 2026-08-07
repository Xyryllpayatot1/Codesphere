import { Gamepad2, Map as MapIcon, Medal, Skull, Sparkles, Trophy } from "lucide-react";
import Link from "next/link";

import { requireSession } from "@/lib/auth";
import { loadGameCatalog } from "@/lib/games/progress";
import { GameCard } from "@/components/games/game-card";

export const dynamic = "force-dynamic";

export default async function GamesPage() {
  const session = await requireSession();
  const { games, stats } = await loadGameCatalog(session.id);

  const byWorld = new Map<string | "standalone", (typeof games)[number][]>();
  for (const g of games) {
    const key = g.worldKey ?? "standalone";
    const list = byWorld.get(key) ?? [];
    list.push(g);
    byWorld.set(key, list);
  }
  const sections = [...byWorld.entries()].sort(([a], [b]) => (a === "standalone" ? 1 : b === "standalone" ? -1 : 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Gamepad2 className="h-6 w-6 text-primary" /> Learning Games
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hands-on games grouped into Programming Worlds — defeat the boss of each world to unlock the next.
          </p>
        </div>
        <Link
          href="/worlds"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold transition hover:border-primary/50"
        >
          <MapIcon className="h-4 w-4 text-primary" /> World Map
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Medal className="h-4 w-4 text-primary" /> Games unlocked
          </div>
          <p className="mt-1 text-2xl font-bold">{stats.gamesUnlocked}<span className="text-base text-muted-foreground">/{games.length}</span></p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Trophy className="h-4 w-4 text-warning" /> Games beaten
          </div>
          <p className="mt-1 text-2xl font-bold">{stats.gamesBeaten}<span className="text-base text-muted-foreground">/{games.length}</span></p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-success" /> Levels beaten
          </div>
          <p className="mt-1 text-2xl font-bold">{stats.levelsBeaten}<span className="text-base text-muted-foreground">/{stats.totalLevels}</span></p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Skull className="h-4 w-4 text-warning" /> Bosses
          </div>
          <p className="mt-1 text-2xl font-bold">{games.filter((g) => g.isBoss).length}</p>
        </div>
      </div>

      {sections.map(([worldKey, worldGames]) => {
        const world = worldGames[0];
        return (
          <div key={worldKey}>
            <div className="mb-3 flex items-center gap-2">
              {world.worldName ? (
                <>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-bold"
                    style={{ backgroundColor: `${world.worldColor ?? "#6366f1"}1a`, color: world.worldColor ?? "#6366f1" }}
                  >
                    {world.worldName}
                  </span>
                  <Link href={`/worlds/${world.worldSlug}`} className="text-xs font-semibold text-muted-foreground hover:text-foreground">
                    View world →
                  </Link>
                </>
              ) : (
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Standalone games</h2>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {worldGames.map((g) => (
                <GameCard key={g.slug} game={g} />
              ))}
            </div>
          </div>
        );
      })}

      {games.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No games available yet.
        </div>
      )}
    </div>
  );
}
