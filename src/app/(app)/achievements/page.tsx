import { Trophy, Lock, CheckCircle2, Award } from "lucide-react";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserStats } from "@/lib/engine/achievements";
import { evaluateCriteria } from "@/lib/engine/achievements/criteria";
import { Card, CardContent } from "@/components/ui/card";
import { AchievementFilter } from "@/components/achievements/achievement-filter";
import { RarityBadge } from "@/components/progression/rarity-badge";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AchievementsPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const session = await requireSession();
  const userId = session.id;
  const { cat } = await searchParams;
  const activeCategory = cat && cat.length > 0 ? cat.toUpperCase() : null;

  const [achievements, earned, stats] = await Promise.all([
    prisma.achievement.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true, earnedAt: true },
    }),
    getUserStats(userId),
  ]);

  const earnedMap = new Map(earned.map((e) => [e.achievementId, e.earnedAt]));
  const categories = [...new Set(achievements.map((a) => a.category))].sort();
  const visible = activeCategory ? achievements.filter((a) => a.category === activeCategory) : achievements;
  const earnedVisible = visible.filter((a) => earnedMap.has(a.id)).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Trophy className="h-6 w-6 text-primary" /> Achievements
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {earned.length} of {achievements.length} unlocked · {achievements.reduce((s, a) => s + a.xpReward, 0)} XP available
        </p>
      </div>

      <AchievementFilter categories={categories} active={activeCategory} />

      {activeCategory && (
        <p className="text-xs text-muted-foreground">
          Showing {earnedVisible} of {visible.length} {activeCategory.toLowerCase()} achievements.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visible.map((a) => {
          const earnedAt = earnedMap.get(a.id);
          const met = earnedAt ? true : evaluateCriteria(a.criteria as never, stats);
          const unlocked = Boolean(earnedAt);
          return (
            <Card
              key={a.id}
              className={cn(
                "relative overflow-hidden transition",
                unlocked ? "border-primary/40" : "opacity-80"
              )}
            >
              <CardContent className="flex flex-col items-start gap-3 pt-5">
                <div className="flex w-full items-start justify-between">
                  <span
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl text-2xl",
                      unlocked ? "bg-primary/10" : "bg-muted"
                    )}
                    aria-hidden
                  >
                    {unlocked ? a.icon : <Lock className="h-5 w-5 text-muted-foreground" />}
                  </span>
                  {unlocked ? (
                    <span className="inline-flex flex-col items-end gap-1">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Unlocked
                      </span>
                      <RarityBadge rarity={a.rarity} />
                    </span>
                  ) : (
                    <span className="flex flex-col items-end gap-1">
                      <span className="text-[11px] text-muted-foreground">{a.xpReward} XP</span>
                      <RarityBadge rarity={a.rarity} />
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold">{a.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{a.description}</p>
                </div>
                {!unlocked && met && (
                  <div className="w-full">
                    <p className="mb-1 text-xs font-medium text-primary">Ready to unlock — keep going!</p>
                  </div>
                )}
                {unlocked && earnedAt && (
                  <p className="text-xs text-muted-foreground">
                    Earned {earnedAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {visible.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 pt-8 text-center">
            <Award className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No achievements in this category yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
