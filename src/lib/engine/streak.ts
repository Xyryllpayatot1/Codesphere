// ---------------------------------------------------------------------------
// Streak engine. Pure date logic — a streak continues when the user studies on
// consecutive calendar days, resets otherwise. No AI, no timezone ambiguity:
// all keys are local YYYY-MM-DD.
// ---------------------------------------------------------------------------

import { toDateKey } from "@/lib/utils";

export type StreakUpdate = {
  streak: number;
  longestStreak: number;
  /** True when the user studied on a new day (used to gate daily rewards). */
  newDay: boolean;
  /** True when streak continues (studied today or yesterday). */
  continued: boolean;
};

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365];

export function nextStreakMilestone(streak: number): number | null {
  const next = STREAK_MILESTONES.find((m) => m > streak);
  return next ?? null;
}

export function updateStreak(
  currentStreak: number,
  longestStreak: number,
  lastActiveAt: Date | null,
  now: Date = new Date()
): StreakUpdate {
  const today = toDateKey(now);
  const todayDate = new Date(now);
  todayDate.setHours(0, 0, 0, 0);
  const yesterday = toDateKey(new Date(todayDate.getTime() - 86400000));

  if (!lastActiveAt) {
    return { streak: 1, longestStreak: Math.max(longestStreak, 1), newDay: true, continued: true };
  }

  const lastKey = toDateKey(lastActiveAt);
  if (lastKey === today) {
    // Already studied today — streak unchanged.
    return { streak: currentStreak, longestStreak, newDay: false, continued: true };
  }
  if (lastKey === yesterday) {
    const streak = currentStreak + 1;
    return { streak, longestStreak: Math.max(longestStreak, streak), newDay: true, continued: true };
  }
  // Gap of >1 day — streak resets.
  return { streak: 1, longestStreak, newDay: true, continued: false };
}

export function isStreakMilestone(streak: number): boolean {
  return STREAK_MILESTONES.includes(streak);
}
