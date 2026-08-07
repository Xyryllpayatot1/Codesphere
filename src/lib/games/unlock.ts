// ---------------------------------------------------------------------------
// Game / world unlock rules. Rules are pure data (UnlockCriteria stored on the
// Game or World row) evaluated against a snapshot of the user's progress —
// nothing is hardcoded, so teachers can rebalance from the admin panel.
// ---------------------------------------------------------------------------

import type { UnlockContext, UnlockCriteria } from "@/lib/games/types";

export function evaluateUnlock(criteria: UnlockCriteria | null | undefined, ctx: UnlockContext): boolean {
  if (!criteria) return true;
  switch (criteria.kind) {
    case "levelReached":
      return ctx.level >= criteria.level;
    case "xpReached":
      return ctx.xp >= criteria.xp;
    case "lessonsCompleted":
      return ctx.lessonsCompleted >= criteria.count;
    case "quizzesPassed":
      return ctx.quizzesPassed >= criteria.count;
    case "courseCompleted":
      return ctx.coursesCompleted.includes(criteria.slug);
    case "gameBeaten":
      return ctx.gamesBeaten.includes(criteria.slug);
    case "gamePerfect":
      return ctx.gamesPerfect.includes(criteria.slug);
    case "streakReached":
      return ctx.streak >= criteria.days;
    case "projectsApproved":
      return ctx.projectsApproved >= criteria.count;
    case "certificatesEarned":
      return ctx.certificatesEarned >= criteria.count;
    case "achievementEarned":
      return ctx.achievementsEarned.includes(criteria.key);
    case "lessonInWorld":
      return (ctx.worldLessonCounts[criteria.worldKey] ?? 0) >= criteria.count;
    case "quizScoreInWorld":
      return (ctx.worldQuizBest[criteria.worldKey] ?? 0) >= criteria.percent;
    case "masteryReached":
      return (ctx.worlds[criteria.worldKey]?.masteryPercent ?? 0) >= criteria.percent;
    case "worldCompleted":
      return ctx.worlds[criteria.worldKey]?.completed ?? false;
    case "bossDefeated":
      return ctx.worlds[criteria.worldKey]?.bossDefeated ?? false;
    case "allOf":
      return criteria.criteria.every((c) => evaluateUnlock(c, ctx));
    case "anyOf":
      return criteria.criteria.some((c) => evaluateUnlock(c, ctx));
    default:
      return false;
  }
}

export type UnlockRequirementStatus = {
  kind: string;
  label: string;
  met: boolean;
  detail: string; // e.g. "Level 3 (you are level 2)"
};

/** Evaluates every requirement and explains WHY it is (not) met. */
export function evaluateUnlockRequirements(
  criteria: UnlockCriteria | null | undefined,
  ctx: UnlockContext
): UnlockRequirementStatus[] {
  if (!criteria) return [];
  switch (criteria.kind) {
    case "levelReached":
      return [{ kind: criteria.kind, label: `Reach level ${criteria.level}`, met: ctx.level >= criteria.level, detail: `You are level ${ctx.level}` }];
    case "xpReached":
      return [{ kind: criteria.kind, label: `Earn ${criteria.xp.toLocaleString()} XP`, met: ctx.xp >= criteria.xp, detail: `You have ${ctx.xp.toLocaleString()} XP` }];
    case "lessonsCompleted":
      return [{ kind: criteria.kind, label: `Complete ${criteria.count} lesson${criteria.count === 1 ? "" : "s"}`, met: ctx.lessonsCompleted >= criteria.count, detail: `You completed ${ctx.lessonsCompleted}` }];
    case "quizzesPassed":
      return [{ kind: criteria.kind, label: `Pass ${criteria.count} quiz${criteria.count === 1 ? "" : "zes"}`, met: ctx.quizzesPassed >= criteria.count, detail: `You passed ${ctx.quizzesPassed}` }];
    case "courseCompleted":
      return [{ kind: criteria.kind, label: "Complete the linked course", met: ctx.coursesCompleted.includes(criteria.slug), detail: "" }];
    case "gameBeaten":
      return [{ kind: criteria.kind, label: "Beat the linked game", met: ctx.gamesBeaten.includes(criteria.slug), detail: "" }];
    case "gamePerfect":
      return [{ kind: criteria.kind, label: "Beat the linked game perfectly", met: ctx.gamesPerfect.includes(criteria.slug), detail: "" }];
    case "streakReached":
      return [{ kind: criteria.kind, label: `Keep a ${criteria.days}-day streak`, met: ctx.streak >= criteria.days, detail: `Your streak is ${ctx.streak}` }];
    case "projectsApproved":
      return [{ kind: criteria.kind, label: `Get ${criteria.count} project${criteria.count === 1 ? "" : "s"} approved`, met: ctx.projectsApproved >= criteria.count, detail: `You have ${ctx.projectsApproved} approved` }];
    case "certificatesEarned":
      return [{ kind: criteria.kind, label: `Earn ${criteria.count} certificate${criteria.count === 1 ? "" : "s"}`, met: ctx.certificatesEarned >= criteria.count, detail: `You earned ${ctx.certificatesEarned}` }];
    case "achievementEarned":
      return [{ kind: criteria.kind, label: "Earn the required achievement", met: ctx.achievementsEarned.includes(criteria.key), detail: "" }];
    case "lessonInWorld": {
      const got = ctx.worldLessonCounts[criteria.worldKey] ?? 0;
      return [{ kind: criteria.kind, label: `Complete ${criteria.count} lesson${criteria.count === 1 ? "" : "s"} in the world`, met: got >= criteria.count, detail: `You completed ${got}` }];
    }
    case "quizScoreInWorld": {
      const got = ctx.worldQuizBest[criteria.worldKey] ?? 0;
      return [{ kind: criteria.kind, label: `Score ${criteria.percent}% on the world quiz`, met: got >= criteria.percent, detail: `Your best is ${got}%` }];
    }
    case "masteryReached": {
      const got = ctx.worlds[criteria.worldKey]?.masteryPercent ?? 0;
      return [{ kind: criteria.kind, label: `Reach ${criteria.percent}% mastery`, met: got >= criteria.percent, detail: `You have ${got}%` }];
    }
    case "worldCompleted":
      return [{ kind: criteria.kind, label: "Complete the previous world", met: ctx.worlds[criteria.worldKey]?.completed ?? false, detail: "" }];
    case "bossDefeated":
      return [{ kind: criteria.kind, label: "Defeat the world boss", met: ctx.worlds[criteria.worldKey]?.bossDefeated ?? false, detail: "" }];
    case "allOf":
      return criteria.criteria.flatMap((c) => evaluateUnlockRequirements(c, ctx));
    case "anyOf": {
      const children = criteria.criteria.map((c) => evaluateUnlockRequirements(c, ctx)).filter((r) => r.length > 0);
      const flat = children.flat();
      const met = flat.some((r) => r.met);
      return [{ kind: "anyOf", label: flat.map((r) => r.label).join(" or "), met, detail: "" }];
    }
    default:
      return [];
  }
}

export function unlockReason(criteria: UnlockCriteria | null | undefined): string | null {
  if (!criteria) return null;
  switch (criteria.kind) {
    case "levelReached":
      return `Reach level ${criteria.level}`;
    case "xpReached":
      return `Earn ${criteria.xp.toLocaleString()} XP`;
    case "lessonsCompleted":
      return `Complete ${criteria.count} lesson${criteria.count === 1 ? "" : "s"}`;
    case "quizzesPassed":
      return `Pass ${criteria.count} quiz${criteria.count === 1 ? "" : "zes"}`;
    case "courseCompleted":
      return "Complete the linked course";
    case "gameBeaten":
      return "Beat the linked game";
    case "gamePerfect":
      return "Beat the linked game perfectly";
    case "streakReached":
      return `Keep a ${criteria.days}-day streak`;
    case "projectsApproved":
      return `Get ${criteria.count} project${criteria.count === 1 ? "" : "s"} approved`;
    case "certificatesEarned":
      return `Earn ${criteria.count} certificate${criteria.count === 1 ? "" : "s"}`;
    case "achievementEarned":
      return "Earn the required achievement";
    case "lessonInWorld":
      return `Complete ${criteria.count} lesson${criteria.count === 1 ? "" : "s"} in the world`;
    case "quizScoreInWorld":
      return `Score ${criteria.percent}% on the world quiz`;
    case "masteryReached":
      return `Reach ${criteria.percent}% mastery`;
    case "worldCompleted":
      return "Complete the previous world";
    case "bossDefeated":
      return "Defeat the world boss";
    case "allOf":
      return criteria.criteria.map((c) => unlockReason(c)).filter(Boolean).join(" + ");
    case "anyOf":
      return criteria.criteria.map((c) => unlockReason(c)).filter(Boolean).join(" or ");
    default:
      return null;
  }
}
