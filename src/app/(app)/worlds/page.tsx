import { Crown, Map, Skull, Trophy } from "lucide-react";

import { requireSession } from "@/lib/auth";
import { loadWorldMap } from "@/lib/engine/worlds";
import { WorldMap } from "@/components/worlds/world-map";

export const dynamic = "force-dynamic";

export default async function WorldsPage() {
  const session = await requireSession();
  const worlds = await loadWorldMap(session.id);

  const unlocked = worlds.filter((w) => w.unlocked).length;
  const mastered = worlds.filter((w) => w.mastered).length;
  const bosses = worlds.filter((w) => w.bossDefeated).length;
  const current = worlds.find((w) => w.isCurrent);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Map className="h-6 w-6 text-primary" /> Programming Worlds
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ten worlds, one path. Master each world&apos;s lessons, games and projects, then defeat the boss to unlock the next world.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Map className="h-4 w-4 text-primary" /> Worlds reached
          </div>
          <p className="mt-1 text-2xl font-bold">{unlocked}<span className="text-base text-muted-foreground">/{worlds.length}</span></p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Trophy className="h-4 w-4 text-success" /> Worlds mastered
          </div>
          <p className="mt-1 text-2xl font-bold">{mastered}<span className="text-base text-muted-foreground">/{worlds.length}</span></p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Skull className="h-4 w-4 text-warning" /> Bosses defeated
          </div>
          <p className="mt-1 text-2xl font-bold">{bosses}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Crown className="h-4 w-4 text-warning" /> Current world
          </div>
          <p className="mt-1 truncate text-lg font-bold">{current?.name ?? "—"}</p>
        </div>
      </div>

      <WorldMap worlds={worlds} />
    </div>
  );
}
