// ---------------------------------------------------------------------------
// Gamification: XP accounting and the Level 1–100 curve.
// Deterministic pure functions — no external state, easy to unit test.
//
// CURVE: xpForLevel(n) = (n - 1) * (25n + 50). This reproduces the original
// thresholds exactly for levels 1–20 (0, 100, 250, 450, 700, …) and extends
// the same quadratic ramp all the way to level 100 (252,450 total XP). The
// inverse is the closed-form solution of the quadratic — no table, no loops.
// ---------------------------------------------------------------------------

import { MAX_LEVEL, LEVEL_TITLE_BANDS } from "@/lib/constants";

export const LEVEL_CAP = MAX_LEVEL;

/** Total XP required to reach `level` (level 1 = 0, level cap = 100). */
export function xpForLevel(level: number): number {
  const n = Math.max(1, Math.min(LEVEL_CAP, Math.floor(level)));
  return (n - 1) * (25 * n + 50);
}

export function levelFromXp(totalXp: number): { level: number; current: number; needed: number; progress: number } {
  const x = Math.max(0, totalXp);
  // Solve 25n² + 25n − (50 + x) = 0  →  n = (−25 + √(5625 + 100x)) / 50
  let level = Math.floor((-25 + Math.sqrt(5625 + 100 * x)) / 50);
  level = Math.max(1, Math.min(LEVEL_CAP, level));
  const current = xpForLevel(level);
  const next = level >= LEVEL_CAP ? current : xpForLevel(level + 1);
  const span = next - current;
  const progress = span <= 0 ? 1 : Math.min(1, Math.max(0, (x - current) / span));
  return { level, current, needed: Math.max(0, next - x), progress };
}

/** Default milestone title at a level (the DB Title system refines this). */
export function levelTitle(level: number): string {
  let title = LEVEL_TITLE_BANDS[0].title;
  for (const band of LEVEL_TITLE_BANDS) {
    if (level >= band.level) title = band.title;
    else break;
  }
  return title;
}

/** Applies XP to a user object and returns { xp, level } with the delta. */
export function applyXp(currentXp: number, currentLevel: number, amount: number) {
  const xp = currentXp + amount;
  const { level, progress } = levelFromXp(xp);
  const leveledUp = level > currentLevel;
  return { xp, level, progress, leveledUp, gainedLevels: level - currentLevel };
}

export type XpAward = {
  amount: number;
  /** Short label shown in the XP toast, e.g. "Lesson completed". */
  reason: string;
};
