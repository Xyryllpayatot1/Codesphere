"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export type AdminWorld = {
  id: string;
  key: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  difficulty: string;
  order: number;
  rewardXp: number;
  rewardCoins: number;
  isActive: boolean;
  courseSlugs: string[];
  unlockCriteria: Record<string, unknown> | null;
  masteryConfig: Record<string, unknown> | null;
  gamesCount: number;
  bossGame: { id: string; name: string } | null;
};

type AdminWorldManagerProps = {
  worlds: AdminWorld[];
  gamesByWorld: Record<string, { id: string; key: string; name: string }[]>;
};

function WorldEditor({ world, games }: { world: AdminWorld; games: { id: string; key: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const [name, setName] = useState(world.name);
  const [description, setDescription] = useState(world.description);
  const [icon, setIcon] = useState(world.icon);
  const [color, setColor] = useState(world.color);
  const [difficulty, setDifficulty] = useState(world.difficulty);
  const [order, setOrder] = useState(String(world.order));
  const [rewardXp, setRewardXp] = useState(String(world.rewardXp));
  const [rewardCoins, setRewardCoins] = useState(String(world.rewardCoins));
  const [isActive, setIsActive] = useState(world.isActive);
  const [courseSlugs, setCourseSlugs] = useState(world.courseSlugs.join(", "));
  const [unlockCriteria, setUnlockCriteria] = useState(
    world.unlockCriteria ? JSON.stringify(world.unlockCriteria, null, 2) : ""
  );
  const [masteryConfig, setMasteryConfig] = useState(
    world.masteryConfig ? JSON.stringify(world.masteryConfig, null, 2) : ""
  );
  const [bossGameId, setBossGameId] = useState(world.bossGame?.id ?? "");

  function parseJson(text: string, label: string): Record<string, unknown> | null {
    if (!text.trim()) return null;
    try {
      const value = JSON.parse(text);
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        throw new Error(`${label} must be a JSON object`);
      }
      return value;
    } catch {
      throw new Error(`${label} must be valid JSON`);
    }
  }

  async function save() {
    setError(null);
    setSaved(null);
    let unlockJson: Record<string, unknown> | null = null;
    let configJson: Record<string, unknown> | null = null;
    try {
      unlockJson = parseJson(unlockCriteria, "Unlock criteria");
      configJson = parseJson(masteryConfig, "Mastery config");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid input");
      return;
    }

    const slugs = courseSlugs
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/worlds/${world.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          icon,
          color,
          difficulty,
          order: Math.max(0, parseInt(order, 10) || 0),
          rewardXp: Math.max(0, parseInt(rewardXp, 10) || 0),
          rewardCoins: Math.max(0, parseInt(rewardCoins, 10) || 0),
          isActive,
          courseSlugs: slugs,
          unlockCriteria: unlockJson,
          masteryConfig: configJson,
          bossGameId: bossGameId || null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to save");
      }
      setSaved("Saved");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
          style={{ backgroundColor: `${world.color}22`, color: world.color }}
        >
          {world.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{world.name}</span>
            <Badge variant="outline" className="font-mono text-[10px]">{world.key}</Badge>
            {!world.isActive && <Badge variant="destructive" className="text-[10px]">INACTIVE</Badge>}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            #{world.order} · {world.difficulty.toLowerCase()} · {world.gamesCount} game{world.gamesCount === 1 ? "" : "s"}
            {world.bossGame ? ` · boss: ${world.bossGame.name}` : " · no boss"}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-border p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor={`name-${world.id}`}>Name</Label>
              <Input id={`name-${world.id}`} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor={`icon-${world.id}`}>Icon (emoji)</Label>
              <Input id={`icon-${world.id}`} value={icon} onChange={(e) => setIcon(e.target.value)} />
            </div>
            <div>
              <Label htmlFor={`color-${world.id}`}>Color (hex)</Label>
              <Input id={`color-${world.id}`} value={color} onChange={(e) => setColor(e.target.value)} placeholder="#6366f1" />
            </div>
            <div>
              <Label htmlFor={`difficulty-${world.id}`}>Difficulty</Label>
              <select
                id={`difficulty-${world.id}`}
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>
            <div>
              <Label htmlFor={`order-${world.id}`}>Order</Label>
              <Input id={`order-${world.id}`} type="number" min={0} value={order} onChange={(e) => setOrder(e.target.value)} />
            </div>
            <div>
              <Label htmlFor={`rewardXp-${world.id}`}>Certificate XP</Label>
              <Input id={`rewardXp-${world.id}`} type="number" min={0} value={rewardXp} onChange={(e) => setRewardXp(e.target.value)} />
            </div>
            <div>
              <Label htmlFor={`rewardCoins-${world.id}`}>Certificate coins</Label>
              <Input id={`rewardCoins-${world.id}`} type="number" min={0} value={rewardCoins} onChange={(e) => setRewardCoins(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4"
              />
              Active
            </label>
          </div>

          <div>
            <Label htmlFor={`desc-${world.id}`}>Description</Label>
            <Input id={`desc-${world.id}`} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div>
            <Label htmlFor={`courses-${world.id}`}>
              Course slugs (comma-separated) <span className="font-normal text-muted-foreground">— feed mastery</span>
            </Label>
            <Input id={`courses-${world.id}`} value={courseSlugs} onChange={(e) => setCourseSlugs(e.target.value)} placeholder="html, css, javascript" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor={`boss-${world.id}`}>Boss game</Label>
              <select
                id={`boss-${world.id}`}
                value={bossGameId}
                onChange={(e) => setBossGameId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">— none —</option>
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.key})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">Beating the boss unlocks the next world.</p>
            </div>
            <div>
              <Label htmlFor={`unlock-${world.id}`}>Unlock criteria (JSON)</Label>
              <textarea
                id={`unlock-${world.id}`}
                value={unlockCriteria}
                onChange={(e) => setUnlockCriteria(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs shadow-sm"
                placeholder='{"kind":"worldCompleted","worldKey":"html"}'
              />
            </div>
          </div>

          <div>
            <Label htmlFor={`mastery-${world.id}`}>Mastery config (JSON, optional — defaults apply)</Label>
            <textarea
              id={`mastery-${world.id}`}
              value={masteryConfig}
              onChange={(e) => setMasteryConfig(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs shadow-sm"
              placeholder='{"gameWeight":20,"bossWeight":25}'
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {saved && <p className="text-sm text-success">{saved}</p>}

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              slug: <span className="font-mono">{world.slug}</span>
            </p>
            <Button size="sm" onClick={save} disabled={busy}>
              <Save className="h-3.5 w-3.5" /> {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminWorldManager({ worlds, gamesByWorld }: AdminWorldManagerProps) {
  return (
    <div className="space-y-3">
      {worlds.length === 0 ? (
        <p className="text-sm text-muted-foreground">No worlds defined yet.</p>
      ) : (
        worlds.map((w) => (
          <WorldEditor key={w.id} world={w} games={gamesByWorld[w.id] ?? []} />
        ))
      )}
    </div>
  );
}
