// ---------------------------------------------------------------------------
// Game badge evaluation. Badges are pure data on the Game row; earned badges
// are derived from the player's per-level progress — nothing is persisted.
// ---------------------------------------------------------------------------

import type { GameBadge } from "@/lib/games/types";
import { GAME_LEVEL_STATUS } from "@/lib/constants";

export type LevelOutcome = {
  status: string; // LOCKED | UNLOCKED | BEATEN | PERFECT
};

export function evaluateGameBadges(
  badges: GameBadge[] | null | undefined,
  outcomes: LevelOutcome[]
): { badge: GameBadge; earned: boolean }[] {
  if (!badges || badges.length === 0) return [];
  const beaten = outcomes.filter((o) => o.status === GAME_LEVEL_STATUS.BEATEN || o.status === GAME_LEVEL_STATUS.PERFECT);
  const perfectCount = outcomes.filter((o) => o.status === GAME_LEVEL_STATUS.PERFECT).length;
  const allDone = outcomes.length > 0 && beaten.length === outcomes.length;

  return badges.map((badge) => {
    let earned = false;
    switch (badge.requirement) {
      case "beat":
        earned = allDone;
        break;
      case "perfect":
        earned = perfectCount >= 1;
        break;
      case "allPerfect":
        earned = outcomes.length > 0 && perfectCount === outcomes.length;
        break;
    }
    return { badge, earned };
  });
}
