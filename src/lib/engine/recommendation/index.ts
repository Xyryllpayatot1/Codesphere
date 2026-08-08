// ---------------------------------------------------------------------------
// Smart study-plan engine. Generates a personalized daily plan WITHOUT AI.
//
// Strategy — weighted heuristic scoring over a candidate lesson pool:
//   1. Candidate pool = published, uncompleted lessons in the user's active
//      courses whose prerequisites are satisfied.
//   2. Each candidate gets a 0..1 priority score combining:
//        time fit         (lesson fits in the student's available time)
//        difficulty match (relative to the student's current level)
//        readiness        (fraction of prerequisite lessons done)
//        mistake signal   (failed exercises/quizzes on this lesson → review)
//        momentum         (partially completed lesson → finish it)
//        continuity       (next lesson in sequence → slight boost)
//        recency          (last touched long ago → spaced repetition)
//   3. Greedy selection fills the available time budget.
// All weights are constants below — tune them, no training data needed.
// ---------------------------------------------------------------------------

import "server-only";

import { prisma } from "@/lib/prisma";
import { levelFromXp } from "@/lib/engine/xp";
import { fromDateKey, toDateKey } from "@/lib/utils";
import { PLAN_ITEM_STATUS } from "@/lib/constants";

export const PLAN_WEIGHTS = {
  timeFit: 0.3,
  difficultyMatch: 0.25,
  readiness: 0.15,
  mistake: 0.1,
  momentum: 0.1,
  continuity: 0.05,
  recency: 0.05,
} as const;

export const MAX_PLAN_ITEMS = 6;

const DIFFICULTY_INDEX: Record<string, number> = { BEGINNER: 1, INTERMEDIATE: 2, ADVANCED: 3 };

export type PlanCandidate = {
  lessonId: string;
  lessonSlug: string;
  lessonTitle: string;
  courseSlug: string;
  courseTitle: string;
  courseColor: string;
  estimatedMinutes: number;
  difficulty: string;
  moduleTitle: string;
  order: number;
  score: number;
  reason: string;
};

type CandidateMeta = {
  progressStatus?: string;
  progressPercent: number;
  lastAccessedAt: Date | null;
  failedRecently: boolean;
  completedPrev: number;
  totalPrev: number;
  isNextInModule: boolean;
};

export type PlanGenerationInput = {
  availableMinutes: number;
  dateKey: string; // YYYY-MM-DD
};

function timeFit(estimatedMinutes: number, availableMinutes: number): number {
  if (availableMinutes <= 0) return 0;
  const ratio = estimatedMinutes / availableMinutes;
  if (ratio <= 0.5) return 1;
  if (ratio <= 1) return 1 - 0.5 * (ratio - 0.5);
  if (ratio <= 1.5) return 0.5;
  if (ratio <= 2) return 0.25;
  return 0.1;
}

function difficultyMatch(lessonDifficulty: string, userLevel: number): number {
  const target = userLevel >= 7 ? 3 : userLevel >= 4 ? 2 : 1;
  const diff = Math.abs((DIFFICULTY_INDEX[lessonDifficulty] ?? 1) - target);
  return diff === 0 ? 1 : diff === 1 ? 0.6 : 0.25;
}

function recencyBoost(lastAccessedAt: Date | null): number {
  if (!lastAccessedAt) return 0.6; // never touched → gentle nudge
  const days = Math.max(0, (Date.now() - lastAccessedAt.getTime()) / 86400000);
  if (days >= 21) return 1;
  if (days >= 7) return 0.8;
  if (days >= 3) return 0.5;
  return 0.2;
}

function computeScore(lesson: PlanCandidate, meta: CandidateMeta, availableMinutes: number, userLevel: number): number {
  const time = timeFit(lesson.estimatedMinutes, availableMinutes);
  const difficulty = difficultyMatch(lesson.difficulty, userLevel);
  const readiness = meta.totalPrev === 0 ? 1 : meta.completedPrev / meta.totalPrev;
  const mistake = meta.failedRecently ? 1 : 0;
  const momentum = meta.progressPercent > 0 && meta.progressPercent < 100 ? 1 : 0;
  const continuity = meta.isNextInModule ? 1 : 0;
  const recency = recencyBoost(meta.lastAccessedAt);

  const score =
    PLAN_WEIGHTS.timeFit * time +
    PLAN_WEIGHTS.difficultyMatch * difficulty +
    PLAN_WEIGHTS.readiness * readiness +
    PLAN_WEIGHTS.mistake * mistake +
    PLAN_WEIGHTS.momentum * momentum +
    PLAN_WEIGHTS.continuity * continuity +
    PLAN_WEIGHTS.recency * recency;

  return Math.min(1, Math.max(0, score));
}

function reasonFor(lesson: PlanCandidate, meta: CandidateMeta, availableMinutes: number): string {
  const parts: string[] = [];
  if (meta.progressPercent > 0 && meta.progressPercent < 100) parts.push("Continue where you left off");
  if (meta.failedRecently) parts.push("Review the concept you struggled with");
  if (meta.isNextInModule) parts.push("Next lesson in sequence");
  if (meta.completedPrev === 0 && meta.totalPrev > 0) parts.push("Just unlocked");
  if (meta.progressStatus === "COMPLETED") parts.push("Spaced repetition refresh");
  if (lesson.estimatedMinutes <= availableMinutes) parts.push("Fits your study window");
  if (parts.length === 0) parts.push("Recommended for your level");
  return parts.join(" · ");
}

/**
 * Generates and persists today's study plan.
 * Returns the plan items (in priority order) plus an explanation of the budget.
 */
export async function generateStudyPlan(userId: string, input: PlanGenerationInput) {
  const { availableMinutes, dateKey } = input;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const userLevel = levelFromXp(user.xp).level;

  // 1. Active enrollments → courses
  const enrollments = await prisma.enrollment.findMany({
    where: { userId, status: { not: "COMPLETED" }, course: { status: "PUBLISHED" } },
    select: { course: { select: { id: true, slug: true, title: true, color: true } } },
  });

  if (enrollments.length === 0) {
    return { plan: [], budget: { availableMinutes, usedMinutes: 0 }, reason: "no_enrollments" };
  }

  const courseIds = enrollments.map((e) => e.course.id);

  // 2. Full course graph (modules → lessons) in order
  const lessons = await prisma.lesson.findMany({
    where: { courseId: { in: courseIds }, isPublished: true },
    select: {
      id: true,
      slug: true,
      title: true,
      difficulty: true,
      estimatedMinutes: true,
      order: true,
      courseId: true,
      module: { select: { title: true, order: true } },
      progress: { where: { userId }, select: { status: true, progressPercent: true, lastAccessedAt: true } },
    },
    orderBy: [{ module: { order: "asc" } }, { order: "asc" }],
  });

  // 3. Learning-history signals
  const [failedSubmissions, recentQuizFailures] = await Promise.all([
    prisma.exerciseSubmission.findMany({
      where: { userId, passed: false },
      select: { exercise: { select: { lessonId: true } }, submittedAt: true },
    }),
    prisma.quizAttempt.findMany({
      where: { userId, passed: false },
      select: { quiz: { select: { lessonId: true } }, startedAt: true, completedAt: true },
    }),
  ]);

  const failedLessonIds = new Set<string>();
  for (const s of failedSubmissions) {
    if (Date.now() - s.submittedAt.getTime() < 14 * 86400000) failedLessonIds.add(s.exercise.lessonId);
  }
  for (const q of recentQuizFailures) {
    const t = q.completedAt ?? q.startedAt;
    if (Date.now() - t.getTime() < 14 * 86400000 && q.quiz.lessonId) failedLessonIds.add(q.quiz.lessonId);
  }

  // 4. Build candidates with prerequisite/sequence metadata
  const byCourse = new Map<string, typeof lessons>();
  for (const l of lessons) {
    const arr = byCourse.get(l.courseId) ?? [];
    arr.push(l);
    byCourse.set(l.courseId, arr);
  }

  const candidates: PlanCandidate[] = [];
  const metas = new Map<string, CandidateMeta>();

  for (const [courseId, courseLessons] of byCourse) {
    const course = enrollments.find((e) => e.course.id === courseId)!.course;
    const seen: string[] = [];
    for (let i = 0; i < courseLessons.length; i++) {
      const lesson = courseLessons[i];
      const progress = lesson.progress[0];
      const completed = progress?.status === "COMPLETED";

      if (completed && !failedLessonIds.has(lesson.id)) {
        seen.push(lesson.id);
        continue; // exclude completed lessons unless flagged for review
      }

      const completedPrev = seen.filter((id) => !failedLessonIds.has(id)).length;
      const totalPrev = seen.length;
      const isNextInModule = i === 0 || (courseLessons[i - 1].progress[0]?.status === "COMPLETED");

      const meta: CandidateMeta = {
        progressStatus: progress?.status,
        progressPercent: progress?.progressPercent ?? 0,
        lastAccessedAt: progress?.lastAccessedAt ?? null,
        failedRecently: failedLessonIds.has(lesson.id),
        completedPrev,
        totalPrev,
        isNextInModule,
      };

      const candidate: PlanCandidate = {
        lessonId: lesson.id,
        lessonSlug: lesson.slug,
        lessonTitle: lesson.title,
        courseSlug: course.slug,
        courseTitle: course.title,
        courseColor: course.color,
        estimatedMinutes: lesson.estimatedMinutes,
        difficulty: lesson.difficulty,
        moduleTitle: lesson.module.title,
        order: lesson.order,
        score: 0,
        reason: "",
      };

      const score = computeScore(candidate, meta, availableMinutes, userLevel);
      candidate.score = score;
      candidate.reason = reasonFor(candidate, meta, availableMinutes);
      candidates.push(candidate);
      metas.set(candidate.lessonId, meta);

      seen.push(lesson.id);
    }
  }

  // 5. Greedy selection under the time budget
  candidates.sort((a, b) => b.score - a.score);

  const plan: PlanCandidate[] = [];
  let usedMinutes = 0;
  for (const c of candidates) {
    if (plan.length >= MAX_PLAN_ITEMS) break;
    if (usedMinutes + c.estimatedMinutes > availableMinutes * 1.15 && plan.length > 0) break;
    plan.push(c);
    usedMinutes += c.estimatedMinutes;
  }

  // 6. Persist
  // deleteMany + createMany run as independent pooled queries rather than a
  // $transaction — a $transaction pins one pooled connection for the whole batch
  // and can exhaust the pool under concurrency on this pooler stack. If the
  // process dies between the two, the next dashboard load simply regenerates.
  const date = fromDateKey(dateKey);
  await prisma.studyPlanItem.deleteMany({ where: { userId, date } });
  await prisma.studyPlanItem.createMany({
    data: plan.map((p) => ({
      userId,
      date,
      lessonId: p.lessonId,
      reason: p.reason,
      priority: Math.round(p.score * 10),
      status: PLAN_ITEM_STATUS.PENDING,
    })),
  });

  return {
    plan,
    budget: { availableMinutes, usedMinutes },
    reason: plan.length === 0 ? "no_suitable_lessons" : "ok",
    today: toDateKey(new Date()),
  };
}
