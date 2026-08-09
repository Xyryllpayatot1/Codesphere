import { Coins, Store } from "lucide-react";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isFeatureUnlocked, storeTierForLevel } from "@/lib/engine/levels";
import { StoreClient } from "@/components/store/store-client";

export const dynamic = "force-dynamic";

export default async function StorePage() {
  const session = await requireSession();

  const [user, items, owned, saleTitles, titleOwned] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.id }, select: { coins: true, level: true, xp: true, equipped: true } }),
    prisma.storeItem.findMany({ where: { isActive: true }, orderBy: [{ order: "asc" }] }),
    prisma.userPurchase.findMany({ where: { userId: session.id }, select: { itemId: true } }),
    prisma.title.findMany({ where: { isActive: true, unlockType: "store" }, orderBy: [{ price: "asc" }] }),
    prisma.userTitle.findMany({
      where: { userId: session.id, title: { unlockType: "store" } },
      select: { titleId: true },
    }),
  ]);

  const level = user?.level ?? 1;
  const unlocked = isFeatureUnlocked("store", level);
  const tier = storeTierForLevel(level);
  const ownedIds = new Set(owned.map((o) => o.itemId));
  const titleOwnedIds = new Set(titleOwned.map((t) => t.titleId));
  const tierIndex = ["COMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC"];
  const userTierIndex = tierIndex.indexOf(tier.max);

  const catalog = items.map((item) => {
    const itemIndex = tierIndex.indexOf(item.rarity);
    return {
      key: item.key,
      name: item.name,
      description: item.description,
      type: item.type,
      asset: typeof item.asset === "string" ? item.asset : JSON.stringify(item.asset ?? ""),
      price: item.price,
      rarity: item.rarity,
      minLevel: item.minLevel,
      owned: ownedIds.has(item.id),
      levelLocked: item.minLevel > level || itemIndex > userTierIndex,
    };
  });

  const lockedTiers = unlocked
    ? tierIndex.slice(userTierIndex + 1)
    : tierIndex.slice(1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Store className="h-6 w-6 text-primary" /> CodeCoin Store
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Spend CodeCoins earned through learning on cosmetics. Your balance:{" "}
          <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
            <Coins className="h-4 w-4" /> {user?.coins.toLocaleString() ?? 0}
          </span>
        </p>
      </div>

      {!unlocked ? (
        <p className="rounded-lg border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          The store unlocks at level 5 — keep learning to earn CodeCoins! You are currently level {level}.
        </p>
      ) : (
        <StoreClient
          coins={user?.coins ?? 0}
          equipped={(user?.equipped as Record<string, string> | null) ?? {}}
          items={catalog}
          saleTitles={saleTitles.map((t) => ({
            key: t.key,
            name: t.name,
            description: t.description,
            icon: t.icon,
            rarity: t.rarity,
            price: t.price,
            owned: titleOwnedIds.has(t.id),
            levelLocked: false,
          }))}
          lockedTiers={lockedTiers}
        />
      )}
    </div>
  );
}
