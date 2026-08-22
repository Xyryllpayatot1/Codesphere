import "server-only";

import { prisma } from "@/lib/prisma";
import { evaluateCriteria, type UserStats } from "@/lib/engine/achievements/criteria";
import { toDateKey } from "@/lib/utils";
import { ACTIVITY_TYPES, COINS, XP_TYPES } from "@/lib/constants";
import { awardXp } from "@/lib/engine/rewards";
import { unlockTitlesFromAchievements } from "@/lib/engine/titles";

/** Builds the user-stats snapshot used by the achievement rule engine. */
export async function getUserStats(userId: string): Promise<UserStats> {
  const [user, lessonsCompleted, exercisesPassed, quizCounts, projectsSubmitted, projectsApproved, certificates, worldCertificates, enrollments, studyMinutesAgg, studyDayRows, levelCountsByGame, beatenRows, titlesOwned, missionsCompleted, storeItemsOwned, worldProgress] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { xp: true, level: true, streak: true, linesOfCode: true, totalCoinsEarned: true } }),
      prisma.lessonProgress.count({ where: { userId, status: "COMPLETED" } }),
      prisma.exerciseSubmission.count({ where: { userId, passed: true } }),
      // Counts instead of loading every attempt ever made.
      Promise.all([
        prisma.quizAttempt.count({ where: { userId } }),
        prisma.quizAttempt.count({ where: { userId, passed: true } }),
        // "Perfect" needs a field comparison (score = maxScore), which is not
        // portable across providers — computed from a minimal projection.
        prisma.quizAttempt.findMany({ where: { userId }, select: { score: true, maxScore: true } }),
      ]),
      prisma.projectSubmission.count({ where: { userId } }),
      prisma.projectSubmission.count({ where: { userId, status: "APPROVED" } }),
      prisma.certificate.count({ where: { userId } }),
      prisma.worldCertificate.count({ where: { userId } }),
      prisma.enrollment.findMany({
        where: { userId, status: "COMPLETED" },
        select: { course: { select: { slug: true } } },
      }),
      // Lifetime minutes aggregated in the database.
      prisma.studySession.aggregate({ _sum: { durationSeconds: true }, where: { userId } }),
      // Distinct study days need the dates; only meaningful sessions are sent.
      prisma.studySession.findMany({
        where: { userId, durationSeconds: { gte: 5 } },
        select: { startedAt: true },
      }),
      prisma.gameLevel.groupBy({ by: ["gameId"], _count: { id: true }, where: { isActive: true } }),
      prisma.gameProgress.findMany({
        where: { userId, status: { in: ["BEATEN", "PERFECT"] } },
        select: { gameId: true, levelId: true, status: true },
      }),
      prisma.userTitle.count({ where: { userId } }),
      prisma.userMission.count({ where: { userId, claimed: true } }),
      prisma.userPurchase.count({ where: { userId } }),
      prisma.userWorldProgress.findMany({
        where: { userId },
        select: { bossDefeated: true, masteryPercent: true, world: { select: { key: true } } },
      }),
    ]);

  const [quizAttempts, quizzesPassedRows, quizRows] = quizCounts;
  const quizzesPassed = quizzesPassedRows;
  const perfect = quizRows.filter((a) => a.maxScore > 0 && a.score === a.maxScore).length;
  const studyDays = new Set(studyDayRows.map((s) => toDateKey(s.startedAt))).size;
  const studyMinutes = Math.floor((studyMinutesAgg._sum.durationSeconds ?? 0) / 60);

  // Fully-beaten games = games whose active levels all appear in the user's
  // beaten rows. Two small queries replace loading the whole game catalog.
  const totalLevelsByGame = new Map(levelCountsByGame.map((r) => [r.gameId, r._count.id]));
  const beatenByGame = new Map<string, Set<string>>();
  let gameLevelsBeaten = 0;
  let gameLevelsPerfect = 0;
  for (const row of beatenRows) {
    const set = beatenByGame.get(row.gameId) ?? new Set<string>();
    set.add(row.levelId);
    beatenByGame.set(row.gameId, set);
    if (row.status === "BEATEN" || row.status === "PERFECT") gameLevelsBeaten += 1;
    if (row.status === "PERFECT") gameLevelsPerfect += 1;
  }
  const gameSlugsById = new Map(
    beatenByGame.size > 0
      ? (
          await prisma.game.findMany({
            where: { id: { in: [...beatenByGame.keys()] }, isActive: true },
            select: { id: true, slug: true },
          })
        ).map((g) => [g.id, g.slug])
      : []
  );
  const gamesBeaten = [...beatenByGame.entries()]
    .filter(([gameId, levels]) => levels.size > 0 && levels.size >= (totalLevelsByGame.get(gameId) ?? Infinity))
    .map(([gameId]) => gameSlugsById.get(gameId))
    .filter((slug): slug is string => !!slug);

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
    quizAttempts,
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
