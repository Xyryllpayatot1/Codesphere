// ---------------------------------------------------------------------------
// Daily missions — Duolingo-style engagement, tracked per local calendar day.
// Progress is incremented by the reward pipeline and the progress service;
// rewards are claimed explicitly so the player chooses when to cash in.
// ---------------------------------------------------------------------------

import "server-only";

import { prisma } from "@/lib/prisma";
import { toDateKey } from "@/lib/utils";

export const MISSION_TYPES = {
  COMPLETE_LESSON: "complete_lesson",
  EARN_XP: "earn_xp",
  PASS_QUIZ: "pass_quiz",
  PASS_EXERCISE: "pass_exercise",
  PLAY_GAME: "play_game",
  STUDY_MINUTES: "study_minutes",
} as const;

export type MissionType = (typeof MISSION_TYPES)[keyof typeof MISSION_TYPES];

export function currentDateKey(now: Date = new Date()): string {
  return toDateKey(now);
}

export type MissionProgress = {
  key: string;
  title: string;
  description: string;
  type: string;
  target: number;
  progress: number;
  rewardCoins: number;
  rewardXp: number;
  complete: boolean;
  claimed: boolean;
};

/**
 * Records progress against every active mission of `type`. Idempotent and
 * capped at each mission's target so a mission can only ever be completed once.
 */
export async function progressMission(
  userId: string,
  type: MissionType,
  amount: number,
  dateKey: string = currentDateKey()
): Promise<void> {
  if (amount <= 0) return;
  const [missions, existing] = await Promise.all([
    prisma.dailyMission.findMany({ where: { isActive: true, type }, select: { key: true, target: true } }),
    prisma.userMission.findMany({ where: { userId, dateKey } }),
  ]);
  if (missions.length === 0) return;

  const existingByKey = new Map(existing.map((e) => [e.missionKey, e]));
  await Promise.all(
    missions.map(async (mission) => {
      const ex = existingByKey.get(mission.key);
      const progress = Math.min(mission.target, (ex?.progress ?? 0) + amount);
      await prisma.userMission.upsert({
        where: { userId_missionKey_dateKey: { userId, missionKey: mission.key, dateKey } },
        create: { userId, missionKey: mission.key, type, dateKey, progress, target: mission.target, claimed: ex?.claimed ?? false },
        update: { progress, updatedAt: new Date() },
      });
    })
  );
}

/** Today's missions with the user's progress and claim state. */
export async function loadTodaysMissions(userId: string, dateKey: string = currentDateKey()): Promise<MissionProgress[]> {
  const [missions, entries] = await Promise.all([
    prisma.dailyMission.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    prisma.userMission.findMany({ where: { userId, dateKey } }),
  ]);

  const map = new Map(entries.map((e) => [e.missionKey, e]));
  return missions.map((m) => {
    const e = map.get(m.key);
    const progress = Math.min(m.target, e?.progress ?? 0);
    return {
      key: m.key,
      title: m.title,
      description: m.description,
      type: m.type,
      target: m.target,
      progress,
      rewardCoins: m.rewardCoins,
      rewardXp: m.rewardXp,
      complete: progress >= m.target,
      claimed: e?.claimed ?? false,
    };
  });
}

export type ClaimResult = {
  missionKey: string;
  claimed: boolean;
  rewardCoins: number;
  rewardXp: number;
  coinsAwarded: number;
  xpAwarded: number;
};
