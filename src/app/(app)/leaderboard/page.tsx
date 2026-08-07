import { Medal } from "lucide-react";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isFeatureUnlocked } from "@/lib/engine/levels";
import { LeaderboardClient } from "@/components/leaderboard/leaderboard-client";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const session = await requireSession();
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { level: true, xp: true } });
  const level = user?.level ?? 1;
  const unlocked = isFeatureUnlocked("leaderboards", level);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Medal className="h-6 w-6 text-primary" /> Leaderboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Climb the ranks by earning XP — daily, weekly, monthly, and all-time.
        </p>
      </div>

      <LeaderboardClient userId={session.id} unlocked={unlocked} level={level} />
    </div>
  );
}
