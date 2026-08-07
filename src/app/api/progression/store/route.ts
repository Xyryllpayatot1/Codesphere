import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { ApiError, handle } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { spendCoins } from "@/lib/engine/rewards";
import { isFeatureUnlocked, storeTierForLevel } from "@/lib/engine/levels";
import { grantPurchasedTitle } from "@/lib/engine/titles";
import { awardEligibleAchievements } from "@/lib/engine/achievements";
import { STORE_SLOTS } from "@/lib/constants";
import type { Prisma } from "@/generated/prisma/client";

const purchaseSchema = z.object({
  type: z.enum(["item", "title"]).default("item"),
  key: z.string().min(1).max(64),
});

const SLOT_SET = new Set<string>(Object.values(STORE_SLOTS));

export const GET = handle(async () => {
  const session = await requireSession();
  const [user, items, owned, saleTitles] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.id }, select: { coins: true, level: true, xp: true, equipped: true } }),
    prisma.storeItem.findMany({ where: { isActive: true }, orderBy: [{ order: "asc" }] }),
    prisma.userPurchase.findMany({ where: { userId: session.id }, select: { itemId: true } }),
    prisma.title.findMany({ where: { isActive: true, unlockType: "store" }, orderBy: [{ price: "asc" }] }),
  ]);

  const level = user?.level ?? 1;
  const unlocked = isFeatureUnlocked("store", level);
  const tier = storeTierForLevel(level);
  const ownedIds = new Set(owned.map((o) => o.itemId));
  const tierIndex = ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];
  const userTierIndex = tierIndex.indexOf(tier.max);

  const catalog = items.map((item) => {
    const itemIndex = tierIndex.indexOf(item.rarity);
    return {
      key: item.key,
      name: item.name,
      description: item.description,
      type: item.type,
      asset: item.asset,
      price: item.price,
      rarity: item.rarity,
      minLevel: item.minLevel,
      owned: ownedIds.has(item.id),
      levelLocked: item.minLevel > level || itemIndex > userTierIndex,
    };
  });

  const titleOwned = await prisma.userTitle.findMany({
    where: { userId: session.id, title: { unlockType: "store" } },
    select: { titleId: true },
  });
  const titleOwnedIds = new Set(titleOwned.map((t) => t.titleId));

  return {
    unlocked,
    unlockLevel: 5,
    level,
    coins: user?.coins ?? 0,
    equipped: (user?.equipped as Prisma.JsonObject | null) ?? null,
    tier,
    items: catalog,
    saleTitles: saleTitles.map((t) => ({
      key: t.key,
      name: t.name,
      description: t.description,
      icon: t.icon,
      rarity: t.rarity,
      price: t.price,
      owned: titleOwnedIds.has(t.id),
      levelLocked: false,
    })),
  };
});

export const POST = handle(async (req) => {
  const session = await requireSession();
  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { coins: true, level: true, xp: true } });
  const level = user?.level ?? 1;
  if (!isFeatureUnlocked("store", level)) throw new ApiError("The store unlocks at level 5", 403);

  const parsed = purchaseSchema.safeParse(await req.json());
  if (!parsed.success) throw new ApiError("Invalid request", 400);
  const { type, key } = parsed.data;

  if (type === "title") {
    const title = await prisma.title.findUnique({ where: { key } });
    if (!title || title.unlockType !== "store") throw new ApiError("Title not found", 404);

    const owned = await prisma.userTitle.findUnique({ where: { userId_titleId: { userId: session.id, titleId: title.id } } });
    if (owned) throw new ApiError("Title already owned", 409);

    const { balance } = await spendCoins(session.id, title.price, `Title: ${title.name}`, { titleKey: title.key });
    await grantPurchasedTitle(session.id, title.key);
    await awardEligibleAchievements(session.id);

    return { purchased: true, type: "title", key: title.key, name: title.name, coins: balance };
  }

  const item = await prisma.storeItem.findUnique({ where: { key } });
  if (!item || !item.isActive) throw new ApiError("Item not found", 404);

  const owned = await prisma.userPurchase.findUnique({ where: { userId_itemId: { userId: session.id, itemId: item.id } } });
  if (owned) throw new ApiError("Item already owned", 409);
  if (item.minLevel > level) throw new ApiError("Item is level locked", 403);

  const tier = storeTierForLevel(level);
  const tierIndex = ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];
  if (tierIndex.indexOf(item.rarity) > tierIndex.indexOf(tier.max)) throw new ApiError("Item rarity is not unlocked yet", 403);

  const { balance } = await spendCoins(session.id, item.price, `Item: ${item.name}`, { itemKey: item.key, type: item.type });
  await prisma.userPurchase.create({ data: { userId: session.id, itemId: item.id } });
  await awardEligibleAchievements(session.id);

  return { purchased: true, type: "item", key: item.key, name: item.name, slot: item.type, coins: balance };
});

/** Equip/unequip a cosmetic slot. Slots are store types (see STORE_SLOTS). */
export const PUT = handle(async (req) => {
  const session = await requireSession();
  const parsed = z
    .object({ slot: z.string().min(1), itemKey: z.string().min(1).nullable() })
    .safeParse(await req.json());
  if (!parsed.success) throw new ApiError("Invalid request", 400);
  const { slot, itemKey } = parsed.data;
  if (!SLOT_SET.has(slot)) throw new ApiError("Invalid slot", 400);

  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { equipped: true } });
  const equipped = { ...((user?.equipped as Prisma.JsonObject | null) ?? {}) };

  if (!itemKey) {
    delete equipped[slot];
    await prisma.user.update({ where: { id: session.id }, data: { equipped: equipped as Prisma.JsonObject } });
    return { equipped };
  }

  const item = await prisma.storeItem.findUnique({ where: { key: itemKey } });
  if (!item || item.type !== slot) throw new ApiError("Item not found for this slot", 400);
  const owned = await prisma.userPurchase.findUnique({ where: { userId_itemId: { userId: session.id, itemId: item.id } } });
  if (!owned) throw new ApiError("Item not owned", 403);

  equipped[slot] = itemKey;
  await prisma.user.update({ where: { id: session.id }, data: { equipped: equipped as Prisma.JsonObject } });

  return { equipped };
});
