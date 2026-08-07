"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ShoppingCart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RarityBadge } from "@/components/progression/rarity-badge";
import { cn } from "@/lib/utils";

export type StoreItemView = {
  key: string;
  name: string;
  description: string;
  type: string;
  asset: string;
  price: number;
  rarity: string;
  minLevel: number;
  owned: boolean;
  levelLocked: boolean;
};

export type StoreTitleView = {
  key: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  price: number;
  owned: boolean;
  levelLocked: boolean;
};

export function StoreClient({
  coins,
  equipped,
  items,
  saleTitles,
  lockedTiers,
}: {
  coins: number;
  equipped: Record<string, string>;
  items: StoreItemView[];
  saleTitles: StoreTitleView[];
  lockedTiers: string[];
}) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [equippedState, setEquippedState] = useState<Record<string, string>>(equipped);
  const [coinBalance, setCoinBalance] = useState(coins);

  async function purchase(type: "item" | "title", key: string) {
    setBusyKey(`${type}:${key}`);
    setError(null);
    try {
      const res = await fetch("/api/progression/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, key }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Purchase failed");
      setCoinBalance(data.coins);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setBusyKey(null);
    }
  }

  async function equip(slot: string, itemKey: string | null) {
    setBusyKey(`equip:${slot}:${itemKey ?? "none"}`);
    setError(null);
    try {
      const res = await fetch("/api/progression/store", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, itemKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to equip");
      setEquippedState(data.equipped);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to equip");
    } finally {
      setBusyKey(null);
    }
  }

  function renderItem(item: StoreItemView) {
    const busy = busyKey === `item:${item.key}` || busyKey === `equip:${item.type}:${item.key}`;
    const equippedHere = equippedState[item.type] === item.key;
    return (
      <Card key={item.key} className={cn("relative overflow-hidden", equippedHere && "border-primary")}>
        <CardContent className="flex flex-col items-start gap-3 pt-5">
          <div className="flex w-full items-start justify-between">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-2xl">
              {item.asset}
            </span>
            <RarityBadge rarity={item.rarity} />
          </div>
          <div>
            <h3 className="font-semibold">{item.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
          </div>
          {item.minLevel > 0 && (
            <p className="text-[11px] text-muted-foreground">Requires level {item.minLevel}</p>
          )}
          {item.owned ? (
            equippedHere ? (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                disabled={busy}
                onClick={() => equip(item.type, null)}
              >
                <Check className="h-3.5 w-3.5" /> Equipped
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                className="w-full"
                disabled={busy}
                onClick={() => equip(item.type, item.key)}
              >
                <Sparkles className="h-3.5 w-3.5" /> Equip
              </Button>
            )
          ) : (
            <Button
              size="sm"
              className="w-full"
              disabled={busy || item.levelLocked || coinBalance < item.price}
              onClick={() => purchase("item", item.key)}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              {item.levelLocked
                ? "Level locked"
                : coinBalance < item.price
                  ? `Need ${item.price - coinBalance} more`
                  : `${item.price} coins`}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Cosmetics</h2>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing in the store right now.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map(renderItem)}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Collectible Titles</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {saleTitles.map((t) => {
            const busy = busyKey === `title:${t.key}`;
            return (
              <Card key={t.key} className="relative overflow-hidden">
                <CardContent className="flex flex-col items-start gap-3 pt-5">
                  <div className="flex w-full items-start justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-2xl">
                      {t.icon}
                    </span>
                    <RarityBadge rarity={t.rarity} />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                  </div>
                  {t.owned ? (
                    <Button size="sm" variant="outline" className="w-full" disabled>
                      <Check className="h-3.5 w-3.5" /> Owned
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={busy || coinBalance < t.price}
                      onClick={() => purchase("title", t.key)}
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      {coinBalance < t.price ? `Need ${t.price - coinBalance} more` : `${t.price} coins`}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {lockedTiers.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Rarity tiers you have not reached yet: {lockedTiers.join(" · ")}. Rarer items unlock as you level up.
        </p>
      )}
    </div>
  );
}
