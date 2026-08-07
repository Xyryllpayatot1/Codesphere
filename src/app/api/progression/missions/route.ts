import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { loadTodaysMissions, currentDateKey } from "@/lib/engine/missions";
import { awardXp } from "@/lib/engine/rewards";
import { isFeatureUnlocked } from "@/lib/engine/levels";
import { levelFromXp } from "@/lib/engine/xp";
import { ACTIVITY_TYPES, XP_TYPES } from "@/lib/constants";

const claimSchema = z.object({ missionKey: z.string().min(1).max(64) });

export const GET = handle(async () => {
  const session = await requireSession();
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { xp: true, level: true } });
  const level = user?.level ?? 1;
  const unlocked = isFeatureUnlocked("missions", level);
  const missions = await loadTodaysMissions(session.id);
  const dateKey = currentDateKey();
  const completedToday = missions.filter((m) => m.claimed).length;

  return {
    unlocked,
    level,
    unlockLevel: 2,
    dateKey,
    missions,
    completedToday,
  };
});

export const POST = handle(async (req) => {
  const session = await requireSession();
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { xp: true, level: true, coins: true } });
  const level = user?.level ?? 1;
  if (!isFeatureUnlocked("missions", level)) throw new ApiError("Daily missions unlock at level 2", 403);

  const parsed = claimSchema.safeParse(await req.json());
  if (!parsed.success) throw new ApiError("Invalid request", 400);
  const { missionKey } = parsed.data;

  const mission = await prisma.dailyMission.findUnique({ where: { key: missionKey } });
  if (!mission || !mission.isActive) throw new ApiError("Mission not found", 404);

  const dateKey = currentDateKey();
  const entry = await prisma.userMission.findUnique({
    where: { userId_missionKey_dateKey: { userId: session.id, missionKey, dateKey } },
  });
  if (entry?.claimed) throw new ApiError("Mission already claimed", 409);
  const progress = Math.min(mission.target, entry?.progress ?? 0);
  if (progress < mission.target) throw new ApiError("Mission not complete yet", 400);

  const award = await awardXp(session.id, {
    amount: mission.rewardXp,
    coins: mission.rewardCoins,
    type: XP_TYPES.MISSION,
    reason: `Mission: ${mission.title}`,
    data: { missionKey },
    skipMissionProgress: true,
  });

  await prisma.$transaction([
    prisma.userMission.update({
      where: { userId_missionKey_dateKey: { userId: session.id, missionKey, dateKey } },
      data: { claimed: true, claimedAt: new Date(), progress: mission.target },
    }),
    prisma.activity.create({
      data: { userId: session.id, type: ACTIVITY_TYPES.MISSION_COMPLETED, data: { missionKey, title: mission.title, coins: mission.rewardCoins, xp: mission.rewardXp } },
    }),
  ]);

  const levelInfo = levelFromXp(award.currentXp);

  return {
    claimed: true,
    missionKey,
    title: mission.title,
    coinsAwarded: mission.rewardCoins,
    xpAwarded: mission.rewardXp,
    coins: (user?.coins ?? 0) + award.coinsAwarded,
    award,
    level: levelInfo.level,
  };
});
