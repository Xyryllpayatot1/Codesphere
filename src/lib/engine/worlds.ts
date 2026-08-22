// ---------------------------------------------------------------------------
// Programming Worlds engine — the adventure-map progression system.
//
// Worlds group courses + games + a boss into one topic. Students master a
// world (lessons, quizzes, projects, games, perfect runs, daily practice) and
// then defeat its boss to earn a certificate and unlock the next world.
//
// Every rule is DATA:
//  - World.unlockCriteria  → UnlockCriteria evaluated against a progress snapshot
//  - World.masteryConfig   → component weights (WORLD_DEFAULT_MASTERY_CONFIG)
//  - Game.isBoss           → the challenge that ends the world
//  - Game.rewardCoins      → boss coin payout (on top of WORLD.BOSS_COINS_BONUS)
//
// Mastery = earned points / total possible points (capped at 100). Repeated
// quiz failures decay the quiz component to encourage review.
// ---------------------------------------------------------------------------

import "server-only";

import crypto from "node:crypto";

import { prisma } from "@/lib/prisma";
import {
  WORLD,
  WORLD_DEFAULT_MASTERY_CONFIG,
  WORLD_STATUS,
  MASTERY_MASTER_THRESHOLD,
  MASTERY_EVENT_TYPES,
  ACTIVITY_TYPES,
  XP_TYPES,
  type WorldMasteryConfig,
} from "@/lib/constants";
import { evaluateUnlock, evaluateUnlockRequirements, type UnlockRequirementStatus } from "@/lib/games/unlock";
import { awardXp } from "@/lib/engine/rewards";
import type { UnlockContext, UnlockCriteria } from "@/lib/games/types";

// ────────────────────────────── Mastery math ────────────────────────────────

export type MasteryBreakdown = {
  earned: number;
  total: number;
  penalty: number;
  components: {
    lessons: { earned: number; total: number };
    games: { earned: number; total: number };
    quizzes: { earned: number; total: number };
    projects: { earned: number; total: number };
    boss: { earned: number; total: number };
    practice: number;
    perfectBonus: number;
  };
};

export function worldMasteryConfig(world: { masteryConfig?: unknown }): WorldMasteryConfig {
  const cfg = world.masteryConfig as Partial<WorldMasteryConfig> | null | undefined;
  if (!cfg || typeof cfg !== "object") return WORLD_DEFAULT_MASTERY_CONFIG;
  return {
    ...WORLD_DEFAULT_MASTERY_CONFIG,
    ...(cfg.lessonWeight != null ? { lessonWeight: cfg.lessonWeight } : {}),
    ...(cfg.gameWeight != null ? { gameWeight: cfg.gameWeight } : {}),
    ...(cfg.perfectGameBonus != null ? { perfectGameBonus: cfg.perfectGameBonus } : {}),
    ...(cfg.quizWeight != null ? { quizWeight: cfg.quizWeight } : {}),
    ...(cfg.perfectQuizBonus != null ? { perfectQuizBonus: cfg.perfectQuizBonus } : {}),
    ...(cfg.projectWeight != null ? { projectWeight: cfg.projectWeight } : {}),
    ...(cfg.bossWeight != null ? { bossWeight: cfg.bossWeight } : {}),
    ...(cfg.practiceWeight != null ? { practiceWeight: cfg.practiceWeight } : {}),
    ...(cfg.quizFailPenalty != null ? { quizFailPenalty: cfg.quizFailPenalty } : {}),
  };
}

export type WorldContentCounts = {
  lessonsTotal: number;
  quizzesTotal: number;
  projectsTotal: number;
  gamesTotal: number;
  bossTotal: number;
};

export async function worldContentCounts(worldId: string, courseIds: string[]): Promise<WorldContentCounts> {
  const [lessonsTotal, quizzesTotal, projectsTotal, gamesTotal, bossTotal] = await Promise.all([
    courseIds.length > 0 ? prisma.lesson.count({ where: { courseId: { in: courseIds }, isPublished: true } }) : 0,
    courseIds.length > 0 ? prisma.quiz.count({ where: { courseId: { in: courseIds }, isPublished: true } }) : 0,
    courseIds.length > 0 ? prisma.project.count({ where: { courseId: { in: courseIds }, isPublished: true } }) : 0,
    prisma.game.count({ where: { worldId, isActive: true, isBoss: false } }),
    prisma.game.count({ where: { worldId, isActive: true, isBoss: true } }),
  ]);
  return { lessonsTotal, quizzesTotal, projectsTotal, gamesTotal, bossTotal };
}

export type WorldProgressState = {
  status: string;
  lessonPoints: number;
  gamePoints: number;
  quizPoints: number;
  projectPoints: number;
  bossPoints: number;
  practicePoints: number;
  perfectBonus: number;
  quizFailMap: Record<string, number>;
};

/** Computes the mastery percentage and a full component breakdown for a world. */
export function computeMastery(
  cfg: WorldMasteryConfig,
  counts: WorldContentCounts,
  state: WorldProgressState
): { percent: number; breakdown: MasteryBreakdown } {
  const lessons = { earned: state.lessonPoints, total: counts.lessonsTotal };
  const games = { earned: state.gamePoints, total: counts.gamesTotal };
  const quizzes = { earned: state.quizPoints, total: counts.quizzesTotal };
  const projects = { earned: state.projectPoints, total: counts.projectsTotal };
  const boss = { earned: state.bossPoints, total: counts.bossTotal };

  const failMap = state.quizFailMap ?? {};
  const rawPenalty = Object.values(failMap).reduce((sum, fails) => sum + Math.min(fails, 3), 0) * cfg.quizFailPenalty;
  const penalty = Math.min(rawPenalty, 15);

  const earned =
    lessons.earned * cfg.lessonWeight +
    games.earned * cfg.gameWeight +
    quizzes.earned * cfg.quizWeight +
    projects.earned * cfg.projectWeight +
    boss.earned * cfg.bossWeight +
    state.practicePoints * cfg.practiceWeight +
    state.perfectBonus -
    penalty;

  const total =
    lessons.total * cfg.lessonWeight +
    games.total * cfg.gameWeight +
    quizzes.total * cfg.quizWeight +
    projects.total * cfg.projectWeight +
    boss.total * cfg.bossWeight;

  const percent = total <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((earned / total) * 100)));

  return {
    percent,
    breakdown: {
      earned,
      total,
      penalty,
      components: { lessons, games, quizzes, projects, boss, practice: state.practicePoints, perfectBonus: state.perfectBonus },
    },
  };
}

// ───────────────────────── Unlock context snapshot ──────────────────────────

export async function buildUnlockContext(userId: string): Promise<UnlockContext> {
  const [
    user,
    lessonsCompleted,
    quizRows,
    enrollments,
    gameRows,
    achievements,
    worldProgress,
    worlds,
    lessonRows,
    projectsApproved,
    certificatesEarned,
  ] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { level: true, xp: true, streak: true } }),
    prisma.lessonProgress.count({ where: { userId, status: "COMPLETED" } }),
    prisma.quizAttempt.findMany({
      where: { userId, quiz: { course: { is: { status: "PUBLISHED" } } } },
      select: { score: true, maxScore: true, passed: true, quiz: { select: { courseId: true } } },
    }),
    prisma.enrollment.findMany({
      where: { userId, status: "COMPLETED" },
      select: { course: { select: { slug: true } } },
    }),
    prisma.game.findMany({
      where: { isActive: true },
      select: {
        slug: true,
        levels: { where: { isActive: true }, select: { id: true } },
        progress: { where: { userId }, select: { levelId: true, status: true } },
      },
    }),
    prisma.userAchievement.findMany({ where: { userId }, select: { achievement: { select: { key: true } } } }),
    prisma.userWorldProgress.findMany({ where: { userId }, select: { worldId: true, masteryPercent: true, bossDefeated: true, certificateEarned: true } }),
    prisma.world.findMany({ where: { isActive: true }, orderBy: { order: "asc" }, select: { id: true, key: true, courseSlugs: true } }),
    prisma.lessonProgress.findMany({
      where: { userId, status: "COMPLETED" },
      select: { lesson: { select: { courseId: true } } },
    }),
    prisma.projectSubmission.count({ where: { userId, status: "APPROVED" } }),
    prisma.certificate.count({ where: { userId } }),
  ]);

  const allSlugs = [...new Set(worlds.flatMap((w) => (w.courseSlugs as string[]) ?? []))];
  const courses = allSlugs.length > 0 ? await prisma.course.findMany({ where: { slug: { in: allSlugs } }, select: { id: true, slug: true } }) : [];
  const slugToId = new Map(courses.map((c) => [c.slug, c.id]));
  const worldCourses = new Map<string, string[]>(); // worldId -> course ids
  for (const w of worlds) {
    const ids = ((w.courseSlugs as string[]) ?? []).map((s) => slugToId.get(s)).filter((id): id is string => !!id);
    worldCourses.set(w.id, ids);
  }

  const lessonCountByCourse = new Map<string, number>();
  for (const r of lessonRows) lessonCountByCourse.set(r.lesson.courseId, (lessonCountByCourse.get(r.lesson.courseId) ?? 0) + 1);

  const bestByCourse = new Map<string, number>();
  for (const a of quizRows) {
    if (a.maxScore <= 0) continue;
    const pct = Math.round((a.score / a.maxScore) * 100);
    if (pct > (bestByCourse.get(a.quiz.courseId ?? "") ?? 0)) bestByCourse.set(a.quiz.courseId ?? "", pct);
  }

  const worldLessonCounts: Record<string, number> = {};
  const worldQuizBest: Record<string, number> = {};
  for (const w of worlds) {
    const ids = worldCourses.get(w.id) ?? [];
    worldLessonCounts[w.key] = ids.reduce((sum, id) => sum + (lessonCountByCourse.get(id) ?? 0), 0);
    worldQuizBest[w.key] = ids.reduce((sum, id) => Math.max(sum, bestByCourse.get(id) ?? 0), 0);
  }

  const worldCtx: UnlockContext["worlds"] = {};
  for (const wp of worldProgress) {
    const world = worlds.find((w) => w.id === wp.worldId);
    if (!world) continue;
    worldCtx[world.key] = {
      masteryPercent: wp.masteryPercent,
      completed: wp.bossDefeated && wp.certificateEarned,
      bossDefeated: wp.bossDefeated,
    };
  }

  const perfectSlugs = new Set<string>();
  const beatenSlugs = new Set<string>();
  for (const g of gameRows) {
    if (g.levels.length === 0) continue;
    const done = new Set(g.progress.filter((p) => p.status === "BEATEN" || p.status === "PERFECT").map((p) => p.levelId));
    const allPerfect = g.levels.every((l) => g.progress.some((p) => p.levelId === l.id && p.status === "PERFECT"));
    if (g.levels.every((l) => done.has(l.id))) {
      beatenSlugs.add(g.slug);
      if (allPerfect) perfectSlugs.add(g.slug);
    }
  }

  return {
    level: user?.level ?? 1,
    xp: user?.xp ?? 0,
    streak: user?.streak ?? 0,
    lessonsCompleted,
    quizzesPassed: quizRows.filter((a) => a.passed).length,
    coursesCompleted: enrollments.map((e) => e.course.slug),
    gamesBeaten: [...beatenSlugs],
    gamesPerfect: [...perfectSlugs],
    projectsApproved,
    certificatesEarned,
    achievementsEarned: achievements.map((a) => a.achievement.key),
    worlds: worldCtx,
    worldLessonCounts,
    worldQuizBest,
  };
}

// ────────────────── Scoped unlock context (criteria-driven) ─────────────────

/**
 * Builds an UnlockContext that only fetches the data the given criteria can
 * actually read. Critically faster on pooler-serialized databases than
 * buildUnlockContext when the criteria are narrow (e.g. games that only gate
 * on lessonsCompleted + level).
 */
type CtxGroup =
  | "user"
  | "lessons"
  | "quizzes"
  | "courses"
  | "games"
  | "achievements"
  | "worlds"
  | "projects"
  | "certs"
  | "worldContent";

const CRITERIA_GROUPS: Record<string, CtxGroup[]> = {
  levelReached: ["user"],
  xpReached: ["user"],
  streakReached: ["user"],
  lessonsCompleted: ["lessons"],
  quizzesPassed: ["quizzes"],
  courseCompleted: ["courses"],
  gameBeaten: ["games"],
  gamePerfect: ["games"],
  projectsApproved: ["projects"],
  certificatesEarned: ["certs"],
  achievementEarned: ["achievements"],
  lessonInWorld: ["worlds", "worldContent"],
  quizScoreInWorld: ["worlds", "worldContent"],
  masteryReached: ["worlds"],
  worldCompleted: ["worlds"],
  bossDefeated: ["worlds"],
};

function collectCtxGroups(criteria: UnlockCriteria | null | undefined, out: Set<CtxGroup>): void {
  if (!criteria) return;
  if (criteria.kind === "allOf" || criteria.kind === "anyOf") {
    for (const c of criteria.criteria) collectCtxGroups(c, out);
    return;
  }
  const groups = CRITERIA_GROUPS[criteria.kind];
  if (groups) for (const g of groups) out.add(g);
}

export async function buildUnlockContextFor(
  userId: string,
  criteriaList: (UnlockCriteria | null | undefined)[]
): Promise<UnlockContext> {
  const groups = new Set<CtxGroup>();
  for (const c of criteriaList) collectCtxGroups(c, groups);
  groups.add("user");

  const [
    user,
    lessonsCompleted,
    quizRows,
    enrollments,
    gameRows,
    achievements,
    worldProgress,
    worlds,
    lessonRows,
    projectsApproved,
    certificatesEarned,
  ] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { level: true, xp: true, streak: true } }),
    groups.has("lessons") ? prisma.lessonProgress.count({ where: { userId, status: "COMPLETED" } }) : Promise.resolve(0),
    groups.has("quizzes") || groups.has("worldContent") ? prisma.quizAttempt.findMany({
      where: { userId, quiz: { course: { is: { status: "PUBLISHED" } } } },
      select: { score: true, maxScore: true, passed: true, quiz: { select: { courseId: true } } },
    }) : Promise.resolve([]),
    groups.has("courses") ? prisma.enrollment.findMany({
      where: { userId, status: "COMPLETED" },
      select: { course: { select: { slug: true } } },
    }) : Promise.resolve([] as { course: { slug: string } }[]),
    groups.has("games") ? prisma.game.findMany({
      where: { isActive: true },
      select: {
        slug: true,
        levels: { where: { isActive: true }, select: { id: true } },
        progress: { where: { userId }, select: { levelId: true, status: true } },
      },
    }) : Promise.resolve([]),
    groups.has("achievements") ? prisma.userAchievement.findMany({ where: { userId }, select: { achievement: { select: { key: true } } } }) : Promise.resolve([]),
    groups.has("worlds") ? prisma.userWorldProgress.findMany({ where: { userId }, select: { worldId: true, masteryPercent: true, bossDefeated: true, certificateEarned: true } }) : Promise.resolve([]),
    groups.has("worlds") || groups.has("worldContent") ? prisma.world.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      select: { id: true, key: true, courseSlugs: true },
    }) : Promise.resolve([]),
    groups.has("worldContent") ? prisma.lessonProgress.findMany({
      where: { userId, status: "COMPLETED" },
      select: { lesson: { select: { courseId: true } } },
    }) : Promise.resolve([]),
    groups.has("projects") ? prisma.projectSubmission.count({ where: { userId, status: "APPROVED" } }) : Promise.resolve(0),
    groups.has("certs") ? prisma.certificate.count({ where: { userId } }) : Promise.resolve(0),
  ]);

  let courses: { id: string; slug: string }[] = [];
  const worldLessonCounts: Record<string, number> = {};
  const worldQuizBest: Record<string, number> = {};
  if (groups.has("worldContent")) {
    const allSlugs = [...new Set(worlds.flatMap((w) => (w.courseSlugs as string[]) ?? []))];
    courses = allSlugs.length > 0 ? await prisma.course.findMany({ where: { slug: { in: allSlugs } }, select: { id: true, slug: true } }) : [];
    const slugToId = new Map(courses.map((c) => [c.slug, c.id]));
    const lessonCountByCourse = new Map<string, number>();
    for (const r of lessonRows) lessonCountByCourse.set(r.lesson.courseId, (lessonCountByCourse.get(r.lesson.courseId) ?? 0) + 1);
    const bestByCourse = new Map<string, number>();
    for (const a of quizRows) {
      if (a.maxScore <= 0) continue;
      const pct = Math.round((a.score / a.maxScore) * 100);
      if (pct > (bestByCourse.get(a.quiz.courseId ?? "") ?? 0)) bestByCourse.set(a.quiz.courseId ?? "", pct);
    }
    for (const w of worlds) {
      const ids = ((w.courseSlugs as string[]) ?? []).map((s) => slugToId.get(s)).filter((id): id is string => !!id);
      worldLessonCounts[w.key] = ids.reduce((sum, id) => sum + (lessonCountByCourse.get(id) ?? 0), 0);
      worldQuizBest[w.key] = ids.reduce((sum, id) => Math.max(sum, bestByCourse.get(id) ?? 0), 0);
    }
  }

  const worldCtx: UnlockContext["worlds"] = {};
  const worldById = new Map(worlds.map((w) => [w.id, w]));
  for (const wp of worldProgress) {
    const world = worldById.get(wp.worldId);
    if (!world) continue;
    worldCtx[world.key] = {
      masteryPercent: wp.masteryPercent,
      completed: wp.bossDefeated && wp.certificateEarned,
      bossDefeated: wp.bossDefeated,
    };
  }

  const perfectSlugs = new Set<string>();
  const beatenSlugs = new Set<string>();
  for (const g of gameRows) {
    if (g.levels.length === 0) continue;
    const done = new Set(g.progress.filter((p) => p.status === "BEATEN" || p.status === "PERFECT").map((p) => p.levelId));
    const allPerfect = g.levels.every((l) => g.progress.some((p) => p.levelId === l.id && p.status === "PERFECT"));
    if (g.levels.every((l) => done.has(l.id))) {
      beatenSlugs.add(g.slug);
      if (allPerfect) perfectSlugs.add(g.slug);
    }
  }

  return {
    level: user?.level ?? 1,
    xp: user?.xp ?? 0,
    streak: user?.streak ?? 0,
    lessonsCompleted,
    quizzesPassed: quizRows.filter((a) => a.passed).length,
    coursesCompleted: enrollments.map((e) => e.course.slug),
    gamesBeaten: [...beatenSlugs],
    gamesPerfect: [...perfectSlugs],
    projectsApproved,
    certificatesEarned,
    achievementsEarned: achievements.map((a) => a.achievement.key),
    worlds: worldCtx,
    worldLessonCounts,
    worldQuizBest,
  };
}

// ────────────────────── World unlock lifecycle ──────────────────────────────

/**
 * courseSlugs → courseIds resolution, TTL-cached. This mapping only changes
 * when an admin edits world/course content, so a short-lived cache removes
 * 2 round trips from every mastery update without staleness risk.
 */
const courseIdCache = new Map<string, { ids: string[]; expiresAt: number }>();
const COURSE_ID_TTL_MS = 60_000;

async function worldCourseIds(worldId: string): Promise<string[]> {
  const cached = courseIdCache.get(worldId);
  if (cached && cached.expiresAt > Date.now()) return cached.ids;
  const world = await prisma.world.findUnique({ where: { id: worldId }, select: { courseSlugs: true } });
  const slugs = (world?.courseSlugs as string[] | null) ?? [];
  const ids =
    slugs.length === 0 ? [] : (await prisma.course.findMany({ where: { slug: { in: slugs } }, select: { id: true } })).map((c) => c.id);
  courseIdCache.set(worldId, { ids, expiresAt: Date.now() + COURSE_ID_TTL_MS });
  return ids;
}

/** Creates/updates a user's world progress row and recomputes mastery + status. */
async function touchWorldProgress(
  userId: string,
  world: { id: string; masteryConfig?: unknown },
  patch: Partial<WorldProgressState> = {},
  existingRow?: {
    status: string;
    lessonPoints: number;
    gamePoints: number;
    quizPoints: number;
    projectPoints: number;
    bossPoints: number;
    practicePoints: number;
    perfectBonus: number;
    quizFailMap: unknown;
    masteredAt: Date | null;
  } | null
): Promise<void> {
  // The existing row, course IDs and content counts are mutually independent.
  const [existing, courseIds] = await Promise.all([
    existingRow !== undefined
      ? Promise.resolve(existingRow)
      : prisma.userWorldProgress.findUnique({
          where: { userId_worldId: { userId, worldId: world.id } },
          select: {
            status: true,
            lessonPoints: true,
            gamePoints: true,
            quizPoints: true,
            projectPoints: true,
            bossPoints: true,
            practicePoints: true,
            perfectBonus: true,
            quizFailMap: true,
            masteredAt: true,
          },
        }),
    worldCourseIds(world.id),
  ]);
  const counts = await worldContentCounts(world.id, courseIds);
  const merged: WorldProgressState = {
    status: existing?.status ?? WORLD_STATUS.UNLOCKED,
    lessonPoints: existing?.lessonPoints ?? 0,
    gamePoints: existing?.gamePoints ?? 0,
    quizPoints: existing?.quizPoints ?? 0,
    projectPoints: existing?.projectPoints ?? 0,
    bossPoints: existing?.bossPoints ?? 0,
    practicePoints: existing?.practicePoints ?? 0,
    perfectBonus: existing?.perfectBonus ?? 0,
    quizFailMap: (existing?.quizFailMap as Record<string, number> | null) ?? {},
    ...patch,
  };
  const { percent } = computeMastery(worldMasteryConfig(world), counts, merged);
  const mastered = merged.bossPoints > 0 && percent >= MASTERY_MASTER_THRESHOLD;
  const status = mastered ? WORLD_STATUS.MASTERED : merged.status;

  await prisma.userWorldProgress.upsert({
    where: { userId_worldId: { userId, worldId: world.id } },
    create: {
      userId,
      worldId: world.id,
      status,
      lessonPoints: merged.lessonPoints,
      gamePoints: merged.gamePoints,
      quizPoints: merged.quizPoints,
      projectPoints: merged.projectPoints,
      bossPoints: merged.bossPoints,
      practicePoints: merged.practicePoints,
      perfectBonus: merged.perfectBonus,
      quizFailMap: merged.quizFailMap as never,
      masteryPercent: percent,
      bossDefeated: merged.bossPoints > 0,
      unlockedAt: new Date(),
      masteredAt: mastered ? new Date() : undefined,
    },
    update: {
      status,
      lessonPoints: merged.lessonPoints,
      gamePoints: merged.gamePoints,
      quizPoints: merged.quizPoints,
      projectPoints: merged.projectPoints,
      bossPoints: merged.bossPoints,
      practicePoints: merged.practicePoints,
      perfectBonus: merged.perfectBonus,
      quizFailMap: merged.quizFailMap as never,
      masteryPercent: percent,
      bossDefeated: merged.bossPoints > 0,
      ...(mastered ? { masteredAt: existing?.masteredAt ?? new Date() } : {}),
    },
  });
}

async function createMasteryEvent(userId: string, worldId: string, type: string, amount: number, reason: string) {
  await prisma.masteryEvent.create({ data: { userId, worldId, type, amount, reason } });
}

// ─────────────────────── Record hooks (mastery) ─────────────────────────────

/**
 * Finds the active worlds linked to a course. The course slug is resolved once
 * and matched against each world's courseSlugs in memory — one query total,
 * instead of one `course.findFirst` per world.
 */
async function worldsForCourse(courseId: string): Promise<{ world: { id: string; masteryConfig: unknown }; slugs: string[] }[]> {
  const [course, worlds] = await Promise.all([
    prisma.course.findUnique({ where: { id: courseId }, select: { slug: true } }),
    prisma.world.findMany({ where: { isActive: true }, select: { id: true, courseSlugs: true, masteryConfig: true } }),
  ]);
  if (!course) return [];
  const out: { world: { id: string; masteryConfig: unknown }; slugs: string[] }[] = [];
  for (const w of worlds) {
    const slugs = (w.courseSlugs as string[]) ?? [];
    if (slugs.includes(course.slug)) {
      out.push({ world: { id: w.id, masteryConfig: w.masteryConfig }, slugs });
    }
  }
  return out;
}

/** Called once when a lesson is first completed. */
export async function recordWorldLesson(userId: string, courseId: string | null): Promise<void> {
  if (!courseId) return;
  const linked = await worldsForCourse(courseId);
  for (const { world } of linked) {
    const row = await prisma.userWorldProgress.findUnique({
      where: { userId_worldId: { userId, worldId: world.id } },
      select: {
        status: true,
        lessonPoints: true,
        gamePoints: true,
        quizPoints: true,
        projectPoints: true,
        bossPoints: true,
        practicePoints: true,
        perfectBonus: true,
        quizFailMap: true,
        masteredAt: true,
      },
    });
    await touchWorldProgress(userId, world, { lessonPoints: (row?.lessonPoints ?? 0) + 1 }, row);
    await createMasteryEvent(userId, world.id, MASTERY_EVENT_TYPES.LESSON, worldMasteryConfig(world).lessonWeight, "Lesson completed");
  }
  if (linked.length > 0) await refreshWorldUnlocks(userId);
}

/** Called after every quiz attempt. First passes add mastery; repeated fails decay it. */
export async function recordWorldQuiz(userId: string, quizId: string, courseId: string | null, passed: boolean, perfect: boolean): Promise<void> {
  if (!courseId) return;
  const linked = await worldsForCourse(courseId);
  // Computed once — the caller creates the current attempt before this hook,
  // so count > 1 means a prior pass already existed.
  const priorPassCount = passed ? await prisma.quizAttempt.count({ where: { userId, quizId, passed: true } }) : 0;

  for (const { world } of linked) {
    const row = await prisma.userWorldProgress.findUnique({
      where: { userId_worldId: { userId, worldId: world.id } },
      select: {
        status: true,
        lessonPoints: true,
        gamePoints: true,
        quizPoints: true,
        projectPoints: true,
        bossPoints: true,
        practicePoints: true,
        perfectBonus: true,
        quizFailMap: true,
        masteredAt: true,
      },
    });
    const failMap: Record<string, number> = (row?.quizFailMap as Record<string, number> | null) ?? {};
    const cfg = worldMasteryConfig(world);

    if (passed) {
      if (priorPassCount <= 1) {
        await touchWorldProgress(
          userId,
          world,
          {
            quizPoints: (row?.quizPoints ?? 0) + 1,
            perfectBonus: (row?.perfectBonus ?? 0) + (perfect ? cfg.perfectQuizBonus : 0),
            quizFailMap: { ...failMap, [quizId]: 0 },
          },
          row
        );
        await createMasteryEvent(userId, world.id, MASTERY_EVENT_TYPES.QUIZ, cfg.quizWeight, perfect ? "Perfect quiz" : "Quiz passed");
        if (perfect) await createMasteryEvent(userId, world.id, MASTERY_EVENT_TYPES.QUIZ, cfg.perfectQuizBonus, "Perfect quiz bonus");
      }
    } else {
      await touchWorldProgress(userId, world, { quizFailMap: { ...failMap, [quizId]: (failMap[quizId] ?? 0) + 1 } }, row);
      await createMasteryEvent(userId, world.id, MASTERY_EVENT_TYPES.QUIZ_FAIL, -cfg.quizFailPenalty, "Quiz retry needed");
    }
  }
  if (linked.length > 0) await refreshWorldUnlocks(userId);
}

/** Called when a mini game is first beaten (perfect runs add a bonus). */
export async function recordWorldGame(userId: string, game: { id: string; worldId: string | null }, perfect: boolean): Promise<void> {
  if (!game.worldId) return;
  const world = await prisma.world.findUnique({ where: { id: game.worldId }, select: { id: true, masteryConfig: true } });
  if (!world) return;
  const row = await prisma.userWorldProgress.findUnique({ where: { userId_worldId: { userId, worldId: world.id } } });
  const cfg = worldMasteryConfig(world);
  await touchWorldProgress(userId, world, {
    gamePoints: (row?.gamePoints ?? 0) + 1,
    perfectBonus: (row?.perfectBonus ?? 0) + (perfect ? cfg.perfectGameBonus : 0),
  });
  await createMasteryEvent(userId, world.id, MASTERY_EVENT_TYPES.GAME, cfg.gameWeight, "Game beaten");
  if (perfect) await createMasteryEvent(userId, world.id, MASTERY_EVENT_TYPES.GAME_PERFECT, cfg.perfectGameBonus, "Perfect game");
  await refreshWorldUnlocks(userId);
}

/** Called once per day of active studying — small mastery nudge for the current world. */
export async function recordWorldPractice(userId: string): Promise<void> {
  const current = await currentActiveWorld(userId);
  if (!current) return;
  const row = await prisma.userWorldProgress.findUnique({ where: { userId_worldId: { userId, worldId: current.id } } });
  await touchWorldProgress(userId, current, { practicePoints: (row?.practicePoints ?? 0) + 1 });
  await createMasteryEvent(userId, current.id, MASTERY_EVENT_TYPES.PRACTICE, worldMasteryConfig(current).practiceWeight, "Daily practice");
}

/** Called when a project in a linked course is first approved. */
export async function recordWorldProject(userId: string, courseId: string | null): Promise<void> {
  if (!courseId) return;
  const linked = await worldsForCourse(courseId);
  for (const { world } of linked) {
    const row = await prisma.userWorldProgress.findUnique({
      where: { userId_worldId: { userId, worldId: world.id } },
      select: {
        status: true,
        lessonPoints: true,
        gamePoints: true,
        quizPoints: true,
        projectPoints: true,
        bossPoints: true,
        practicePoints: true,
        perfectBonus: true,
        quizFailMap: true,
        masteredAt: true,
      },
    });
    await touchWorldProgress(userId, world, { projectPoints: (row?.projectPoints ?? 0) + 1 }, row);
    await createMasteryEvent(userId, world.id, MASTERY_EVENT_TYPES.PROJECT, worldMasteryConfig(world).projectWeight, "Project approved");
  }
  if (linked.length > 0) await refreshWorldUnlocks(userId);
}

async function currentActiveWorld(userId: string): Promise<{ id: string; masteryConfig?: unknown } | null> {
  const progress = await prisma.userWorldProgress.findMany({
    where: { userId, status: { in: [WORLD_STATUS.UNLOCKED, WORLD_STATUS.ACTIVE] } },
    include: { world: { select: { id: true, order: true } } },
    orderBy: { world: { order: "asc" } },
  });
  return progress[0]?.world ?? null;
}

/** Re-evaluates locked worlds and unlocks any whose requirements are now met. */
export async function refreshWorldUnlocks(userId: string): Promise<string[]> {
  const [worlds, existing] = await Promise.all([
    prisma.world.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    prisma.userWorldProgress.findMany({ where: { userId }, select: { worldId: true, status: true } }),
  ]);
  const existingMap = new Map(existing.map((e) => [e.worldId, e.status]));
  const lockedWorlds = worlds.filter((w, i) => {
    const status = existingMap.get(w.id);
    return (!status || status === WORLD_STATUS.LOCKED) && (i === 0 || w.unlockCriteria);
  });
  if (lockedWorlds.length === 0) return [];

  // Scoped context: only the data groups actually referenced by the locked
  // worlds' criteria are queried — instead of the full 11-query snapshot.
  const ctx = await buildUnlockContextFor(
    userId,
    lockedWorlds.map((w) => w.unlockCriteria as never)
  );
  const newlyUnlocked: string[] = [];

  for (let i = 0; i < worlds.length; i++) {
    const world = worlds[i];
    const status = existingMap.get(world.id);
    if (status && status !== WORLD_STATUS.LOCKED) continue;

    const isFirstWorld = i === 0;
    const met = isFirstWorld || evaluateUnlock(world.unlockCriteria as never, ctx);
    if (!met) continue;

    await prisma.userWorldProgress.upsert({
      where: { userId_worldId: { userId, worldId: world.id } },
      create: { userId, worldId: world.id, status: WORLD_STATUS.UNLOCKED, unlockedAt: new Date() },
      update: { status: WORLD_STATUS.UNLOCKED },
    });
    newlyUnlocked.push(world.key);
    await prisma.activity.create({
      data: { userId, type: ACTIVITY_TYPES.WORLD_UNLOCKED, data: { worldKey: world.key, worldName: world.name, worldIcon: world.icon } },
    });
    await prisma.notification.create({
      data: { userId, type: "world", title: `New world unlocked: ${world.name}`, body: `You can now enter ${world.name}.`, link: `/worlds/${world.slug}` },
    });
  }

  return newlyUnlocked;
}

// ───────────────────────────── Boss battles ─────────────────────────────────

export type BossOutcome = {
  certificate: { code: string; title: string } | null;
  award: Awaited<ReturnType<typeof awardXp>>;
  unlockedWorlds: string[];
  mastered: boolean;
};

/** One-time rewards for defeating a world boss: certificate, bonus XP/coins, next world. */
export async function handleBossDefeat(
  userId: string,
  game: { id: string; worldId: string | null; name: string; rewardCoins: number; certificateTitle?: string | null },
  perfect: boolean
): Promise<BossOutcome | null> {
  if (!game.worldId) return null;
  const world = await prisma.world.findUnique({ where: { id: game.worldId } });
  if (!world) return null;

  const existing = await prisma.userWorldProgress.findUnique({ where: { userId_worldId: { userId, worldId: world.id } } });
  if (existing?.bossDefeated) return null;

  const cfg = worldMasteryConfig(world);
  await touchWorldProgress(userId, world, { bossPoints: 1, perfectBonus: (existing?.perfectBonus ?? 0) + (perfect ? cfg.perfectGameBonus : 0) });
  await createMasteryEvent(userId, world.id, MASTERY_EVENT_TYPES.BOSS, cfg.bossWeight, "Boss defeated");

  const certificate = await issueWorldCertificate(userId, world);
  const certXp = world.rewardXp || WORLD.CERTIFICATE_XP;
  const certCoins = world.rewardCoins || WORLD.CERTIFICATE_COINS;
  const award = await awardXp(userId, {
    amount: WORLD.BOSS_XP_BONUS + certXp,
    coins: game.rewardCoins + WORLD.BOSS_COINS_BONUS + certCoins,
    type: XP_TYPES.BOSS_DEFEATED,
    reason: `Defeated ${game.name} and earned the ${world.name} certificate`,
    data: { worldKey: world.key, worldName: world.name, bossGame: game.name },
  });

  await prisma.$transaction([
    prisma.activity.create({
      data: { userId, type: ACTIVITY_TYPES.BOSS_DEFEATED, data: { worldKey: world.key, worldName: world.name, gameName: game.name, perfect } },
    }),
    prisma.activity.create({
      data: { userId, type: ACTIVITY_TYPES.WORLD_CERTIFICATE, data: { worldKey: world.key, worldName: world.name, code: certificate.code } },
    }),
    prisma.notification.create({
      data: { userId, type: "boss", title: `Boss defeated! ${world.name}`, body: `You earned ${award.xpAwarded} XP and a ${world.name} certificate.`, link: `/worlds/${world.slug}` },
    }),
  ]);

  const unlockedWorlds = await refreshWorldUnlocks(userId);

  const row = await prisma.userWorldProgress.findUnique({ where: { userId_worldId: { userId, worldId: world.id } } });
  const mastered = !!row && row.bossDefeated && row.masteryPercent >= MASTERY_MASTER_THRESHOLD;

  return { certificate, award, unlockedWorlds, mastered };
}

async function issueWorldCertificate(
  userId: string,
  world: { id: string; name: string; slug: string }
): Promise<{ code: string; title: string }> {
  const existing = await prisma.worldCertificate.findUnique({ where: { userId_worldId: { userId, worldId: world.id } } });
  if (existing) return { code: existing.code, title: existing.title };
  const code = `CS-W-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const cert = await prisma.worldCertificate.create({
    data: { userId, worldId: world.id, title: `${world.name}`, code },
  });
  await prisma.userWorldProgress.update({
    where: { userId_worldId: { userId, worldId: world.id } },
    data: { certificateEarned: true },
  });
  return { code: cert.code, title: cert.title };
}

// ────────────────────────── Catalog loaders (UI) ────────────────────────────

export type WorldProgressView = {
  lessons: { done: number; total: number };
  games: { done: number; total: number };
  quizzes: { done: number; total: number };
  projects: { done: number; total: number };
  boss: { done: number; total: number };
  practice: number;
};

export type WorldMapItem = {
  id: string;
  key: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  difficulty: string;
  order: number;
  status: string;
  unlocked: boolean;
  mastered: boolean;
  bossDefeated: boolean;
  certificateEarned: boolean;
  masteryPercent: number;
  isCurrent: boolean;
  requirements: UnlockRequirementStatus[];
  progress: WorldProgressView;
  gamesCount: number;
  courses: { slug: string; title: string }[];
  bossGame: { slug: string; name: string; icon: string } | null;
};

type WorldRow = Awaited<ReturnType<typeof prisma.world.findMany>>[number];

type WorldMapShared = {
  ctx: UnlockContext;
  courseIdsByWorld: Map<string, string[]>;
  lessonCountsByCourse: Map<string, number>;
  quizCountsByCourse: Map<string, number>;
  projectCountsByCourse: Map<string, number>;
  gameRows: { slug: string; name: string; icon: string; worldId: string | null; isBoss: boolean }[];
  courseRows: { id: string; slug: string; title: string }[];
  progressRows: Awaited<ReturnType<typeof prisma.userWorldProgress.findMany>>;
};

/** Fetches everything the world map/detail pages need in a handful of parallel queries. */
async function loadWorldMapShared(userId: string, worlds: WorldRow[]): Promise<WorldMapShared> {
  const [progressRows, gameRows, courseRows, ctx, lessonRows, quizRows, projectRows] = await Promise.all([
    prisma.userWorldProgress.findMany({ where: { userId } }),
    prisma.game.findMany({ where: { isActive: true }, select: { slug: true, name: true, icon: true, worldId: true, isBoss: true } }),
    prisma.course.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, title: true, id: true } }),
    buildUnlockContext(userId),
    prisma.lesson.findMany({ where: { isPublished: true, course: { status: "PUBLISHED" } }, select: { courseId: true } }),
    prisma.quiz.findMany({ where: { isPublished: true, course: { status: "PUBLISHED" } }, select: { courseId: true } }),
    prisma.project.findMany({ where: { isPublished: true, course: { status: "PUBLISHED" } }, select: { courseId: true } }),
  ]);

  const slugToId = new Map(courseRows.map((c) => [c.slug, c.id]));
  const courseIdsByWorld = new Map<string, string[]>();
  for (const w of worlds) {
    const ids = ((w.courseSlugs as string[]) ?? []).map((s) => slugToId.get(s)).filter((id): id is string => !!id);
    courseIdsByWorld.set(w.id, ids);
  }

  const countByCourse = (rows: { courseId: string | null }[]) => {
    const m = new Map<string, number>();
    for (const r of rows) if (r.courseId) m.set(r.courseId, (m.get(r.courseId) ?? 0) + 1);
    return m;
  };

  return {
    ctx,
    courseIdsByWorld,
    lessonCountsByCourse: countByCourse(lessonRows),
    quizCountsByCourse: countByCourse(quizRows),
    projectCountsByCourse: countByCourse(projectRows),
    gameRows,
    courseRows,
    progressRows,
  };
}

function sumCourseCounts(ids: string[], m: Map<string, number>): number {
  return ids.reduce((sum, id) => sum + (m.get(id) ?? 0), 0);
}

function buildWorldMapItems(worlds: WorldRow[], shared: WorldMapShared): WorldMapItem[] {
  const { ctx, courseIdsByWorld, lessonCountsByCourse, quizCountsByCourse, projectCountsByCourse, gameRows, courseRows, progressRows } = shared;
  const gamesByWorld = new Map<string, { slug: string; name: string; icon: string }[]>();
  const bossByWorld = new Map<string, { slug: string; name: string; icon: string }>();
  for (const g of gameRows) {
    if (!g.worldId) continue;
    if (g.isBoss) bossByWorld.set(g.worldId, { slug: g.slug, name: g.name, icon: g.icon });
    else {
      const list = gamesByWorld.get(g.worldId) ?? [];
      list.push({ slug: g.slug, name: g.name, icon: g.icon });
      gamesByWorld.set(g.worldId, list);
    }
  }

  const progressByWorld = new Map(progressRows.map((p) => [p.worldId, p]));

  const items: WorldMapItem[] = [];
  for (let i = 0; i < worlds.length; i++) {
    const world = worlds[i];
    const isFirst = i === 0;
    const wp = progressByWorld.get(world.id);
    const unlocked = isFirst || !!wp || evaluateUnlock(world.unlockCriteria as never, ctx);
    const courseIds = courseIdsByWorld.get(world.id) ?? [];
    const counts: WorldContentCounts = {
      lessonsTotal: sumCourseCounts(courseIds, lessonCountsByCourse),
      quizzesTotal: sumCourseCounts(courseIds, quizCountsByCourse),
      projectsTotal: sumCourseCounts(courseIds, projectCountsByCourse),
      gamesTotal: (gamesByWorld.get(world.id) ?? []).length,
      bossTotal: bossByWorld.has(world.id) ? 1 : 0,
    };
    const state: WorldProgressState = {
      status: wp?.status ?? WORLD_STATUS.LOCKED,
      lessonPoints: wp?.lessonPoints ?? 0,
      gamePoints: wp?.gamePoints ?? 0,
      quizPoints: wp?.quizPoints ?? 0,
      projectPoints: wp?.projectPoints ?? 0,
      bossPoints: wp?.bossPoints ?? 0,
      practicePoints: wp?.practicePoints ?? 0,
      perfectBonus: wp?.perfectBonus ?? 0,
      quizFailMap: (wp?.quizFailMap as Record<string, number> | null) ?? {},
    };
    const mastery = computeMastery(worldMasteryConfig(world), counts, state).percent;
    const bossDefeated = wp?.bossDefeated ?? false;
    const certificateEarned = wp?.certificateEarned ?? false;
    const mastered = bossDefeated && mastery >= MASTERY_MASTER_THRESHOLD;
    const requirements = unlocked ? [] : evaluateUnlockRequirements(world.unlockCriteria as never, ctx);

    const courseList = courseIds
      .map((id) => courseRows.find((c) => c.id === id))
      .filter((c): c is { id: string; slug: string; title: string } => !!c);

    items.push({
      id: world.id,
      key: world.key,
      slug: world.slug,
      name: world.name,
      description: world.description,
      icon: world.icon,
      color: world.color,
      difficulty: world.difficulty,
      order: world.order,
      status: mastered ? WORLD_STATUS.MASTERED : (wp?.status ?? (unlocked ? WORLD_STATUS.UNLOCKED : WORLD_STATUS.LOCKED)),
      unlocked,
      mastered,
      bossDefeated,
      certificateEarned,
      masteryPercent: mastery,
      isCurrent: false,
      requirements,
      progress: {
        lessons: { done: wp?.lessonPoints ?? 0, total: counts.lessonsTotal },
        games: { done: wp?.gamePoints ?? 0, total: counts.gamesTotal },
        quizzes: { done: wp?.quizPoints ?? 0, total: counts.quizzesTotal },
        projects: { done: wp?.projectPoints ?? 0, total: counts.projectsTotal },
        boss: { done: wp?.bossPoints ?? 0, total: counts.bossTotal },
        practice: wp?.practicePoints ?? 0,
      },
      gamesCount: (gamesByWorld.get(world.id) ?? []).length,
      courses: courseList,
      bossGame: bossByWorld.get(world.id) ?? null,
    });
  }

  const current = items.find((w) => w.unlocked && !w.mastered);
  if (current) current.isCurrent = true;

  return items;
}

export async function loadWorldMap(userId: string): Promise<WorldMapItem[]> {
  const worlds = await prisma.world.findMany({ where: { isActive: true }, orderBy: { order: "asc" } });
  const shared = await loadWorldMapShared(userId, worlds);
  return buildWorldMapItems(worlds, shared);
}

export type WorldDetailResult = {
  world: WorldMapItem;
  nextWorld: WorldMapItem | null;
  boss: {
    slug: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    xpReward: number;
    rewardCoins: number;
    levelsBeaten: number;
    levelsTotal: number;
  } | null;
  games: {
    slug: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    kind: string;
    unlocked: boolean;
    unlockReason: string | null;
    progress: { beaten: number; perfect: number; total: number };
    isBoss: boolean;
  }[];
  courses: { slug: string; title: string; completed: number; total: number }[];
  quizBest: number;
  certificates: { code: string; title: string; issuedAt: Date }[];
};

/** Loads a single world with every content surface needed by the detail page. */
export async function loadWorldDetail(userId: string, slug: string): Promise<WorldDetailResult | null> {
  const worlds = await prisma.world.findMany({ where: { isActive: true }, orderBy: { order: "asc" } });
  const world = worlds.find((w) => w.slug === slug) ?? null;
  if (!world) return null;

  const shared = await loadWorldMapShared(userId, worlds);
  const items = buildWorldMapItems(worlds, shared);
  const item = items.find((w) => w.slug === slug) ?? null;
  if (!item) return null;
  const nextWorld = items.find((w) => w.order > item.order) ?? null;

  const { ctx, courseIdsByWorld, lessonCountsByCourse } = shared;
  const courseIds = courseIdsByWorld.get(world.id) ?? [];
  const [courses, gameRows, quizBest, levelRows, certificates] = await Promise.all([
    courseIds.length > 0
      ? prisma.course.findMany({ where: { id: { in: courseIds }, status: "PUBLISHED" }, select: { id: true, slug: true, title: true }, orderBy: { order: "asc" } })
      : [],
    prisma.game.findMany({
      where: { worldId: world.id, isActive: true },
      orderBy: { order: "asc" },
      include: {
        levels: { where: { isActive: true }, select: { id: true }, orderBy: { order: "asc" } },
        progress: { where: { userId }, select: { levelId: true, status: true } },
      },
    }),
    // User-scoped (this was previously unscoped — it loaded every user's
    // attempts for the course) and reduced via aggregate-friendly selects.
    courseIds.length > 0 ? prisma.quizAttempt.findMany({ where: { userId, quiz: { courseId: { in: courseIds } } }, select: { score: true, maxScore: true } }) : [],
    courseIds.length > 0 ? prisma.lessonProgress.findMany({ where: { userId, lesson: { courseId: { in: courseIds } }, status: "COMPLETED" }, select: { lesson: { select: { courseId: true } } } }) : [],
    prisma.worldCertificate.findMany({ where: { userId, worldId: world.id }, select: { code: true, title: true, issuedAt: true } }),
  ]);

  const bestQuizPct = quizBest.reduce((best, a) => {
    if (a.maxScore <= 0) return best;
    return Math.max(best, Math.round((a.score / a.maxScore) * 100));
  }, 0);

  const courseTotals: Record<string, number> = {};
  const courseDone: Record<string, number> = {};
  for (const id of courseIds) {
    courseTotals[id] = lessonCountsByCourse.get(id) ?? 0;
    courseDone[id] = 0;
  }
  for (const r of levelRows) courseDone[r.lesson.courseId] = (courseDone[r.lesson.courseId] ?? 0) + 1;

  const games = gameRows.map((g) => {
    const beaten = g.progress.filter((p) => p.status === "BEATEN" || p.status === "PERFECT").length;
    const perfect = g.progress.filter((p) => p.status === "PERFECT").length;
    return {
      slug: g.slug,
      name: g.name,
      description: g.description,
      icon: g.icon,
      color: g.color,
      kind: g.kind,
      unlocked: item.unlocked && evaluateUnlock(g.unlockCriteria as never, ctx),
      unlockReason: null,
      progress: { beaten, perfect, total: g.levels.length },
      isBoss: g.isBoss,
    };
  });

  const bossGame = gameRows.find((g) => g.isBoss);
  const boss = bossGame
    ? {
        slug: bossGame.slug,
        name: bossGame.name,
        description: bossGame.description,
        icon: bossGame.icon,
        color: bossGame.color,
        xpReward: bossGame.xpReward,
        rewardCoins: bossGame.rewardCoins,
        levelsBeaten: bossGame.progress.filter((p) => p.status === "BEATEN" || p.status === "PERFECT").length,
        levelsTotal: bossGame.levels.length,
      }
    : null;

  return {
    world: item,
    nextWorld,
    boss,
    games,
    courses: courses.map((c) => ({ slug: c.slug, title: c.title, completed: courseDone[c.id] ?? 0, total: courseTotals[c.id] ?? 0 })),
    quizBest: bestQuizPct,
    certificates: certificates.map((c) => ({ code: c.code, title: c.title, issuedAt: c.issuedAt })),
  };
}
