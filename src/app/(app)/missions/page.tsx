import { Target } from "lucide-react";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loadTodaysMissions } from "@/lib/engine/missions";
import { isFeatureUnlocked } from "@/lib/engine/levels";
import { MissionsClient } from "@/components/missions/missions-client";

export const dynamic = "force-dynamic";

export default async function MissionsPage() {
  const session = await requireSession();
  const [user, missions] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.id }, select: { xp: true, level: true, coins: true } }),
    loadTodaysMissions(session.id),
  ]);
  const level = user?.level ?? 1;
  const unlocked = isFeatureUnlocked("missions", level);

  const view = missions.map((m) => ({
    key: m.key,
    title: m.title,
    description: m.description,
    type: m.type,
    target: m.target,
    progress: m.progress,
    rewardCoins: m.rewardCoins,
    rewardXp: m.rewardXp,
    claimed: m.claimed,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Target className="h-6 w-6 text-primary" /> Daily Missions
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fresh challenges every day — earn CodeCoins and XP, never pay-to-win.
        </p>
      </div>

      <MissionsClient missions={view} unlocked={unlocked} coins={user?.coins ?? 0} level={level} />
    </div>
  );
}
