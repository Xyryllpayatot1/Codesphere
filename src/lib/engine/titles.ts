// ---------------------------------------------------------------------------
// Title system — collectible rank titles with rarity, earned through levels,
// XP milestones, achievements, or purchased with CodeCoins. One title can be
// equipped at a time and is shown next to the username.
// ---------------------------------------------------------------------------

import "server-only";

import { prisma } from "@/lib/prisma";
import { ACTIVITY_TYPES } from "@/lib/constants";

export type TitleInfo = {
  key: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  unlockType: string;
  price: number;
};

export type TitleState = {
  title: TitleInfo;
  owned: boolean;
  equipped: boolean;
};

/** Unlock every level- and XP-threshold title the user has now reached. */
export async function unlockEligibleTitles(userId: string): Promise<{ unlocked: TitleInfo[]; count: number }> {
  const [user, owned] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { xp: true, level: true } }),
    prisma.userTitle.findMany({ where: { userId }, select: { titleId: true } }),
  ]);
  if (!user) return { unlocked: [], count: 0 };

  const ownedIds = new Set(owned.map((o) => o.titleId));
  const candidates = await prisma.title.findMany({
    where: { isActive: true, unlockType: { in: ["level", "xp"] } },
  });

  const toUnlock = candidates.filter(
    (t) =>
      !ownedIds.has(t.id) &&
      (t.unlockType === "level" ? user.level >= t.unlockValue : user.xp >= t.unlockValue)
  );

  if (toUnlock.length === 0) return { unlocked: [], count: 0 };

  await prisma.$transaction([
    prisma.userTitle.createMany({ data: toUnlock.map((t) => ({ userId, titleId: t.id })) }),
    prisma.activity.createMany({
      data: toUnlock.map((t) => ({
        userId,
        type: ACTIVITY_TYPES.TITLE_EARNED,
        data: { titleKey: t.key, titleName: t.name, rarity: t.rarity },
      })),
    }),
  ]);

  return {
    unlocked: toUnlock.map((t) => ({ key: t.key, name: t.name, description: t.description, icon: t.icon, rarity: t.rarity, unlockType: t.unlockType, price: t.price })),
    count: toUnlock.length,
  };
}

/** Unlock achievement-backed titles right after their achievement is earned. */
export async function unlockTitlesFromAchievements(userId: string, achievementKeys: string[]): Promise<{ unlocked: TitleInfo[]; count: number }> {
  if (achievementKeys.length === 0) return { unlocked: [], count: 0 };

  const [titles, owned] = await Promise.all([
    prisma.title.findMany({ where: { isActive: true, unlockType: "achievement", achievementKey: { in: achievementKeys } } }),
    prisma.userTitle.findMany({ where: { userId }, select: { titleId: true } }),
  ]);

  const ownedIds = new Set(owned.map((o) => o.titleId));
  const toUnlock = titles.filter((t) => !ownedIds.has(t.id));
  if (toUnlock.length === 0) return { unlocked: [], count: 0 };

  await prisma.$transaction([
    prisma.userTitle.createMany({ data: toUnlock.map((t) => ({ userId, titleId: t.id })) }),
    prisma.activity.createMany({
      data: toUnlock.map((t) => ({
        userId,
        type: ACTIVITY_TYPES.TITLE_EARNED,
        data: { titleKey: t.key, titleName: t.name, rarity: t.rarity },
      })),
    }),
  ]);

  return {
    unlocked: toUnlock.map((t) => ({ key: t.key, name: t.name, description: t.description, icon: t.icon, rarity: t.rarity, unlockType: t.unlockType, price: t.price })),
    count: toUnlock.length,
  };
}

/** Grant a store-bought title after purchase (validated by the caller). */
export async function grantPurchasedTitle(userId: string, titleKey: string): Promise<void> {
  const title = await prisma.title.findUnique({ where: { key: titleKey } });
  if (!title || title.unlockType !== "store") return;
  await prisma.userTitle.upsert({
    where: { userId_titleId: { userId, titleId: title.id } },
    create: { userId, titleId: title.id },
    update: {},
  });
}

export async function loadUserTitles(userId: string): Promise<{ titles: TitleState[]; equippedKey: string | null; equipped: TitleInfo | null }> {
  const [user, owned] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { titleId: true } }),
    prisma.userTitle.findMany({ where: { userId }, select: { titleId: true } }),
  ]);
  const ownedIds = new Set(owned.map((o) => o.titleId));

  const [titles, equippedRow] = await Promise.all([
    prisma.title.findMany({ where: { isActive: true }, orderBy: [{ order: "asc" }] }),
    user?.titleId ? prisma.title.findUnique({ where: { id: user.titleId } }) : Promise.resolve(null),
  ]);

  const list = titles.map((t) => ({
    title: { key: t.key, name: t.name, description: t.description, icon: t.icon, rarity: t.rarity, unlockType: t.unlockType, price: t.price },
    owned: ownedIds.has(t.id),
    equipped: user?.titleId === t.id,
  }));

  return {
    titles: list,
    equippedKey: user?.titleId ? (equippedRow?.key ?? null) : null,
    equipped: equippedRow
      ? { key: equippedRow.key, name: equippedRow.name, description: equippedRow.description, icon: equippedRow.icon, rarity: equippedRow.rarity, unlockType: equippedRow.unlockType, price: equippedRow.price }
      : null,
  };
}

/** Equip an owned title (or null to unequip). Throws on an unowned title. */
export async function equipTitle(userId: string, titleKey: string | null): Promise<TitleInfo | null> {
  if (!titleKey) {
    await prisma.user.update({ where: { id: userId }, data: { titleId: null } });
    return null;
  }

  const title = await prisma.title.findUnique({ where: { key: titleKey } });
  if (!title) throw new Error("Title not found");
  const owned = await prisma.userTitle.findUnique({ where: { userId_titleId: { userId, titleId: title.id } } });
  if (!owned) throw new Error("Title not owned");

  await prisma.user.update({ where: { id: userId }, data: { titleId: title.id } });
  return { key: title.key, name: title.name, description: title.description, icon: title.icon, rarity: title.rarity, unlockType: title.unlockType, price: title.price };
}
