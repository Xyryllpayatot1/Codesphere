import Link from "next/link";
import { Clock, Lock, Medal, Play, Skull } from "lucide-react";
import { GAME_KIND_META, GAME_KINDS } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type GameCardData = {
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
  unlocked: boolean;
  unlockReason: string | null;
  progress: { beaten: number; perfect: number; total: number; attempts: number };
  worldKey: string | null;
  worldSlug: string | null;
  worldName: string | null;
  worldColor: string | null;
  isBoss: boolean;
  rewardCoins: number;
};

const KIND_LABEL: Record<string, string> = {
  [GAME_KINDS.HTML_BUILDER]: GAME_KIND_META[GAME_KINDS.HTML_BUILDER].short,
  [GAME_KINDS.CSS_PAINTER]: GAME_KIND_META[GAME_KINDS.CSS_PAINTER].short,
  [GAME_KINDS.JS_LOGIC]: GAME_KIND_META[GAME_KINDS.JS_LOGIC].short,
  [GAME_KINDS.BUG_HUNTER]: GAME_KIND_META[GAME_KINDS.BUG_HUNTER].short,
  [GAME_KINDS.CYBER_ESCAPE]: GAME_KIND_META[GAME_KINDS.CYBER_ESCAPE].short,
  [GAME_KINDS.WEBSITE_BUILDER]: GAME_KIND_META[GAME_KINDS.WEBSITE_BUILDER].short,
};

export function GameCard({ game }: { game: GameCardData }) {
  const pct = game.progress.total > 0 ? Math.round((game.progress.beaten / game.progress.total) * 100) : 0;
  return (
    <Link href={game.unlocked ? `/games/${game.slug}` : "#"} className="group block h-full">
      <Card className={cn("h-full transition hover:border-primary/50 hover:shadow-md", !game.unlocked && "opacity-90")}>
        <CardContent className="flex h-full flex-col gap-3 p-5">
          <div className="flex items-start justify-between">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
              style={{ backgroundColor: `${game.color}1a` }}
              aria-hidden
            >
              {game.unlocked ? game.icon : <Lock className="h-5 w-5 text-muted-foreground" />}
            </span>
            <div className="flex flex-wrap items-center justify-end gap-1">
              {game.worldName && (
                <span
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold"
                  style={{ backgroundColor: `${game.worldColor ?? "#6366f1"}1a`, color: game.worldColor ?? "#6366f1" }}
                >
                  {game.worldName}
                </span>
              )}
              {game.isBoss ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-warning/10 px-2 py-0.5 text-[11px] font-bold text-warning">
                  <Skull className="h-3 w-3" /> BOSS
                </span>
              ) : (
                <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {KIND_LABEL[game.kind] ?? game.kind}
                </span>
              )}
            </div>
          </div>

          <div className="flex-1">
            <h3 className="font-semibold">{game.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{game.description}</p>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{game.estimatedMinutes} min</span>
            <span className="inline-flex items-center gap-1"><Medal className="h-3.5 w-3.5" />{game.xpReward} XP{game.rewardCoins > 0 ? ` · ${game.rewardCoins} coins` : ""}</span>
            <span>{game.difficulty.toLowerCase()}</span>
          </div>

          {game.unlocked ? (
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{game.progress.beaten}/{game.progress.total} levels</span>
                <span className="text-muted-foreground">{pct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs">
              <span className="text-muted-foreground">{game.unlockReason ?? "Locked"}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-sm font-semibold text-primary">
            {game.unlocked ? (
              <>
                <Play className="h-4 w-4" /> Play now
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5" /> Locked
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
