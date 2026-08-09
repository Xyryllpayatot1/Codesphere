import "server-only";

import { prisma } from "@/lib/prisma";
import { makePerf } from "@/lib/perf";
import { gradeGameLevel } from "@/lib/games/grade";
import { evaluateUnlock, unlockReason } from "@/lib/games/unlock";
import { publicLevelConfig, type PublicLevelConfig } from "@/lib/games/public";
import { GAME_LEVEL_STATUS, ACTIVITY_TYPES, XP, XP_TYPES, COINS, WORLD } from "@/lib/constants";
import { awardEligibleAchievements, type AwardResult } from "@/lib/engine/achievements";
import { levelFromXp } from "@/lib/engine/xp";
import { awardXp } from "@/lib/engine/rewards";
import { progressMission, MISSION_TYPES } from "@/lib/engine/missions";
import { recordStudyTime } from "@/lib/services/progress";
import { buildUnlockContextFor, handleBossDefeat, recordWorldGame, type BossOutcome } from "@/lib/engine/worlds";
import type { GameSubmission, UnlockCriteria } from "@/lib/games/types";
import type { XpAwardOutcome } from "@/lib/engine/rewards";

// ---------------------------------------------------------------------------
// Game progress service: unlocks, catalog loading and transactional level
// submissions (grade → persist → XP → activity → achievements → streak).
// ---------------------------------------------------------------------------

export type GameLevelWithProgress = {
  id: string;
  key: string;
  order: number;
  title: string;
  description: string | null;
  instructions: string | null;
  objectives: string[];
  hints: string[];
  explanation: string | null;
  xpReward: number;
  isActive: boolean;
  status: string;
  bestScore: number;
  attempts: number;
  completedAt: Date | null;
  unlocked: boolean;
};

export type GameCatalogItem = {
  id: string;
  key: string;
  slug: string;
  name: string;
  description: string;
  kind: string;
  icon: string;
  color: string;
  difficulty: string;
  estimatedMinutes: number;
  xpReward: number;
  levelRequirement: number;
  learningObjectives: string[];
  hints: string[];
  badges: unknown;
  order: number;
  worldKey: string | null;
  worldSlug: string | null;
  worldName: string | null;
  worldColor: string | null;
  isBoss: boolean;
  rewardCoins: number;
  unlocked: boolean;
  unlockReason: string | null;
  levelRequirementMet: boolean;
  progress: { beaten: number; perfect: number; total: number; attempts: number };
};

export type LoadCatalogResult = {
  games: GameCatalogItem[];
  stats: { gamesUnlocked: number; gamesBeaten: number; totalLevels: number; levelsBeaten: number; levelsPerfect: number };
};

export async function loadGameCatalog(userId: string): Promise<LoadCatalogResult> {
  const perf = makePerf("games catalog");
  const [games, user] = await Promise.all([
    prisma.game.findMany({
      where: { isActive: true },
      include: {
        levels: { where: { isActive: true }, orderBy: { order: "asc" }, include: { progress: { where: { userId } } } },
        world: { select: { key: true, slug: true, name: true, color: true } },
      },
      orderBy: { order: "asc" },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { level: true, xp: true } }),
  ]);

  const ctx = await buildUnlockContextFor(userId, games.map((g) => g.unlockCriteria as UnlockCriteria | null | undefined));
  perf("games + user + unlock ctx (scoped)");

  let totalLevels = 0;
  let levelsBeaten = 0;
  let levelsPerfect = 0;

  const items: GameCatalogItem[] = games.map((game) => {
    const progress = game.levels.flatMap((l) =>
      l.progress.map((p) => ({ levelId: p.levelId, status: p.status as string, attempts: p.attempts, bestScore: p.bestScore }))
    );
    const beaten = progress.filter((p) => p.status === GAME_LEVEL_STATUS.BEATEN || p.status === GAME_LEVEL_STATUS.PERFECT).length;    const perfect = progress.filter((p) => p.status === GAME_LEVEL_STATUS.PERFECT).length;
    const attempts = progress.reduce((s, p) => s + p.attempts, 0);

    totalLevels += game.levels.length;
    levelsBeaten += beaten;
    levelsPerfect += perfect;

    const levelRequirementMet = (user?.level ?? 1) >= game.levelRequirement;
    const unlockMet = levelRequirementMet && evaluateUnlock(game.unlockCriteria as never, ctx);
    const unlockReasonText = !levelRequirementMet
      ? `Reach level ${game.levelRequirement}`
      : unlockReason(game.unlockCriteria as never);

    return {
      id: game.id,
      key: game.key,
      slug: game.slug,
      name: game.name,
      description: game.description,
      kind: game.kind,
      icon: game.icon,
      color: game.color,
      difficulty: game.difficulty,
      estimatedMinutes: game.estimatedMinutes,
      xpReward: game.xpReward,
      levelRequirement: game.levelRequirement,
      learningObjectives: game.learningObjectives as string[],
      hints: game.hints as string[],
      badges: game.badges,
      order: game.order,
      worldKey: game.world?.key ?? null,
      worldSlug: game.world?.slug ?? null,
      worldName: game.world?.name ?? null,
      worldColor: game.world?.color ?? null,
      isBoss: game.isBoss,
      rewardCoins: game.rewardCoins,
      unlocked: unlockMet,
      unlockReason: unlockReasonText,
      levelRequirementMet,
      progress: { beaten, perfect, total: game.levels.length, attempts },
    };
  });

  return {
    games: items,
    stats: {
      gamesUnlocked: items.filter((g) => g.unlocked).length,
      gamesBeaten: items.filter((g) => g.progress.beaten === g.progress.total && g.progress.total > 0).length,
      totalLevels,
      levelsBeaten,
      levelsPerfect,
    },
  };
}

export type GameDetailLevel = {
  id: string;
  key: string;
  order: number;
  title: string;
  description: string | null;
  instructions: string | null;
  objectives: string[];
  hints: string[];
  explanation: string | null;
  xpReward: number;
  config: PublicLevelConfig;
  status: string;
  bestScore: number;
  attempts: number;
  completedAt: Date | null;
  unlocked: boolean;
  unlockReason: string | null;
};

export type GameDetailResult = {
  game: {
    id: string;
    key: string;
    slug: string;
    name: string;
    description: string;
    kind: string;
    icon: string;
    color: string;
    difficulty: string;
    estimatedMinutes: number;
    xpReward: number;
    levelRequirement: number;
    learningObjectives: string[];
    hints: string[];
    badges: unknown;
    order: number;
    worldKey: string | null;
    worldSlug: string | null;
    worldName: string | null;
    worldColor: string | null;
    isBoss: boolean;
    rewardCoins: number;
    certificateTitle: string | null;
    bossBonusXp: number;
    bossBonusCoins: number;
  } | null;
  unlocked: boolean;
  unlockReason: string | null;
  levels: GameDetailLevel[];
  progress: { beaten: number; perfect: number; total: number; attempts: number; gameCompleted: boolean };
};

/** Load a single game with per-level lock state for the detail page. */
export async function loadGameDetail(userId: string, slug: string): Promise<GameDetailResult> {
  const perf = makePerf("game detail");
  const game = await prisma.game.findUnique({
    where: { slug },
    include: {
      levels: { where: { isActive: true }, orderBy: { order: "asc" }, include: { progress: { where: { userId } } } },
      world: { select: { key: true, slug: true, name: true, color: true } },
    },
  });
  if (!game) return { game: null, unlocked: false, unlockReason: null, levels: [], progress: { beaten: 0, perfect: 0, total: 0, attempts: 0, gameCompleted: false } };

  perf("game + levels + progress");
  const ctx = await buildUnlockContextFor(userId, [game.unlockCriteria as UnlockCriteria | null | undefined]);
  perf("user + unlock ctx (scoped)");
  const levelRequirementMet = ctx.level >= game.levelRequirement;
  const unlocked = levelRequirementMet && evaluateUnlock(game.unlockCriteria as never, ctx);
  const reason = !levelRequirementMet ? `Reach level ${game.levelRequirement}` : unlockReason(game.unlockCriteria as never);

  const progressMap = new Map<string, { status: string; bestScore: number; attempts: number; completedAt: Date | null }>();
  for (const l of game.levels) {
    for (const p of l.progress) progressMap.set(l.id, p);
  }
  const states = levelStates(game.levels, progressMap, unlocked);

  const levels: GameDetailLevel[] = game.levels.map((l) => {
    const p = progressMap.get(l.id);
    return {
      id: l.id,
      key: l.key,
      order: l.order,
      title: l.title,
      description: l.description,
      instructions: l.instructions,
      objectives: l.objectives as string[],
      hints: l.hints as string[],
      explanation: l.explanation,
      xpReward: l.xpReward,
      config: publicLevelConfig(game.kind, l.config as never),
      status: p?.status ?? GAME_LEVEL_STATUS.LOCKED,
      bestScore: p?.bestScore ?? 0,
      attempts: p?.attempts ?? 0,
      completedAt: p?.completedAt ?? null,
      unlocked: states.get(l.id)?.unlocked ?? false,
      unlockReason: states.get(l.id)?.reason ?? null,
    };
  });

  const beaten = levels.filter((l) => l.status === GAME_LEVEL_STATUS.BEATEN || l.status === GAME_LEVEL_STATUS.PERFECT).length;
  const perfect = levels.filter((l) => l.status === GAME_LEVEL_STATUS.PERFECT).length;
  const attempts = levels.reduce((s, l) => s + l.attempts, 0);

  return {
    game: {
      id: game.id,
      key: game.key,
      slug: game.slug,
      name: game.name,
      description: game.description,
      kind: game.kind,
      icon: game.icon,
      color: game.color,
      difficulty: game.difficulty,
      estimatedMinutes: game.estimatedMinutes,
      xpReward: game.xpReward,
      levelRequirement: game.levelRequirement,
      learningObjectives: game.learningObjectives as string[],
      hints: game.hints as string[],
      badges: game.badges,
      order: game.order,
      worldKey: game.world?.key ?? null,
      worldSlug: game.world?.slug ?? null,
      worldName: game.world?.name ?? null,
      worldColor: game.world?.color ?? null,
      isBoss: game.isBoss,
      rewardCoins: game.rewardCoins,
      certificateTitle: game.certificateTitle,
      bossBonusXp: WORLD.BOSS_XP_BONUS,
      bossBonusCoins: WORLD.BOSS_COINS_BONUS,
    },
    unlocked,
    unlockReason: reason,
    levels,
    progress: { beaten, perfect, total: game.levels.length, attempts, gameCompleted: beaten >= game.levels.length },
  };
}

/** Compute per-level lock state for a single game (sequential unlock). */export function levelStates(
  levels: { id: string; order: number }[],
  progressMap: Map<string, { status: string; bestScore: number; attempts: number; completedAt: Date | null }>,
  gameUnlocked: boolean
): Map<string, { unlocked: boolean; reason: string | null }> {
  const states = new Map<string, { unlocked: boolean; reason: string | null }>();
  let prevBeaten = true; // level 1 unlocks when the game is unlocked
  for (const level of [...levels].sort((a, b) => a.order - b.order)) {
    const p = progressMap.get(level.id);
    const beaten = p?.status === GAME_LEVEL_STATUS.BEATEN || p?.status === GAME_LEVEL_STATUS.PERFECT;
    states.set(level.id, {
      unlocked: gameUnlocked && (beaten || prevBeaten),
      reason: gameUnlocked ? (beaten || prevBeaten ? null : "Beat the previous level to unlock this one") : "Unlock the game first",
    });
    prevBeaten = beaten;
  }
  return states;
}

export type GameSubmissionResult = {
  passed: boolean;
  score: number;
  maxScore: number;
  ratio: number;
  perfect: boolean;
  feedback: string[];
  output?: string;
  firstBeat: boolean;
  xpAwarded: number;
  levelStatus: string;
  gameCompleted: boolean;
  achievements: AwardResult;
  award: XpAwardOutcome;
  boss: BossOutcome | null;
};

export async function submitGameLevel(
  userId: string,
  game: { id: string; key: string; name: string; slug: string; kind: string; worldId: string | null; isBoss: boolean; rewardCoins: number; certificateTitle?: string | null },
  level: { id: string; key: string; title: string; xpReward: number; config: unknown },
  submission: GameSubmission,
  seconds = 0
): Promise<GameSubmissionResult> {
  const result = gradeGameLevel(game.kind, level.config as never, submission);

  const existing = await prisma.gameProgress.findUnique({
    where: { userId_levelId: { userId, levelId: level.id } },
  });
  const alreadyBeaten = existing?.status === GAME_LEVEL_STATUS.BEATEN || existing?.status === GAME_LEVEL_STATUS.PERFECT;
  const wasPerfect = existing?.status === GAME_LEVEL_STATUS.PERFECT;

  let status: string;
  if (result.passed) {
    status = result.perfect || wasPerfect ? GAME_LEVEL_STATUS.PERFECT : GAME_LEVEL_STATUS.BEATEN;
  } else {
    status = GAME_LEVEL_STATUS.UNLOCKED;
  }

  const bestScore = Math.max(existing?.bestScore ?? 0, result.score);

  await prisma.gameProgress.upsert({
    where: { userId_levelId: { userId, levelId: level.id } },
    create: {
      userId,
      gameId: game.id,
      levelId: level.id,
      status,
      bestScore,
      attempts: 1,
      completedAt: result.passed ? new Date() : null,
    },
    update: {
      status,
      bestScore,
      attempts: (existing?.attempts ?? 0) + 1,
      completedAt: result.passed ? (existing?.completedAt ?? new Date()) : existing?.completedAt,
    },
  });

  let xpAwarded = 0;
  let award: XpAwardOutcome;
  const firstBeat = result.passed && !alreadyBeaten;

  if (firstBeat) {
    xpAwarded += level.xpReward + (result.perfect ? XP.GAME_PERFECT_BONUS : 0);
    await prisma.activity.create({
      data: {
        userId,
        type: ACTIVITY_TYPES.GAME_LEVEL_COMPLETED,
        data: { gameKey: game.key, gameName: game.name, levelKey: level.key, levelTitle: level.title, perfect: result.perfect, xp: xpAwarded },
      },
    });
    award = await awardXp(userId, {
      amount: xpAwarded,
      coins: COINS.GAME_LEVEL_COMPLETE + (result.perfect ? COINS.GAME_PERFECT_BONUS : 0),
      type: XP_TYPES.GAME_LEVEL,
      reason: `${game.name}: ${level.title}`,
      data: { gameKey: game.key, gameName: game.name, levelKey: level.key, levelTitle: level.title, perfect: result.perfect },
    });
    await progressMission(userId, MISSION_TYPES.PLAY_GAME, 1);
  } else if (result.passed && result.perfect && !wasPerfect) {
    // First time this already-beaten level is completed perfectly.
    xpAwarded = XP.GAME_PERFECT_BONUS;
    award = await awardXp(userId, {
      amount: xpAwarded,
      coins: COINS.GAME_PERFECT_BONUS,
      type: XP_TYPES.GAME_PERFECT,
      reason: `${game.name}: perfect level`,
      data: { gameKey: game.key, levelKey: level.key, levelTitle: level.title },
    });
  } else {
    const { level: lv, current, needed, progress } = levelFromXp((await prisma.user.findUnique({ where: { id: userId }, select: { xp: true } }))?.xp ?? 0);
    award = { xpAwarded: 0, coinsAwarded: 0, levelUpCoins: 0, currentXp: current, level: lv, leveledUp: false, gainedLevels: 0, progress, needed, newTitles: 0 };
  }

  if (result.passed && seconds > 0) {
    await recordStudyTime(userId, "game", Math.min(Math.max(Math.round(seconds), 5), 3600));
  }

  const achievements = await awardEligibleAchievements(userId);

  const [totalLevels, beatenLevels] = await Promise.all([
    prisma.gameLevel.count({ where: { gameId: game.id, isActive: true } }),
    prisma.gameProgress.count({ where: { userId, gameId: game.id, status: { in: [GAME_LEVEL_STATUS.BEATEN, GAME_LEVEL_STATUS.PERFECT] } } }),
  ]);
  const gameCompleted = result.passed && beatenLevels >= totalLevels;
  if (gameCompleted) {
    await prisma.activity.create({
      data: { userId, type: ACTIVITY_TYPES.GAME_COMPLETED, data: { gameKey: game.key, gameName: game.name } },
    });
  }

  // World hooks fire only once the game is actually completed. For single-level
  // boss games this is the same moment as the first beat; for multi-level bosses
  // the world-ending reward must wait until the whole gauntlet is finished.
  let boss: BossOutcome | null = null;
  if (gameCompleted && game.worldId) {
    if (game.isBoss) {
      boss = await handleBossDefeat(userId, { id: game.id, worldId: game.worldId, name: game.name, rewardCoins: game.rewardCoins, certificateTitle: game.certificateTitle ?? null }, result.perfect);
    } else {
      await recordWorldGame(userId, { id: game.id, worldId: game.worldId }, result.perfect);
    }
  }

  return {
    ...result,
    firstBeat,
    xpAwarded,
    levelStatus: status,
    gameCompleted,
    achievements,
    award,
    boss,
  };
}
