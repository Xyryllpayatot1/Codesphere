import "server-only";

import { prisma } from "@/lib/prisma";
import { evaluateCriteria, type UserStats } from "@/lib/engine/achievements/criteria";
import { toDateKey } from "@/lib/utils";
import { ACTIVITY_TYPES, COINS, XP_TYPES } from "@/lib/constants";
import { awardXp } from "@/lib/engine/rewards";
import { unlockTitlesFromAchievements } from "@/lib/engine/titles";

/** Builds the user-stats snapshot used by the achievement rule engine. */
export async function getUserStats(userId: string): Promise<UserStats> {
  const [user, lessonsCompleted, exercisesPassed, quizAttemptRows, projectsSubmitted, projectsApproved, certificates, worldCertificates, enrollments, studySessions, games, titlesOwned, missionsCompleted, storeItemsOwned, worldProgress] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { xp: true, level: true, streak: true, linesOfCode: true, totalCoinsEarned: true } }),
      prisma.lessonProgress.count({ where: { userId, status: "COMPLETED" } }),
      prisma.exerciseSubmission.count({ where: { userId, passed: true } }),
      prisma.quizAttempt.findMany({ where: { userId }, select: { score: true, maxScore: true, passed: true } }),
      prisma.projectSubmission.count({ where: { userId } }),
      prisma.projectSubmission.count({ where: { userId, status: "APPROVED" } }),
      prisma.certificate.count({ where: { userId } }),
      prisma.worldCertificate.count({ where: { userId } }),
      prisma.enrollment.findMany({
        where: { userId, status: "COMPLETED" },
        select: { course: { select: { slug: true } } },
      }),
      prisma.studySession.findMany({
        where: { userId },
        select: { startedAt: true, durationSeconds: true },
      }),
      prisma.game.findMany({
        where: { isActive: true },
        include: {
          levels: { where: { isActive: true }, select: { id: true } },
          progress: { where: { userId }, select: { levelId: true, status: true } },
        },
      }),
      prisma.userTitle.count({ where: { userId } }),
      prisma.userMission.count({ where: { userId, claimed: true } }),
      prisma.userPurchase.count({ where: { userId } }),
      prisma.userWorldProgress.findMany({ where: { userId }, include: { world: { select: { key: true } } } }),
    ]);

  const quizzesPassed = quizAttemptRows.filter((a) => a.passed).length;
  const perfect = quizAttemptRows.filter((a) => a.maxScore > 0 && a.score === a.maxScore).length;
  const studyDays = new Set(
    studySessions.filter((s) => s.durationSeconds >= 5).map((s) => toDateKey(s.startedAt))
  ).size;
  const studyMinutes = Math.floor(studySessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0) / 60);

  const gamesBeaten = games
    .filter((g) => {
      const done = new Set(g.progress.filter((p) => p.status === "BEATEN" || p.status === "PERFECT").map((p) => p.levelId));
      return g.levels.length > 0 && g.levels.every((l) => done.has(l.id));
    })
    .map((g) => g.slug);

  const allGameProgress = games.flatMap((g) => g.progress);
  const gameLevelsBeaten = allGameProgress.filter((p) => p.status === "BEATEN" || p.status === "PERFECT").length;
  const gameLevelsPerfect = allGameProgress.filter((p) => p.status === "PERFECT").length;

  const bossesDefeated = worldProgress.filter((w) => w.bossDefeated).map((w) => w.world.key);
  const worldsMastered = worldProgress
    .filter((w) => w.bossDefeated && w.masteryPercent >= 80)
    .map((w) => w.world.key);

  return {
    xp: user?.xp ?? 0,
    level: user?.level ?? 1,
    streak: user?.streak ?? 0,
    lessonsCompleted,
    exercisesPassed,
    quizzesPassed,
    quizAttempts: quizAttemptRows.length,
    quizPerfect: perfect,
    projectsSubmitted,
    projectsApproved,
    studyDays,
    studyMinutes,
    linesOfCode: user?.linesOfCode ?? 0,
    coinsEarned: user?.totalCoinsEarned ?? 0,
    certificatesEarned: certificates,
    coursesCompleted: enrollments.map((e) => e.course.slug),
    gamesBeaten,
    gameLevelsBeaten,
    gameLevelsPerfect,
    titlesOwned,
    missionsCompleted,
    storeItemsOwned,
    worldsMastered,
    bossesDefeated,
    worldCertificatesEarned: worldCertificates,
  };
}

export type AwardResult = {
  awarded: { key: string; name: string; icon: string; rarity: string }[];
  xpAwarded: number;
  coinsAwarded: number;
};

/**
 * Evaluates every active achievement against the user's stats and awards any
 * that are newly satisfied. Returns the newly earned achievements and rewards.
 */
export async function awardEligibleAchievements(userId: string): Promise<AwardResult> {
  const [achievements, earned, stats] = await Promise.all([
    prisma.achievement.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true } }),
    getUserStats(userId),
  ]);

  const earnedIds = new Set(earned.map((e) => e.achievementId));
  const toAward = achievements.filter(
    (a) => !earnedIds.has(a.id) && evaluateCriteria(a.criteria as Parameters<typeof evaluateCriteria>[0], stats)
  );

  if (toAward.length === 0) {
    return { awarded: [], xpAwarded: 0, coinsAwarded: 0 };
  }

  const totalXp = toAward.reduce((sum, a) => sum + a.xpReward, 0);
  const totalCoins = COINS.ACHIEVEMENT * toAward.length;

  await prisma.$transaction([
    prisma.userAchievement.createMany({
      data: toAward.map((a) => ({ userId, achievementId: a.id })),
    }),
    prisma.activity.createMany({
      data: toAward.map((a) => ({
        userId,
        type: ACTIVITY_TYPES.ACHIEVEMENT_EARNED,
        data: { achievementKey: a.key, achievementName: a.name, rarity: a.rarity },
      })),
    }),
  ]);

  const keys = toAward.map((a) => a.key);
  await awardXp(userId, {
    amount: totalXp,
    coins: totalCoins,
    type: XP_TYPES.ACHIEVEMENT,
    reason: `${toAward.length} achievement${toAward.length === 1 ? "" : "s"} earned`,
    data: { keys },
  });
  await unlockTitlesFromAchievements(userId, keys);

  return {
    awarded: toAward.map((a) => ({ key: a.key, name: a.name, icon: a.icon, rarity: a.rarity })),
    xpAwarded: totalXp,
    coinsAwarded: totalCoins,
  };
}
