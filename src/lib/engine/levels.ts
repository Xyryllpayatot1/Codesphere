// ---------------------------------------------------------------------------
// Level perks — the "every level unlocks something meaningful" contract.
// Feature gating is enforced by the API/pages via isFeatureUnlocked; the map
// below is also what surfaces as "What you unlock next" on the profile.
// ---------------------------------------------------------------------------

import { FEATURES, LEVEL_TITLE_BANDS, MAX_LEVEL } from "@/lib/constants";

export type LevelUnlock = {
  feature: string;
  level: number;
  title: string;
  description: string;
  icon: string;
};

const FEATURE_DESCRIPTIONS: Record<string, { title: string; description: string; icon: string }> = {
  missions: { title: "Daily Missions", description: "Complete daily missions for CodeCoins and XP.", icon: "🎯" },
  leaderboards: { title: "Leaderboards", description: "Compete on daily, weekly and monthly XP leaderboards.", icon: "🏆" },
  store: { title: "CodeCoin Store", description: "Spend CodeCoins on profile frames, themes and cosmetics.", icon: "🛍️" },
  store_rare: { title: "Rare Store Tier", description: "Rare cosmetics become purchasable.", icon: "🔷" },
  store_epic: { title: "Epic Store Tier", description: "Epic cosmetics become purchasable.", icon: "💜" },
  store_legendary: { title: "Legendary Store Tier", description: "Legendary cosmetics become purchasable.", icon: "🌟" },
  store_mythic: { title: "Mythic Store Tier", description: "Mythic cosmetics become purchasable.", icon: "💎" },
  max_level: { title: "Level Cap", description: "Reach the top of the mountain. You are the myth.", icon: "👑" },
};

/** Every unlockable feature with the level that grants it. */
export const LEVEL_UNLOCKS: LevelUnlock[] = Object.values(FEATURES).map((spec) => ({
  feature: spec.key,
  level: spec.level,
  ...FEATURE_DESCRIPTIONS[spec.key],
}));

const FEATURE_LEVEL_BY_KEY: Record<string, number> = Object.values(FEATURES).reduce(
  (acc, spec) => {
    acc[spec.key] = spec.level;
    return acc;
  },
  {} as Record<string, number>
);

export function featureLevel(feature: string): number {
  return FEATURE_LEVEL_BY_KEY[feature] ?? 1;
}

export function isFeatureUnlocked(feature: string, level: number): boolean {
  return level >= featureLevel(feature);
}

/** All unlocks earned by `level`, newest first. */
export function unlocksAtLevel(level: number): LevelUnlock[] {
  return LEVEL_UNLOCKS.filter((u) => level >= u.level).sort((a, b) => b.level - a.level);
}

/** The next unlock a user is working toward (null at level cap). */
export function nextUnlock(level: number): LevelUnlock | null {
  if (level >= MAX_LEVEL) return null;
  return LEVEL_UNLOCKS.filter((u) => u.level > level).sort((a, b) => a.level - b.level)[0] ?? null;
}

/** Per-level cosmetic tier check (which store rarities the user may see). */
export function storeTierForLevel(level: number): { min: string; max: string } {
  if (level >= FEATURES.STORE_MYTHIC.level) return { min: "COMMON", max: "MYTHIC" };
  if (level >= FEATURES.STORE_LEGENDARY.level) return { min: "COMMON", max: "LEGENDARY" };
  if (level >= FEATURES.STORE_EPIC.level) return { min: "COMMON", max: "EPIC" };
  if (level >= FEATURES.STORE_RARE.level) return { min: "COMMON", max: "RARE" };
  return { min: "COMMON", max: "COMMON" };
}

/** Title suggestions earned by level — used to nudge users toward the Title system. */
export function titleSuggestion(level: number): string {
  let title = LEVEL_TITLE_BANDS[0].title;
  for (const band of LEVEL_TITLE_BANDS) {
    if (level >= band.level) title = band.title;
    else break;
  }
  return title;
}
