"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RarityBadge } from "@/components/progression/rarity-badge";
import { cn } from "@/lib/utils";

export type TitleItem = {
  title: {
    key: string;
    name: string;
    description: string;
    icon: string;
    rarity: string;
    unlockType: string;
    price: number;
  };
  owned: boolean;
  equipped: boolean;
};

export function TitlesClient({
  titles,
  equipped,
}: {
  titles: TitleItem[];
  equipped: TitleItem["title"] | null;
}) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setTitle(titleKey: string | null) {
    setBusyKey(titleKey ?? "none");
    setError(null);
    try {
      const res = await fetch("/api/progression/titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titleKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to equip title");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to equip title");
    } finally {
      setBusyKey(null);
    }
  }

  const owned = titles.filter((t) => t.owned);
  const locked = titles.filter((t) => !t.owned);

  return (
    <div className="space-y-6">
      {equipped && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <Crown className="h-5 w-5 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              Equipped title: {equipped.icon} {equipped.name}
            </p>
            <p className="text-xs text-muted-foreground">{equipped.description}</p>
          </div>
          <Button size="sm" variant="outline" disabled={busyKey === "none"} onClick={() => setTitle(null)}>
            Unequip
          </Button>
        </div>
      )}

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {owned.length === 0 && (
        <p className="text-sm text-muted-foreground">
          You have not earned any titles yet. Level up and complete achievements to collect them — or grab one in the{" "}
          <a href="/store" className="font-medium text-primary hover:underline">store</a>.
        </p>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Your titles ({owned.length})
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {owned.map((t) => {
            const busy = busyKey === t.title.key;
            return (
              <Card key={t.title.key} className={cn("relative overflow-hidden", t.equipped && "border-primary")}>
                <CardContent className="flex items-start gap-3 pt-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-xl">
                    {t.title.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold">{t.title.name}</p>
                      <RarityBadge rarity={t.title.rarity} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.title.description}</p>
                    <Button
                      size="sm"
                      variant={t.equipped ? "outline" : "secondary"}
                      className="mt-2"
                      disabled={busy || t.equipped}
                      onClick={() => setTitle(t.title.key)}
                    >
                      {busy ? "…" : t.equipped ? <><Check className="h-3.5 w-3.5" /> Equipped</> : "Equip"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {locked.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Not yet unlocked ({locked.length})
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {locked.map((t) => (
              <div key={t.title.key} className="flex items-center gap-3 rounded-lg border border-dashed bg-card/50 px-4 py-3 opacity-70">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-xl grayscale">
                  {t.title.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.title.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.title.unlockType === "level" && "Unlock type: Level"}
                    {t.title.unlockType === "xp" && "Unlock type: XP"}
                    {t.title.unlockType === "achievement" && "Unlock type: Achievement"}
                    {t.title.unlockType === "store" && `Buy in store — ${t.title.price} coins`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
