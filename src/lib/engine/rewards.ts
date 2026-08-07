// ---------------------------------------------------------------------------
// Reward pipeline — the single funnel for every XP and CodeCoin award.
//
// XP:  awarded, ledgered in XpTransaction, never spent. Total XP drives the
//      Level 1–100 curve; crossing a level boundary mints a level-up CodeCoin
//      bonus and unlocks any level/XP titles now reached.
// COINS: the spendable currency. Earned through learning + level-ups, spent
//      only in the store (spendCoins). Never purchasable with real money.
//
// All side effects (mission progress, title unlocks) happen AFTER the ledger
// transaction commits so a failed award never leaves a partial ledger row.
// ---------------------------------------------------------------------------

import "server-only";

import { prisma } from "@/lib/prisma";
import { levelFromXp } from "@/lib/engine/xp";
import { COINS, XP_TYPES, ACTIVITY_TYPES } from "@/lib/constants";
import { progressMission } from "@/lib/engine/missions";
import { unlockEligibleTitles } from "@/lib/engine/titles";

export type XpRewardInput = {
  amount: number;
  type: string;
  reason: string;
  coins?: number;
  data?: Record<string, unknown>;
  /** Skip earn_xp mission progress (used when the reward itself is a mission). */
  skipMissionProgress?: boolean;
};

export type XpAwardOutcome = {
  xpAwarded: number;
  coinsAwarded: number;
  levelUpCoins: number;
  currentXp: number;
  level: number;
  leveledUp: boolean;
  gainedLevels: number;
  progress: number;
  needed: number;
  newTitles: number;
};

export type CoinAwardInput = {
  amount: number;
  type: string;
  reason: string;
  data?: Record<string, unknown>;
};

/** Awards XP (and optionally CodeCoins), mints level-up bonuses and unlocks titles. */
export async function awardXp(userId: string, input: XpRewardInput): Promise<XpAwardOutcome> {
  const amount = Math.floor(input.amount);
  if (amount <= 0) {
    const { level, current, needed, progress } = levelFromXp((await prisma.user.findUnique({ where: { id: userId }, select: { xp: true } }))?.xp ?? 0);
    return { xpAwarded: 0, coinsAwarded: 0, levelUpCoins: 0, currentXp: current, level, leveledUp: false, gainedLevels: 0, progress, needed, newTitles: 0 };
  }

  const coinAmount = Math.floor(input.coins ?? 0);

  const outcome = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { xp: true, level: true, coins: true } });
    if (!user) throw new Error("User not found");

    const newXp = user.xp + amount;
    const { level, needed, progress } = levelFromXp(newXp);
    const leveledUp = level > user.level;
    const gainedLevels = level - user.level;

    let levelUpCoins = 0;
    if (leveledUp) {
      for (let l = user.level + 1; l <= level; l++) levelUpCoins += COINS.LEVEL_UP * l;
    }

    const coinDelta = coinAmount + levelUpCoins;
    const newCoins = user.coins + coinDelta;

    await tx.user.update({
      where: { id: userId },
      data: {
        xp: newXp,
        level,
        coins: newCoins,
        ...(coinDelta > 0 ? { totalCoinsEarned: { increment: coinDelta } } : {}),
      },
    });

    await tx.xpTransaction.create({
      data: { userId, amount, type: input.type, reason: input.reason, data: (input.data ?? undefined) as never },
    });

    if (coinAmount > 0) {
      await tx.coinTransaction.create({
        data: { userId, amount: coinAmount, type: input.type, reason: input.reason, data: (input.data ?? undefined) as never },
      });
    }
    if (levelUpCoins > 0) {
      await tx.coinTransaction.create({
        data: { userId, amount: levelUpCoins, type: XP_TYPES.LEVEL_UP, reason: `Level ${level} reward`, data: { level, gained: gainedLevels } },
      });
    }
    if (leveledUp) {
      await tx.activity.create({
        data: { userId, type: ACTIVITY_TYPES.LEVEL_UP, data: { level, gained: gainedLevels, coins: levelUpCoins } },
      });
    }

    return { currentXp: newXp, level, progress, needed, leveledUp, gainedLevels, levelUpCoins };
  });

  if (!input.skipMissionProgress) await progressMission(userId, "earn_xp", amount);
  const titles = outcome.leveledUp ? await unlockEligibleTitles(userId) : { count: 0 };

  return {
    xpAwarded: amount,
    coinsAwarded: coinAmount + outcome.levelUpCoins,
    levelUpCoins: outcome.levelUpCoins,
    currentXp: outcome.currentXp,
    level: outcome.level,
    leveledUp: outcome.leveledUp,
    gainedLevels: outcome.gainedLevels,
    progress: outcome.progress,
    needed: outcome.needed,
    newTitles: titles.count,
  };
}

/** Awards CodeCoins without XP (mission claims, streak milestones, etc.). */
export async function awardCoins(userId: string, input: CoinAwardInput): Promise<void> {
  const amount = Math.floor(input.amount);
  if (amount <= 0) return;

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { coins: true } });
    if (!user) throw new Error("User not found");
    await tx.user.update({
      where: { id: userId },
      data: { coins: user.coins + amount, totalCoinsEarned: { increment: amount } },
    });
    await tx.coinTransaction.create({
      data: { userId, amount, type: input.type, reason: input.reason, data: (input.data ?? undefined) as never },
    });
  });
}

/** Deducts CodeCoins for a store purchase. Throws when the balance is too low. */
export async function spendCoins(userId: string, amount: number, reason: string, data?: Record<string, unknown>): Promise<{ balance: number }> {
  const price = Math.floor(amount);
  if (price <= 0) throw new Error("Invalid amount");

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { coins: true } });
    if (!user) throw new Error("User not found");
    if (user.coins < price) throw new Error("Not enough CodeCoins");

    const balance = user.coins - price;
    await tx.user.update({ where: { id: userId }, data: { coins: balance } });
    await tx.coinTransaction.create({
      data: { userId, amount: -price, type: XP_TYPES.STORE_PURCHASE, reason, data: (data ?? undefined) as never },
    });
    return { balance };
  });

  return result;
}
