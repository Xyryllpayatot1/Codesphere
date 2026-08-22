// ---------------------------------------------------------------------------
// Reward pipeline — the single funnel for every XP and CodeCoin award.
//
// XP:  awarded, ledgered in XpTransaction, never spent. Total XP drives the
//      Level 1–100 curve; crossing a level boundary mints a level-up CodeCoin
//      bonus and unlocks any level/XP titles now reached.
// COINS: the spendable currency. Earned through learning + level-ups, spent
//      only in the store (spendCoins). Never purchasable with real money.
//
// Concurrency: balances change via SQL-level increments, never read-modify-
// write, so concurrent awards cannot lose updates. The level-up bonus uses a
// conditional update (level < newLevel) so exactly one concurrent award claims
// it. All side effects (mission progress, title unlocks) happen AFTER the
// ledger transaction commits so a failed award never leaves a partial row.
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
    // Single atomic increment — no lost updates under concurrency.
    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        xp: { increment: amount },
        ...(coinAmount > 0
          ? { coins: { increment: coinAmount }, totalCoinsEarned: { increment: coinAmount } }
          : {}),
      },
      select: { xp: true, level: true },
    });

    const { level, needed, progress } = levelFromXp(updated.xp);
    const gainedLevels = level - updated.level;

    let levelUpCoins = 0;
    for (let l = updated.level + 1; l <= level; l++) levelUpCoins += COINS.LEVEL_UP * l;

    let claimedLevelUp = false;
    if (gainedLevels > 0) {
      // Conditional claim: only the transaction that still sees the old level
      // applies it — concurrent awards can never double-mint the bonus.
      const claimed = await tx.user.updateMany({
        where: { id: userId, level: { lt: level } },
        data: {
          level,
          ...(levelUpCoins > 0
            ? { coins: { increment: levelUpCoins }, totalCoinsEarned: { increment: levelUpCoins } }
            : {}),
        },
      });
      claimedLevelUp = claimed.count > 0;
    }

    await tx.xpTransaction.create({
      data: { userId, amount, type: input.type, reason: input.reason, data: (input.data ?? undefined) as never },
    });

    if (coinAmount > 0) {
      await tx.coinTransaction.create({
        data: { userId, amount: coinAmount, type: input.type, reason: input.reason, data: (input.data ?? undefined) as never },
      });
    }
    if (claimedLevelUp && levelUpCoins > 0) {
      await tx.coinTransaction.create({
        data: { userId, amount: levelUpCoins, type: XP_TYPES.LEVEL_UP, reason: `Level ${level} reward`, data: { level, gained: gainedLevels } },
      });
    }
    if (claimedLevelUp) {
      await tx.activity.create({
        data: { userId, type: ACTIVITY_TYPES.LEVEL_UP, data: { level, gained: gainedLevels, coins: levelUpCoins } },
      });
    }

    const effectiveLevelUpCoins = claimedLevelUp ? levelUpCoins : 0;
    return {
      currentXp: updated.xp,
      level,
      leveledUp: claimedLevelUp,
      gainedLevels: claimedLevelUp ? gainedLevels : 0,
      levelUpCoins: effectiveLevelUpCoins,
      progress,
      needed,
    };
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

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { coins: { increment: amount }, totalCoinsEarned: { increment: amount } },
    }),
    prisma.coinTransaction.create({
      data: { userId, amount, type: input.type, reason: input.reason, data: (input.data ?? undefined) as never },
    }),
  ]);
}

/** Deducts CodeCoins for a store purchase. Throws when the balance is too low. */
export async function spendCoins(userId: string, amount: number, reason: string, data?: Record<string, unknown>): Promise<{ balance: number }> {
  const price = Math.floor(amount);
  if (price <= 0) throw new Error("Invalid amount");

  // Atomic conditional debit: the row is only updated when the balance covers
  // the price, so concurrent purchases cannot overdraw.
  const claimed = await prisma.user.updateMany({
    where: { id: userId, coins: { gte: price } },
    data: { coins: { decrement: price } },
  });
  if (claimed.count === 0) {
    const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!exists) throw new Error("User not found");
    throw new Error("Not enough CodeCoins");
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { coins: true } });
  await prisma.coinTransaction.create({
    data: { userId, amount: -price, type: XP_TYPES.STORE_PURCHASE, reason, data: (data ?? undefined) as never },
  });
  return { balance: user?.coins ?? 0 };
}
